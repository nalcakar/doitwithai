import express from 'express';
import { generateMCQ } from '../utils/ai.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { text, userLanguage, questionCount, optionCount } = req.body;
    if (!text || text.length < 10) return res.status(400).json({ error: "Text too short" });

    const questions = await generateMCQ(text, userLanguage, questionCount, optionCount);
    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate MCQs' });
  }
});

export default router;
