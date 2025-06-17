import fetch from 'node-fetch';

function capitalizeFirstLetter(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function fetchWikipediaSummary(topic, lang = 'en', section = null) {
  try {
    const formattedTopic = capitalizeFirstLetter(topic.trim());

    // 1️⃣ Get sections
    const sectionRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(formattedTopic)}&prop=sections&format=json&origin=*`);
    const sectionData = await sectionRes.json();
    if (!sectionData.parse) {
      console.warn("❌ Page not found");
      return { summary: "" };
    }

    let sectionIndex = null;

    if (section) {
      // 2️⃣ Try matching section anchor (case-insensitive, tolerate _ vs space)
      const lowerSection = section.toLowerCase().replace(/_/g, ' ').trim();
      const found = sectionData.parse.sections.find(s =>
        s.anchor.toLowerCase().replace(/_/g, ' ').trim() === lowerSection
      );

      if (found) {
        sectionIndex = found.index;
      } else {
        console.warn("❌ Section not found:", section);
        return { summary: "" };
      }
    }

    let parseUrl = `https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(formattedTopic)}&format=json&origin=*`;
    if (sectionIndex) {
      parseUrl += `&section=${sectionIndex}`;
    }

    // 3️⃣ Fetch content (whole page or section)
    const contentRes = await fetch(parseUrl);
    const contentData = await contentRes.json();
    if (!contentData.parse || !contentData.parse.text) {
      console.warn("❌ Could not parse section or page content");
      return { summary: "" };
    }

    const html = contentData.parse.text["*"];
    // 4️⃣ Extract paragraphs
    const paragraphs = html.match(/<p>(.*?)<\/p>/g);
    if (!paragraphs || paragraphs.length === 0) return { summary: "" };

    const cleaned = paragraphs.map(p =>
      p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim()
    ).join(" ");

    return { summary: cleaned };
  } catch (error) {
    console.error("❌ Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}


