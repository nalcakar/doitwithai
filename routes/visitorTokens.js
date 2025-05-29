import express from 'express';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

// ✅ FIXED: Accept both req and res
function getVisitorId(req, res) {
  let id = req.cookies?.visitor_id;
  if (!id) {
    id = uuidv4();
    res.cookie('visitor_id', id, { maxAge: 86400000, httpOnly: true, sameSite: 'Lax' });
  }
  return id;
}

function getTodayKey(visitorId) {
  const today = new Date().toISOString().split('T')[0];
  return `visitor:${visitorId}:${today}`;
}

// ✅ GET usage
router.get('/', async (req, res) => {
  const visitorId = getVisitorId(req, res); // ✅ pass res
  const key = getTodayKey(visitorId);

  const used = (await redis.get(key)) || 0;
  const remaining = Math.max(0, DAILY_LIMIT - used);

  res.json({ tokens: remaining });
});

// ✅ Increment usage
router.post('/increment', async (req, res) => {
  const visitorId = getVisitorId(req, res); // ✅ pass res
  const key = getTodayKey(visitorId);

  try {
    const used = parseInt(await redis.get(key)) || 0;

    if (used >= DAILY_LIMIT) {
      return res.status(403).json({ error: 'Token limit reached' });
    }

    const newCount = used + 1;
    await redis.set(key, newCount);
    await redis.expire(key, 86400); // expire in 1 day

    res.json({ success: true, used: newCount });
  } catch (err) {
    console.error("❌ Redis increment failed:", err);
    res.status(500).json({ error: 'Increment failed' });
  }
});

export default router;
