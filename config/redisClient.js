// src/config/redisClient.js
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL, // ✅ use environment variable
});

redis.on('error', (err) => {
  console.error('❌ Redis client error:', err);
});

redis.connect();

export default redis;
