import express from 'express';
import requestIp from 'request-ip';
import { generateMCQ } from '../utils/ai.js';
import { checkVisitorLimit } from '../utils/visitorFunctions.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const clientIp = requestIp.getClientIp(req);
    const { text, userLanguage, questionCount, optionCount } = req.body;

    if (!text || text.length < 10) {
      return res.status(400).json({ error: "Text too short" });
    }

    // Check Redis token usage
    const limit = await checkVisitorLimit(clientIp, questionCount);
    if (!limit.allowed) {
      return res.status(429).json({ error: "Daily visitor token limit reached", used: limit.used });
    }

    const questions = await generateMCQ(text, userLanguage, questionCount, optionCount);
    res.json({ questions });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Visitor MCQ generation failed' });
  }
});

export default router;
