import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import generateRouter from './routes/generate.js';
import visitorTokensRouter from './routes/visitorTokens.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ Middleware
app.use(cors({
  origin: ['https://doitwithai.org'], // or '*' if testing
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// ✅ Routes
app.use('/api/generate', generateRouter);
app.use('/api/visitor-tokens', visitorTokensRouter);

// ✅ Root Test Route
app.get('/', (req, res) => {
  res.send('✅ AI MCQ API is running');
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
