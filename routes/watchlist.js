// نسخة Debug من watchlist.js بعد اعتماد التحميل والتحليل التلقائي دائمًا
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { sql, poolPromise } = require("../data/db");
const yahooFinance = require("yahoo-finance2").default;
const analyzeStock = require("../services/stockAnalyzer");


const ANALYSIS_DIR = path.join(__dirname, "../public/data/analysis");
if (!fs.existsSync(ANALYSIS_DIR))
  fs.mkdirSync(ANALYSIS_DIR, { recursive: true });

router.post("/add", async (req, res) => {
  const { symbol, name } = req.body;

  if (!symbol || typeof symbol !== "string") {
    return res.status(400).json({ error: "رمز السهم غير صالح" });
  }

  const fullSymbol = symbol.toUpperCase().endsWith(".CA")
    ? symbol.toUpperCase()
    : `${symbol.toUpperCase()}.CA`;

  try {
    const pool = await poolPromise;

    await pool.request()
      .input("symbol", sql.NVarChar, fullSymbol)
      .input("name", sql.NVarChar, name || "")
      .query(`
        IF NOT EXISTS (SELECT 1 FROM Watchlist WHERE Symbol = @symbol)
          INSERT INTO Watchlist (Symbol, Name, CreatedAt, Status)
          VALUES (@symbol, @name, GETDATE(), 1)
      `);

    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 1);

    const chart = await yahooFinance.chart(fullSymbol, {
      period1: fromDate,
      interval: '1d'
    });

    if (!chart || !chart.quotes || chart.quotes.length === 0) {
      return res.status(400).json({ error: "لم يتم استرجاع أي بيانات من Yahoo." });
    }

    console.log("📊 عدد الأيام المسترجعة:", chart.quotes.length);
    console.log("📅 أول يوم:", chart.quotes[0]);
    console.log("📅 آخر يوم:", chart.quotes[chart.quotes.length - 1]);

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    const request = transaction.request();
    let savedCount = 0;

    for (const d of chart.quotes) {
      if (!d.close || !d.date) continue;

      try {
        await request.query(`
          IF NOT EXISTS (
            SELECT 1 FROM PriceHistory WHERE Symbol = '${fullSymbol}' AND [PriceDate] = '${d.date.toISOString().slice(0, 10)}'
          )
          INSERT INTO PriceHistory (Symbol, [PriceDate], [OpenPrice], [HighPrice], [LowPrice], [ClosePrice], [Volume])
          VALUES ('${fullSymbol}', '${d.date.toISOString().slice(0, 10)}', ${d.open || 0}, ${d.high || 0}, ${d.low || 0}, ${d.close || 0}, ${d.volume || 0})
        `);
        savedCount++;
      } catch (innerErr) {
        console.error(`❌ فشل في حفظ يوم ${d.date.toISOString().slice(0, 10)}:`, innerErr.message);
      }
    }

    await transaction.commit();
    console.log(`📊 تم حفظ ${savedCount} يوم من البيانات في PriceHistory.`);

    if (savedCount === 0) {
      return res.status(500).json({ error: "لم يتم حفظ أي بيانات في قاعدة البيانات." });
    }

    const analysis = await analyzeStock(fullSymbol);
    if (analysis.error) throw new Error("فشل التحليل - قد تكون البيانات غير كافية");

    analysis.addedAt = new Date().toISOString();

    const fileName = `${symbol.replace(/\./g, "_")}_${Date.now()}.json`;
    const filePath = path.join(ANALYSIS_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(analysis, null, 2));

    await pool
      .request()
      .input("symbol", sql.NVarChar, fullSymbol)
      .input("path", sql.NVarChar, `data/analysis/${fileName}`)
      .query(`
        UPDATE Watchlist
        SET AnalysisPath = @path
        WHERE Symbol = @symbol
      `);

    res.json({
      success: true,
      message: `✅ تم تحليل السهم وتخزين البيانات بنجاح (${savedCount} يوم جديد).`,
      file: fileName,
    });
  } catch (err) {
    console.error("❌ خطأ كامل:", err);
    res.status(500).json({ error: "فشل إضافة السهم أو التحليل", details: err.message });
  }
});

router.post('/check', async (req, res) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ exists: false });
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('symbol', sql.NVarChar, symbol.toUpperCase().endsWith('.CA') ? symbol.toUpperCase() : symbol.toUpperCase() + '.CA')
      .query('SELECT COUNT(*) as count FROM Watchlist WHERE Symbol = @symbol');
    res.json({ exists: result.recordset[0].count > 0 });
  } catch (err) {
    res.json({ exists: false });
  }
});



module.exports = router;