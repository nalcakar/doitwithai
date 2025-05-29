import fetch from 'node-fetch';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const DAILY_LIMIT = 20;

export async function checkVisitorToken(visitorId) {
  const key = `visitor_tokens_${visitorId}`;
  const res = await fetch(`${redisUrl}/get/${key}`, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });
  const data = await res.json();
  return parseInt(data.result) || 0;
}

export async function incrementVisitorToken(visitorId, amount = 1) {
  const key = `visitor_tokens_${visitorId}`;
  const expireKey = `visitor_expire_${visitorId}`;

  const usage = await checkVisitorToken(visitorId);

  if (usage >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  await fetch(`${redisUrl}/incrby/${key}/${amount}`, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });

  await fetch(`${redisUrl}/expire/${key}/86400`, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });

  return { allowed: true, remaining: DAILY_LIMIT - (usage + amount) };
}
