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
        return res.status(500).json({ error: 'Could not determine file duration.' });
      }

      const durationSeconds = metadata.format.duration || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const tokenCost = durationMinutes * 2;

      console.log(`⏱️ Duration: ${durationMinutes} minute(s) → 🔻 ${tokenCost} token(s)`);

      let hasTokens = false;
      let userType = 'unknown';
      let availableTokens = null;

      if (req.headers['x-wp-nonce']) {
        // ✅ MEMBER TOKEN CHECK
        try {
          const tokenRes = await fetch('https://doitwithai.org/wp-json/mcq/v1/tokens', {
            headers: {
              'X-WP-Nonce': req.headers['x-wp-nonce']
            },
            credentials: 'include'
          });

          const tokenData = await tokenRes.json();
          console.log("🔐 Member token check:", tokenData);

          if (tokenRes.ok && typeof tokenData.tokens === 'number') {
            availableTokens = tokenData.tokens;
            if (availableTokens >= tokenCost) {
              hasTokens = true;
              userType = 'member';
            }
          }
        } catch (e) {
          console.warn("❌ Member token check failed:", e);
        }
      } else {
        // ✅ VISITOR TOKEN CHECK
        try {
          const ip = getClientIP(req);
          const redisKey = `visitor_tokens_${ip}`;
          const current = parseInt(await redis.get(redisKey)) || 0;
          availableTokens = DAILY_LIMIT - current;

          if (current + tokenCost <= DAILY_LIMIT) {
            hasTokens = true;
            userType = 'visitor';
          } else {
            console.warn(`❌ Visitor token check failed. Used: ${current}, Cost: ${tokenCost}`);
          }
        } catch (e) {
          console.warn("❌ Visitor Redis check failed:", e);
        }
      }

      if (!hasTokens) {
        fs.unlink(filePath, () => {});
        return res.status(403).json({
          error: `Not enough tokens (${userType}). Required: ${tokenCost}, Available: ${availableTokens ?? 'unknown'}`
        });
      }

      // ✅ TRANSCRIBE AFTER TOKEN APPROVAL
      console.log("🎧 Starting transcription...");
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
