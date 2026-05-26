// ── Configuration ─────────────────────────────────────────────────────────────
const CONFIG = {
  lat: 31.7683,
  lon: 35.2137,
  hebcalGeonameId: 281184,   // Jerusalem
  candleLightingMins: 40,    // Jerusalem uses 40 minutes
  newsRssUrl: 'https://www.c14.co.il/feed/',
  newsRssFallback: 'https://www.ynet.co.il/Integration/StoryRss2.xml',
  imageRotateMs: 30_000,
  weatherRefreshMs: 10 * 60_000,
  newsRefreshMs:    15 * 60_000,
  pageReloadMs:     30 * 60_000,
};

// Background images — replace paths with your own photos, e.g. 'images/spring/lobby.jpg'
const IMAGES = [
  'https://picsum.photos/seed/jlm1/1920/1080',
  'https://picsum.photos/seed/jlm2/1920/1080',
  'https://picsum.photos/seed/jlm3/1920/1080',
  'https://picsum.photos/seed/jlm4/1920/1080',
  'https://picsum.photos/seed/jlm5/1920/1080',
];

// ── Hebrew strings ─────────────────────────────────────────────────────────────
const HE_DAYS   = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                   'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

// ── WMO weather codes ──────────────────────────────────────────────────────────
const WMO = {
  0:  { label: 'בהיר', icon: '☀️' },
  1:  { label: 'בהיר חלקית', icon: '🌤️' },
  2:  { label: 'מעונן חלקית', icon: '⛅' },
  3:  { label: 'מעונן', icon: '☁️' },
  45: { label: 'ערפל', icon: '🌫️' },
  48: { label: 'ערפל', icon: '🌫️' },
  51: { label: 'טפטוף קל', icon: '🌦️' },
  53: { label: 'טפטוף', icon: '🌦️' },
  55: { label: 'טפטוף כבד', icon: '🌦️' },
  61: { label: 'גשם קל', icon: '🌧️' },
  63: { label: 'גשם', icon: '🌧️' },
  65: { label: 'גשם כבד', icon: '🌧️' },
  71: { label: 'שלג קל', icon: '🌨️' },
  73: { label: 'שלג', icon: '🌨️' },
  75: { label: 'שלג כבד', icon: '❄️' },
  80: { label: 'מקלחות', icon: '🌦️' },
  81: { label: 'מקלחות', icon: '🌦️' },
  82: { label: 'מקלחות כבדות', icon: '⛈️' },
  95: { label: 'סופת רעמים', icon: '⛈️' },
  96: { label: 'סופת רעמים', icon: '⛈️' },
  99: { label: 'סופת רעמים', icon: '⛈️' },
};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  updateGregorianDate();
  loadHebrewDate();
  loadWeather();
  loadShabbatTimes();
  loadNews();
  loadAnnouncements();
  startImageRotation();

  setInterval(loadWeather, CONFIG.weatherRefreshMs);
  setInterval(loadNews,    CONFIG.newsRefreshMs);
  setTimeout(() => location.reload(), CONFIG.pageReloadMs);
});

// ── Clock ─────────────────────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('clock');
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
  }
  tick();
  setInterval(tick, 1000);
}

// ── Gregorian date in Hebrew ──────────────────────────────────────────────────
function updateGregorianDate() {
  const now = new Date();
  const dayName   = HE_DAYS[now.getDay()];
  const dayNum    = now.getDate();
  const monthName = HE_MONTHS[now.getMonth()];
  document.getElementById('gregorian-date').textContent =
    `יום ${dayName}, ${dayNum} ${monthName}`;

  // Refresh at midnight
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 30, 0);
  setTimeout(updateGregorianDate, tomorrow - now);
}

// ── Hebrew date from HebCal ───────────────────────────────────────────────────
async function loadHebrewDate() {
  const now = new Date();
  try {
    const url = `https://www.hebcal.com/converter?cfg=json&gy=${now.getFullYear()}&gm=${now.getMonth() + 1}&gd=${now.getDate()}&g2h=1`;
    const data = await fetchJSON(url);
    document.getElementById('hebrew-date').textContent = data.hebrew ?? '';
  } catch { /* silent */ }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 1, 0, 0);
  setTimeout(loadHebrewDate, tomorrow - now);
}

// ── Weather ───────────────────────────────────────────────────────────────────
async function loadWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.lat}&longitude=${CONFIG.lon}` +
      `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m&timezone=auto`;
    const data = await fetchJSON(url);
    const c   = data.current;
    const wmo = WMO[c.weathercode] ?? { label: '', icon: '🌡️' };

    document.getElementById('weather-icon-mini').textContent = wmo.icon;
    document.getElementById('weather-temp-mini').textContent = `${Math.round(c.temperature_2m)}°`;
    document.getElementById('weather-desc-mini').textContent =
      `${wmo.label} · מרגיש ${Math.round(c.apparent_temperature)}°`;
  } catch { /* leave previous value */ }
}

// ── Shabbat times ─────────────────────────────────────────────────────────────
async function loadShabbatTimes() {
  const el = document.getElementById('shabbat-content');
  try {
    const url = `https://www.hebcal.com/shabbat?cfg=json&geonameid=${CONFIG.hebcalGeonameId}&m=${CONFIG.candleLightingMins}&leyning=off`;
    const data = await fetchJSON(url);

    const candles  = data.items.find(i => i.category === 'candles');
    const havdalah = data.items.find(i => i.category === 'havdalah');
    const parasha  = data.items.find(i => i.category === 'parashat');
    const holiday  = data.items.find(i => i.category === 'holiday' && i.yomtov);

    const dayOfWeek = new Date().getDay(); // 5 = Fri, 6 = Sat
    const isShabbat = dayOfWeek === 6;
    const isErevShabbat = dayOfWeek === 5;

    const fmt = iso => new Date(iso).toLocaleTimeString('he-IL', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

    // Prefer Hebrew name, fall back to English title
    const title = holiday?.hebrew ?? holiday?.title ?? parasha?.hebrew ?? parasha?.title ?? '';

    if (isShabbat) {
      el.innerHTML = `
        <div class="shabbat-shalom">שבת שלום ✨</div>
        ${title ? `<div class="shabbat-parasha">${escapeHtml(title)}</div>` : ''}
        <div class="shabbat-row active">
          <span class="shabbat-label">✨ הבדלה</span>
          <span class="shabbat-time">${havdalah ? fmt(havdalah.date) : '—'}</span>
        </div>
      `;
    } else {
      el.innerHTML = `
        ${title ? `<div class="shabbat-parasha">${escapeHtml(title)}</div>` : ''}
        <div class="shabbat-row ${isErevShabbat ? 'active' : ''}">
          <span class="shabbat-label">🕯️ הדלקת נרות</span>
          <span class="shabbat-time">${candles ? fmt(candles.date) : '—'}</span>
        </div>
        <div class="shabbat-row">
          <span class="shabbat-label">✨ הבדלה</span>
          <span class="shabbat-time">${havdalah ? fmt(havdalah.date) : '—'}</span>
        </div>
      `;
    }
  } catch {
    el.innerHTML = '<span class="loading">הזמנים אינם זמינים</span>';
  }

  // Refresh next Sunday
  const now = new Date();
  const daysUntilSun = (7 - now.getDay()) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilSun);
  next.setHours(0, 5, 0, 0);
  setTimeout(loadShabbatTimes, next - now);
}

// ── News panel + ticker ────────────────────────────────────────────────────────
async function loadNews() {
  let items = [];

  for (const url of [CONFIG.newsRssUrl, CONFIG.newsRssFallback]) {
    try {
      items = await fetchRSS(url);
      if (items.length) break;
    } catch { /* try next */ }
  }

  if (items.length) {
    renderNewsPanel(items);
    renderTicker(items);
  } else {
    document.getElementById('news-list').innerHTML = '<div class="loading" style="padding:16px">החדשות אינן זמינות</div>';
    document.getElementById('ticker-content').textContent = 'החדשות אינן זמינות כרגע';
  }
}

async function fetchRSS(url) {
  // Use AllOrigins as a CORS proxy, then parse the XML ourselves
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxy);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  if (xml.querySelector('parsererror')) throw new Error('XML parse error');
  return Array.from(xml.querySelectorAll('item'))
    .slice(0, 15)
    .map(el => ({
      title:  el.querySelector('title')?.textContent?.trim() ?? '',
      author: el.querySelector('author, dc\\:creator')?.textContent?.trim() ?? '',
    }))
    .filter(i => i.title);
}

function renderNewsPanel(items) {
  const list = document.getElementById('news-list');

  // Build items HTML — duplicate for seamless loop
  const itemsHtml = items.map(item => `
    <div class="news-item">
      <div class="news-headline">${escapeHtml(item.title)}</div>
      <div class="news-source">${escapeHtml(item.author || '')}</div>
    </div>
  `).join('');

  const scroller = document.createElement('div');
  scroller.className = 'news-scroller';
  // Duplicate content for seamless infinite scroll
  scroller.innerHTML = itemsHtml + itemsHtml;
  list.innerHTML = '';
  list.appendChild(scroller);

  // Set animation duration based on item count (~4s per item)
  const duration = items.length * 4;
  scroller.style.animationDuration = `${duration}s`;
}

function renderTicker(items) {
  const el = document.getElementById('ticker-content');
  const text = items.map(i => i.title).join('     •     ');
  el.textContent = text;
  const charWidth = 11;
  const totalPx = text.length * charWidth + 1920;
  el.style.animationDuration = `${totalPx / 120}s`;
}

// ── Announcements ─────────────────────────────────────────────────────────────
async function loadAnnouncements() {
  const el = document.getElementById('announcements-content');
  try {
    const data = await fetchJSON(`announcements.json?t=${Date.now()}`);
    if (!data.length) throw new Error('empty');
    el.innerHTML = data.slice(0, 3).map(item => `
      <div class="announcement">
        ${escapeHtml(item.text)}
        ${item.date ? `<div class="announcement-date">${escapeHtml(item.date)}</div>` : ''}
      </div>
    `).join('');
  } catch {
    el.innerHTML = '<div class="no-announcements">אין הודעות</div>';
  }
}

// ── Image rotation ────────────────────────────────────────────────────────────
function startImageRotation() {
  if (!IMAGES.length) return;
  const el = document.getElementById('bg-image');
  let index = 0;

  function showNext() {
    el.classList.remove('visible');
    setTimeout(() => {
      el.style.backgroundImage = `url('${IMAGES[index]}')`;
      el.classList.add('visible');
      index = (index + 1) % IMAGES.length;
    }, 800);
  }

  const first = new Image();
  first.onload = first.onerror = showNext;
  first.src = IMAGES[0];

  setInterval(showNext, CONFIG.imageRotateMs);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Scale to fit any screen ────────────────────────────────────────────────────
function scaleToFit() {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  document.getElementById('app').style.transform = `scale(${scale})`;
}
scaleToFit();
window.addEventListener('resize', scaleToFit);
