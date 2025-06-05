// routes/wiki.js
import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.post('/wikipedia-summary', async (req, res) => {
  const { topic, lang = 'en' } = req.body;
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
    const wikiRes = await fetch(url);
    const data = await wikiRes.json();

    if (data.extract) {
      return res.json({ summary: data.extract });
    }

    res.status(404).json({ error: "Summary not found" });
  } catch (err) {
    console.error("Wiki Error:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

export default router;
