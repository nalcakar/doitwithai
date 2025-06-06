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
    try {
      const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(title)}`);
      const htmlText = await htmlRes.text();
      const paragraphs = htmlText.match(/<p>(.*?)<\/p>/g);
      if (!paragraphs || paragraphs.length === 0) return "";
      return paragraphs.slice(0, 5).map(p =>
        p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim()
      ).join(" ");
    } catch {
      return "";
    }
  };

  try {
    const formattedTopic = capitalizeEachWord(topic.trim());
    let bestSummary = "";

    // 1. Doğrudan sayfa kontrolü
    const pageCheck = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(formattedTopic)}&format=json&origin=*`);
    const pageJson = await pageCheck.json();
    const firstPage = Object.values(pageJson.query.pages)[0];

    if (!firstPage.missing) {
      const directSummary = await tryFetch(firstPage.title);
      if (directSummary.length > bestSummary.length) {
        bestSummary = directSummary;
      }
    }

    // 2. Arama sonuçlarından ilk başlığı da dene
    const searchRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`);
    const searchJson = await searchRes.json();
    const topResult = searchJson?.query?.search?.[0];

    if (topResult?.title) {
      const searchSummary = await tryFetch(topResult.title);
      if (searchSummary.length > bestSummary.length) {
        bestSummary = searchSummary;
      }
    }

    return { summary: bestSummary };
  } catch (error) {
    console.error("❌ Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}
