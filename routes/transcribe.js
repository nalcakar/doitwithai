import express from 'express';
import multer from 'multer';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { transcribeAudio } from '../utils/whisperClient.js';
import { getVisitorTokens, deductVisitorTokens } from './visitorTokens.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const isMember = !!req.headers['x-wp-nonce'];
  const userId = isMember ? null : req.ip;

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

      // 🔐 Get tokens
      const tokens = isMember
        ? await fetchMemberTokenCount(req.headers['x-wp-nonce'])
        : await getVisitorTokens(userId);

      if (tokens < cost) {
        fs.unlinkSync(filePath);
        return res.status(402).json({
          error: `Not enough tokens. Need ${cost}, but have ${tokens}.`
        });
      }

      // 💳 Deduct tokens
      const deducted = isMember
        ? await deductMemberTokensViaAPI(req.headers['x-wp-nonce'], cost)
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

// ✅ Helper for members
async function fetchMemberTokenCount(nonce) {
  try {
    const res = await fetch('https://doitwithai.org/wp-json/mcq/v1/tokens', {
      headers: { 'X-WP-Nonce': nonce }
    });
    const data = await res.json();
    return data.tokens || 0;
  } catch (err) {
    console.error("❌ Failed to fetch member tokens:", err);
    return 0;
  }
}

async function deductMemberTokensViaAPI(nonce, count) {
  try {
    const res = await fetch('https://doitwithai.org/wp-json/mcq/v1/deduct-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce
      },
      body: JSON.stringify({ count })
    });
    return res.ok;
  } catch (err) {
    console.error("❌ Failed to deduct member tokens:", err);
    return false;
  }
}

export default router;
