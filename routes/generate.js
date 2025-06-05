import express from 'express';
import { generateMCQ, generateFillInBlank } from '../utils/ai.js';

import { fetchWikipediaSummary, languageToISOCode } from '../utils/wikipediaUtils.js';


const router = express.Router();

router.post('/', async (req, res) => {
  try {
    let { text, userLanguage = "", questionCount, optionCount, questionType, isFromFile } = req.body;

    if (!text || text.length < 2) {
      return res.status(400).json({ error: "Text too short" });
    }

    // Dil kodu
    const isoCode = languageToISOCode(userLanguage);
    console.log(`🗣️ Language selected: ${userLanguage || "Auto Detect"}`);
    console.log(`🌐 Prompt language sent to Gemini: ${isoCode === 'en' ? "English" : userLanguage}`);

    // Wikipedia özeti alma (sadece dosya ile gelmediyse ve kısa başlıksa)
    if (!isFromFile && text.split(/\s+/).length <= 10) {
      const summary = await fetchWikipediaSummary(text, isoCode);
      if (summary) {
        console.log("📚 Wikipedia'dan alınan özet:");
        console.log(summary);
        text = `Here is some background information about "${text}":\n${summary}\n\nPlease generate questions based on this.`;
      } else {
        console.warn(`⚠️ Wikipedia özeti alınamadı: ${text}`);
      }
    }

    let questions = [];
    if (questionType === "fill") {
      questions = await generateFillInBlank(text, isoCode, questionCount);
    } else {
      questions = await generateMCQ(text, isoCode, questionCount, optionCount);
    }

    res.json({ questions });

  } catch (err) {
    console.error("❌ Soru üretiminde hata:", err);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

export default router;
