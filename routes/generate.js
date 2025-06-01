import express from "express";
import { generateQuestions } from "../utils/ai.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { text, type, userLanguage, questionCount, optionCount } = req.body;

    if (!text || !type) {
      return res.status(400).json({ error: "Missing required parameters." });
    }

    const questions = await generateQuestions(
      text,
      type,
      userLanguage,
      questionCount,
      optionCount
    );

    res.json({ questions });
  } catch (err) {
    console.error("❌ Error generating questions:", err);
    res.status(500).json({ error: "Failed to generate questions." });
  }
});

export default router;
