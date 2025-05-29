import express from 'express';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const redis = new Redis(process.env.UPSTASH_REDIS_REST_URL, {
  password: process.env.UPSTASH_REDIS_REST_TOKEN
});

function getTodayKey(visitorId) {
  const today = new Date().toISOString().slice(0, 10);
  return `tokens:${visitorId}:${today}`;
}

// ✅ Get visitor token count
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

  const key = getTodayKey(visitorId);
  let used = await redis.get(key);
  used = used ? parseInt(used) : 0;

  res.json({ tokens: 20 - used });
});

// ✅ Increment visitor usage
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

  const key = getTodayKey(visitorId);
  let current = await redis.get(key);
  current = current ? parseInt(current) : 0;

  if (current >= 20) {
    return res.status(403).json({ error: 'Visitor token limit exceeded' });
  }

  await redis.incr(key);
  await redis.expire(key, 86400); // 1 day
  res.json({ success: true });
});

export default router;
