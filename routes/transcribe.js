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

    // Step 1: Detect duration
    ffmpeg.ffprobe(filePath, async (err, metadata) => {
      if (err) {
        console.error("❌ ffprobe error:", err);
        return res.status(500).json({ error: "Could not determine file duration." });
      }

      const durationSeconds = metadata.format.duration || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const requiredTokens = durationMinutes * 2;

      console.log(`⏱️ Duration: ${durationMinutes} min → 🔻 Needs ${requiredTokens} tokens`);

      // Step 2: Check token balance
      const nonce = req.headers['x-wp-nonce'];
      const isLoggedIn = typeof nonce === 'string' && nonce.length > 0;

      const tokenEndpoint = isLoggedIn
        ? 'https://doitwithai.org/wp-json/mcq/v1/tokens'
        : 'https://doitwithai.onrender.com/api/visitor-tokens';

      const tokenHeaders = {
        'Content-Type': 'application/json',
        ...(isLoggedIn ? { 'X-WP-Nonce': nonce } : {})
      };

      try {
        const tokenRes = await fetch(tokenEndpoint, {
          method: 'GET',
          headers: tokenHeaders
        });

        const tokenData = await tokenRes.json();
        const available = parseInt(tokenData.tokens || 0);

        console.log(`🪙 Available: ${available}, Needed: ${requiredTokens}`);

        if (available < requiredTokens) {
          fs.unlink(filePath, () => {}); // cleanup
          return res.status(403).json({
            error: `❌ Not enough tokens. You need ${requiredTokens}, but only have ${available}.`
          });
        }

      } catch (tokenErr) {
        console.error("❌ Failed to check token balance:", tokenErr);
        fs.unlink(filePath, () => {});
        return res.status(500).json({ error: 'Token check failed' });
      }

      // Step 3: Transcribe
      console.log("🎧 Starting transcription...");
      const transcript = await transcribeAudio(filePath, originalName);

      fs.unlink(filePath, () => {});
      console.log("✅ Transcription complete.");

      // Step 4: Return result
      res.json({ text: transcript, durationMinutes });
    });

  } catch (err) {
    console.error("❌ Transcription route error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
