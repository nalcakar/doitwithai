import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { transcribeAudio } from '../utils/whisperClient.js';
import {
  deductVisitorTokens,
  deductMemberTokens
} from '../utils/tokenHelpers.js';

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

    const durationInSeconds = await getAudioDurationInSeconds(filePath);
    const durationInMinutes = Math.ceil(durationInSeconds / 60);
    const tokensToDeduct = durationInMinutes * 2;

    console.log(`⏱️ Duration: ${durationInMinutes} minute(s) → 🔻 ${tokensToDeduct} token(s)`);

    // ✅ Inject user from header (for WordPress users)
    if (!req.user && req.headers['x-user-id']) {
      req.user = { id: parseInt(req.headers['x-user-id']) };
    }

    let success = false;

    if (req.user && req.user.id) {
      console.log("🧑 Member ID detected:", req.user.id);
      success = await deductMemberTokens(req.user.id, tokensToDeduct);
    } else {
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
      console.log("🌐 Visitor IP:", ip);
      success = await deductVisitorTokens(ip, tokensToDeduct);
    }

    if (!success) {
      fs.unlink(filePath, () => {});
      return res.status(403).json({ error: 'Token deduction failed or limit exceeded.' });
    }

    const transcript = await transcribeAudio(filePath, originalName);
    fs.unlink(filePath, () => {}); // 🧹 cleanup

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
