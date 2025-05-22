// routes/watchlist.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { sql, poolPromise } = require('../Data/db');
const analyzeStock = require('../services/stockAnalyzer');

const ANALYSIS_DIR = path.join(__dirname, '../data/analysis');
if (!fs.existsSync(ANALYSIS_DIR)) fs.mkdirSync(ANALYSIS_DIR, { recursive: true });

// إضافة سهم إلى قائمة المراقبة مع تحليل وتخزين النتيجة في ملف JSON
router.post('/add', async (req, res) => {
  const { symbol, name } = req.body;
  if (!symbol) return res.status(400).json({ error: 'رمز السهم مطلوب' });

  try {
    const analysis = await analyzeStock(symbol);
    const fileName = `${symbol.replace(/\./g, '_')}_${Date.now()}.json`;
    const filePath = path.join(ANALYSIS_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify(analysis, null, 2));

    const pool = await poolPromise;
    const insertQuery = `
      INSERT INTO Watchlist (Symbol, Name, CreatedAt, AnalysisPath, Status)
      VALUES (@symbol, @name, GETDATE(), @path, 1)
    `;
    await pool.request()
      .input('symbol', sql.NVarChar, symbol)
      .input('name', sql.NVarChar, name || '')
      .input('path', sql.NVarChar, `data/analysis/${fileName}`)
      .query(insertQuery);

    res.json({ success: true, message: '✅ تم إضافة السهم وتحليل البيانات', file: fileName });
  } catch (error) {
    console.error('❌ خطأ في إضافة السهم:', error);
    res.status(500).json({ error: 'فشل إضافة السهم أو التحليل' });
  }
});

module.exports = router;
