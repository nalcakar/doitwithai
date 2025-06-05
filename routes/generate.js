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
