import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = 'en') {
  const baseUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/mobile-sections-lead/${encodeURIComponent(topic)}`;

  try {
    const response = await fetch(baseUrl);

    // ❗ JSON değilse veya hata durumuysa yakala
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
      console.warn("❌ Wikipedia: Beklenmeyen içerik tipi veya 404");
      return { summary: "", warning: "Wikipedia'da bu başlık bulunamadı." };
    }

    const data = await response.json();

    const isDisambiguation = data.sections?.[0]?.line?.toLowerCase()?.includes("anlam ayrımı");
    let rawText = data.lead?.sections?.map(s => s.text).join("\n") || data.sections?.[0]?.text || "";
    rawText = rawText.replace(/<[^>]+>/g, '');

    if (!rawText || rawText.length < 100 || isDisambiguation) {
      return {
        summary: "",
        warning: "❌ Bu başlık belirsiz olabilir veya yeterli içerik bulunamadı. Örn: 'Kalp (organ)' gibi daha açık yazın."
      };
    }

    return { summary: rawText.trim() };

  } catch (error) {
    console.error("Wikipedia fetch error:", error.message);
    return { summary: "", warning: "❌ Wikipedia bağlantısı başarısız oldu." };
  }
}
