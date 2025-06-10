import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import fetch from 'node-fetch';
import { Redis } from '@upstash/redis';
import { transcribeAudio } from '../utils/whisperClient.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

// ✅ IP extraction
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return forwarded ? forwarded.split(',')[0].trim() : req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

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

    // Step 1: Detect duration (NEEDED for cost calculation)
    ffmpeg.ffprobe(filePath, async (err, metadata) => {
      if (err) {
        console.error("❌ ffprobe error:", err);
        fs.unlink(filePath, () => {});
        return res.status(500).json({ error: "Could not determine file duration." });
      }

      const durationSeconds = metadata.format.duration || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const tokenCost = durationMinutes * 2;

      console.log(`⏱️ Duration: ${durationMinutes} min → 🔻 ${tokenCost} tokens`);

      const isLoggedIn = !!req.headers['x-wp-nonce'];

      // ---------- VISITOR LOGIC ----------
      if (!isLoggedIn) {
        const ip = getClientIP(req);
        const redisKey = `visitor_tokens_${ip}`;
        const current = parseInt(await redis.get(redisKey)) || 0;

        // Check token limit BEFORE deduction
        if (current + tokenCost > DAILY_LIMIT) {
          console.warn(`❌ Visitor over limit: used ${current}, needs ${tokenCost}`);
          fs.unlink(filePath, () => {});
          return res.status(403).json({ error: 'Insufficient visitor tokens for transcription.' });
        }

        // Deduct tokens for visitor (AFTER check)
        await redis.incrby(redisKey, tokenCost);
        await redis.expire(redisKey, 86400); // 24 hours

      // ---------- MEMBER LOGIC ----------
      } else {
        // Check and deduct tokens atomically via WP API
        const verifyRes = await fetch(`${process.env.BASE_URL}/wp-json/mcq/v1/deduct-tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': req.headers['x-wp-nonce']
          },
          body: JSON.stringify({ count: tokenCost })
        });

        if (!verifyRes.ok) {
          const error = await verifyRes.json();
          fs.unlink(filePath, () => {});
          return res.status(403).json({ error: error?.error || 'Token deduction failed.' });
        }
      }

      // ---------- SAFE TO TRANSCRIBE NOW ----------
      console.log("🎧 Starting transcription...");
      const transcript = await transcribeAudio(filePath, originalName);
      fs.unlink(filePath, () => {});
      console.log("✅ Transcription complete.");

      // ---------- RETURN RESULT ----------
      res.json({ text: transcript, durationMinutes });
    });

  } catch (err) {
    console.error("❌ Transcription route error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
