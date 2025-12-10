require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.use(helmet());
// ✅ FIXED: Removed trailing space in origin
app.use(cors({
  origin: ['https://furnisure-frontend.vercel.app']
}));
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB error:', err));

const quotationRoutes = require('./routes/quotations');
app.use('/api/quotations', quotationRoutes);

app.get('/', (req, res) => {
  res.status(404).send('Not Found');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Running on port ${PORT}`);
});