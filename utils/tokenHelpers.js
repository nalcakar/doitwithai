// utils/tokenHelpers.js
import { Redis } from '@upstash/redis';
import fetch from 'node-fetch';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

export async function deductVisitorTokens(ip, count) {
  const redisKey = `visitor_tokens_${ip}`;
  const current = parseInt(await redis.get(redisKey)) || 0;

  console.log(`🔐 Visitor ${ip}: using ${current}/${DAILY_LIMIT}, attempting to deduct ${count}`);

  if (current + count > DAILY_LIMIT) {
    console.warn(`❌ Visitor token limit exceeded for ${ip}`);
    return false;
  }

  await redis.set(redisKey, current + count, { ex: 86400 });
  console.log(`✅ New token total for ${ip}: ${current + count}`);
  return true;
}

export async function deductMemberTokens(userId, count) {
  try {
    const response = await fetch('https://yourdomain.com/wp-json/mcq/v1/deduct-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': process.env.WP_NONCE || ''
      },
      body: JSON.stringify({ user_id: userId, count })
    });

    if (!response.ok) {
      const msg = await response.text();
      console.error("❌ Member token deduction failed:", msg);
      return false;
    }

    const data = await response.json();
    return data.success;
  } catch (err) {
    console.error("❌ Error in deductMemberTokens:", err);
    return false;
  }
}
