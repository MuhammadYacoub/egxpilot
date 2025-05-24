// stockAnalyzer.js - قراءة المؤشرات الفنية الجاهزة من قاعدة البيانات بدلاً من حسابها لحظيًا
// هذا الملف الآن يعتمد على أن المؤشرات (RSI, MACD, SMA, EMA, Bollinger, إلخ) مخزنة مسبقًا في جدول PriceHistory أو جدول منفصل

const { poolPromise } = require("../data/db");

// دالة لجلب آخر صف من PriceHistory مع المؤشرات الفنية المخزنة
async function getLatestIndicators(symbol) {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("symbol", symbol)
      .query(`
        SELECT TOP 1 * FROM PriceHistory
        WHERE Symbol = @symbol
        ORDER BY [PriceDate] DESC
      `);
    return result.recordset[0];
  } catch (err) {
    console.error("❌ فشل جلب المؤشرات من PriceHistory:", err);
    return null;
  }
}

// الدالة الرئيسية: تعيد المؤشرات الفنية الجاهزة والتوصية
async function analyzeStock(symbol) {
  try {
    // جلب آخر صف (أحدث يوم) من PriceHistory
    const last = await getLatestIndicators(symbol);
    if (!last) {
      return { error: 'لا توجد بيانات كافية للتحليل', symbol };
    }

    // المؤشرات يجب أن تكون مخزنة في الأعمدة التالية (تأكد من وجودها في الجدول):
    // RSI, MACD, MACDSignal, SMA20, EMA50, BB_Middle, BB_Upper, BB_Lower
    const lastPrice = last.ClosePrice;
    const lastRSI = last.RSI;
    const lastMACD = { MACD: last.MACD, signal: last.MACDSignal, histogram: last.MACDHist };
    const lastBB = { middle: last.BB_Middle, upper: last.BB_Upper, lower: last.BB_Lower };
    const lastVolume = last.Volume;
    const sma20 = last.SMA20;
    const ema50 = last.EMA50;

    // منطق التوصية بناءً على المؤشرات
    let suggestion = 'تحليل فقط';
    let confidence = 50;
    if (lastRSI < 30 && lastMACD?.MACD > lastMACD?.signal && lastPrice < lastBB.lower) {
      suggestion = '📈 فرصة شراء قوية';
      confidence = 90;
    } else if (lastRSI > 70) {
      suggestion = '📉 احتمالية تصحيح';
      confidence = 70;
    }

    // إرجاع النتائج النهائية
    return {
      symbol,
      lastPrice,
      rsi: lastRSI,
      macd: lastMACD,
      sma20,
      ema50,
      bollinger: lastBB,
      volume: lastVolume,
      suggestion,
      confidence,
    };
  } catch (err) {
    console.error("❌ فشل التحليل الفني (قراءة من القاعدة):", err);
    return { error: 'فشل التحليل الفني', symbol };
  }
}

module.exports = analyzeStock;