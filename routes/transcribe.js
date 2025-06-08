import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { transcribeAudio } from '../utils/whisperClient.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Supported file extensions by OpenAI Whisper
const allowedExts = ['.flac', '.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.wav', '.webm'];

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    console.log("🧾 Uploaded file info:", req.file);

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'Uploaded file not found on server.' });
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Uploaded file is empty.' });
    }

    if (!allowedExts.includes(ext)) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error: `Unsupported file format (${ext}). Please upload one of: ${allowedExts.join(', ')}`
      });
    }

const transcript = await transcribeAudio(req.file.path);
    fs.unlinkSync(filePath); // clean up temp file
    res.json({ text: transcript });

  } catch (err) {
    console.error("❌ Transcription error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
