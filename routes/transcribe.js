import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import fetch from 'node-fetch';
import { transcribeAudio } from '../utils/whisperClient.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      console.warn("⚠️ No file uploaded.");
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    console.log("🧾 Uploaded file:", {
      path: filePath,
      originalName,
      mime: req.file.mimetype,
      size: req.file.size
    });

    ffmpeg.ffprobe(filePath, async (err, metadata) => {
  if (err) {
    console.error("❌ ffprobe error:", err);
    return res.status(500).json({ error: "Could not determine file duration." });
  }

  const durationSeconds = metadata.format.duration || 0;
  const durationMinutes = Math.ceil(durationSeconds / 60);
  const tokenCost = durationMinutes * 2;

  console.log(`⏱️ Duration: ${durationMinutes} min → Token cost: ${tokenCost}`);

  // ✅ Check token balance BEFORE transcribing
  let hasEnoughTokens = false;

  if (req.headers["x-wp-nonce"]) {
    // Logged-in member
    try {
      const wpRes = await fetch(`${process.env.WP_BASE_URL}/wp-json/mcq/v1/tokens`, {
        headers: {
          "X-WP-Nonce": req.headers["x-wp-nonce"],
        },
      });

      const data = await wpRes.json();
      hasEnoughTokens = wpRes.ok && data.tokens >= tokenCost;
    } catch (err) {
      console.error("❌ Member token check error:", err);
    }
  } else {
    // Visitor
    const ip = req.headers["x-forwarded-for"]?.split(',')[0] || req.socket.remoteAddress;
    const redisKey = `visitor_tokens_${ip}`;
    try {
      const Redis = (await import('@upstash/redis')).Redis;
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      });
      const used = parseInt(await redis.get(redisKey)) || 0;
      hasEnoughTokens = (used + tokenCost) <= 20;
    } catch (err) {
      console.error("❌ Visitor token check error:", err);
    }
  }

  if (!hasEnoughTokens) {
    fs.unlink(filePath, () => {}); // Cleanup
    return res.status(403).json({ error: "Not enough tokens to transcribe this file." });
  }

  // ✅ Proceed with transcription
  const transcript = await transcribeAudio(filePath, originalName);
  fs.unlink(filePath, () => {});
  console.log("✅ Transcription complete.");
  res.json({ text: transcript, durationMinutes });
});


  } catch (err) {
    console.error("❌ Transcription route error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
