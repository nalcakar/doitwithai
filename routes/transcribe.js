import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { transcribeAudio } from '../utils/whisperClient.js';
import { Redis } from '@upstash/redis';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    // 🕒 Get duration
    const getDuration = () => new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        const seconds = metadata.format.duration || 0;
        resolve(Math.ceil(seconds / 60)); // round up to next minute
      });
    });

    const durationMinutes = await getDuration();
    const tokensToDeduct = durationMinutes * 2;

    // 🧾 Token deduction
    const isLoggedIn = req.headers['x-wp-nonce'];
    if (isLoggedIn) {
      // 🔐 Logged-in member
      const wpRes = await fetch(`${process.env.WORDPRESS_SITE}/wp-json/mcq/v1/deduct-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': req.headers['x-wp-nonce'],
        },
        body: JSON.stringify({ count: tokensToDeduct }),
      });

      if (!wpRes.ok) {
        throw new Error('Member token deduction failed');
      }
    } else {
      // 🌐 Visitor
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
      const redisKey = `visitor_tokens_${ip}`;
      const current = parseInt(await redis.get(redisKey)) || 0;

      if (current + tokensToDeduct > 20) {
        return res.status(403).json({ error: '❌ Daily token limit exceeded for visitor.' });
      }

      await redis.set(redisKey, current + tokensToDeduct, { ex: 86400 });
    }

    // 🧠 Transcribe audio
    const transcript = await transcribeAudio(filePath, originalName);

    fs.unlink(filePath, () => {}); // cleanup
    res.json({ text: transcript });

  } catch (err) {
    console.error("❌ Transcription error:", err);
    res.status(500).json({ error: err.message || 'Failed to transcribe audio.' });
  }
});

export default router;
