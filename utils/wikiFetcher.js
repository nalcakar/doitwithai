import fetch from 'node-fetch';

// İlk harfi büyüt (örneğin: 'kalp' -> 'Kalp')
function capitalizeFirstLetter(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function fetchWikipediaSummary(topic, lang = 'en') {
  try {
    const formattedTopic = capitalizeFirstLetter(topic.trim());

    // ✅ Adım 1: Başlığı normalize et
    const titleRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(formattedTopic)}&format=json&origin=*`);
    const titleData = await titleRes.json();
    const pages = titleData.query.pages;
    const firstPage = Object.values(pages)[0];
    if (firstPage.missing) {
      console.warn("❌ Wikipedia sayfası bulunamadı.");
      return { summary: "" };
    }
    const normalizedTitle = firstPage.title;

    // ✅ Adım 2: Sayfanın HTML özetini çek
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
