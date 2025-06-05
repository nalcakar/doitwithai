import express from 'express';
import { generateMCQ, generateFillInBlank } from '../utils/ai.js';
import { fetchWikipediaSummary } from '../utils/wikipediaUtils.js'; // ✅ Eklendi

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    let { text, userLanguage, questionCount, optionCount, questionType, isFromFile } = req.body;

    // ✅ Eğer metin kısa ve dosyadan gelmiyorsa, Wikipedia'dan metin çek
    if (!isFromFile && text.length < 20 && !text.includes(" ")) {
      const isoMap = {
        "İngilizce": "en", "Türkçe": "tr", "Fransızca": "fr", "İspanyolca": "es",
        "Almanca": "de", "Arapça": "ar", "Rusça": "ru", "Çince": "zh", "Japonca": "ja",
        "İtalyanca": "it", "Portekizce": "pt", "Korece": "ko", "Lehçe": "pl", "Flemenkçe": "nl"
      };
      const lang = isoMap[userLanguage] || "en";

      try {
        const wikiText = await fetchWikipediaSummary(text, lang);
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
