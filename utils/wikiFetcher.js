import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = 'en') {
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
      console.warn("❌ tryFetch error for title:", title, "-", err.message);
      return "";
    }
  };

  try {
    console.log("📥 Gelen istek:", topic, lang);

    // ✅ Wikipedia'da arama yap
    const searchRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`);
    const searchJson = await searchRes.json();
    const topResult = searchJson?.query?.search?.[0];

    if (topResult?.title) {
      console.log("🔎 Arama sonucu ilk başlık:", topResult.title);
      const summary = await tryFetch(topResult.title);
      console.log("📄 Özet uzunluğu:", summary.length);
      if (summary.length > 50) {
        return { summary };
      }
    }

    return { summary: "" };
  } catch (error) {
    console.error("❌ Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}
