import express from 'express';
import { generateMCQ, generateFillInBlank } from '../utils/ai.js';
import { fetchWikipediaSummary } from '../utils/wikiFetcher.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const {
      text,
      userLanguage,
      questionCount,
      optionCount,
      questionType,
      useWikipedia,
      wikiLang,
      uploadedFileContent
    } = req.body;

    if (!text || text.trim().length < 2) {
      return res.status(400).json({ error: "Text too short" });
    }

    let finalText = text;

    // Wikipedia özeti gerekiyorsa ve dosya içeriği gelmemişse
    if (useWikipedia === true) {
      if (!uploadedFileContent || uploadedFileContent.trim().length === 0) {
        try {
          const wikiData = await fetchWikipediaSummary(text, wikiLang || 'en');
          if (wikiData && typeof wikiData.summary === 'string') {
            if (wikiData.summary.trim().length > 0) {
              finalText = wikiData.summary;
            }
          }
        } catch (err) {
          console.warn("Wikipedia fetch error:", err.message);
        }
      }
    }

    let questions = [];

    if (questionType === "fill") {
      questions = await generateFillInBlank(finalText, userLanguage, questionCount);
    } else {
      questions = await generateMCQ(finalText, userLanguage, questionCount, optionCount);
    }

    return res.json({ questions });
  } catch (err) {
    console.error("❌ Error in /api/generate:", err);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

export default router;
