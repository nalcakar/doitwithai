import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { transcribeAudio } from '../utils/whisperClient.js';
import { deductVisitorTokens } from '../utils/tokenHelpers.js'; // ✅ import visitor logic

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

    // 🕒 Get audio duration and compute token cost
   const durationInSeconds = await getAudioDurationInSeconds(filePath);
    const durationInMinutes = Math.ceil(durationInSeconds / 60);
    const tokensToDeduct = durationInMinutes * 2;

    console.log(`⏱️ Duration: ${durationInMinutes} minute(s) → 🔻 ${tokensToDeduct} token(s)`);

    // 🔐 Deduct visitor tokens
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const success = await deductVisitorTokens(ip, tokensToDeduct);
    if (!success) {
      fs.unlink(filePath, () => {}); // clean up
      return res.status(403).json({ error: 'Visitor token limit exceeded.' });
    }

    // 🧠 Transcribe with OpenAI Whisper
    const transcript = await transcribeAudio(filePath, originalName);
    fs.unlink(filePath, () => {}); // 🧹 Clean up

    res.json({
      text: transcript,
      duration: durationInMinutes,
      tokensUsed: tokensToDeduct
    });

  } catch (err) {
    console.error("❌ Transcription route error:", err);
    res.status(500).json({ error: err.message || 'Failed to transcribe audio.' });
  }
});

export default router;
