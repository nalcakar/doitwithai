// utils/wikiFetcher.js
import fetch from 'node-fetch';

export async function fetchWikipediaSummary(topic, lang = 'en') {
  try {
    // Adım 1: Başlığın doğru halini al (redirect/normalize gibi düzeltmeler)
    const titleRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(topic)}&format=json&origin=*`);
    const titleData = await titleRes.json();
    const pages = titleData.query.pages;
    const firstPage = Object.values(pages)[0];
    if (firstPage.missing) {
      console.warn("❌ Wikipedia sayfası bulunamadı.");
      return { summary: "" };
    }
    const formattedTitle = firstPage.title;

    // Adım 2: Sayfanın mobil HTML içeriğini çek
    const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(formattedTitle)}`);
    const htmlText = await htmlRes.text();

    // HTML içinden paragrafları ayıkla
    const paragraphs = htmlText.match(/<p>(.*?)<\/p>/g);
    if (!paragraphs || paragraphs.length === 0) {
      return { summary: "" };
    }

    // İlk 5 paragrafı al, HTML taglerini ve kaynak numaralarını temizle
    const cleaned = paragraphs.slice(0, 5).map(p => {
      return p.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').trim();
    }).join(" ");

    return { summary: cleaned };
  } catch (error) {
    console.error("❌ Wikipedia fetch error:", error.message);
    return { summary: "" };
  }
}
