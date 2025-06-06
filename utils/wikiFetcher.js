import fetch from 'node-fetch';

function capitalizeEachWord(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ✅ Basit Levenshtein benzeri benzerlik skoru
function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return 1;
  let longer = a.length > b.length ? a : b;
  let shorter = a.length > b.length ? b : a;
  let common = [...shorter].filter(ch => longer.includes(ch)).length;
  return common / longer.length;
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

    // ✅ 1. Sayfa doğrudan var mı kontrol et
    const pageCheck = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(formattedTopic)}&format=json&origin=*`);
    const pageJson = await pageCheck.json();
    const firstPage = Object.values(pageJson.query.pages)[0];

    if (!firstPage.missing) {
      const summary = await tryFetch(firstPage.title);
      if (summary.length > 100) {
        return { summary };
      }
    }

    // 🔍 2. Arama yap
    const searchRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`);
    const searchJson = await searchRes.json();
    const results = searchJson?.query?.search || [];

    // ✅ En benzer sonucu bul
    let bestMatch = null;
    let bestScore = 0;

    for (const result of results) {
      const score = similarity(result.title, topic);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = result.title;
      }
    }

    // ✅ En benzer başlığa göre dene
    if (bestMatch) {
      const fallback = await tryFetch(bestMatch);
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
