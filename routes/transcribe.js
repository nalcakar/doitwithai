import express from 'express';
import multer from 'multer';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { transcribeAudio } from '../utils/whisperClient.js';
import { Redis } from '@upstash/redis';
import fetch from 'node-fetch';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    ffmpeg.ffprobe(filePath, async (err, metadata) => {
      if (err) {
        fs.unlink(filePath, () => {});
        return res.status(500).json({ error: "Could not determine file duration." });
      }

      const durationSeconds = metadata.format.duration || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const tokenCost = durationMinutes * 2;

      // ✅ Check token availability
      let hasTokens = false;

      if (req.headers['x-wp-nonce']) {
        // Member user → Call WP endpoint to check token count
        const tokenRes = await fetch('https://doitwithai.org/wp-json/mcq/v1/tokens', {
          headers: {
            'X-WP-Nonce': req.headers['x-wp-nonce']
          },
          credentials: 'include'
        });
        const tokenData = await tokenRes.json();
        if (tokenRes.ok && tokenData.tokens >= tokenCost) {
          hasTokens = true;
        } else {
          fs.unlink(filePath, () => {});
          return res.status(403).json({ error: "Not enough tokens (member)." });
        }
      } else {
        // Visitor → Check Upstash Redis
        const ip = getClientIP(req);
        const redisKey = `visitor_tokens_${ip}`;
        const current = parseInt(await redis.get(redisKey)) || 0;

        if ((current + tokenCost) > DAILY_LIMIT) {
          fs.unlink(filePath, () => {});
          return res.status(403).json({ error: "Not enough tokens (visitor)." });
        }

        // Proceed and deduct later if successful
        hasTokens = true;
      }

      if (!hasTokens) {
        fs.unlink(filePath, () => {});
        return res.status(403).json({ error: "Token check failed." });
      }

      // ✅ Proceed with transcription
      const transcript = await transcribeAudio(filePath, originalName);
      fs.unlink(filePath, () => {});
      res.json({ text: transcript, durationMinutes });
    });

  } catch (err) {
    console.error("❌ Transcription error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
