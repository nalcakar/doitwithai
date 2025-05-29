import express from 'express';
import { Redis } from '@upstash/redis';

const router = express.Router();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

// ✅ Check how many tokens the visitor has left
router.get('/', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "unknown";
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

// ✅ Deduct 1 token
router.post('/increment', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "unknown";
  const redisKey = `visitor_tokens_${ip}`;

  try {
    const used = parseInt(await redis.get(redisKey)) || 0;

    if (used >= DAILY_LIMIT) {
      return res.status(403).json({ error: 'Token limit reached' });
    }

    await redis.set(redisKey, used + 1, { ex: 86400 }); // 1 day expiry
    res.json({ success: true, used: used + 1 });
  } catch (err) {
    console.error("❌ Redis increment failed:", err);
    res.status(500).json({ error: 'Increment failed' });
  }
});

export default router;
