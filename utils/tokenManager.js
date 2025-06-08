import redis from '../config/redisClient.js';
import fetch from 'node-fetch';


export async function deductTokensForUser({ user, ip, count }) {
  if (user?.isMember) {
    try {
      const verifyRes = await fetch('https://doitwithai.org/wp-json/mcq/v1/deduct-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': user.nonce || '', // Optionally send nonce if needed
        },
        body: JSON.stringify({ count })
      });

      if (!verifyRes.ok) {
        const errorJson = await verifyRes.json();
        console.warn("❌ Member token deduction failed:", errorJson);
        return { success: false, error: 'Member token deduction failed' };
      }

      const json = await verifyRes.json();
      console.log("✅ Member token deducted:", json.remaining);
      return { success: true };
    } catch (err) {
      console.error("❌ Error contacting WP:", err.message);
      return { success: false, error: 'Server error verifying membership' };
    }
  }

  // 👤 Visitor fallback
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `visitor_tokens:${ip}:${today}`;
    const used = parseInt(await redis.get(key)) || 0;

    if (used + count > 20) {
      return { success: false, error: 'Daily visitor token limit exceeded (20)' };
    }

    await redis.set(key, used + count, 'EX', 86400);
    console.log(`🔻 Visitor token used: ${used + count}/20`);
    return { success: true };
  } catch (err) {
    console.error("❌ Redis error:", err.message);
    return { success: false, error: 'Token tracking failed' };
  }
}
