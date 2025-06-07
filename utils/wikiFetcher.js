import fetch from "node-fetch";

// 🔤 İlk harfleri büyük yap
function capitalizeFirstLetter(str) {
  return str
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// 🔎 Belirli başlıktaki paragrafı al
function extractSection(htmlText, heading) {
  const headingRegex = new RegExp(`<h[2-4][^>]*>\\s*${heading}\\s*</h[2-4]>`, "i");
  const match = headingRegex.exec(htmlText);
  if (!match) return "";

  const startIndex = match.index;
  const subHtml = htmlText.slice(startIndex);

  const nextHeadingRegex = /<h[2-4][^>]*>/gi;
  const nextHeading = nextHeadingRegex.exec(subHtml.slice(match[0].length));
  const endIndex = nextHeading ? nextHeading.index + match[0].length : subHtml.length;

  const sectionHtml = subHtml.slice(0, endIndex);
  const paragraphs = sectionHtml.match(/<p>(.*?)<\/p>/g);
  if (!paragraphs) return "";

  return paragraphs
    .map(p => p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim())
    .join(" ");
}

// 📥 Ana fonksiyon
export async function fetchWikipediaSummary(rawTopic, lang = "en") {
  try {
    let topic = rawTopic.trim();
    let anchor = null;

    // 🧩 # varsa başlığı ve anchor'ı ayır
    if (topic.includes("#")) {
      const parts = topic.split("#");
      topic = parts[0].trim();
      anchor = decodeURIComponent(parts[1].trim().replace(/_/g, " "));
    }

    const formattedTopic = capitalizeFirstLetter(topic);

    // 🛰 Başlık kontrolü
    const titleRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(formattedTopic)}&format=json&origin=*`);
    const titleData = await titleRes.json();
    const pages = titleData.query.pages;
    const firstPage = Object.values(pages)[0];
    if (firstPage.missing) return { summary: "" };

    const normalizedTitle = firstPage.title;

    // 📄 HTML getir
    const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(normalizedTitle)}`);
    const htmlText = await htmlRes.text();

    let summary = "";
    if (anchor) {
      summary = extractSection(htmlText, anchor);
    } else {
      const paragraphs = htmlText.match(/<p>(.*?)<\/p>/g);
      if (!paragraphs || paragraphs.length === 0) return { summary: "" };
      summary = paragraphs
        .slice(0, 5)
        .map(p => p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim())
        .join(" ");
    }

    return { summary, matchedTitle: normalizedTitle };
  } catch (error) {
    console.error("❌ Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}
