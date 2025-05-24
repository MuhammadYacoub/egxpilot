
// 🔍 candlestick_utils.js – دوال التعرف على الشموع اليابانية
function detectCandlePattern(data) {
  if (!Array.isArray(data) || data.length < 2) return "لا يوجد نمط واضح";

  const [today, yesterday] = data.slice(-2);

  const open = today.OpenPrice;
  const close = today.ClosePrice;
  const high = today.HighPrice;
  const low = today.LowPrice;

  const body = Math.abs(close - open);
  const upperShadow = high - Math.max(open, close);
  const lowerShadow = Math.min(open, close) - low;

  // شمعة المطرقة Hammer
  if (body < (high - low) * 0.3 && lowerShadow > body * 2 && upperShadow < body * 0.5) {
    return "شمعة المطرقة (Hammer) – إشارة انعكاس صعودي";
  }

  // شمعة الابتلاع الصاعد Bullish Engulfing
  const prevOpen = yesterday.OpenPrice;
  const prevClose = yesterday.ClosePrice;
  if (prevClose < prevOpen && close > open &&
      open < prevClose && close > prevOpen) {
    return "شمعة الابتلاع الصاعد (Bullish Engulfing)";
  }

  return "لا يوجد نمط مؤكد";
}

module.exports = { detectCandlePattern };
