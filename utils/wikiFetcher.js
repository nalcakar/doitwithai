import fetch from 'node-fetch';

function capitalizeEachWord(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function fetchWikipediaSummary(topic, lang = 'en') {
  const tryFetch = async (title) => {
    const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(title)}`);
    const htmlText = await htmlRes.text();
    const paragraphs = htmlText.match(/<p>(.*?)<\/p>/g);
    if (!paragraphs || paragraphs.length === 0) return "";
    return paragraphs.slice(0, 5).map(p =>
      p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim()
    ).join(" ");
  };

  try {
    const formattedTopic = capitalizeEachWord(topic.trim());

    // 🔍 1. Search ile sonuç al
    const searchRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(formattedTopic)}&format=json&origin=*`);
    const searchJson = await searchRes.json();
    const results = searchJson?.query?.search || [];

    if (results.length > 0) {
      const bestMatchTitle = results[0].title; // ✅ En üstteki sonucu kullan
      const summary = await tryFetch(bestMatchTitle);
      if (summary.length > 100) {
        return { summary };
      }
    }

    return { summary: "" };
  } catch (error) {
    console.error("❌ Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}
