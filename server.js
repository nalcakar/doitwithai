import fs from 'fs';
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import generateRouter from './routes/generate.js';
import visitorTokenRouter from './routes/visitorTokens.js';
import transcribeRoute from './routes/transcribe.js'; // ✅ Added here
import { fetchWikipediaSummary } from './utils/wikiFetcher.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ✅ Register all API routes
app.use('/api/generate', generateRouter);
app.use('/api/visitor-tokens', visitorTokenRouter);
app.use('/api/transcribe', transcribeRoute);// ✅ This handles /api/transcribe from transcribe.js

// ✅ Home route
app.get('/', (req, res) => {
  res.send('✅ AI MCQ Generator Backend is running');
});

// ✅ Wikipedia summary fetch route
app.post('/api/fetch-wikipedia', async (req, res) => {
  const { topic, lang } = req.body;
  if (!topic || !lang) {
    return res.status(400).json({ error: "Missing topic or language" });
  }

  const result = await fetchWikipediaFullContent(topic, lang);
  res.json(result);
});


const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
