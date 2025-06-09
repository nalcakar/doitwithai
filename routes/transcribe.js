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

    // Step 1: Detect duration using ffprobe
    ffmpeg.ffprobe(filePath, async (err, metadata) => {
      if (err) {
        console.error("❌ ffprobe error:", err);
        fs.unlink(filePath, () => {});
        return res.status(500).json({ error: "Could not determine file duration." });
      }

      const durationSeconds = metadata.format.duration || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const requiredTokens = durationMinutes * 2;

      console.log(`⏱️ Duration: ${durationMinutes} min → 🔻 Needs ${requiredTokens} tokens`);

      // Step 2: Determine token source
      const nonce = req.headers['x-wp-nonce'];
      const visitorIp = req.headers['x-visitor-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
      const isLoggedIn = nonce && typeof nonce === 'string';

      let tokenEndpoint = '';
      const headers = { 'Content-Type': 'application/json' };

      if (isLoggedIn) {
        tokenEndpoint = 'https://doitwithai.org/wp-json/mcq/v1/tokens';
        headers['X-WP-Nonce'] = nonce;
      } else if (visitorIp) {
        tokenEndpoint = 'https://doitwithai.onrender.com/api/visitor-tokens';
        headers['X-Visitor-IP'] = visitorIp;
      } else {
        fs.unlink(filePath, () => {});
        return res.status(400).json({ error: 'Unable to identify user or visitor IP.' });
      }

      // Step 3: Fetch token balance
      try {
        const tokenRes = await fetch(tokenEndpoint, {
          method: 'GET',
          headers
        });

        const tokenData = await tokenRes.json();
        const available = parseInt(tokenData.tokens || 0);

        console.log(`🪙 Available: ${available}, Required: ${requiredTokens}`);

        if (available < requiredTokens) {
          fs.unlink(filePath, () => {});
          return res.status(403).json({
            error: `❌ Not enough tokens. You need ${requiredTokens}, but only have ${available}.`
          });
        }

      } catch (tokenErr) {
        console.error("❌ Token check error:", tokenErr);
        fs.unlink(filePath, () => {});
        return res.status(500).json({ error: 'Failed to verify token balance' });
      }

      // Step 4: Transcribe
      console.log("🎧 Starting transcription...");
      const transcript = await transcribeAudio(filePath, originalName);

      fs.unlink(filePath, () => {});
      console.log("✅ Transcription complete.");

      // Step 5: Return result
      res.json({ text: transcript, durationMinutes });
    });

  } catch (err) {
    console.error("❌ Transcription route error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
