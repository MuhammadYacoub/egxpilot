// services/stockAnalyzer.js
const yahooFinance = require('yahoo-finance2').default;
const ti = require('technicalindicators');

yahooFinance.suppressNotices(['ripHistorical']); // suppress warning

async function analyzeStock(symbol) {
  try {
    const result = await yahooFinance.chart(symbol, {
      period1: '2023-01-01',
      interval: '1d'
    });

    const prices = result.quotes.map(d => d.close);
    const volumes = result.quotes.map(d => d.volume);
    const highs = result.quotes.map(d => d.high);
    const lows = result.quotes.map(d => d.low);

    const rsi = ti.RSI.calculate({ values: prices, period: 14 });
    const macd = ti.MACD.calculate({
      values: prices,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });

    const sma20 = ti.SMA.calculate({ values: prices, period: 20 });
    const ema50 = ti.EMA.calculate({ values: prices, period: 50 });
    const bb = ti.BollingerBands.calculate({
      period: 20,
      stdDev: 2,
      values: prices,
    });

    const lastPrice = prices.at(-1);
    const lastVolume = volumes.at(-1);
    const lastRSI = rsi.at(-1);
    const lastMACD = macd.at(-1);
    const lastBB = bb.at(-1);

    let suggestion = '🔍 تحليل فقط';
    let confidence = 50;

    if (lastRSI < 30 && lastMACD?.MACD > lastMACD?.signal && lastPrice < lastBB.lower) {
      suggestion = '📈 فرصة شراء قوية';
      confidence = 90;
    } else if (lastRSI > 70) {
      suggestion = '📉 احتمالية تصحيح';
      confidence = 70;
    }

    return {
      symbol,
      lastPrice,
      rsi: lastRSI,
      macd: lastMACD,
      sma20: sma20.at(-1),
      ema50: ema50.at(-1),
      bollinger: lastBB,
      volume: lastVolume,
      suggestion,
      confidence,
    };
  } catch (error) {
    console.error('❌ تحليل السهم فشل:', symbol, error);
    return { error: 'فشل التحليل', symbol };
  }
}

module.exports = analyzeStock;
