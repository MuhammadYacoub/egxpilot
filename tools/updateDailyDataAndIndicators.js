// سكربت موحد ومستقل لتحديث يوم واحد من بيانات كل سهم + حساب المؤشرات الفنية
// يتضمن أيضًا جدولة تلقائية يومية (3 صباحًا)

const yahooFinance = require("yahoo-finance2").default;
const { sql, poolPromise } = require("../data/db");
const technicalindicators = require("technicalindicators");
const cron = require("node-cron");

async function updateAndAnalyze() {
  const pool = await poolPromise;

  const result = await pool.request().query("SELECT DISTINCT Symbol FROM PriceHistory");
  const symbols = result.recordset.map(row => row.Symbol);

  for (const symbol of symbols) {
    try {
      const dateResult = await pool.request()
        .input("symbol", sql.NVarChar, symbol)
        .query("SELECT MAX(PriceDate) as lastDate FROM PriceHistory WHERE Symbol = @symbol");

      const lastDate = dateResult.recordset[0].lastDate;
      const fromDate = new Date(lastDate);
      fromDate.setDate(fromDate.getDate() + 1);

      const chart = await yahooFinance.chart(symbol, {
        period1: fromDate,
        interval: "1d"
      });

      if (!chart?.quotes?.length) {
        console.log(`ℹ️ لا توجد بيانات جديدة للسهم ${symbol}`);
        continue;
      }

      const closesResult = await pool.request()
        .input("symbol", sql.NVarChar, symbol)
        .query("SELECT PriceDate, ClosePrice FROM PriceHistory WHERE Symbol = @symbol ORDER BY PriceDate");

      const existingRows = closesResult.recordset;
      const closes = existingRows.map(r => r.ClosePrice);
      const dates = existingRows.map(r => r.PriceDate);

      let newDataInserted = 0;

      for (const d of chart.quotes) {
        if (!d.close || !d.date) continue;

        const dateStr = d.date.toISOString().slice(0, 10);
        const closeValue = d.close;

        closes.push(closeValue);
        dates.push(d.date);

        const ema20 = technicalindicators.EMA.calculate({ period: 20, values: closes });
        const ema50 = technicalindicators.EMA.calculate({ period: 50, values: closes });
        const rsi = technicalindicators.RSI.calculate({ period: 14, values: closes });
        const macd = technicalindicators.MACD.calculate({
          values: closes,
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
          SimpleMAOscillator: false,
          SimpleMASignal: false
        });

        const i = closes.length - 1;
        const ema20Val = ema20[i - (closes.length - ema20.length)] || null;
        const ema50Val = ema50[i - (closes.length - ema50.length)] || null;
        const rsiVal = rsi[i - (closes.length - rsi.length)] || null;
        const macdVal = macd[i - (closes.length - macd.length)]?.MACD || null;

        await pool.request()
          .input("symbol", sql.NVarChar, symbol)
          .input("date", sql.Date, d.date)
          .input("open", sql.Float, d.open || 0)
          .input("high", sql.Float, d.high || 0)
          .input("low", sql.Float, d.low || 0)
          .input("close", sql.Float, closeValue)
          .input("volume", sql.Int, d.volume || 0)
          .input("ema20", sql.Float, ema20Val)
          .input("ema50", sql.Float, ema50Val)
          .input("rsi", sql.Float, rsiVal)
          .input("macd", sql.Float, macdVal)
          .query(`
            IF NOT EXISTS (
              SELECT 1 FROM PriceHistory WHERE Symbol = @symbol AND [PriceDate] = @date
            )
            INSERT INTO PriceHistory (Symbol, [PriceDate], OpenPrice, HighPrice, LowPrice, ClosePrice, Volume, EMA20, EMA50, RSI, MACD)
            VALUES (@symbol, @date, @open, @high, @low, @close, @volume, @ema20, @ema50, @rsi, @macd)
          `);

        newDataInserted++;
      }

      console.log(`✅ ${symbol}: تم إدخال ${newDataInserted} يوم وتحديث المؤشرات`);
    } catch (err) {
      console.error(`❌ خطأ في ${symbol}:`, err.message);
    }
  }

  console.log("📊 تم الانتهاء من التحديث والتحليل اليومي.");
}

// تشغيل يدوي فوري
updateAndAnalyze();

// تشغيل تلقائي يوميًا الساعة 3 صباحًا
cron.schedule("0 3 * * *", () => {
  console.log("⏰ تنفيذ التحديث المجدول (3 صباحًا)...");
  updateAndAnalyze();
});
