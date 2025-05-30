import express from 'express';
import { Redis } from '@upstash/redis';

const router = express.Router();
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

router.get('/', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const redisKey = `visitor_tokens_${ip}`;

  try {
    const used = parseInt(await redis.get(redisKey)) || 0;
    const remaining = Math.max(0, DAILY_LIMIT - used);
    res.json({ tokens: remaining });
  } catch (err) {
    console.error("❌ Redis error:", err);
    res.status(500).json({ error: 'Redis error' });
  }
});

router.post('/deduct', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const redisKey = `visitor_tokens_${ip}`;
  const count = parseInt(req.body.count || 0);

  try {
    const current = parseInt(await redis.get(redisKey)) || 0;

    if (current + count > DAILY_LIMIT) {
      return res.status(403).json({ error: 'Daily token limit exceeded' });
    }

    await redis.set(redisKey, current + count, { ex: 86400 });
    res.json({ success: true, remaining: DAILY_LIMIT - (current + count) });
  } catch (err) {
    console.error("❌ Token deduction error:", err);
    res.status(500).json({ error: 'Token deduction failed' });
  }
});

export default router;
