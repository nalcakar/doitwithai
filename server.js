import express from 'express';
import dotenv from 'dotenv';
import { incrementVisitorToken } from "./utils/visitorFunctions.js"; // doğru yolu yaz
import cors from 'cors';

import generateRouter from './routes/generate.js';

dotenv.config(); // Load .env variables

const app = express();


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/generate', generateRouter);

app.post("/visitor/generate-questions", async (req, res) => {
  const visitorId = req.header("X-Visitor-ID");

  if (!visitorId) {
    return res.status(400).json({ error: "Visitor ID required" });
  }

  const { allowed, remaining } = await incrementVisitorToken(visitorId, 1);

  if (!allowed) {
    return res.status(429).json({
      error: "Daily visitor limit reached",
      usage: { max: 20, remaining: 0 }
    });
  }

  // 👇 Replace this with your actual MCQ generation logic
  const questions = []; // await generateMCQs(...)

  res.json({
    message: "Token accepted",
    remainingTokens: remaining,
    questions
  });
});



// Optional: Home test route
app.get('/', (req, res) => {
  res.send('✅ AI MCQ Generator Backend is running');
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
