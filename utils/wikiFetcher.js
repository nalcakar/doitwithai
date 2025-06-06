import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = 'en') {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;

  try {
    const response = await fetch(url);

    // ❗ Geçerli JSON ve 200 mü?
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
      console.warn("❌ Wikipedia: Geçersiz içerik veya 404");
      return { summary: "", warning: "Wikipedia'da bu başlık bulunamadı." };
    }

    const data = await response.json();

    // 🧹 HTML temizle
    const cleanText = (data.extract || "").replace(/<[^>]+>/g, '').trim();

    if (!cleanText || cleanText.length < 50 || data.type === "disambiguation") {
      return { summary: "", warning: "⚠️ Başlık çok kısa, belirsiz veya yönlendirme içeriyor." };
    }

    return { summary: cleanText };

  } catch (error) {
    console.error("Wikipedia fetch error:", error.message);
    return { summary: "", warning: "❌ Wikipedia bağlantısı başarısız oldu." };
  }
}
