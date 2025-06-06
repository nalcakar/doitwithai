import fetch from 'node-fetch';

export async function fetchWikipediaTitleViaGoogle(query, lang = 'tr') {
  const q = `site:${lang}.wikipedia.org ${query}`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" // Daha inandırıcı
      }
    });

    const html = await res.text();

    // 🔍 Tüm Wikipedia linklerini bul
    const matches = [...html.matchAll(/https:\/\/(?:\w+\.)?wikipedia\.org\/wiki\/([^"&\s]+)/g)];
    
    if (matches.length > 0) {
      const title = decodeURIComponent(matches[0][1].replace(/_/g, " "));
      console.log("🔍 Google üzerinden Wikipedia başlığı bulundu:", title);
      return title;
    } else {
      console.warn("⚠️ Google'da Wikipedia bağlantısı bulunamadı");
      return null;
    }
  } catch (err) {
    console.error("❌ Google araması başarısız:", err.message);
    return null;
  }
}
