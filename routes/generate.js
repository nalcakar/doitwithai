// generate.js
import express from 'express';
import { generateMCQ, generateFillInBlank } from '../utils/ai.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { text, userLanguage, questionCount, optionCount, questionType } = req.body;

    if (!text || text.length < 2) {
      return res.status(400).json({ error: "Text too short" });
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

import fetch from 'node-fetch';

router.post('/fetch-wikipedia', async (req, res) => {
  const { topic, lang } = req.body;
  try {
    const langCode = lang || "en";
    const apiUrl = `https://${langCode}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
    const wikiRes = await fetch(apiUrl);
    if (!wikiRes.ok) throw new Error("Wikipedia fetch failed");

    const wikiData = await wikiRes.json();
    const summary = wikiData.extract;

    res.json({ summary });
  } catch (err) {
    console.error("❌ Wikipedia error:", err.message);
    res.status(500).json({ error: "Wikipedia summary fetch failed" });
  }
});
