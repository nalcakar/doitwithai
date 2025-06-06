import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import generateRouter from './routes/generate.js';
import visitorTokenRouter from './routes/visitorTokens.js'; // ✅ Add this
import { fetchWikipediaSummary } from './utils/wikiFetcher.js';
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/generate', generateRouter);
app.use('/api/visitor-tokens', visitorTokenRouter); // ✅ Register visitor token route

app.get('/', (req, res) => {
  res.send('✅ AI MCQ Generator Backend is running');
});

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
