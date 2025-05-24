import express from 'express';

const router = express.Router();

// Placeholder — update later with webhook secret check
router.post('/webhook', (req, res) => {
  console.log("📩 Paddle Webhook Received:", req.body);
  res.sendStatus(200);
});

export default router;
