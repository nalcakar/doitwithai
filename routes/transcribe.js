import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import fetch from 'node-fetch';
import { Redis } from '@upstash/redis';
import { transcribeAudio } from '../utils/whisperClient.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const DAILY_LIMIT = 20;

// Helper: Get client IP reliably
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

// Helper: Remove file asynchronously, log errors
async function safeUnlink(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    console.warn(`⚠️ Could not remove file ${filePath}:`, err);
  }
}

// Helper: Get audio duration in minutes
function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const durationSeconds = metadata.format?.duration || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      resolve(durationMinutes);
    });
  });
}

// Helper: Deduct tokens for visitor from Redis
async function deductVisitorTokens(ip, cost) {
  const redisKey = `visitor_tokens_${ip}`;
  const used = parseInt(await redis.get(redisKey)) || 0;
  if (used + cost > DAILY_LIMIT) {
    throw new Error('Insufficient visitor tokens for transcription.');
  }
  await redis.incrby(redisKey, cost);
  await redis.expire(redisKey, 86400);
}

// Helper: Deduct tokens for member via WordPress REST
async function deductMemberTokens(baseUrl, nonce, cost) {
  const response = await fetch(`${baseUrl}/wp-json/mcq/v1/deduct-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': nonce,
    },
    body: JSON.stringify({ count: cost }),
  });
  if (!response.ok) {
    let error = 'Token deduction failed.';
    try {
      const data = await response.json();
      error = data.error || error;
    } catch {}
    throw new Error(error);
  }
}

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file?.path) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;
  console.log('🧾 Uploaded file:', {
    path: filePath,
    originalName,
    mime: req.file.mimetype,
    size: req.file.size,
  });

  try {
    // Get duration and calculate token cost
    const durationMinutes = await getAudioDuration(filePath);
    const tokenCost = durationMinutes * 2;
    console.log(`⏱️ Duration: ${durationMinutes} min → 🔻 ${tokenCost} tokens`);

    // Check user type and deduct tokens accordingly
    const nonce = req.headers['x-wp-nonce'];
    const isLoggedIn = Boolean(nonce);

    if (!isLoggedIn) {
      // Visitor logic
      const ip = getClientIP(req);
      await deductVisitorTokens(ip, tokenCost);
    } else {
      // Member logic
      await deductMemberTokens(process.env.BASE_URL, nonce, tokenCost);
    }

    // Transcribe audio
    console.log('🎧 Starting transcription...');
    const transcript = await transcribeAudio(filePath, originalName);
    console.log('✅ Transcription complete.');

    // Respond with transcription and duration
    res.json({ text: transcript, durationMinutes });
  } catch (err) {
    console.error('❌ Transcription error:', err.message);
    res.status(err.message.includes('Insufficient') || err.message.includes('Token deduction') ? 403 : 500).json({ error: err.message });
  } finally {
    await safeUnlink(filePath);
  }
});

export default router;
