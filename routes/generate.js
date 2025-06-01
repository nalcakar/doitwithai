import express from "express";
import { generateMCQ, generateFillBlanks, generateReorder, generateMatching, generateKeywords } from "../utils/ai.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { text, userLanguage, type = "mcq", questionCount = 5, optionCount = 4 } = req.body;

  try {
    let questions;

    switch (type) {
      case "fill_blank":
        questions = await generateFillBlanks(text, userLanguage, questionCount);
        break;
      case "reorder":
        questions = await generateReorder(text, userLanguage, questionCount);
        break;
      case "matching":
        questions = await generateMatching(text, userLanguage, questionCount);
        break;
      case "keywords":
        questions = await generateKeywords(text, userLanguage, questionCount);
        break;
      case "mcq":
      default:
        questions = await generateMCQ(text, userLanguage, questionCount, optionCount);
    }

    res.json({ questions });
  } catch (err) {
    console.error("Generation error:", err);
    res.status(500).json({ error: "Question generation failed" });
  }
});

export default router;
