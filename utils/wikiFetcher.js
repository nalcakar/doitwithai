// utils/wikiFetcher.js
import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = 'en') {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return {
      summary: data.extract || ""
    };
  } catch (error) {
    console.error("Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}
