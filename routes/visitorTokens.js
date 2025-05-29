import express from 'express';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

function getVisitorId(req) {
  let id = req.cookies?.visitor_id;
  if (!id) {
    id = uuidv4();
    res.cookie('visitor_id', id, { maxAge: 86400000, httpOnly: true });
  }
  return id;
}

function getTodayKey(visitorId) {
  const today = new Date().toISOString().split('T')[0];
  return `visitor:${visitorId}:${today}`;
}

// ✅ GET usage
router.get('/', async (req, res) => {
  const visitorId = getVisitorId(req);
  const key = getTodayKey(visitorId);

  const used = (await redis.get(key)) || 0;
  const remaining = Math.max(0, DAILY_LIMIT - used);

  res.json({ tokens: remaining });
});

// ✅ Increment usage
router.post('/increment', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "unknown";
  const redisKey = `visitor_tokens_${ip}`;

  try {
    const used = parseInt(await redis.get(redisKey)) || 0;

    if (used >= DAILY_LIMIT) {
      return res.status(403).json({ error: 'Token limit reached' });
    }

    const newCount = used + 1;

    await redis.set(redisKey, newCount);
    await redis.expire(redisKey, 86400); // Set expiration in a separate call

    res.json({ success: true, used: newCount });
  } catch (err) {
    console.error("❌ Redis increment failed:", err);
    res.status(500).json({ error: 'Increment failed' });
  }
});


export default router;
