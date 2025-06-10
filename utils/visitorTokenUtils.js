// routes/visitorTokenUtils.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

export async function checkVisitorTokens(ip, count) {
  const key = `visitor_tokens_${ip}`;
  const used = parseInt(await redis.get(key)) || 0;
  return used + count <= DAILY_LIMIT;
}

export async function incrementVisitorUsage(ip, count) {
  const key = `visitor_tokens_${ip}`;
  await redis.incrby(key, count);
  await redis.expire(key, 86400); // expire in 24 hours
}
