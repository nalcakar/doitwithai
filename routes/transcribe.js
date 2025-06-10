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

// --- UTIL: Reliable IP extraction ---
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return forwarded ? forwarded.split(',')[0].trim() : req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

// --- UTIL: Clean up uploaded file ---
function safeUnlink(filePath) {
  fs.unlink(filePath, err => {
    if (err) console.warn("⚠️ Could not remove file:", filePath, err);
  });
}

// --- MAIN: Transcribe Route ---
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

    // --- Step 1: Probe file for duration ---
    const durationInfo = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata);
      });
    });

    const durationSeconds = durationInfo.format.duration || 0;
    const durationMinutes = Math.ceil(durationSeconds / 60);
    const tokenCost = durationMinutes * 2;
    console.log(`⏱️ Duration: ${durationMinutes} min → 🔻 ${tokenCost} tokens`);

    // --- Step 2: Check tokens ---
    const isLoggedIn = !!req.headers['x-wp-nonce'];

    if (!isLoggedIn) {
      // --- Visitor logic with Redis token tracking ---
      const ip = getClientIP(req);
      const redisKey = `visitor_tokens_${ip}`;
      const used = parseInt(await redis.get(redisKey)) || 0;

      if (used + tokenCost > DAILY_LIMIT) {
        console.warn(`❌ Visitor limit: used ${used}, needs ${tokenCost}`);
        safeUnlink(filePath);
        return res.status(403).json({ error: 'Insufficient visitor tokens for transcription.' });
      }
      await redis.incrby(redisKey, tokenCost);
      await redis.expire(redisKey, 86400); // 24hr

    } else {
      // --- Member logic: Deduct tokens via WP REST ---
      const verifyRes = await fetch(`${process.env.BASE_URL}/wp-json/mcq/v1/deduct-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': req.headers['x-wp-nonce']
        },
        body: JSON.stringify({ count: tokenCost })
      });
      if (!verifyRes.ok) {
        const error = await verifyRes.json().catch(() => ({}));
        safeUnlink(filePath);
        return res.status(403).json({ error: error?.error || 'Token deduction failed.' });
      }
    }

    // --- Step 3: Transcribe if allowed ---
    console.log("🎧 Starting transcription...");
    const transcript = await transcribeAudio(filePath, originalName);
    safeUnlink(filePath);
    console.log("✅ Transcription complete.");

    // --- Step 4: Respond with transcript ---
    return res.json({ text: transcript, durationMinutes });

  } catch (err) {
    console.error("❌ Transcription route error:", err);
    if (filePath) safeUnlink(filePath);
    return res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
