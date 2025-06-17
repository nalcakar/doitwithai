import fetch from 'node-fetch';

function capitalizeFirstLetter(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function fetchWikipediaFullContent(topic, lang = 'en') {
  try {
    const formattedTopic = capitalizeFirstLetter(topic.trim());

    const titleRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(formattedTopic)}&format=json&origin=*`);
    const titleData = await titleRes.json();
    const pages = titleData.query.pages;
    const firstPage = Object.values(pages)[0];
    if (firstPage.missing) {
      console.warn("❌ Wikipedia page not found.");
      return { content: "" };
    }

    const normalizedTitle = firstPage.title;

    const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(normalizedTitle)}`);
    const htmlText = await htmlRes.text();

    // Remove HTML tags for plain text (or you could return raw HTML if you prefer)
    const cleaned = htmlText.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim();

    // 👇 Log full content
    console.log("✅ Full Wikipedia content loaded:");
    console.log(cleaned);

    return { content: cleaned };
  } catch (error) {
    console.error("❌ Wikipedia fetch error:", error.message);
    return { content: "" };
  }
}
