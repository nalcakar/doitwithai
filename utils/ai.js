import { GoogleGenerativeAI } from "@google/generative-ai";
import { franc } from 'franc';

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

function extractJsonArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;

  const jsonPart = text.slice(start, end + 1).trim();
  try {
    return JSON.parse(jsonPart);
  } catch (err) {
    console.warn("⚠️ JSON.extractJsonArray failed:", err.message);
    return null;
  }
}

export async function generateQuestions(text, type = "mcq", userLanguage = "", questionCount = 5, optionCount = 4) {
  const langCode = franc(text || "");
  const questionLanguage = userLanguage?.trim() || languageMap[langCode] || "İngilizce";
  const promptLang = isoMap[questionLanguage] || "English";

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = generatePrompt(text, type, questionCount, optionCount, promptLang);
  let finalQuestions = [];

  for (let i = 0; i < 3 && finalQuestions.length < questionCount; i++) {
    try {
      const result = await model.generateContent(prompt);
      const rawText = await result.response.text();

      console.log("📦 Gemini Raw Response:\n", rawText);
      const cleaned = rawText
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

      console.log("🧹 Cleaned JSON Candidate:\n", cleaned);

      const parsed = extractJsonArray(cleaned);
      if (parsed && Array.isArray(parsed)) {
        const valid = parsed.filter(q =>
          q?.question || q?.sentence || q?.instruction || q?.keyword
        );
        finalQuestions.push(...valid);
      } else {
        console.warn("⚠️ Could not extract valid JSON array.");
      }
    } catch (apiErr) {
      console.warn("⚠️ Gemini API error:", apiErr.message);
    }
  }

  shuffleArray(finalQuestions);
  return finalQuestions.slice(0, questionCount);
}

function generatePrompt(text, type, questionCount, optionCount, promptLang) {
  const letters = Array.from({ length: optionCount }, (_, i) => String.fromCharCode(65 + i));
  const optionsObject = letters.map(l => `"${l}": "..."`).join(", ");
  const letterList = letters.join(", ");

  const commonHeader = `You are an expert AI teaching assistant.
Generate exactly ${questionCount} well-structured questions in ${promptLang}, based on the topic below. Only return valid JSON, no extra text or commentary.`;

  const topicBlock = `\n\nTopic:\n"""\n${text}\n"""`;

  switch (type) {
    case "mcq":
      return `
${commonHeader}

Each question must include exactly ${optionCount} choices labeled ${letterList}, with only one correct answer.
Format:
[
  {
    "question": "...",
    "options": { ${optionsObject} },
    "correct_answer": "${letters[0]}",
    "explanation": "..."
  }
]${topicBlock}`;

    case "fill":
      return `
${commonHeader}

Each item should be a sentence with a blank (____), the correct answer, and an explanation.
Format:
[
  {
    "sentence": "The capital of France is ____.",
    "correct_answer": "Paris",
    "explanation": "Paris is the capital of France."
  }
]${topicBlock}`;

    case "reorder":
      return `
${commonHeader}

Each item should have an instruction, a shuffled list of steps, the correct order (as index array), and an explanation.
Format:
[
  {
    "instruction": "Put the steps of the water cycle in order.",
    "steps": ["Evaporation", "Condensation", "Precipitation", "Collection"],
    "correct_order": [0, 1, 2, 3],
    "explanation": "The water cycle begins with evaporation..."
  }
]${topicBlock}`;

    case "matching":
      return `
${commonHeader}

Each item must include a matching question with two lists: term_set and definition_set. Also include correct_pairs as index pairs and explanation.
Format:
[
  {
    "question": "Match the following terms with their definitions.",
    "term_set": ["Photosynthesis", "Evaporation"],
    "definition_set": ["Process by which plants make food", "Change of water into vapor"],
    "correct_pairs": [[0,0], [1,1]],
    "explanation": "Each term matches its definition."
  }
]${topicBlock}`;

case "keywords":
  return `
${commonHeader}

Your task is to extract and define exactly ${questionCount} important technical or conceptual keywords from the topic.

Return only a valid JSON array of objects in the following format:
[
  {
    "keyword": "Term",
    "definition": "A short, clear explanation of the term."
  }
]

⚠️ Do not include explanations, titles, commentary, or formatting — only a JSON array. Do not return full questions or essay prompts.
${topicBlock}`;


    default:
      throw new Error("Unsupported question type");
  }
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
