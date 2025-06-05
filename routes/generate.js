// routes/generate.js
import express from 'express';
import { generateMCQ, generateFillInBlank } from '../utils/ai.js';
import { fetchWikipediaSummary } from '../utils/wikiFetcher.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { text, userLanguage, questionCount, optionCount, questionType, useWikipedia, wikiLang } = req.body;

    if (!text || text.length < 2) {
      return res.status(400).json({ error: "Text too short" });
    }

    let finalText = text;

    // ✅ Wikipedia'dan içerik al (eğer dosya yoksa ve checkbox seçiliyse)
    if (useWikipedia && !req.body.uploadedFileContent) {
      const wikiData = await fetchWikipediaSummary(text, wikiLang || 'en');
      if (wikiData?.summary) {
        finalText = wikiData.summary;
      }
    }

    let questions = [];
    if (questionType === "fill") {
      questions = await generateFillInBlank(finalText, userLanguage, questionCount);
    } else {
      questions = await generateMCQ(finalText, userLanguage, questionCount, optionCount);
    }

    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

export default router;
