import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = 'en') {
  try {
    const trimmedTopic = topic.trim();

    // 🔍 1. Wikipedia'da başlık ara (spelling tolerant)
    const searchRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(trimmedTopic)}&format=json&origin=*`);
    const searchData = await searchRes.json();

    const firstResult = searchData.query?.search?.[0];
    if (!firstResult) {
      console.warn("❌ Wikipedia page not found via search.");
      return { summary: "", matchedTitle: "" };
    }

    const matchedTitle = firstResult.title;
    console.log("🔍 Wikipedia title found:", matchedTitle);

    // 📄 2. /summary endpoint'i ile içerik al (redirect'leri işler)
    const summaryRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(matchedTitle)}`);
    const summaryData = await summaryRes.json();

    if (!summaryData.extract) {
      console.warn("❌ No extract found in summary response.");
      return { summary: "", matchedTitle };
    }

    return {
      summary: summaryData.extract,
      matchedTitle: summaryData.title || matchedTitle
    };

  } catch (error) {
    console.error("❌ Wikipedia fetch error:", error.message);
    return { summary: "", matchedTitle: "" };
  }
}
