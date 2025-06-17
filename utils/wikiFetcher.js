import fetch from 'node-fetch';
import cheerio from 'cheerio';

export async function fetchWikipediaFullContent(topic, lang = 'en', sectionTitle = '') {
  try {
    const encodedTopic = encodeURIComponent(topic);
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodedTopic}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`❌ Wikipedia fetch failed: ${res.statusText}`);
      throw new Error(`Wikipedia fetch failed: ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    let extractedText = '';

    if (sectionTitle) {
      // Locate the section heading
      const heading = $(`h2:contains("${sectionTitle}")`).first();

      if (heading.length === 0) {
        console.warn(`⚠️ Section "${sectionTitle}" not found.`);
        return { summary: '' };
      }

      // Collect content until next h2
      const content = [];
      let elem = heading.next();

      while (elem.length && elem[0].tagName !== 'h2') {
        content.push($.html(elem));
        elem = elem.next();
      }

      extractedText = content.join('\n');
    } else {
      // If no sectionTitle, return full text
      extractedText = $('body').text();
    }

    // Clean up extracted HTML into plain text
    const cleanText = cheerio.load(`<div>${extractedText}</div>`)('div').text().replace(/\s+/g, ' ').trim();

    console.log("✅ Extracted section text (preview):", cleanText.slice(0, 500)); // First 500 chars preview

    return { summary: cleanText };
  } catch (err) {
    console.error("❌ Error in fetchWikipediaFullContent:", err);
    return { summary: '' };
  }
}
