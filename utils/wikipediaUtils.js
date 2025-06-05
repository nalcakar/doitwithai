// utils/wikipediaUtils.js
import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic) {
  const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("Wikipedia'dan içerik alınamadı");

    const data = await response.json();

    if (!data.extract) throw new Error("Wikipedia özeti boş");

    // ✅ Console'a tam özeti yazdır
    console.log("📚 Wikipedia'dan alınan özet:");
    console.log(data.extract);

    return data.extract;
  } catch (err) {
    console.warn("⚠️ Wikipedia özeti alınamadı:", err.message);
    return null;
  }
}

export function languageToISOCode(language) {
  const map = {
    "Türkçe": "tr", "İngilizce": "en", "İspanyolca": "es", "Fransızca": "fr",
    "Almanca": "de", "İtalyanca": "it", "Portekizce": "pt", "Rusça": "ru",
    "Arapça": "ar", "Çince": "zh", "Japonca": "ja", "Korece": "ko",
    "Flemenkçe": "nl", "Lehçe": "pl", "Hintçe": "hi", "Bengalce": "bn",
    "Vietnamca": "vi", "Tayca": "th", "Romence": "ro", "Ukraynaca": "uk"
  };
  return map[language] || "en";
}
