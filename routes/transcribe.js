import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { transcribeAudio } from '../utils/whisperClient.js';
import { Redis } from '@upstash/redis';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// ✅ Setup Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

// ✅ Get client IP reliably
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

// ✅ Main route
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

    // ✅ Step 1: Get duration
    ffmpeg.ffprobe(filePath, async (err, metadata) => {
      if (err) {
        console.error("❌ ffprobe error:", err);
        fs.unlink(filePath, () => {});
        return res.status(500).json({ error: "Could not determine file duration." });
      }

      const durationSeconds = metadata.format.duration || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const tokenCost = durationMinutes * 2;
      const ip = getClientIP(req);
      const redisKey = `visitor_tokens_${ip}`;

      console.log(`⏱️ Duration: ${durationMinutes} min → ${tokenCost} tokens required`);

      // ✅ Step 2: Check token limit BEFORE transcription
      try {
        const current = parseInt(await redis.get(redisKey)) || 0;
        if (current + tokenCost > DAILY_LIMIT) {
          console.warn(`❌ Token limit exceeded for ${ip}: current ${current}, needed ${tokenCost}`);
          fs.unlink(filePath, () => {});
          return res.status(403).json({ error: 'Daily token limit exceeded' });
        }
      } catch (err) {
        console.error("❌ Redis token check error:", err);
        fs.unlink(filePath, () => {});
        return res.status(500).json({ error: 'Token check failed' });
      }

      // ✅ Step 3: Transcribe
      console.log("🎧 Starting transcription...");
      const transcript = await transcribeAudio(filePath, originalName);
      fs.unlink(filePath, () => {});
      console.log("✅ Transcription complete.");

      // ✅ Step 4: Deduct tokens
      try {
        await redis.incrby(redisKey, tokenCost);
        await redis.expire(redisKey, 86400);
        console.log(`✅ Deducted ${tokenCost} tokens for ${ip}`);
      } catch (err) {
        console.error("❌ Redis token deduction error:", err);
        return res.status(500).json({ error: 'Token deduction failed' });
      }

      // ✅ Step 5: Return result
      res.json({ text: transcript, durationMinutes });
    });

  } catch (err) {
    console.error("❌ Transcription route error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
