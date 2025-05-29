import express from 'express';
import { Redis } from '@upstash/redis';

const router = express.Router();

// ✅ Create Redis client using REST URL & TOKEN
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const DAILY_LIMIT = 20;

router.get('/', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const redisKey = `visitor_tokens_${ip}`;

  console.log("🧪 Visitor IP:", ip);
  console.log("🔑 Redis key:", redisKey);

  try {
    const used = parseInt(await redis.get(redisKey)) || 0;
    const remaining = Math.max(0, DAILY_LIMIT - used);
    console.log("🧮 Tokens used:", used);
    res.json({ tokens: remaining });
  } catch (err) {
    console.error("❌ Redis error:", err);
    res.status(500).json({ error: 'Redis error' });
  }
});

export default router;
