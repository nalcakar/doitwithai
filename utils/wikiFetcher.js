import fetch from 'node-fetch';

function capitalizeEachWord(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function fetchWikipediaSummary(topic, lang = 'en') {
  try {
    const formattedTopic = capitalizeEachWord(topic.trim());

    const titleRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(formattedTopic)}&format=json&origin=*`);
    const titleData = await titleRes.json();
    const pages = titleData.query.pages;
    const firstPage = Object.values(pages)[0];
    if (firstPage.missing) {
      console.warn("❌ Wikipedia page not found.");
      return { summary: "" };
    }

    const normalizedTitle = firstPage.title;

    const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(normalizedTitle)}`);
    const htmlText = await htmlRes.text();

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
