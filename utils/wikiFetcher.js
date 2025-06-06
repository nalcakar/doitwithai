// wikiFetcher.js
import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = 'en') {
  const title = encodeURIComponent(topic.trim());

  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=true&redirects=1&titles=${title}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];

    const paragraphs = page?.extract?.split('\n\n') || [];
    let summary = '';

    for (let p of paragraphs) {
      if ((summary + p).length > 1200) break;
      summary += p + '\n\n';
    }

    return {
      summary: summary.trim()
    };
  } catch (err) {
    console.error("❌ Wikipedia fetch error:", err);
    return { summary: "" };
  }
}
