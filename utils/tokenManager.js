import { Redis } from '@upstash/redis';
import fetch from 'node-fetch'; // ✅ Also make sure this is imported

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

export async function deductTokensForUser({ user, ip, count }) {
  try {
    if (!user) {
      // Visitor
      const redisKey = `visitor_tokens_${ip}`;
      const current = parseInt(await redis.get(redisKey)) || 0;
      if (current + count > DAILY_LIMIT) {
        return { success: false, error: 'Daily token limit exceeded for visitor' };
      }
      await redis.set(redisKey, current + count, { ex: 86400 });
      return { success: true };
    } else {
      // Logged-in user
      const res = await fetch('https://doitwithai.org/wp-json/mcq/v1/deduct-tokens', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": user.nonce
        },
        body: JSON.stringify({ count })
      });

      if (!res.ok) {
        const data = await res.json();
        return { success: false, error: data.error || 'Token error' };
      }

      return { success: true };
    }
  } catch (err) {
    console.error("❌ Token deduction error:", err);
    return { success: false, error: 'Token deduction failed' };
  }
}
