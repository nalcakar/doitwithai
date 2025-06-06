// googleHelper.js
import fetch from 'node-fetch';

export async function fetchWikipediaTitleViaGoogle(query, lang = 'tr') {
  const q = `site:${lang}.wikipedia.org ${query}`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0" // Google bot engellemesin
      }
    });

    const html = await res.text();
    const match = html.match(/https:\/\/(?:\w+\.)?wikipedia\.org\/wiki\/([^"&]+)/i);

    if (match) {
      const title = decodeURIComponent(match[1].replace(/_/g, " "));
      console.log("🔍 Google üzerinden Wikipedia başlığı bulundu:", title);
      return title;
    } else {
      console.warn("⚠️ Google ile başlık bulunamadı");
      return null;
    }
  } catch (err) {
    console.error("❌ Google araması başarısız:", err.message);
    return null;
  }
}
