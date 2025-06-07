import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = 'en') {
  try {
    const trimmedTopic = topic.trim();

    // 🔍 1. Wikipedia iç arama API'si ile başlık bul
    const searchRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(trimmedTopic)}&format=json&origin=*`);
    const searchData = await searchRes.json();

    const firstResult = searchData.query?.search?.[0];
    if (!firstResult) {
      console.warn("❌ Wikipedia page not found via search.");
      return { summary: "" };
    }

    const matchedTitle = firstResult.title;
    console.log("🔍 Wikipedia title found:", matchedTitle);

    // 📄 2. mobile-html endpoint ile içerik çek
    const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(matchedTitle)}`);
    const htmlText = await htmlRes.text();

    // 🔎 Paragrafları temizle
    const paragraphs = htmlText.match(/<p>(.*?)<\/p>/g);
    if (!paragraphs || paragraphs.length === 0) return { summary: "" };

    const cleaned = paragraphs.slice(0, 5).map(p =>
      p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim()
    ).join(" ");

    return { summary: cleaned };
  } catch (error) {
    console.error("❌ Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}
