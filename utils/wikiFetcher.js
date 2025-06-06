import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = 'en') {
  const tryFetch = async (title) => {
    try {
      const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(title)}`);
      const htmlText = await htmlRes.text();
      const paragraphs = htmlText.match(/<p>(.*?)<\/p>/g);
      if (!paragraphs || paragraphs.length === 0) return "";
      return paragraphs.slice(0, 5).map(p =>
        p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim()
      ).join(" ");
    } catch (err) {
      console.warn("❌ tryFetch error:", title, "-", err.message);
      return "";
    }
  };

  const searchWikipedia = async (query) => {
    try {
      const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`);
      const json = await res.json();
      return json?.query?.search || [];
    } catch (err) {
      console.warn("🔍 Arama başarısız:", err.message);
      return [];
    }
  };

  try {
    console.log("📥 Gelen istek:", topic, lang);

    let results = await searchWikipedia(topic);

    // 🔁 Eğer sonuç yoksa, büyük harfli tekrar dene
    if (!results || results.length === 0) {
      const capitalized = topic.trim().split(" ").map(w =>
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(" ");
      console.log("🔁 Tekrar deneniyor (düzenlenmiş başlık):", capitalized);
      results = await searchWikipedia(capitalized);
    }

    // ✅ Arama sonucu varsa ilk başlığı kullan
    if (results.length > 0) {
      const title = results[0].title;
      console.log("🔎 İlk çıkan başlık:", title);
      const summary = await tryFetch(title);
      if (summary.length > 50) {
        console.log("📄 Özet bulundu, uzunluğu:", summary.length);
        return { summary };
      }
    }

    console.log("⚠️ Hiçbir özet bulunamadı");
    return { summary: "" };
  } catch (error) {
    console.error("❌ fetchWikipediaSummary hata:", error.message);
    return { summary: "" };
  }
}
