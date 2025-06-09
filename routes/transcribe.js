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

    // Get duration using ffmpeg
    ffmpeg.ffprobe(filePath, async (err, metadata) => {
      if (err) {
        console.error("❌ ffprobe error:", err);
        return res.status(500).json({ error: "Could not determine file duration." });
      }

      const durationSeconds = metadata.format.duration || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const tokensToDeduct = durationMinutes * 2;

      console.log(`⏱️ Duration: ${durationMinutes} min → 🔻 ${tokensToDeduct} tokens`);

      // Detect login via X-WP-Nonce
      const nonce = req.headers['x-wp-nonce'];
      const isLoggedIn = typeof nonce === 'string' && nonce.length > 0;

      const deductEndpoint = isLoggedIn
        ? 'https://doitwithai.org/wp-json/mcq/v1/deduct-tokens'
        : 'https://doitwithai.onrender.com/api/visitor-tokens/deduct';

      const deductHeaders = {
        'Content-Type': 'application/json',
        ...(isLoggedIn ? { 'X-WP-Nonce': nonce } : {})
      };

      const deductRes = await fetch(deductEndpoint, {
        method: 'POST',
        headers: deductHeaders,
        body: JSON.stringify({ count: tokensToDeduct })
      });

      const deductData = await deductRes.json();

      if (!deductRes.ok) {
        console.error("❌ Token deduction failed:", deductData);
        return res.status(403).json({ error: deductData.error || 'Token deduction failed.' });
      }

      // Transcribe
      const transcript = await transcribeAudio(filePath, originalName);
      fs.unlink(filePath, () => {}); // clean up
      res.json({ text: transcript });
    });

  } catch (err) {
    console.error("❌ Transcription route error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
