import express from 'express';
import fetch from 'node-fetch';
import Redis from 'ioredis';

const router = express.Router();
const redis = new Redis(process.env.REDIS_URL);

// ✅ Use client-supplied visitor IP when available
function getClientIP(req) {
  return (
    req.headers['x-visitor-ip'] || // ✅ from frontend (public IP)
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// ✅ Daily token limit per visitor
const DAILY_LIMIT = 20;

router.get('/', async (req, res) => {
  const ip = getClientIP(req);
  const key = `visitor_tokens_${ip}`;

  try {
    const used = parseInt((await redis.get(key)) || 0);
    const remaining = Math.max(0, DAILY_LIMIT - used);
    console.log(`📊 [GET] IP: ${ip}, Used: ${used}, Remaining: ${remaining}`);
    res.json({ tokens: remaining });
  } catch (err) {
    console.error("❌ Redis error in /api/visitor-tokens GET:", err);
    res.status(500).json({ error: 'Token fetch failed' });
  }
});

router.post('/deduct', async (req, res) => {
  const ip = getClientIP(req);
  const key = `visitor_tokens_${ip}`;
  const count = parseInt(req.body.count || 0);

  if (isNaN(count) || count <= 0) {
    return res.status(400).json({ error: 'Invalid token count' });
  }

  try {
    const used = parseInt((await redis.get(key)) || 0);
    const newUsed = used + count;

    if (newUsed > DAILY_LIMIT) {
      return res.status(403).json({ error: 'Not enough tokens' });
    }

    await redis.set(key, newUsed, 'EX', 86400); // 1 day expiry
    const remaining = Math.max(0, DAILY_LIMIT - newUsed);
    console.log(`🔻 [POST] IP: ${ip}, Deducted: ${count}, New Used: ${newUsed}, Remaining: ${remaining}`);
    res.json({ success: true, remaining });
  } catch (err) {
    console.error("❌ Redis error in /api/visitor-tokens/deduct:", err);
    res.status(500).json({ error: 'Token deduction failed' });
  }
});

export default router;
