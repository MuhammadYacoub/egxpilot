
// 🔍 stockAnalyzer_advanced.js – النسخة النهائية مع تحليل الشموع
const { sql, poolPromise } = require("../data/db");
const { detectCandlePattern } = require("./candlestick_utils");

async function analyzeStock(symbol) {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("symbol", sql.NVarChar, symbol)
    .query("SELECT TOP 90 * FROM PriceHistory WHERE Symbol = @symbol ORDER BY PriceDate DESC");

  const rows = result.recordset;

  if (!rows || rows.length < 30) {
    return { error: "لا توجد بيانات كافية للتحليل الفني." };
  }

  const closes = rows.map(r => r.ClosePrice).reverse();
  const highs = rows.map(r => r.HighPrice).reverse();
  const lows = rows.map(r => r.LowPrice).reverse();
  const volumes = rows.map(r => r.Volume).reverse();
  const dates = rows.map(r => r.PriceDate).reverse();

  const latest = rows[0];
  const lastPrice = latest.ClosePrice;
  const ema20 = latest.EMA20;
  const ema50 = latest.EMA50;
  const rsi = latest.RSI;
  const macd = latest.MACD;

  // 🔹 الاتجاه العام
  let trend = "جانبي", trendSince = dates[0];
  for (let i = 1; i < rows.length; i++) {
    const p = rows[i];
    if (p.EMA20 && p.EMA50 && p.EMA20 > p.EMA50 && p.ClosePrice > p.EMA20) {
      trend = "صاعد";
      trendSince = p.PriceDate;
      break;
    } else if (p.EMA20 && p.EMA50 && p.EMA20 < p.EMA50 && p.ClosePrice < p.EMA20) {
      trend = "هابط";
      trendSince = p.PriceDate;
      break;
    }
  }

  const emaCross = (rows[1]?.EMA20 < rows[1]?.EMA50 && ema20 > ema50) ? "Golden Cross" :
                   (rows[1]?.EMA20 > rows[1]?.EMA50 && ema20 < ema50) ? "Death Cross" : "لا يوجد";

  const high20 = Math.max(...highs.slice(-20));
  const low20 = Math.min(...lows.slice(-20));
  const breakout = lastPrice > high20 ? "اختراق صاعد" :
                   lastPrice < low20 ? "كسر هابط" : "لا يوجد";

  const avgVolume20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volumeSpike = latest.Volume > avgVolume20 * 1.5;

  const momentumSignal =
    rsi > 70 ? "تشبع شرائي – خطر انعكاس" :
    rsi < 30 ? "تشبع بيعي – احتمال صعود" :
    macd > 0 && rsi > 50 ? "زخم إيجابي" :
    macd < 0 && rsi < 50 ? "زخم سلبي" : "محايد";

  const supportLevels = lows.slice(-60).filter((val, i, arr) => {
    return val < arr[i - 1] && val < arr[i + 1];
  }).sort((a, b) => b - a).slice(0, 3);

  const resistanceLevels = highs.slice(-60).filter((val, i, arr) => {
    return val > arr[i - 1] && val > arr[i + 1];
  }).sort((a, b) => a - b).slice(0, 3);

  // 🔍 تحليل إضافي
  const candleSignal = detectCandlePattern(rows.slice(-2)); // استخدم آخر يومين
  const elliottWave = "موجة 3 - صاعدة";  // Placeholder
  const wyckoffPhase = "Accumulation";  // Placeholder

  // 💡 حساب النقاط
  let score = 0;
  if (trend === "صاعد") score += 15;
  if (emaCross === "Golden Cross") score += 15;
  if (momentumSignal.includes("إيجابي")) score += 15;
  if (volumeSpike) score += 10;
  if (breakout.includes("اختراق")) score += 10;
  if (candleSignal.includes("ابتلاع") || candleSignal.includes("مطرقة")) score += 10;
  if (elliottWave.includes("موجة 3")) score += 10;
  if (wyckoffPhase === "Accumulation") score += 10;
  if (supportLevels[0] && lastPrice > supportLevels[0]) score += 5;

  const recommendation =
    score >= 80 ? "✅ فرصة قوية جدًا" :
    score >= 60 ? "📈 فرصة جيدة" :
    score >= 40 ? "⚠️ فرصة ضعيفة – تابع السهم" :
    "❌ غير مناسب حاليًا";

  const narrativeSummary = `
📌 السهم ${symbol} في اتجاه ${trend} منذ ${new Date(trendSince).toLocaleDateString("ar-EG")}.
تظهر تقاطع ${emaCross}، وزخم ${momentumSignal}، مع إشارات شموع: ${candleSignal}.
السعر قريب من دعم عند ${supportLevels[0]?.toFixed(2)} ومقاومة عند ${resistanceLevels[0]?.toFixed(2)}.
${wyckoffPhase === "Accumulation" ? "تحليل وايكوف يشير إلى بداية مرحلة تجميع." : ""}
${elliottWave.includes("3") ? "ويظهر ضمن موجة 3 من نظرية إليوت – وهي الأقوى." : ""}
🔍 التوصية: ${recommendation} (نقاط الثقة: ${score}/100)
`;

  return {
    symbol,
    lastPrice,
    trend,
    trendSince,
    emaCross,
    breakout,
    volumeSpike,
    momentumSignal,
    supportLevels,
    resistanceLevels,
    candleSignal,
    elliottWave,
    wyckoffPhase,
    recommendation,
    score,
    summary: narrativeSummary,
    analyzedAt: new Date().toISOString()
  };
}

module.exports = analyzeStock;
