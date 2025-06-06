import fetch from 'node-fetch';

/**
 * Çok dilli başlık düzeltici (örneğin: "adolf hitler" → "Adolf Hitler")
 * Türkçe, Almanca, Fransızca gibi dillerde büyük harf kurallarına dikkat eder.
 */
function toTitleCase(str, lang = 'en') {
  return str
    .toLocaleLowerCase(lang)
    .split(' ')
    .map(word =>
      word.charAt(0).toLocaleUpperCase(lang) + word.slice(1)
    )
    .join(' ');
}

export async function fetchWikipediaSummary(topic, lang = 'en') {
  // Başlığı biçimlendir (büyük harf düzeltmesi)
  const formattedTitle = toTitleCase(topic, lang);

  // Mobil HTML API'si ile daha uzun içerik al
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(formattedTitle)}`;

  try {
    const response = await fetch(url);
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
      console.warn("❌ Wikipedia: Beklenmeyen içerik tipi veya 404");
      return { summary: "" };
    }

    const html = await response.text();

    // Sadece ilk <p> etiketlerini al (bazı girişler çok uzun olabilir)
    const paragraphs = html.match(/<p[^>]*>(.*?)<\/p>/g);
    if (!paragraphs || paragraphs.length === 0) return { summary: "" };

    // İlk 2 paragrafı al
    const cleaned = paragraphs.slice(0, 2).map(p => {
      return p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim();
    }).join(" ");

    return { summary: cleaned };
  } catch (error) {
    console.error("Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}
