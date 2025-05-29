import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import visitorTokenRouter from './routes/visitorTokens.js';
app.use('/api/visitor-tokens', visitorTokenRouter);
import generateRouter from './routes/generate.js';

dotenv.config(); // Load .env variables

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api/visitor-tokens', visitorTokenRouter);
// Routes
app.use('/api/generate', generateRouter);

// Optional: Home test route
app.get('/', (req, res) => {
  res.send('✅ AI MCQ Generator Backend is running');
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
