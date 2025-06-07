import fetch from "node-fetch";

// 🔤 İlk harfleri büyük yap
function capitalizeFirstLetter(str) {
  return str
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// 🔎 Belirli başlıktaki paragrafı al
function extractSection(html, anchor) {
  if (!anchor) return "";

  const normalize = str => str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // aksanlar
    .replace(/[çğıöşü]/g, c => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' }[c]))
    .replace(/[^a-z0-9]/gi, '');

  const normalizedAnchor = normalize(anchor);

  const headingRegex = /<(h2|h3)[^>]*>\s*<span[^>]*>(.*?)<\/span>\s*<\/\1>/gi;

  let match;
  let startIndex = -1;
  let endIndex = -1;

  while ((match = headingRegex.exec(html)) !== null) {
    const headingText = match[2];
    const normalizedHeading = normalize(headingText);

    if (startIndex === -1 && normalizedHeading.includes(normalizedAnchor)) {
      startIndex = match.index;
    } else if (startIndex !== -1) {
      endIndex = match.index;
      break;
    }
  }

  if (startIndex === -1) return "";

  if (endIndex === -1) endIndex = html.length;
  const sectionHtml = html.slice(startIndex, endIndex);

  const paragraphs = sectionHtml.match(/<p>(.*?)<\/p>/g);
  if (!paragraphs || paragraphs.length === 0) return "";

  return paragraphs
    .slice(0, 5)
    .map(p => p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim())
    .join("\n\n");
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
    const htmlRes = await fetch(`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(normalizedTitle)}`);

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
