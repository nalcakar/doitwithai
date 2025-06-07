// wikiFetcher.js
import fetch from 'node-fetch';
import { fetchWikipediaTitleViaGoogle } from './googleHelper.js';

export async function fetchWikipediaSummary(topic, lang = 'tr') {
  const tryFetch = async (title) => {
    try {
      console.log(`🌐 ${lang}.wikipedia.org için özet çekiliyor: "${title}"`);
      const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(title)}`);
      const htmlText = await htmlRes.text();
      const paragraphs = htmlText.match(/<p>(.*?)<\/p>/g);
      if (!paragraphs || paragraphs.length === 0) {
        console.warn("⚠️ Paragraf bulunamadı:", title);
        return "";
      }
      const cleanSummary = paragraphs.slice(0, 5).map(p =>
        p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim()
      ).join(" ");
      console.log(`✅ "${title}" başlığından çekilen özet uzunluğu: ${cleanSummary.length} karakter`);
      return cleanSummary;
    } catch (err) {
      console.warn("❌ tryFetch error:", title, "-", err.message);
      return "";
    }
  };

  try {
    console.log("📥 Gelen istek:", topic, lang);

    // 🔍 1. Wikipedia iç araması
    const searchURL = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`;
    console.log("🔍 Wikipedia iç arama URL:", searchURL);
    const searchRes = await fetch(searchURL);
    const searchJson = await searchRes.json();
    const topResult = searchJson?.query?.search?.[0];

    if (topResult?.title) {
      console.log("🔎 Wikipedia iç aramada bulunan başlık:", topResult.title);
      const summary = await tryFetch(topResult.title);
      if (summary.length > 50) {
        console.log("✅ Wikipedia iç arama özeti kullanılacak");
        return { summary, title: topResult.title };
      } else {
        console.warn("⚠️ İç arama özeti çok kısa, Google denenecek");
      }
    } else {
      console.warn("⚠️ Wikipedia iç aramada başlık bulunamadı");
    }

    // 🔁 2. Google üzerinden Wikipedia başlığı dene
    const googleTitle = await fetchWikipediaTitleViaGoogle(topic, lang);
    if (googleTitle) {
      console.log("🔁 Google'dan elde edilen başlık:", googleTitle);
      const fallback = await tryFetch(googleTitle);
      if (fallback.length > 20) {
        console.log("✅ Google arama özeti kullanılacak");
        return { summary: fallback, title: googleTitle };
      } else {
        console.warn("⚠️ Google özeti çok kısa:", fallback.length);
      }
    } else {
      console.warn("⚠️ Google'dan başlık bulunamadı");
    }

    return { summary: "" };
  } catch (error) {
    console.error("❌ fetchWikipediaSummary genel hata:", error.message);
    return { summary: "" };
  }
}
