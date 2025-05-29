import express from 'express';
import { redis } from '../utils/redisClient.js';
import { generateMCQ } from '../utils/ai.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const key = `visitor_tokens:${ip}:${new Date().toISOString().slice(0, 10)}`;

    const used = await redis.get(key) || 0;
    const { text, userLanguage, questionCount = 5, optionCount = 4 } = req.body;
    const totalToUse = Number(questionCount);

    if (used + totalToUse > 20) {
      return res.status(429).json({ error: 'Daily visitor limit reached', usage: { used, max: 20 } });
    }

    const questions = await generateMCQ(text, userLanguage, questionCount, optionCount);
    await redis.set(key, used + totalToUse, { ex: 86400 });

    return res.json({ questions, usage: { used: used + totalToUse, max: 20 } });
  } catch (err) {
    console.error("Visitor generation failed:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
