import express from 'express';
import multer from 'multer';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { transcribeAudio } from '../utils/whisperClient.js';
import { getVisitorTokens, deductVisitorTokens } from './visitorTokens.js'; // update this to your logic
import { getMemberTokens, deductMemberTokens } from './memberTokens.js'; // hypothetical for members

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const isMember = !!req.headers['x-wp-nonce'];
  const userId = isMember ? req.user?.id : req.ip;

  try {
    ffmpeg.ffprobe(filePath, async (err, metadata) => {
      if (err) {
        console.error("❌ ffprobe error:", err);
        fs.unlinkSync(filePath);
        return res.status(500).json({ error: "Could not analyze audio." });
      }

      const durationSec = metadata.format.duration;
      const durationMinutes = Math.ceil(durationSec / 60);
      const cost = durationMinutes * 2;

      // 🔐 Check token availability
      const tokens = isMember
        ? await getMemberTokens(userId)
        : await getVisitorTokens(userId);

      if (tokens < cost) {
        fs.unlinkSync(filePath);
        return res.status(402).json({
          error: `Not enough tokens. Need ${cost}, but have ${tokens}.`
        });
      }

      // ✅ Deduct first
      const deducted = isMember
        ? await deductMemberTokens(userId, cost)
        : await deductVisitorTokens(userId, cost);

      if (!deducted) {
        fs.unlinkSync(filePath);
        return res.status(500).json({ error: "Token deduction failed." });
      }

      const text = await transcribeAudio(filePath);
      fs.unlinkSync(filePath);

      return res.json({
        text,
        durationMinutes,
        cost
      });
    });
  } catch (error) {
    console.error("❌ Transcription error:", error);
    fs.unlinkSync(filePath);
    return res.status(500).json({ error: "Transcription failed." });
  }
});
