import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import visitorRoutes from './routes/visitorTokens.js';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ Middleware
app.use(cors({
  origin: 'https://doitwithai.org',
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

// ✅ Routes
app.use('/api/visitor-tokens', visitorRoutes);

// ✅ Root check
app.get('/', (req, res) => {
  res.send('🟢 MCQ Visitor Token API is running');
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
