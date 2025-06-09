import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';
// ✅ npm install music-metadata
import { transcribeAudio } from '../utils/whisperClient.js';
import { Redis } from '@upstash/redis';
import fetch from 'node-fetch';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const VISITOR_LIMIT = 20;

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    // ✅ 1. Extract duration
    const metadata = await parseFile(filePath);

    const durationSec = Math.ceil(metadata.format.duration || 0);
    const durationMin = Math.ceil(durationSec / 60);
    const tokensToDeduct = 2 * durationMin;

    // ✅ 2. Deduct tokens
    if (req.headers['x-wp-nonce']) {
      // Logged-in user
      const response = await fetch('https://doitwithai.org/wp-json/mcq/v1/deduct-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': req.headers['x-wp-nonce']
        },
        body: JSON.stringify({ count: tokensToDeduct })
      });

      if (!response.ok) {
        const data = await response.json();
        return res.status(403).json({ error: `Member token error: ${data.error}` });
      }
    } else {
      // Visitor
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
      const key = `visitor_tokens_${ip}`;
      const current = parseInt(await redis.get(key)) || 0;
      if (current + tokensToDeduct > VISITOR_LIMIT) {
        return res.status(403).json({ error: 'Daily token limit exceeded for visitors' });
      }
      await redis.set(key, current + tokensToDeduct, { ex: 86400 });
    }

    // ✅ 3. Transcribe
    const transcript = await transcribeAudio(filePath, originalName);
    fs.unlink(filePath, () => {}); // Clean up

    res.json({ text: transcript, durationMin, tokensDeducted: tokensToDeduct });
  } catch (err) {
    console.error("❌ Transcription route error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});
