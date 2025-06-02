import { GoogleGenerativeAI } from "@google/generative-ai";
import { franc } from 'franc';

export async function generateMCQ(text, userLanguage = "", questionCount = 5, optionCount = 4, forceEducational = false) {
  const languageMap = {
    "eng": "İngilizce", "tur": "Türkçe", "spa": "İspanyolca", "fra": "Fransızca",
    "deu": "Almanca", "ita": "İtalyanca", "por": "Portekizce", "rus": "Rusça",
    "jpn": "Japonca", "kor": "Korece", "nld": "Flemenkçe", "pol": "Lehçe",
    "ara": "Arapça", "hin": "Hintçe", "ben": "Bengalce", "zho": "Çince",
    "vie": "Vietnamca", "tha": "Tayca", "ron": "Romence", "ukr": "Ukraynaca"
  };

  const isoMap = {
    "İngilizce": "English", "Türkçe": "Turkish", "Arapça": "Arabic", "Fransızca": "French",
    "İspanyolca": "Spanish", "Almanca": "German", "İtalyanca": "Italian", "Portekizce": "Portuguese",
    "Rusça": "Russian", "Çince": "Chinese", "Japonca": "Japanese", "Korece": "Korean",
    "Flemenkçe": "Dutch", "Lehçe": "Polish", "Hintçe": "Hindi", "Bengalce": "Bengali",
    "Vietnamca": "Vietnamese", "Tayca": "Thai", "Romence": "Romanian", "Ukraynaca": "Ukrainian"
  };

  const langCode = franc(text || "");
  const questionLanguage = userLanguage?.trim() || languageMap[langCode] || "İngilizce";
  const promptLang = isoMap[questionLanguage] || "English";

  console.log("🗣️ Language selected:", questionLanguage);
  console.log("🌐 Prompt language sent to Gemini:", promptLang);

  const letters = Array.from({ length: optionCount }, (_, i) => String.fromCharCode(65 + i));
  const letterList = letters.join(", ");
  const optionsObject = letters.map(l => `"${l}": "..."`).join(", ");

  const prompt = (subtext) => {
    let basePrompt = `
You are an AI teacher assistant.

🎯 Your job is to generate exactly ${questionCount} unique multiple-choice questions (MCQs) based on the topic provided.

Your answers must be based strictly on accurate, official, and educational sources.

Each question MUST include exactly ${optionCount} answer choices labeled ${letterList}. Do NOT include extra or missing options.

Use this strict JSON format:

[
  {
    "question": "...",
    "options": { ${optionsObject} },
    "correct_answer": "${letters[0]}",
    "explanation": "..."
  },
  ...
]

🟢 Write everything in ${promptLang}.
❗ Do NOT use any English unless ${promptLang} is English.
🚫 Avoid repeating questions or similar phrasing from previous attempts.

// YENİ EKLEMELER BURADAN BAŞLIYOR

✅ **Sorularınızı yalnızca sağlanan 'Topic' metnindeki bilgileri kullanarak oluşturun.**
❌ **Metinde bulunmayan, varsayımsal veya yanıltıcı bilgiler içeren sorular sormayın.**
🤔 **Her sorunun net, anlaşılır ve tek bir doğru cevabı olduğundan emin olun.**
🧐 **Çok genel veya çok spesifik (önemsiz) bilgilerden soru oluşturmaktan kaçının.**
💡 **Anahtar kavramları, tanımları, önemli olayları veya ilişkileri hedefleyen sorular sorun.**
🔄 **Seçeneklerin (options) her birinin anlamlı ve sorunun bağlamına uygun olduğundan emin olun. Yanlış seçenekler mantıklı, ancak yine de yanlış olmalıdır.**
🚫 **"Yukarıdakilerin hepsi" veya "Hiçbiri" gibi seçenekler kullanmaktan kaçının.**
`;

    if (forceEducational) {
        basePrompt += `
❗ Your answers must be based strictly on accurate, official, and educational sources.
❌ Do NOT invent terms or use colloquial expressions (e.g., "royal return", "king’s journey").
✅ Focus only on real, validated knowledge (e.g., chess rules from FIDE, mathematical laws, scientific facts).
`;
    }

    return `${basePrompt}

Topic:
"""
${subtext}
"""`;
};

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  let finalQuestions = [];

  const isValid = (q) => {
    const optionValues = Object.values(q.options || {});
    return (
      q.question && typeof q.question === "string" && q.question.length > 10 &&
      q.options && typeof q.options === "object" &&
      letters.every(k => q.options[k] && q.options[k].trim().length > 0) &&
      new Set(optionValues).size === optionValues.length &&
      letters.includes(q.correct_answer) &&
      q.explanation && q.explanation.length > 5
    );
  };

  for (let i = 0; i < 3 && finalQuestions.length < questionCount; i++) {
    try {
      const result = await model.generateContent(prompt(text));
      let raw = await result.response.text();
      raw = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const match = raw.match(/\[\s*{[\s\S]*?}\s*\]/);
      if (!match) throw new Error("Invalid response format");

      const mcqs = JSON.parse(match[0]);
      finalQuestions.push(...mcqs.filter(isValid));
    } catch (err) {
      console.error("⚠️ Retry failed:", err.message);
    }
  }

  while (finalQuestions.length < questionCount) {
    console.warn("♻️ Ek üretim başlatılıyor. Kalan:", questionCount - finalQuestions.length);
    try {
      const result = await model.generateContent(prompt(text));
      let raw = await result.response.text();
      raw = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const match = raw.match(/\[\s*{[\s\S]*?}\s*\]/);
      if (!match) break;

      const mcqs = JSON.parse(match[0]);
      finalQuestions.push(...mcqs.filter(isValid));
    } catch (err) {
      break;
    }
  }

  shuffleArray(finalQuestions);
  return finalQuestions.slice(0, questionCount);

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
