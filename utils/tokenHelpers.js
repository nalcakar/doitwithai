// utils/tokenHelpers.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

export async function deductVisitorTokens(ip, count) {
  const redisKey = `visitor_tokens_${ip}`;
  const current = parseInt(await redis.get(redisKey)) || 0;

  if (current + count > DAILY_LIMIT) {
    return false;
  }

  await redis.set(redisKey, current + count, { ex: 86400 }); // Expires in 24h
  return true;
}
