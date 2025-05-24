// main.js - واجهة المستخدم لتحليل الأسهم وإدارة قائمة المراقبة
// هذا الملف يحتوي على وظائف التفاعل مع المستخدم وواجهة برمجة التطبيقات

// عند تحميل الصفحة: تجهيز إدخال الرمز وتحويله لحروف كبيرة تلقائيًا
// وإتاحة التحليل عند الضغط على Enter
document.addEventListener('DOMContentLoaded', function () {
  const input = document.getElementById('symbolInput');
  if (input) {
    // عند الكتابة: تحويل الرمز لحروف كبيرة وإزالة أي رموز غير مسموحة
    input.addEventListener('input', function (e) {
      let val = e.target.value.toUpperCase().replace(/\.CA$/, '');
      val = val.replace(/[^A-Z0-9]/g, '');
      e.target.value = val;
    });
    // عند الضغط على Enter: تنفيذ التحليل مباشرة
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        analyzeStock();
      }
    });
  }
});

// دالة تحليل السهم وعرض النتائج في الواجهة
async function analyzeStock() {
  const symbolInput = document.getElementById('symbolInput');
  const box = document.getElementById('resultBox');
  let symbol = symbolInput.value.trim().toUpperCase();
  if (!symbol) return alert('يرجى إدخال رمز السهم.');
  symbol = symbol + '.CA'; // إضافة الامتداد تلقائيًا

  box.style.display = 'none';
  box.innerHTML = 'جاري التحليل...';

  try {
    // طلب التحليل من السيرفر
    const res = await fetch(`/api/analyze/${symbol}`);
    const data = await res.json();

    if (data.error) {
      box.innerHTML = `<p style='color:red;'>${data.error}</p>`;
    } else {
      // عرض النتائج بشكل منسق مع تفسيرات مختصرة
      box.innerHTML = `
        <div class="result-header">
          <h2>${data.symbol}${data.name ? ' - ' + data.name : ''}</h2>
        </div>
        <div class="result-body">
          <div class="result-row">
            <span class="result-label">🔹 السعر الحالي:</span>
            <span class="result-value">${getPriceDescription(data.lastPrice)}</span>
          </div>
          <div class="result-row">
            <span class="result-label">📉 RSI:</span>
            <span class="result-value">${data.rsi?.toFixed(2) ?? 'غير متوفر'}</span>
            <span class="result-label">تفسير:</span>
            <span class="result-value">${getRsiDescription(data.rsi)}</span>
          </div>
          <div class="result-row">
            <span class="result-label">📈 MACD:</span>
            <span class="result-value">${data.macd?.MACD?.toFixed(2) ?? 'غير متوفر'}</span>
            <span class="result-label">إشارة:</span>
            <span class="result-value">${data.macd?.signal?.toFixed(2) ?? 'غير متوفر'}</span>
            <span class="result-label">تفسير:</span>
            <span class="result-value">${getMacdDescription(data.macd)}</span>
          </div>
          <div class="result-row">
            <span class="result-label">📊 SMA 20:</span>
            <span class="result-value">${data.sma20?.toFixed(2) ?? 'غير متوفر'}</span>
            <span class="result-label">EMA 50:</span>
            <span class="result-value">${data.ema50?.toFixed(2) ?? 'غير متوفر'}</span>
          </div>
          <div class="result-row">
            <span class="result-label">📦 الحجم:</span>
            <span class="result-value">${data.volume?.toLocaleString() ?? 'غير متوفر'}</span>
          </div>
          <div class="result-row">
            <span class="result-label">📌 التوصية:</span>
            <span class="result-badge ${data.suggestion === 'شراء' ? 'buy' : data.suggestion === 'بيع' ? 'sell' : 'hold'}">${data.suggestion}</span>
          </div>
          <div class='result-confidence'>
            <span class="confidence-label">⚡ درجة الثقة:</span>
            <div class="confidence-bar">
              <div class="confidence-bar-inner" style="width: ${data.confidence}%;"></div>
            </div>
            <span class="confidence-label">${data.confidence}%</span>
          </div>
          <div class='actions'>
            <button onclick="addToWatchlist('${data.symbol}')">📌 أضف للمراقبة</button>
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

// دوال مساعدة لعرض تفسيرات مختصرة للمؤشرات الفنية
function getRsiDescription(rsi) {
  if (rsi == null) return 'غير متوفر';
  if (rsi < 30) return 'قوة شراء (مُبالغ في البيع)';
  if (rsi > 70) return 'قوة بيع (مُبالغ في الشراء)';
  return 'وضع طبيعي';
}

function getMacdDescription(macd) {
  if (!macd) return 'غير متوفر';
  if (macd.MACD > macd.signal) return 'إشارة صعودية';
  if (macd.MACD < macd.signal) return 'إشارة هبوطية';
  return 'محايد';
}

function getPriceDescription(price) {
  if (price == null) return 'غير متوفر';
  return price;
}

// إضافة سهم إلى قائمة المراقبة بعد التحقق من عدم وجوده
async function addToWatchlist(symbol) {
  const baseSymbol = symbol.replace('.CA', '');
  const name = prompt('📌 أدخل اسم السهم (اختياري):', '');
  // تحقق أولاً إذا كان السهم موجود بالفعل في قائمة المراقبة
  try {
    const checkRes = await fetch('/api/watchlist/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: baseSymbol })
    });
    const checkData = await checkRes.json();
    if (checkData.exists) {
      alert('⚠️ السهم موجود بالفعل في قائمة المراقبة');
      return;
    }
  } catch (err) {
    // إذا فشل التحقق، استمر في الإضافة كالمعتاد
  }
  try {
    const res = await fetch('/api/watchlist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: baseSymbol, name })
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ تم إضافة السهم بنجاح إلى قائمة المراقبة');
    } else {
      alert('❌ فشل الإضافة: ' + (data.error || 'خطأ غير معروف'));
    }
  } catch (err) {
    alert('❌ فشل الاتصال بالسيرفر');
  }
}

// إضافة سهم فقط (بدون تحليل مباشر) - يمكن استخدامها لاحقًا
async function addSymbolOnly() {
  const symbolInput = document.getElementById('symbolInput');
  const baseSymbol = symbolInput.value.trim().toUpperCase().replace('.CA', '');
  if (!baseSymbol) return alert('يرجى إدخال رمز السهم.');

  const name = prompt('📌 أدخل اسم السهم (اختياري):', '');

  try {
    const res = await fetch('/api/watchlist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: baseSymbol, name })
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ تم الإضافة والتحليل بنجاح');
    } else {
      alert('❌ فشل الإضافة: ' + (data.error || 'خطأ غير معروف'));
    }
  } catch (err) {
    alert('❌ فشل الاتصال بالسيرفر');
  }
}
