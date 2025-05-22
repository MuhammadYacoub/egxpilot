// app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const analyzeStock = require('./services/stockAnalyzer');
const db = require('./Data/db');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(express.json());
app.use(express.static('public'));

// Root route
app.get('/', (req, res) => {
  res.send('📈 Stock Analyzer Running...');
});


app.use(express.static(path.join(__dirname, 'public')));


// تحليل سهم مباشر
app.get(['/api/analyze/:symbol', '/api/analyze/:symbol/'], async (req, res) => {
  const symbol = req.params.symbol.toUpperCase().replace('/', '');
  const analysis = await analyzeStock(symbol);
  res.json(analysis);
});

// إضافة سهم إلى قائمة المراقبة
const watchlistRoutes = require('./routes/watchlist');
app.use('/api/watchlist', watchlistRoutes);



app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
