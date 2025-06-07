// wikiFetcher.js
import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = 'tr') {
  const tryFetch = async (title) => {
    try {
      console.log(`🌐 Özet çekiliyor: "${title}"`);
      const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(title)}`);
      const htmlText = await htmlRes.text();
      const paragraphs = htmlText.match(/<p>(.*?)<\/p>/g);
      if (!paragraphs || paragraphs.length === 0) {
        console.warn("⚠️ Paragraf bulunamadı:", title);
        return "";
      }
      const cleanSummary = paragraphs.slice(0, 5).map(p =>
        p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim()
      ).join(" ");
      console.log(`✅ "${title}" özeti (${cleanSummary.length} karakter):`, cleanSummary.slice(0, 100) + "...");
      return cleanSummary;
    } catch (err) {
      console.warn("❌ tryFetch error:", title, "-", err.message);
      return "";
    }
  };

  try {
    console.log("📥 Gelen istek:", topic, lang);

    const searchURL = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`;
    console.log("🔍 Wikipedia iç arama URL:", searchURL);
    const searchRes = await fetch(searchURL);
    const searchJson = await searchRes.json();
    const results = searchJson?.query?.search || [];

    if (results.length === 0) {
      console.warn("⚠️ Wikipedia iç aramada hiçbir sonuç bulunamadı");
      return { summary: "" };
    }

    console.log(`🔎 ${results.length} adet başlık bulundu. Sırayla deneniyor...`);

    for (let i = 0; i < results.length; i++) {
      const title = results[i].title;
      console.log(`🔄 ${i + 1}. başlık: ${title}`);
      const summary = await tryFetch(title);
      if (summary.length > 50) {
        console.log("✅ Kullanılacak özet bulundu:", title);
        return { summary, title };
      }
    }

    console.warn("⚠️ Tüm başlıklar denendi ama geçerli özet bulunamadı.");
    return { summary: "" };
  } catch (error) {
    console.error("❌ fetchWikipediaSummary genel hata:", error.message);
    return { summary: "" };
  }
}
