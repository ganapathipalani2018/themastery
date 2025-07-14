import express from 'express';

const app = express();
const PORT = 3003;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Minimal server running' });
});

app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
}); 