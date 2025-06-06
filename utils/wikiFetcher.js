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

    // ✅ 1. Sayfa doğrudan var mı?
    const pageCheck = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(formattedTopic)}&format=json&origin=*`);
    const pageJson = await pageCheck.json();
    const firstPage = Object.values(pageJson.query.pages)[0];

    if (!firstPage.missing) {
      const summary = await tryFetch(firstPage.title);
      if (summary.length > 100) {
        return { summary };
      }
    }

    // ✅ 2. Arama sonuçlarından en üsttekini dene
    const searchRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`);
    const searchJson = await searchRes.json();
    const topResult = searchJson?.query?.search?.[0];

    if (topResult?.title) {
      const fallback = await tryFetch(topResult.title);
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
