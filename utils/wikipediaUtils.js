// utils/wikipediaUtils.js
import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = "en") {
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${encodeURIComponent(
      topic
    )}&exintro=false&explaintext=true&format=json&origin=*`;

    const res = await fetch(url);
    const data = await res.json();

    const page = Object.values(data.query.pages)[0];

    // ✅ Eğer sayfa bulunamazsa veya extract yoksa null döndür
    if (!page || page.missing || !page.extract) {
      console.warn(`⚠️ Wikipedia'da '${topic}' başlığı bulunamadı (${lang})`);
      return null;
    }

    return page.extract.slice(0, 2000); // ✅ 2000 karakterle sınırla
  } catch (err) {
    console.error("❌ Wikipedia fetch error:", err);
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
