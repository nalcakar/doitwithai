import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateMCQ(text) {
  const prompt = `
You are an AI teacher assistant that generates 5 multiple choice questions (MCQs) from the given topic.

Each MCQ must include:
- "question": the main question
- "options": an object with 4 options labeled "A" to "D"
- "correct_answer": the letter of the correct option
- "explanation": a short sentence explaining why the answer is correct (required, no skipping)
- brainstorm 3 – 5 educational subtopics. Pick one and generate 5 MCQs about it.

🧠 Your response must be valid JSON ONLY.
🚫 Do not include markdown, intro text, or explanations outside the JSON block.

Example:
[
  {
    "question": "Which city was formerly known as Byzantium?",
    "options": {
      "A": "Athens",
      "B": "Cairo",
      "C": "Istanbul",
      "D": "Baghdad"
    },
    "correct_answer": "C",
    "explanation": "Istanbul was originally founded as Byzantium by Greek settlers."
  },
  ...
]

Input topic: "${text}"
🔁 Request ID: ${Math.floor(Math.random() * 1000000)}
`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const result = await model.generateContent(prompt);
    let raw = await result.response.text();

    console.log("🔍 Gemini Raw Response:", raw);

    // 🧹 Remove markdown if present
    raw = raw
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    // 🧠 Extract valid JSON array
    const match = raw.match(/\[\s*{[\s\S]*?}\s*\]/);
    if (!match) {
      throw new Error("Gemini did not return valid JSON array");
    }

    return JSON.parse(match[0]);
  } catch (err) {
    console.error("❌ Gemini SDK Error:", err.message);
    throw new Error("Gemini generation failed");
  }
}
