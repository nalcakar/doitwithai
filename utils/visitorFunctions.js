const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export async function checkVisitorLimit(ip, tokensRequested = 1) {
  const today = new Date().toISOString().split("T")[0];
  const key = `visitor:${ip}:${today}`;

  const currentRes = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const currentJson = await currentRes.json();
  const used = parseInt(currentJson.result || "0");

  if (used + tokensRequested > 20) {
    return { allowed: false, used };
  }

  await fetch(`${REDIS_URL}/set/${key}/${used + tokensRequested}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ EX: 86400 }) // 1 day
  });

  return { allowed: true, used: used + tokensRequested };
}
