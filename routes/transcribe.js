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
        return res.status(500).json({ error: "Could not determine file duration." });
      }

      const durationSeconds = metadata.format.duration || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const tokensToDeduct = durationMinutes * 2;

      console.log(`⏱️ Duration: ${durationMinutes} min → 🔻 ${tokensToDeduct} tokens`);

      // Step 2: Decide whether user is logged in
      const nonce = req.headers['x-wp-nonce'];
      const isLoggedIn = typeof nonce === 'string' && nonce.length > 0;

      const deductEndpoint = isLoggedIn
        ? 'https://doitwithai.org/wp-json/mcq/v1/deduct-tokens'
        : 'https://doitwithai.onrender.com/api/visitor-tokens/deduct';

      const deductHeaders = {
        'Content-Type': 'application/json',
        ...(isLoggedIn ? { 'X-WP-Nonce': nonce } : {})
      };

      console.log("🔁 Deducting tokens from:", deductEndpoint);
      console.log("📦 Payload:", { count: tokensToDeduct });

      const deductRes = await fetch(deductEndpoint, {
        method: 'POST',
        headers: deductHeaders,
        body: JSON.stringify({ count: tokensToDeduct })
      });

      let deductData = {};
      try {
        deductData = await deductRes.json();
      } catch (parseErr) {
        console.error("❌ Failed to parse deduction response JSON:", parseErr);
      }

      console.log("📬 Deduct response:", deductData);

      if (!deductRes.ok) {
        console.error("❌ Token deduction failed:", deductData);
        return res.status(403).json({ error: deductData.error || 'Token deduction failed.' });
      }

      // Step 3: Transcribe
      console.log("🎧 Starting transcription...");
      const transcript = await transcribeAudio(filePath, originalName);

      fs.unlink(filePath, () => {}); // Clean up uploaded file
      console.log("✅ Transcription complete.");
      res.json({ text: transcript });
    });

  } catch (err) {
    console.error("❌ Transcription route error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
