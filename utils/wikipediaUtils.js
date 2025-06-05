// utils/wikipediaUtils.js
import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = "en") {
  const langCode = lang.toLowerCase().substring(0, 2);
  const url = `https://${langCode}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Wikipedia'dan içerik alınamadı");
  const data = await res.json();

  if (!data.extract) throw new Error("Wikipedia özeti bulunamadı.");
  return data.extract;
}
