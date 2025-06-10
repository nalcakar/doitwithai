import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { transcribeAudio } from '../utils/whisperClient.js';
import { checkVisitorTokens, incrementVisitorUsage } from '../routes/visitorToken.js';
import axios from 'axios';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Helper to verify WP nonce and get user info
async function verifyNonce(nonce) {
  try {
    const response = await axios.post(
      'https://doitwithai.org/wp-json/custom/v1/verify-nonce',
      {},
      {
        headers: {
          'X-WP-Nonce': nonce,
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      }
    );
    return response.data;
  } catch (err) {
    return null;
  }
}

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const nonce = req.headers['x-wp-nonce'];

    if (!file || !file.path) {
      console.warn("⚠️ No file uploaded.");
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    console.log("🧾 Uploaded file:", {
      path: file.path,
      originalName: file.originalname,
      mime: file.mimetype,
      size: file.size
    });

    // Step 1: Detect audio duration
    ffmpeg.ffprobe(file.path, async (err, metadata) => {
      if (err) {
        console.error("❌ ffprobe error:", err);
        return res.status(500).json({ error: "Could not determine file duration." });
      }

      const durationSeconds = metadata.format.duration || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const tokensNeeded = durationMinutes * 2;

      console.log(`⏱️ Duration: ${durationMinutes} min → 🔻 ${tokensNeeded} tokens`);

      // Step 2: Check authentication
      const user = await verifyNonce(nonce);
      if (!user || !user.id) {
        console.log("🧍 Treating as visitor.");

        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
        const allowed = await checkVisitorTokens(ip, tokensNeeded);
        if (!allowed) {
          console.log(`❌ Visitor over limit: needs ${tokensNeeded}`);
          fs.unlink(file.path, () => {});
          return res.status(403).json({ error: 'Visitor token limit reached' });
        }

        await incrementVisitorUsage(ip, tokensNeeded);
        console.log(`✅ Visitor allowed. Used ${tokensNeeded} tokens.`);

      } else {
        console.log(`👤 Logged in as user ID ${user.id}`);
        // Token deduction happens on WordPress after success
      }

      // Step 3: Transcription
      console.log("🎧 Starting transcription...");
      const transcript = await transcribeAudio(file.path, file.originalname);

      fs.unlink(file.path, () => {}); // Clean up uploaded file
      console.log("✅ Transcription complete.");

      res.json({
        text: transcript,
        durationMinutes,
        tokens: tokensNeeded,
        isLoggedIn: !!(user && user.id)
      });
    });

  } catch (err) {
    console.error("❌ Transcription route error:", err);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
