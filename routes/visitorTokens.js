import express from 'express';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ✅ Connect to Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ✅ Get token balance
router.get('/', async (req, res) => {
  let visitorId = req.cookies?.visitor_id;

  if (!visitorId) {
    visitorId = uuidv4();
    res.cookie('visitor_id', visitorId, {
      maxAge: 86400000,
      httpOnly: false,
      sameSite: 'None',
      secure: true
    });
  }

  const todayKey = `tokens:${visitorId}:${new Date().toISOString().slice(0, 10)}`;
  let tokensUsed = await redis.get(todayKey);
  tokensUsed = tokensUsed ? parseInt(tokensUsed) : 0;

  res.json({ tokens: Math.max(20 - tokensUsed, 0) });
});

// ✅ Increment token usage
router.post('/increment', async (req, res) => {
  let visitorId = req.cookies?.visitor_id;

  if (!visitorId) {
    visitorId = uuidv4();
    res.cookie('visitor_id', visitorId, {
      maxAge: 86400000,
      httpOnly: false,
      sameSite: 'None',
      secure: true
    });
  }

  const todayKey = `tokens:${visitorId}:${new Date().toISOString().slice(0, 10)}`;
  let current = await redis.get(todayKey);
  current = current ? parseInt(current) : 0;

  if (current >= 20) {
    return res.status(403).json({ error: 'Visitor token limit exceeded' });
  }

  await redis.incr(todayKey);
  await redis.expire(todayKey, 86400); // Expire in 24 hours

  res.json({ success: true });
});

export default router;
