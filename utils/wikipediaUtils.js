// utils/wikipediaUtils.js
import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = 'en') {
  const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(topic)}&limit=1&namespace=0&format=json&origin=*`;

  try {
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData[1] || searchData[1].length === 0) {
      console.warn(`⚠️ Wikipedia'da '${topic}' başlığı bulunamadı (${lang})`);
      return null;
    }

    const actualTitle = searchData[1][0];
    const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(actualTitle)}`;

    const res = await fetch(summaryUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return data.extract?.slice(0, 2000) || null;
  } catch (err) {
    console.error(`⚠️ Wikipedia özeti alınamadı: ${topic}`, err);
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
