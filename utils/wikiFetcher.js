// utils/wikiFetcher.js
import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = 'en') {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=true&titles=${encodeURIComponent(topic)}&origin=*`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const pages = data.query?.pages;
    const page = pages && Object.values(pages)[0];

    return {
      summary: page?.extract || ""
    };
  } catch (error) {
    console.error("Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}
