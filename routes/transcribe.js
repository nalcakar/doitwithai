import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import fetch from 'node-fetch';
import { transcribeAudio } from '../utils/whisperClient.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

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

    ffmpeg.ffprobe(filePath, async (err, metadata) => {
      if (err) {
        console.error("❌ ffprobe error:", err);
        return res.status(500).json({ error: "Could not determine file duration." });
      }

      const durationSeconds = metadata.format.duration || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const tokenCost = durationMinutes * 2;

      console.log(`⏱️ Duration: ${durationMinutes} min → Token cost: ${tokenCost}`);

      let hasEnoughTokens = false;

      // ✅ Case 1: Logged-in user
      const nonce = req.headers["x-wp-nonce"];
      if (nonce) {
        try {
        const wpBase = process.env.WP_BASE_URL || 'https://doitwithai.org';
const wpRes = await fetch(`${wpBase}/wp-json/mcq/v1/tokens`, {

            headers: {
              "X-WP-Nonce": nonce
            },
            credentials: "include"
          });

          const wpData = await wpRes.json();
          console.log("🪙 Member tokens:", wpData.tokens);

          if (wpRes.ok && wpData.tokens >= tokenCost) {
            hasEnoughTokens = true;
          } else {
            console.warn("❌ Member does not have enough tokens.");
          }
        } catch (err) {
          console.error("❌ Failed to check member tokens:", err);
        }
      } else {
        // ✅ Case 2: Visitor (no nonce present)
        const ip = req.headers["x-forwarded-for"]?.split(',')[0] || req.socket.remoteAddress;
        const Redis = (await import('@upstash/redis')).Redis;
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN
        });

        const redisKey = `visitor_tokens_${ip}`;
        const used = parseInt(await redis.get(redisKey)) || 0;
        console.log(`📊 Visitor used ${used}, needs ${tokenCost}`);

        if ((used + tokenCost) <= 20) {
          hasEnoughTokens = true;
        } else {
          console.warn("❌ Visitor over daily limit.");
        }
      }

      if (!hasEnoughTokens) {
        fs.unlink(filePath, () => {});
        return res.status(403).json({ error: "Not enough tokens to transcribe this file." });
      }

      // ✅ Transcribe
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
