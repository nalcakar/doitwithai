import fetch from 'node-fetch';

function capitalizeFirstLetter(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizeAnchor(str) {
  return str.toLowerCase().replace(/[\s_]+/g, '');
}

export async function fetchWikipediaSummary(topic, lang = 'en', sectionName = null) {
  try {
    const formattedTopic = capitalizeFirstLetter(topic.trim());

    if (sectionName) {
      // Step 1: Fetch section list
      const titleRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(formattedTopic)}&format=json&origin=*`);
      const titleData = await titleRes.json();

      if (!titleData.parse || !titleData.parse.sections) {
        console.warn("❌ Sections not found.");
        return { summary: "" };
      }

      console.log(`🔎 Available sections for '${topic}':`);
      titleData.parse.sections.forEach(sec => console.log(`- ${sec.anchor}`));

      const normalizedTarget = normalizeAnchor(sectionName);
      const targetSection = titleData.parse.sections.find(sec =>
        normalizeAnchor(sec.anchor) === normalizedTarget
      );

      if (!targetSection) {
        console.warn(`❌ Section '${sectionName}' not found.`);
        return { summary: "" };
      }

      // Step 2: Fetch the section content
      const sectionRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(formattedTopic)}&section=${targetSection.index}&format=json&origin=*`);
      const sectionData = await sectionRes.json();

      if (sectionData.parse && sectionData.parse.text) {
        const html = sectionData.parse.text["*"];
        const cleaned = html.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim();
        return { summary: cleaned };
      } else {
        console.warn("❌ Section content not found.");
        return { summary: "" };
      }

    } else {
      // Default: Fetch intro summary
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
    }

  } catch (error) {
    console.error("❌ Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}
