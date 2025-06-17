import fetch from 'node-fetch';

function capitalizeFirstLetter(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function fetchWikipediaSummary(topic, lang = 'en', section = null) {
  try {
    const formattedTopic = capitalizeFirstLetter(topic.trim());

    const titleRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(formattedTopic)}&prop=sections&format=json&origin=*`);
    const titleData = await titleRes.json();
    const page = titleData.parse;
    if (!page) {
      console.warn("❌ Wikipedia page not found.");
      return { summary: "" };
    }

    if (section) {
      const matchedSection = page.sections.find(s => 
        s.anchor.replace(/_/g, " ").toLowerCase() === section.toLowerCase()
      );
      if (matchedSection) {
        const secRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(formattedTopic)}&section=${matchedSection.index}&format=json&origin=*`);
        const secData = await secRes.json();
        if (secData.parse && secData.parse.text) {
          const html = secData.parse.text["*"];
          const paragraphs = html.match(/<p>(.*?)<\/p>/g);
          if (!paragraphs || paragraphs.length === 0) return { summary: "" };
          const cleaned = paragraphs.map(p =>
            p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim()
          ).join(" ");
          return { summary: cleaned };
        }
      } else {
        console.warn("❌ Section not found.");
        return { summary: "" };
      }
    } else {
      // fallback to your existing logic: mobile-html and get first paragraphs
      const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(formattedTopic)}`);
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

