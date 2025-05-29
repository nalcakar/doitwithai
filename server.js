import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import generateRouter from './routes/generate.js';
import visitorTokenRouter from './routes/visitorTokens.js'; // ✅ Import the new router

dotenv.config(); // Load .env variables

const app = express(); // ✅ Declare the app first!

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/generate', generateRouter);
app.use('/api/visitor-tokens', visitorTokenRouter); // ✅ After app is initialized

// Optional: Home route
app.get('/', (req, res) => {
  res.send('✅ AI MCQ Generator Backend is running');
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
