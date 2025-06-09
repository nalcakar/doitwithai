import express from 'express';
import { Redis } from '@upstash/redis';

const router = express.Router();
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

// ✅ Reliable IP extractor
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

// ✅ GET: Remaining tokens
router.get('/', async (req, res) => {
  const ip = getClientIP(req);
  const redisKey = `visitor_tokens_${ip}`;

  try {
    const used = parseInt(await redis.get(redisKey)) || 0;
    const remaining = Math.max(0, DAILY_LIMIT - used);
    console.log(`📊 [GET] IP: ${ip}, Used: ${used}, Remaining: ${remaining}`);
    res.json({ tokens: remaining });
  } catch (err) {
    console.error("❌ Redis error (GET):", err);
    res.status(500).json({ error: 'Redis error' });
  }
});

// ✅ POST: Deduct tokens
router.post('/deduct', async (req, res) => {
  const ip = getClientIP(req);
  const redisKey = `visitor_tokens_${ip}`;
  const count = parseInt(req.body.count || 0);

  console.log(`📥 [POST] Deduct request from ${ip}, Count: ${count}`);

  try {
    const current = parseInt(await redis.get(redisKey)) || 0;

    if (current + count > DAILY_LIMIT) {
      console.warn(`❌ Over limit for ${ip}: current ${current}, requested ${count}`);
      return res.status(403).json({ error: 'Daily token limit exceeded' });
    }

    await redis.incrby(redisKey, count);
    await redis.expire(redisKey, 86400); // 24 hours

    const newTotal = current + count;
    const remaining = Math.max(0, DAILY_LIMIT - newTotal);

    console.log(`✅ [POST] New total for ${ip}: ${newTotal}, Remaining: ${remaining}`);
    res.json({ success: true, remaining });
  } catch (err) {
    console.error("❌ Redis error (POST):", err);
    res.status(500).json({ error: 'Token deduction failed' });
  }
});

export default router;
