// مثال على تشغيل stockAnalyzer.js لتحليل سهم معين

const analyzeStock = require('./services/stockAnalyzer');

(async () => {
  const result = await analyzeStock("COMI.CA");
  console.log(JSON.stringify(result, null, 2));
})();
