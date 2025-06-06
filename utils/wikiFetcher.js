// wikiFetcher.js
import fetch from 'node-fetch';
import { fetchWikipediaTitleViaGoogle } from './googleHelper.js';

export async function fetchWikipediaSummary(topic, lang = 'tr') {
  const tryFetch = async (title) => {
    try {
      const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(title)}`);
      const htmlText = await htmlRes.text();
      const paragraphs = htmlText.match(/<p>(.*?)<\/p>/g);
      if (!paragraphs || paragraphs.length === 0) return "";
      return paragraphs.slice(0, 5).map(p =>
        p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim()
      ).join(" ");
    } catch (err) {
      console.warn("❌ tryFetch error:", title, "-", err.message);
      return "";
    }
  };

  try {
    console.log("📥 Gelen istek:", topic, lang);

    // 🔍 1. Wikipedia iç araması
    const searchRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`);
    const searchJson = await searchRes.json();
    const topResult = searchJson?.query?.search?.[0];

    if (topResult?.title) {
      console.log("🔎 Wikipedia arama sonucu:", topResult.title);
      const summary = await tryFetch(topResult.title);
      if (summary.length > 50) return { summary };
    }

    // 🔁 2. Google üzerinden Wikipedia başlığı dene
    const googleTitle = await fetchWikipediaTitleViaGoogle(topic, lang);
    if (googleTitle) {
      const fallback = await tryFetch(googleTitle);
      if (fallback.length > 50) return { summary: fallback };
    }

    return { summary: "" };
  } catch (error) {
    console.error("❌ fetchWikipediaSummary genel hata:", error.message);
    return { summary: "" };
  }
}
