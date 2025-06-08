import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from 'ffprobe-static';
import { transcribeAudio } from '../utils/whisperClient.js';
import { deductTokensForUser } from '../utils/tokenManager.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
ffmpeg.setFfprobePath(ffprobeStatic.path);

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const user = null; // 🔧 If needed, replace this with logic to extract WordPress nonce and user data

    console.log("🧾 Uploaded file:", {
      path: filePath,
      originalName,
      mime: req.file.mimetype,
      size: req.file.size
    });

    ffmpeg.ffprobe(filePath, async (err, metadata) => {
      if (err || !metadata?.format?.duration) {
        fs.unlink(filePath, () => {});
        console.error("❌ ffprobe error:", err);
        return res.status(500).json({ error: 'Failed to get file duration.' });
      }

      const durationInSec = metadata.format.duration;
      const minutes = Math.ceil(durationInSec / 60);
      const tokenCost = minutes * 2;

      const result = await deductTokensForUser({ user, ip, count: tokenCost });
      if (!result.success) {
        fs.unlink(filePath, () => {});
        return res.status(403).json({ error: result.error });
      }

      const transcript = await transcribeAudio(filePath, originalName);
      fs.unlink(filePath, () => {});
      res.json({ text: transcript });
    });
  } catch (err) {
    console.error("❌ Transcription route error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
