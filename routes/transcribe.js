import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { transcribeAudio } from '../utils/whisperClient.js';
import { getClientIP, deductTokens } from '../utils/visitorTokens.js'; // Import token functions

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
    const ip = getClientIP(req); // Get client IP for token management

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
        // Clean up file if ffprobe fails
        fs.unlink(filePath, () => {});
        return res.status(500).json({ error: "Could not determine file duration." });
      }

      const durationSeconds = metadata.format.duration || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);

      console.log(`⏱️ Duration: ${durationMinutes} min → should deduct ${durationMinutes * 2} tokens`);

      // **NEW Step 2: Check for sufficient tokens BEFORE transcription**
      const requiredTokens = durationMinutes * 2; // Assuming 2 tokens per minute as per console log

      try {
        // We'll simulate a check here, as `deductTokens` in visitorTokens.js directly deducts.
        // For a true "check then deduct" flow, you'd need a `checkTokens` function in visitorTokens.js.
        // For simplicity, we'll try to deduct and handle the 403 error.
        await deductTokens(ip, requiredTokens); // Attempt to deduct tokens
        console.log(`✅ Tokens deducted for transcription: ${requiredTokens}`);
      } catch (tokenErr) {
        // If deduction fails due to limit, return 403
        if (tokenErr.message === 'Daily token limit exceeded') {
          console.warn(`❌ Transcription aborted for ${ip}: ${tokenErr.message}`);
          fs.unlink(filePath, () => {}); // Clean up uploaded file
          return res.status(403).json({ error: tokenErr.message });
        }
        // Other token related errors
        console.error("❌ Token deduction error:", tokenErr);
        fs.unlink(filePath, () => {}); // Clean up uploaded file
        return res.status(500).json({ error: 'Failed to check/deduct tokens for transcription.' });
      }


      // Original Step 2 (now Step 3): Transcribe
      console.log("🎧 Starting transcription...");
      const transcript = await transcribeAudio(filePath, originalName);

      fs.unlink(filePath, () => {}); // Clean up uploaded file
      console.log("✅ Transcription complete.");

      // Step 4: Return transcript + duration for frontend deduction
      res.json({ text: transcript, durationMinutes });
    });

  } catch (err) {
    console.error("❌ Transcription route error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;