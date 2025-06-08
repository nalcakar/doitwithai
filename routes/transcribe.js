import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { transcribeAudio } from '../utils/whisperClient.js'; // ✅ fixed path

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const transcript = await transcribeAudio(filePath);
    fs.unlinkSync(filePath);
    res.json({ text: transcript });
  } catch (err) {
    console.error("❌ Transcription error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
