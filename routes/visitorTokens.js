import express from 'express';
import { Redis } from '@upstash/redis';

const router = express.Router();
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

function getVisitorKey(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  return `visitor_tokens_${ip}`;
}

// ✅ GET: Check remaining tokens
router.get('/', async (req, res) => {
  const redisKey = getVisitorKey(req);

  try {
    const used = parseInt(await redis.get(redisKey)) || 0;
    const remaining = Math.max(0, DAILY_LIMIT - used);
    res.json({ tokens: remaining });
  } catch (err) {
    console.error("❌ Redis error:", err);
    res.status(500).json({ error: 'Redis error' });
  }
});

// ✅ POST: Deduct tokens
router.post('/deduct', async (req, res) => {
  const redisKey = getVisitorKey(req);
  const count = parseInt(req.body.count || 0);

  try {
    const current = parseInt(await redis.get(redisKey)) || 0;

    if (current + count > DAILY_LIMIT) {
      return res.status(403).json({ error: 'Daily token limit exceeded' });
    }

    // ✅ Atomically increment and expire
    await redis.incrby(redisKey, count);
    await redis.expire(redisKey, 86400); // 1 day TTL

    const newTotal = current + count;
    const remaining = Math.max(0, DAILY_LIMIT - newTotal);

    res.json({ success: true, remaining });
  } catch (err) {
    console.error("❌ Token deduction error:", err);
    res.status(500).json({ error: 'Token deduction failed' });
  }
});

export default router;
