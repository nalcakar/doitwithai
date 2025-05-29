import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import generateRouter from './routes/generate.js';
import visitorRouter from './routes/generateVisitor.js'; // ✅ new
import requestIp from 'request-ip';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestIp.mw()); // ✅ required for IP tracking
app.use(express.static('public'));

// Routes
app.use('/api/generate', generateRouter);            // members
app.use('/api/visitor-generate', visitorRouter);     // visitors

app.get('/', (req, res) => {
  res.send('✅ AI MCQ Generator Backend is running');
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
