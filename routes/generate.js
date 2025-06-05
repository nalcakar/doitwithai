import express from 'express';
import { generateMCQ, generateFillInBlank } from '../utils/ai.js';
import { fetchWikipediaSummary } from '../utils/wikipediaUtils.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    let { text, questionCount, optionCount, questionType, isFromFile } = req.body;

    if (!text || text.length < 2) {
      return res.status(400).json({ error: "Text too short" });
    }

    // Eğer dosyadan gelmediyse ve metin 10 kelime veya daha kısaysa Wikipedia'dan özet çek
    if (!isFromFile && text.split(/\s+/).length <= 10) {
      const summary = await fetchWikipediaSummary(text, 'en');
      if (summary) {
        console.log("📚 Wikipedia'dan alınan özet:");
        console.log(summary);
        text = summary;
      } else {
        console.warn("⚠️ Wikipedia özeti alınamadı:", text);
      }
    }

    let questions = [];

    if (questionType === "fill") {
      questions = await generateFillInBlank(text, "English", questionCount);
    } else {
      questions = await generateMCQ(text, "English", questionCount, optionCount);
    }

    res.json({ questions });

  } catch (err) {
    console.error("❌ Soru üretiminde hata:", err);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

export default router;
