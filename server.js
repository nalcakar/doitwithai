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
import transcribeRoute from './routes/transcribe.js'; // ✅ Your transcription route
import { fetchWikipediaSummary } from './utils/wikiFetcher.js';

dotenv.config();

const app = express();

// ✅ Enable CORS for both localhost (dev) and production frontend
app.use(cors({
  origin: ['http://localhost:3000', 'https://doitwithai.org'],
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

// ✅ Register API routes
app.use('/api/generate', generateRouter);
app.use('/api/visitor-tokens', visitorTokenRouter);
app.use('/api/transcribe', transcribeRoute); // ✅ Transcription logic

// ✅ Home route
app.get('/', (req, res) => {
  res.send('✅ AI MCQ Generator Backend is running');
});

// ✅ Health check route to test Render deployment
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'up' });
});

// ✅ Wikipedia summary fetch
app.post('/api/fetch-wikipedia', async (req, res) => {
  const { topic, lang } = req.body;

  if (!topic || !lang) {
    return res.status(400).json({ error: "Missing topic or language" });
  }

  const data = await fetchWikipediaSummary(topic, lang);

  if (data.summary) {
    res.json(data);
  } else {
    res.status(404).json({ error: "No summary found" });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
