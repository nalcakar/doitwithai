import fetch from 'node-fetch';
import { fetchWikipediaTitleViaGoogle } from './googleHelper.js';

export async function fetchWikipediaSummary(topic, lang = 'tr') {
  const tryFetch = async (title) => {
    try {
      console.log(`🌐 Özet çekiliyor: "${title}"`);
      const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(title)}`);
      const htmlText = await htmlRes.text();
      const paragraphs = htmlText.match(/<p>(.*?)<\/p>/g);
      if (!paragraphs || paragraphs.length === 0) return "";
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

    if (results.length > 0) {
      console.log(`🔎 ${results.length} başlık bulundu. Sırayla deneniyor...`);
      for (let i = 0; i < results.length; i++) {
        const title = results[i].title;
        console.log(`🔄 ${i + 1}. başlık: ${title}`);
        const summary = await tryFetch(title);
        if (summary.length > 50) {
          console.log("✅ Kullanılacak başlık bulundu:", title);
          return { summary, title };
        }
      }
      console.warn("⚠️ Tüm başlıklar denendi ama geçerli özet bulunamadı.");
    } else {
      console.warn("⚠️ Wikipedia iç aramada hiçbir sonuç bulunamadı");
    }

    // 🔁 Google fallback başlık
    console.log("🔁 Google üzerinden başlık aranıyor...");
    const googleTitle = await fetchWikipediaTitleViaGoogle(topic, lang);
    if (googleTitle) {
      console.log("🔁 Google'dan elde edilen başlık:", googleTitle);
      const fallback = await tryFetch(googleTitle);
      if (fallback.length > 50) {
        console.log("✅ Google sonucu başarıyla kullanıldı:", googleTitle);
        return { summary: fallback, title: googleTitle };
      } else {
        console.warn("⚠️ Google sonucu çok kısa:", fallback.length);
      }
    } else {
      console.warn("⚠️ Google'dan başlık bulunamadı");
    }

    return { summary: "" };
  } catch (error) {
    console.error("❌ fetchWikipediaSummary genel hata:", error.message);
    return { summary: "" };
  }
}
