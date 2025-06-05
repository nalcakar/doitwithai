import express from 'express';
import { generateMCQ, generateFillInBlank } from '../utils/ai.js';
import { fetchWikipediaSummary, languageToISOCode } from '../utils/wikipediaUtils.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    let { text, userLanguage, questionCount, optionCount, questionType, isFromFile } = req.body;

    if (!text || text.length < 2) {
      return res.status(400).json({ error: "Text too short" });
    }

    // 🔍 Wikipedia özeti alma (eğer dosyadan gelmiyorsa ve 10 kelime veya daha azsa)
    if (!isFromFile && text.trim().split(/\s+/).length <= 10) {
      const topicForWiki = text.trim().split(/\s+/).slice(0, 10).join(" ");
      const langCode = languageToISOCode(userLanguage || "İngilizce");

      try {
        const wikiText = await fetchWikipediaSummary(topicForWiki, langCode);
        if (wikiText) {
          console.log("📚 Wikipedia'dan metin alındı:", topicForWiki);
          text = wikiText;
        } else {
          console.warn("⚠️ Wikipedia özeti alınamadı:", topicForWiki);
        }
      } catch (err) {
        console.error("❌ Wikipedia fetch hatası:", err.message);
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
