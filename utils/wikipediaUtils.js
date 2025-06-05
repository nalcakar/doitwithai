// utils/wikipediaUtils.js
import fetch from 'node-fetch';

export async function fetchWikipediaSummary(rawText, lang = "tr") {
  try {
    const normalizeTitle = (text) =>
      text
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("_");

    const fallbackLang = lang === "tr" ? "en" : "tr";
    const title = normalizeTitle(rawText);

    // 🔍 1. Türkçe dene
    let url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    let response = await fetch(url);
    let data = response.ok ? await response.json() : null;

    // 🔁 2. Eğer boşsa, İngilizce dene
    if (!data?.extract || data.extract.length < 100) {
      console.warn(`⚠️ Wikipedia'da '${title}' başlığı bulunamadı (${lang}), ${fallbackLang} deneniyor`);
      url = `https://${fallbackLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      response = await fetch(url);
      data = response.ok ? await response.json() : null;
    }

    if (data?.extract) {
      console.log("📚 Wikipedia'dan alınan özet:");
      console.log(data.extract);
      return data.extract.slice(0, 2000); // Maksimum 2000 karaktere kadar al
    }

    console.warn(`⚠️ Wikipedia özeti alınamadı: ${rawText}`);
    return null;

  } catch (err) {
    console.error("❌ Wikipedia özeti alınırken hata:", err);
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
