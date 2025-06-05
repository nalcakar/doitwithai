import express from 'express';
import { generateMCQ, generateFillInBlank } from '../utils/ai.js';
import { fetchWikipediaSummary } from '../utils/wikipediaUtils.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    let { text, userLanguage, questionCount, optionCount, questionType, isFromFile } = req.body;

    if (!text || text.length < 2) {
      return res.status(400).json({ error: "Text too short" });
    }

    const wordCount = text.trim().split(/\s+/).length;
    const langMap = {
      "Türkçe": "tr",
      "İngilizce": "en",
      "Fransızca": "fr",
      "Almanca": "de",
      "İspanyolca": "es",
      "Arapça": "ar"
    };
    const langCode = langMap[userLanguage] || 'en';

    // ✅ Wikipedia’dan içerik çek sadece kullanıcı dosya yüklemediyse ve kısa konu girdiyse
    if (!isFromFile && wordCount <= 10) {
      try {
        const wikiText = await fetchWikipediaSummary(text, langCode);
        console.log("📚 Wikipedia'dan metin alındı:", wikiText.slice(0, 200) + "...");
        text = wikiText;
      } catch (err) {
        console.warn("⚠️ Wikipedia özeti alınamadı:", err.message);
      }
    }

    let questions = [];
    if (questionType === "fill") {
      questions = await generateFillInBlank(text, userLanguage, questionCount);
    } else {
      questions = await generateMCQ(text, userLanguage, questionCount, optionCount);
    }

    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

export default router;
