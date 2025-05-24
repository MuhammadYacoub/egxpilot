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
<div class="analysis-card">
  <div class="card-header">
    <h2><span id="stock-symbol">${data.symbol}</span>${data.name ? ' – <span id="stock-name">' + data.name + '</span>' : ''}</h2>
    <span class="analysis-date">📅 تحليل بتاريخ: ${new Date(data.analyzedAt).toLocaleDateString("ar-EG")}</span>
  </div>

  <div class="card-price">
    <span>💰 السعر الحالي:</span>
    <strong>${data.lastPrice?.toFixed(2) ?? 'غير متوفر'} جنيه</strong>
  </div>

  <div class="core-insights">
    <div><strong>📈 الاتجاه:</strong> ${data.trend}</div>
    <div><strong>🔄 التقاطع:</strong> ${data.emaCross}</div>
    <div><strong>📊 الزخم:</strong> ${data.momentumSignal}</div>
    <div><strong>🔊 حجم التداول:</strong> ${data.volumeSpike ? "مرتفع" : "طبيعي"}</div>
  </div>

  <div class="levels">
    <div>
      <strong>🧱 مستويات الدعم:</strong>
      ${data.supportLevels?.map(v => v.toFixed(2)).join(" / ") || "غير متوفر"}
    </div>
    <div>
      <strong>🚧 مستويات المقاومة:</strong>
      ${data.resistanceLevels?.map(v => v.toFixed(2)).join(" / ") || "غير متوفر"}
    </div>
  </div>

  <div class="candles-theories">
    <div><strong>🕯️ نمط الشمعة:</strong> ${data.candleSignal}</div>
    <div><strong>📚 نظرية إليوت:</strong> ${data.elliottWave}</div>
    <div><strong>📦 وايكوف:</strong> ${data.wyckoffPhase}</div>
  </div>

  <div class="confidence-score">
    <strong>⚡ درجة الثقة:</strong>
    <div class="confidence-bar">
      <div class="confidence-bar-fill" style="width: ${data.score}%"></div>
    </div>
    <span class="confidence-percent">${data.score}%</span>
  </div>

  <div class="recommendation">
    <strong>🔍 التوصية:</strong>
    <span class="recommendation-badge">${data.recommendation}</span>
  </div>

  <div class="summary-section">
    <h3>📄 الملخص الذكي:</h3>
    <p>${data.summary}</p>
  </div>

  <div class="card-actions">
    <button onclick="addToWatchlist('${data.symbol}')">📌 أضف للمراقبة</button>
    <button onclick="alert('🚧 سيتم الحفظ كمملوك قريبًا')">✅ أضف كمملوك</button>
  </div>
</div>
`;

    }
    box.style.display = 'block';
  } catch (err) {
    box.innerHTML = `<p style='color:red;'>فشل في جلب البيانات.<br>تأكد أنك شغلت السيرفر (npm run dev أو npm start) وافتح الموقع عبر <b>http://localhost:PORT</b> وليس مباشرة من الملفات.<br><span style='font-size:13px;color:#888;'>${err.message || err}</span></p>`;
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

