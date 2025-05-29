import express from 'express';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const redis = new Redis(process.env.UPSTASH_REDIS_REST_URL, {
  password: process.env.UPSTASH_REDIS_REST_TOKEN
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
  let tokens = await redis.get(todayKey);
  tokens = tokens ? parseInt(tokens) : 0;

  res.json({ tokens: 20 - tokens });
});

// ✅ Increment token use
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
  await redis.expire(todayKey, 86400); // 24h expiry

  res.json({ success: true });
});

export default router;
