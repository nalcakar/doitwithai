import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { transcribeAudio } from '../utils/whisperClient.js';
import fetch from 'node-fetch';
import { Redis } from '@upstash/redis';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

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

    // Step 1: Detect duration
    ffmpeg.ffprobe(filePath, async (err, metadata) => {
      if (err) {
        console.error("❌ ffprobe error:", err);
        return res.status(500).json({ error: "Could not determine file duration." });
      }

      const durationSeconds = metadata.format.duration || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const tokenCost = durationMinutes * 2;

      console.log(`⏱️ Duration: ${durationMinutes} minute(s) → 🔻 ${tokenCost} token(s)`);

      let tokenCheckPass = false;
      const nonce = req.headers["x-wp-nonce"];
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
      const redisKey = `visitor_tokens_${ip}`;

      try {
        if (nonce) {
          // ✅ Member token check
          const memberRes = await fetch("https://doitwithai.org/wp-json/mcq/v1/tokens", {
            headers: { "X-WP-Nonce": nonce },
          });
          const memberData = await memberRes.json();
          if (memberRes.ok && memberData.tokens >= tokenCost) {
            tokenCheckPass = true;
          }
        } else {
          // ✅ Visitor token check
          const used = parseInt(await redis.get(redisKey)) || 0;
          if (used + tokenCost <= 20) {
            tokenCheckPass = true;
          }
        }

        if (!tokenCheckPass) {
          fs.unlink(filePath, () => {});
          return res.status(403).json({ error: "Insufficient tokens for this transcription." });
        }

        // Step 2: Transcribe
        console.log("🎧 Starting transcription...");
        const transcript = await transcribeAudio(filePath, originalName);
        fs.unlink(filePath, () => {});
        console.log("✅ Transcription complete.");

        // Step 3: Deduct tokens
        if (nonce) {
          await fetch("https://doitwithai.org/wp-json/mcq/v1/deduct-tokens", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": nonce
            },
            body: JSON.stringify({ count: tokenCost }),
          });
        } else {
          await redis.incrby(redisKey, tokenCost);
          await redis.expire(redisKey, 86400);
        }

        return res.json({ text: transcript, durationMinutes });
      } catch (tokenErr) {
        console.error("❌ Token check/deduction error:", tokenErr);
        fs.unlink(filePath, () => {});
        return res.status(500).json({ error: "Token check or deduction failed." });
      }
    });

  } catch (err) {
    console.error("❌ Transcription route error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
