import fetch from 'node-fetch';
import { load } from 'cheerio';  // ✔ correct ESM import

export async function fetchWikipediaSection(topic, lang = 'en', sectionTitle = '') {
  try {
    const encodedTitle = encodeURIComponent(topic);
    const url = `https://${lang}.wikipedia.org/wiki/${encodedTitle}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch Wikipedia page: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = load(html);

    if (!sectionTitle) {
      // If no section requested, return all text
      return $('body').text();
    }

    // Find the section header
    let content = '';
    const headings = $('h2, h3, h4');
    let found = false;

    headings.each((_, el) => {
      if (found) {
        // Stop if next major section starts (same or higher heading level)
        if (/^H[23]$/.test(el.tagName)) return false;
        content += $(el).text() + '\n';
        content += $(el).nextUntil('h2, h3').text() + '\n';
      } else {
        const headingText = $(el).text().replace(/\[edit\]/g, '').trim();
        if (headingText.toLowerCase() === sectionTitle.toLowerCase()) {
          found = true;
          content += headingText + '\n';
          content += $(el).nextUntil('h2, h3').text() + '\n';
        }
      }
    });

    if (!content) {
      throw new Error(`Section "${sectionTitle}" not found.`);
    }

    return content.trim();
  } catch (err) {
    console.error(`❌ fetchWikipediaSection error:`, err);
    throw err;
  }
}
