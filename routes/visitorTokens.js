import express from 'express';
import { createClient } from '@upstash/redis';

const router = express.Router();

const redis = createClient({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Route: GET /api/visitor-tokens → returns current visitor token count
router.get('/', async (req, res) => {
  const ip = req.ip;
  const key = `visitor_tokens_${ip}`;
  const val = await redis.get(key);
  const tokens = parseInt(val || "0", 10);
  res.json({ tokens });
});

// Route: POST /api/visitor-tokens/deduct → deducts N tokens if enough
router.post('/deduct', async (req, res) => {
  const ip = req.ip;
  const key = `visitor_tokens_${ip}`;
  const count = parseInt(req.body.count || "0", 10);

  const val = await redis.get(key);
  const current = parseInt(val || "0", 10);
  if (current < count) {
    return res.status(400).json({ error: "Not enough tokens" });
  }

  await redis.decrby(key, count);
  res.json({ success: true });
});

// ✅ Named exports for internal use in transcribe.js
export async function getVisitorTokens(ip) {
  const key = `visitor_tokens_${ip}`;
  const val = await redis.get(key);
  return parseInt(val || "0", 10);
}

export async function deductVisitorTokens(ip, count) {
  const key = `visitor_tokens_${ip}`;
  const val = await redis.get(key);
  const current = parseInt(val || "0", 10);
  if (current < count) return false;
  await redis.decrby(key, count);
  return true;
}

export default router;
