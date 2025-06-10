import express from 'express';
import multer from 'multer';
import fs from 'fs';
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

// Utility: get client IP for visitor token tracking
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return forwarded ? forwarded.split(',')[0].trim() : req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

// Utility: safe file delete
function safeUnlink(filePath) {
  fs.unlink(filePath, err => {
    if (err) console.warn("⚠️ Failed to unlink file:", filePath, err);
  });
}

router.post('/', upload.single('file'), async (req, res) => {
  let filePath, originalName;
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    filePath = req.file.path;
    originalName = req.file.originalname;

    console.log("🧾 Uploaded file:", {
      path: filePath,
      originalName,
      mime: req.file.mimetype,
      size: req.file.size
    });

    // Step 1: ffprobe to get duration
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const durationSeconds = metadata.format.duration || 0;
    const durationMinutes = Math.ceil(durationSeconds / 60);
    const tokenCost = durationMinutes * 2;

    console.log(`⏱️ Duration: ${durationMinutes} min → token cost: ${tokenCost}`);

    // Step 2: Token check and deduction
    const nonce = req.headers['x-wp-nonce'];
    const isLoggedIn = !!nonce;

    if (!isLoggedIn) {
      // Visitor token check + deduction using Redis
      const ip = getClientIP(req);
      const redisKey = `visitor_tokens_${ip}`;
      const used = parseInt(await redis.get(redisKey)) || 0;

      if (used + tokenCost > DAILY_LIMIT) {
        safeUnlink(filePath);
        console.warn(`❌ Visitor tokens exceeded: used ${used}, needs ${tokenCost}`);
        return res.status(403).json({ error: 'Insufficient visitor tokens for transcription.' });
      }

      await redis.incrby(redisKey, tokenCost);
      await redis.expire(redisKey, 86400); // expire in 24h

    } else {
      // Logged-in user: call WP REST API to deduct tokens atomically
      const response = await fetch(`${process.env.BASE_URL}/wp-json/mcq/v1/deduct-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        body: JSON.stringify({ count: tokenCost }),
      });

      if (!response.ok) {
        safeUnlink(filePath);
        const errorData = await response.json().catch(() => ({}));
        console.warn('❌ Token deduction failed:', errorData);
        return res.status(403).json({ error: errorData.error || 'Token deduction failed.' });
      }
    }

    // Step 3: Transcribe after tokens confirmed
    console.log("🎧 Starting transcription...");
    const transcript = await transcribeAudio(filePath, originalName);

    safeUnlink(filePath);
    console.log("✅ Transcription complete.");

    // Step 4: Return transcript and duration
    return res.json({ text: transcript, durationMinutes });

  } catch (err) {
    console.error("❌ Transcription route error:", err);
    if (filePath) safeUnlink(filePath);
    return res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
