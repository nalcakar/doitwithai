// utils/tokenHelpers.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const DAILY_LIMIT = 20;

export async function deductMemberTokens(userId, count) {
  try {
    const res = await fetch(`https://yourdomain.com/wp-json/mcq/v1/deduct-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // You may need to pass a valid nonce/token if required
        "X-WP-Nonce": process.env.WP_NONCE // or pass from frontend
      },
      body: JSON.stringify({ user_id: userId, count })
    });

    if (!res.ok) {
      console.error("❌ Member token deduction failed", await res.text());
      return false;
    }

    const data = await res.json();
    return data.success;
  } catch (err) {
    console.error("❌ Member token deduction error:", err);
    return false;
  }
}


