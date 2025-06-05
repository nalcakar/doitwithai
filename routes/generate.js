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

    // Eğer dosyadan gelmediyse ve konu çok kısaysa Wikipedia'dan destek al
    if (!isFromFile && text.split(/\s+/).length <= 10) {
      const summary = await fetchWikipediaSummary(text, 'en'); // şimdilik İngilizce wiki kullanılıyor
      if (summary) {
        console.log("📚 Wikipedia'dan alınan özet:");
        console.log(summary);
        text = summary;
      } else {
        console.warn("⚠️ Wikipedia özeti alınamadı:", text);
      }
    }

    // Eğer userLanguage boşsa, İngilizce kullan
    const lang = userLanguage && userLanguage.trim() !== "" ? userLanguage.trim() : "English";

    let questions = [];

    if (questionType === "fill") {
      questions = await generateFillInBlank(text, lang, questionCount);
    } else {
      questions = await generateMCQ(text, lang, questionCount, optionCount);
    }

    res.json({ questions });

  } catch (err) {
    console.error("❌ Soru üretiminde hata:", err);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

export default router;
