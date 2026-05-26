// ── Configuration ────────────────────────────────────────────────────────────
// Edit these values to match your building
const CONFIG = {
  buildingName: 'Your Building Name',   // Change this
  lat: 31.7683,
  lon: 35.2137,
  hebcalGeonameId: 281184,              // Jerusalem
  candleLightingMins: 40,               // Jerusalem uses 40 minutes
  newsRssUrl: 'https://www.timesofisrael.com/feed/',
  imageRotateMs: 30_000,   // 30 seconds between image changes
  weatherRefreshMs: 10 * 60_000,
  newsRefreshMs: 15 * 60_000,
  pageReloadMs: 30 * 60_000,
};

// Default background images (placeholder photos from picsum.photos).
// To use your own: drop files into the images/ subfolders and list their
// paths here, e.g. 'images/spring/lobby.jpg'
const IMAGES = [
  'https://picsum.photos/seed/jlm1/1920/1080',
  'https://picsum.photos/seed/jlm2/1920/1080',
  'https://picsum.photos/seed/jlm3/1920/1080',
  'https://picsum.photos/seed/jlm4/1920/1080',
  'https://picsum.photos/seed/jlm5/1920/1080',
];

// ── WMO weather code map ──────────────────────────────────────────────────────
const WMO = {
  0:  { label: 'Clear sky',       icon: '☀️' },
  1:  { label: 'Mainly clear',    icon: '🌤️' },
  2:  { label: 'Partly cloudy',   icon: '⛅' },
  3:  { label: 'Overcast',        icon: '☁️' },
  45: { label: 'Foggy',           icon: '🌫️' },
  48: { label: 'Icy fog',         icon: '🌫️' },
  51: { label: 'Light drizzle',   icon: '🌦️' },
  53: { label: 'Drizzle',         icon: '🌦️' },
  55: { label: 'Heavy drizzle',   icon: '🌦️' },
  61: { label: 'Light rain',      icon: '🌧️' },
  63: { label: 'Rain',            icon: '🌧️' },
  65: { label: 'Heavy rain',      icon: '🌧️' },
  71: { label: 'Light snow',      icon: '🌨️' },
  73: { label: 'Snow',            icon: '🌨️' },
  75: { label: 'Heavy snow',      icon: '❄️' },
  80: { label: 'Showers',         icon: '🌦️' },
  81: { label: 'Showers',         icon: '🌦️' },
  82: { label: 'Heavy showers',   icon: '⛈️' },
  95: { label: 'Thunderstorm',    icon: '⛈️' },
  96: { label: 'Thunderstorm',    icon: '⛈️' },
  99: { label: 'Thunderstorm',    icon: '⛈️' },
};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('building-name').textContent = CONFIG.buildingName;

  startClock();
  loadHebrewDate();
  loadWeather();
  loadShabbatTimes();
  loadNews();
  loadAnnouncements();
  startImageRotation();

  setInterval(loadWeather, CONFIG.weatherRefreshMs);
  setInterval(loadNews, CONFIG.newsRefreshMs);
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

// ── Hebrew date ───────────────────────────────────────────────────────────────
async function loadHebrewDate() {
  const now = new Date();
  try {
    const url = `https://www.hebcal.com/converter?cfg=json&gy=${now.getFullYear()}&gm=${now.getMonth() + 1}&gd=${now.getDate()}&g2h=1`;
    const data = await fetchJSON(url);
    document.getElementById('hebrew-date').textContent = data.hebrew || '';
  } catch {
    // silent — clock is still showing
  }
  // Schedule reload at next midnight
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 1, 0, 0);
  setTimeout(loadHebrewDate, tomorrow - now);
}

// ── Weather ───────────────────────────────────────────────────────────────────
async function loadWeather() {
  const el = document.getElementById('weather-content');
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.lat}&longitude=${CONFIG.lon}` +
      `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m&timezone=auto`;
    const data = await fetchJSON(url);
    const c = data.current;
    const wmo = WMO[c.weathercode] ?? { label: 'Unknown', icon: '🌡️' };

    el.innerHTML = `
      <div class="weather-icon">${wmo.icon}</div>
      <div>
        <div class="weather-temp">${Math.round(c.temperature_2m)}°</div>
        <div class="weather-desc">${wmo.label}</div>
        <div class="weather-meta">Feels ${Math.round(c.apparent_temperature)}° · Wind ${Math.round(c.windspeed_10m)} km/h</div>
      </div>
    `;
  } catch {
    el.innerHTML = '<span class="loading">Weather unavailable</span>';
  }
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

    const title = holiday?.title ?? parasha?.title ?? '';
    const dayOfWeek = new Date().getDay(); // 5=Fri, 6=Sat

    const fmt = iso => new Date(iso).toLocaleTimeString('he-IL', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

    el.innerHTML = `
      ${title ? `<div class="shabbat-parasha">${title}</div>` : ''}
      <div class="shabbat-row ${dayOfWeek === 5 ? 'active' : ''}">
        <span class="shabbat-label">🕯️ Candle lighting</span>
        <span class="shabbat-time">${candles ? fmt(candles.date) : '—'}</span>
      </div>
      <div class="shabbat-row ${dayOfWeek === 6 ? 'active' : ''}">
        <span class="shabbat-label">✨ Havdalah</span>
        <span class="shabbat-time">${havdalah ? fmt(havdalah.date) : '—'}</span>
      </div>
    `;
  } catch {
    el.innerHTML = '<span class="loading">Times unavailable</span>';
  }

  // Refresh next Sunday at midnight so we always show the coming Shabbat
  const now = new Date();
  const daysUntilSun = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSun);
  nextSunday.setHours(0, 5, 0, 0);
  setTimeout(loadShabbatTimes, nextSunday - now);
}

// ── News ticker ───────────────────────────────────────────────────────────────
async function loadNews() {
  const el = document.getElementById('ticker-content');
  try {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(CONFIG.newsRssUrl)}&count=12`;
    const data = await fetchJSON(apiUrl);
    if (data.status !== 'ok' || !data.items?.length) throw new Error('bad response');

    const text = data.items.map(i => i.title).join('     •     ');
    el.textContent = text;

    // Adjust speed to content length: ~120px/s
    const charWidth = 11; // approx px per char at 19px font
    const totalPx = text.length * charWidth + window.innerWidth;
    const duration = totalPx / 120;
    el.style.animationDuration = `${duration}s`;
  } catch {
    el.textContent = 'News temporarily unavailable';
    el.style.animationDuration = '20s';
  }
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
    el.innerHTML = '<div class="no-announcements">No announcements</div>';
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
    }, 600);
  }

  // Preload first image then show
  const img = new Image();
  img.onload = showNext;
  img.onerror = showNext;
  img.src = IMAGES[0];

  setInterval(showNext, CONFIG.imageRotateMs);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
