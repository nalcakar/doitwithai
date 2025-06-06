import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = 'en') {
  const baseUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/mobile-sections-lead/${encodeURIComponent(topic)}`;
  try {
    const response = await fetch(baseUrl);
    const data = await response.json();

    // 🔍 Disambiguation sayfası kontrolü
    const isDisambiguation = data.sections?.[0]?.line?.toLowerCase()?.includes("anlam ayrımı");

    // 🔍 Metni al (HTML ise temizle)
    let rawText = data.lead?.sections?.map(s => s.text).join("\n") || data.sections?.[0]?.text || "";

    // HTML etiketlerini temizle (çıplak metne dönüştür)
    rawText = rawText.replace(/<[^>]+>/g, '');

    // Çok kısa ve boş içerik varsa uyar
    if (!rawText || rawText.length < 100 || isDisambiguation) {
      return {
        summary: "",
        warning: "❌ Bu başlık belirsiz olabilir veya yeterli içerik bulunamadı. Daha açık bir konu girin. Örn: 'Kalp (organ)'"
      };
    }

    return {
      summary: rawText.trim()
    };
  } catch (error) {
    console.error("❌ Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}
