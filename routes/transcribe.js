import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { transcribeAudio } from '../utils/whisperClient.js';
import { getVisitorTokenCount, deductVisitorTokens } from '../routes/visitorTokens.js';


const router = express.Router();
const upload = multer({ dest: 'uploads/' });

function getDurationInMinutes(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      const durationSeconds = metadata?.format?.duration || 0;
      const minutes = Math.ceil(durationSeconds / 60);
      resolve(minutes);
    });
  });
}

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    const durationMinutes = await getDurationInMinutes(filePath);
    const tokenCost = durationMinutes * 2;

    console.log(`⏱️ Duration: ${durationMinutes} minute(s) → 🔻 ${tokenCost} token(s)`);

    let hasTokens = false;
    let availableTokens = null;
    let userType = "unknown";

    // 🔐 Check member tokens via X-WP-Nonce header
    const wpNonce = req.headers['x-wp-nonce'];
    if (wpNonce) {
      try {
        const wpRes = await fetch("https://doitwithai.org/wp-json/mcq/v1/tokens", {
          headers: {
            'X-WP-Nonce': wpNonce,
            'Content-Type': 'application/json'
          },
          credentials: 'include' // not strictly needed in server-side fetch
        });
        const tokenData = await wpRes.json();
        console.log("🔐 Member token check:", tokenData);

        if (wpRes.ok && typeof tokenData.tokens === 'number') {
          availableTokens = tokenData.tokens;
          userType = "member";
          hasTokens = availableTokens >= tokenCost;
        }
      } catch (err) {
        console.warn("❌ Member token check failed:", err.message);
      }
    }

    // 🧑‍🦲 If not a member or invalid nonce, check visitor token usage
    if (!hasTokens) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      availableTokens = await getVisitorTokenCount(ip);
      userType = "visitor";
      hasTokens = availableTokens >= tokenCost;
      console.log(`❌ Visitor token check ${hasTokens ? "passed" : "failed"}. Used: ${availableTokens}, Cost: ${tokenCost}`);
    }

    if (!hasTokens) {
      fs.unlinkSync(filePath); // cleanup uploaded file
      return res.status(403).json({
        error: `Not enough tokens (${userType}). Required: ${tokenCost}, Available: ${availableTokens ?? 'unknown'}`
      });
    }

    // ✅ Transcribe with Whisper
    const transcript = await transcribeAudio(filePath, originalName);

    fs.unlinkSync(filePath); // cleanup after transcription

    // ✅ Deduct tokens after success
    if (userType === "member") {
      const wpUserRes = await fetch("https://doitwithai.org/wp-json/mcq/v1/deduct-tokens", {
        method: "POST",
        headers: {
          'X-WP-Nonce': wpNonce,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tokens: tokenCost }),
        credentials: 'include'
      });
      const result = await wpUserRes.json();
      console.log("🧾 Member token deduction:", result);
    } else if (userType === "visitor") {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      await deductVisitorTokens(ip, tokenCost);
      console.log("🧾 Visitor tokens deducted");
    }

    res.json({
      text: transcript,
      durationMinutes: durationMinutes
    });

  } catch (err) {
    console.error("❌ Transcription error:", err);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path); // cleanup on failure
    }
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

export default router;
