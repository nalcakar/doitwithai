import express from 'express';
import { Redis } from '@upstash/redis';

const router = express.Router();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

router.get('/', async (req, res) => {
  try {
    await redis.set("test_key", "hello world", { ex: 60 });
    const value = await redis.get("test_key");

    res.json({ message: "✅ Redis test successful", value });
  } catch (err) {
    console.error("❌ Redis connection failed", err);
    res.status(500).json({ error: 'Redis test failed', detail: err.message });
  }
});

export default router;
