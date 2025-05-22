document.addEventListener('DOMContentLoaded', function () {
  const input = document.getElementById('symbolInput');
  if (input) {
    // Always keep input uppercase, but do not show .CA to user
    input.addEventListener('input', function (e) {
      let val = e.target.value.toUpperCase().replace(/\.CA$/, '');
      val = val.replace(/[^A-Z0-9]/g, '');
      e.target.value = val;
    });
    // Allow submitting by pressing Enter
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        analyzeStock();
      }
    });
  }
});

async function analyzeStock() {
  const symbolInput = document.getElementById('symbolInput');
  const box = document.getElementById('resultBox');
  let symbol = symbolInput.value.trim().toUpperCase();
  if (!symbol) return alert('يرجى إدخال رمز السهم.');
  // Always append .CA for the API
  symbol = symbol + '.CA';

  box.style.display = 'none';
  box.innerHTML = 'جاري التحليل...';

  try {
    const res = await fetch(`/api/analyze/${symbol}`);
    const data = await res.json();

    if (data.error) {
      box.innerHTML = `<p style='color:red;'>${data.error}</p>`;
    } else {
      box.innerHTML = `
        <div class="result-header">
          <h2>${data.symbol}</h2>
        </div>
        <div class="result-body">
          <div class="result-row">
            <span class="result-label">🔹 السعر الحالي:</span>
            <span class="result-value">${data.lastPrice}</span>
          </div>
          <div class="result-row">
            <span class="result-label">📉 RSI:</span>
            <span class="result-value">${data.rsi?.toFixed(2)}</span>
            <span class="result-label">📈 MACD:</span>
            <span class="result-value">${data.macd?.MACD?.toFixed(2)}</span>
            <span class="result-label">إشارة:</span>
            <span class="result-value">${data.macd?.signal?.toFixed(2)}</span>
          </div>
          <div class="result-row">
            <span class="result-label">📊 SMA 20:</span>
            <span class="result-value">${data.sma20?.toFixed(2)}</span>
            <span class="result-label">EMA 50:</span>
            <span class="result-value">${data.ema50?.toFixed(2)}</span>
          </div>
          <div class="result-row">
            <span class="result-label">📦 الحجم:</span>
            <span class="result-value">${data.volume?.toLocaleString()}</span>
          </div>
          <div class="result-row">
            <span class="result-label">📌 التوصية:</span>
            <span class="result-badge ${data.suggestion === 'شراء' ? 'buy' : data.suggestion === 'بيع' ? 'sell' : 'hold'}">${data.suggestion}</span>
          </div>
          <div class="result-confidence">
            <span class="confidence-label">⚡ درجة الثقة:</span>
            <div class="confidence-bar">
              <div class="confidence-bar-inner" style="width: ${data.confidence}%;"></div>
            </div>
            <span class="confidence-label">${data.confidence}%</span>
          </div>
          <div class='actions'>
            <button onclick="alert('🚧 سيتم الحفظ في قائمة المراقبة لاحقًا')">📌 أضف للمراقبة</button>
            <button onclick="alert('🚧 سيتم الحفظ كمملوك قريبًا')">✅ أضف كمملوك</button>
          </div>
        </div>
      `;
    }
    box.style.display = 'block';
  } catch (err) {
    box.innerHTML = `<p style='color:red;'>فشل في جلب البيانات</p>`;
    box.style.display = 'block';
  }
}
