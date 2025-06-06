export async function fetchWikipediaSummary(topic, lang = 'en') {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    // ❗ Disambiguation sayfası mı?
    const isDisambiguation = data.type === 'disambiguation';

    // ❗ İçerik çok kısa ve anlamsızsa
    const isTooShort = data.extract && data.extract.length < 100;

    if (isDisambiguation || isTooShort) {
      return {
        summary: "",
        warning: "❌ Bu kelime birden fazla anlama gelebilir. Lütfen daha açık bir konu yazın. Örn: 'kalp (organ)'"
      };
    }

    return {
      summary: data.extract || ""
    };
  } catch (error) {
    console.error("Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}
