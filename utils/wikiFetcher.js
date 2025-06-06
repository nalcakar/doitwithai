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

    // 1. Normal sayfa kontrolü
    const titleRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(formattedTopic)}&format=json&origin=*`);
    const titleData = await titleRes.json();
    const pages = titleData.query.pages;
    const firstPage = Object.values(pages)[0];

    if (!firstPage.missing) {
      const normalizedTitle = firstPage.title;
      const summary = await tryFetch(normalizedTitle);
      return { summary };
    }

    // 2. Alternatif arama
    const searchRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`);
    const searchData = await searchRes.json();
    const results = searchData?.query?.search || [];

    for (const result of results.slice(0, 3)) { // 🔁 ilk 3 sonucu sırayla dene
      const fallback = await tryFetch(result.title);
      if (fallback.length > 100) {
        return { summary: fallback };
      }
    }

    return { summary: "" };
  } catch (error) {
    console.error("❌ Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}
