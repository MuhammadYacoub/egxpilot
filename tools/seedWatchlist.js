const fs = require("fs");
const path = require("path");
const yahooFinance = require("yahoo-finance2").default;
const { sql, poolPromise } = require("../data/db");

const watchlistData = JSON.parse(fs.readFileSync(path.join(__dirname, "watchlist.json"), "utf-8"));

async function seedWatchlistAndPriceHistory() {
  const pool = await poolPromise;

  for (const stock of watchlistData) {
    const symbol = stock.Symbol;
    const name = stock.Name;

    try {
      // 1. إدخال في جدول Watchlist
      await pool.request()
        .input("symbol", sql.NVarChar, symbol)
        .input("name", sql.NVarChar, name)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM Watchlist WHERE Symbol = @symbol)
            INSERT INTO Watchlist (Symbol, Name, CreatedAt, Status)
            VALUES (@symbol, @name, GETDATE(), 1)
        `);

      // 2. تحميل بيانات من Yahoo
      const fromDate = new Date();
      fromDate.setFullYear(fromDate.getFullYear() - 1);

      const chart = await yahooFinance.chart(symbol, {
        period1: fromDate,
        interval: "1d"
      });

      if (!chart?.quotes?.length) {
        console.warn(`⚠️ لا توجد بيانات لـ ${symbol}`);
        continue;
      }

      // 3. إدخال في جدول PriceHistory
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      const request = transaction.request();

      for (const d of chart.quotes) {
        if (!d.close || !d.date) continue;

        await request.query(`
          IF NOT EXISTS (
            SELECT 1 FROM PriceHistory WHERE Symbol = '${symbol}' AND [PriceDate] = '${d.date.toISOString().slice(0, 10)}'
          )
          INSERT INTO PriceHistory (Symbol, [PriceDate], [OpenPrice], [HighPrice], [LowPrice], [ClosePrice], [Volume])
          VALUES ('${symbol}', '${d.date.toISOString().slice(0, 10)}', ${d.open || 0}, ${d.high || 0}, ${d.low || 0}, ${d.close || 0}, ${d.volume || 0})
        `);
      }

      await transaction.commit();
      console.log(`✅ ${symbol} - تم تحميل البيانات التاريخية (${chart.quotes.length})`);

    } catch (err) {
      console.error(`❌ فشل في ${symbol}:`, err.message);
    }
  }

  console.log("🚀 تم الانتهاء من إدخال كل الأسهم.");
}

seedWatchlistAndPriceHistory();
