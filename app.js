// ── Music tracks ──────────────────────────────────────────────────────────────
const MUSIC_TRACKS = [
  'Music/atlasaudio-ambient-astronomy-511860.mp3',
  'Music/atlasaudio-ambient-cinematic-510518.mp3',
  'Music/clavier-music-inspiring-cinematic-ambient-255033.mp3',
  'Music/freemusicforvideo-ambient-piano-524039.mp3',
  'Music/leberch-calm-ambient-354930.mp3',
  'Music/litesaturation-ambient-piano-music-no-copyright-540618.mp3',
  'Music/morgan-ambient-calm-ambient-dreamscape-529861.mp3',
  'Music/quietphase-calm-ambient-491577.mp3',
  'Music/ribhavagrawal-the-realization-ambient-piano-230860.mp3',
  'Music/tunetank-ambient-piano-relaxing-music-347950.mp3',
  'Music/tunetank-cinematic-ambient-348342.mp3',
];

// ── Shabbat mode state ────────────────────────────────────────────────────────
let shabbatTimes = { candleTime: null, havdalahTime: null };
let shabbatModeActive = false;
let lobbyAudio = null; // set by startMusic(), used by Shabbat mode
let shabbatParasha = '';  // parasha/holiday name for Shabbat overlay

// ── Configuration ─────────────────────────────────────────────────────────────
const CONFIG = {
  lat: 31.7683,
  lon: 35.2137,
  hebcalGeonameId: 281184,   // Jerusalem
  // Candle lighting and havdalah are now calculated from sunset — see loadShabbatTimes()
  newsPanelUrl: 'https://www.ynet.co.il/Integration/StoryRss2.xml',  // side panel with images
  newsTickerUrl: 'https://www.c14.co.il/feed/',                       // bottom ticker
  imageRotateMs: 30_000,
  weatherRefreshMs:       10 * 60_000,
  newsRefreshMs:          15 * 60_000,
  announcementsRefreshMs:  5 * 60_000,
  pageReloadMs:           30 * 60_000,
};

// Background images — replace paths with your own photos, e.g. 'images/spring/lobby.jpg'
const IMAGES = [
  'images/building.jpg',
  'images/jerusalem1.jpg',
  'images/jerusalem2.jpg',
  'images/jerusalem3.jpg',
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

  setInterval(loadWeather,       CONFIG.weatherRefreshMs);
  setInterval(loadNews,          CONFIG.newsRefreshMs);
  setInterval(loadAnnouncements, CONFIG.announcementsRefreshMs);
  setTimeout(() => location.reload(), CONFIG.pageReloadMs);

  startMusic();
});

// ── Clock ─────────────────────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('clock');
  const elOverlay = document.getElementById('shabbat-overlay-clock');
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${h}:${m}:${s}`;
    el.textContent = timeStr;
    elOverlay.textContent = timeStr;
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
  const gregStr = `יום ${dayName}, ${dayNum} ${monthName}`;
  document.getElementById('gregorian-date').textContent = gregStr;
  // Store for overlay (combined with Hebrew date)
  document.getElementById('shabbat-overlay-date').dataset.greg = gregStr;
  updateOverlayDate();

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
    const hebStr = data.hebrew ?? '';
    document.getElementById('hebrew-date').textContent = hebStr;
    document.getElementById('shabbat-overlay-date').dataset.heb = hebStr;
    updateOverlayDate();
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
    document.getElementById('shabbat-overlay-weather').textContent =
      `${wmo.icon}  ${Math.round(c.temperature_2m)}°  ${wmo.label}`;
  } catch { /* leave previous value */ }
}

// ── Shabbat times (Israeli Rabbinate: sunset−36 / sunset+42) ─────────────────
async function loadShabbatTimes() {
  const el = document.getElementById('shabbat-content');
  try {
    const now = new Date();
    const dow = now.getDay(); // 0=Sun … 5=Fri, 6=Sat
    const isShabbat     = dow === 6;
    const isErevShabbat = dow === 5;

    // Find the relevant Friday and Saturday dates
    const friday = new Date(now);
    if (dow === 6) {
      friday.setDate(now.getDate() - 1);         // yesterday
    } else {
      const daysAhead = (5 - dow + 7) % 7 || 7;
      friday.setDate(now.getDate() + daysAhead);
    }
    const saturday = new Date(friday);
    saturday.setDate(friday.getDate() + 1);

    // Use local date parts to avoid UTC midnight rollover issues
    const localDate = d =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const zmanimBase = `https://www.hebcal.com/zmanim?cfg=json&latitude=${CONFIG.lat}&longitude=${CONFIG.lon}&tzid=Asia%2FJerusalem`;

    // Fetch sunset for Friday + Saturday and parasha in parallel
    const [friZ, satZ, shabbatData] = await Promise.all([
      fetchJSON(`${zmanimBase}&date=${localDate(friday)}`),
      fetchJSON(`${zmanimBase}&date=${localDate(saturday)}`),
      fetchJSON(`https://www.hebcal.com/shabbat?cfg=json&geonameid=${CONFIG.hebcalGeonameId}&leyning=off`),
    ]);

    const friSunset = friZ?.times?.sunset;
    const satSunset = satZ?.times?.sunset;
    if (!friSunset || !satSunset) throw new Error('Missing sunset times from Zmanim API');

    // Israeli Rabbinate offsets
    const candleTime   = new Date(new Date(friSunset).getTime() - 36 * 60_000);
    const havdalahTime = new Date(new Date(satSunset).getTime() + 42 * 60_000);
    shabbatTimes = { candleTime, havdalahTime };
    shabbatParasha = title;
    scheduleShabbatMode();

    const fmt = d => d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });

    const parasha = shabbatData.items.find(i => i.category === 'parashat');
    const holiday = shabbatData.items.find(i => i.category === 'holiday' && i.yomtov);
    const title   = holiday?.hebrew ?? holiday?.title ?? parasha?.hebrew ?? parasha?.title ?? '';

    if (isShabbat) {
      el.innerHTML = `
        <div class="shabbat-shalom">שבת שלום ✨</div>
        ${title ? `<div class="shabbat-parasha">${escapeHtml(title)}</div>` : ''}
        <div class="shabbat-row active">
          <span class="shabbat-label">✨ הבדלה</span>
          <span class="shabbat-time">${fmt(havdalahTime)}</span>
        </div>
      `;
    } else {
      el.innerHTML = `
        ${title ? `<div class="shabbat-parasha">${escapeHtml(title)}</div>` : ''}
        <div class="shabbat-row ${isErevShabbat ? 'active' : ''}">
          <span class="shabbat-label">🕯️ הדלקת נרות</span>
          <span class="shabbat-time">${fmt(candleTime)}</span>
        </div>
        <div class="shabbat-row">
          <span class="shabbat-label">✨ הבדלה</span>
          <span class="shabbat-time">${fmt(havdalahTime)}</span>
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
  await Promise.all([loadNewsPanel(), loadNewsTicker()]);
}

async function loadNewsPanel() {
  try {
    // rss2json works reliably with Ynet and preserves description HTML (for images)
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(CONFIG.newsPanelUrl)}`;
    const data = await fetchJSON(url);
    if (data.status !== 'ok' || !data.items?.length) throw new Error('bad response');

    const items = data.items.map(i => ({
      title:   i.title?.trim() ?? '',
      pubDate: i.pubDate ?? '',
      image:   i.thumbnail || extractImgFromHtml(i.description ?? ''),
    })).filter(i => i.title);

    renderNewsPanel(items);
  } catch {
    document.getElementById('news-list').innerHTML = '<div class="loading" style="padding:16px">החדשות אינן זמינות</div>';
  }
}

function extractImgFromHtml(html) {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

async function loadNewsTicker() {
  try {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(CONFIG.newsTickerUrl)}`;
    const data = await fetchJSON(url);
    if (data.status !== 'ok' || !data.items?.length) throw new Error('bad response');
    const items = data.items.map(i => ({
      title:   i.title?.trim() ?? '',
      pubDate: i.pubDate ?? '',
    })).filter(i => i.title);
    renderTicker(items);
  } catch {
    document.getElementById('ticker-content').textContent = 'החדשות אינן זמינות כרגע';
  }
}

async function fetchRSS(url) {
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxy);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  if (xml.querySelector('parsererror')) throw new Error('XML parse error');
  return Array.from(xml.querySelectorAll('item'))
    .slice(0, 15)
    .map(el => ({
      title:   el.querySelector('title')?.textContent?.trim() ?? '',
      pubDate: el.querySelector('pubDate')?.textContent?.trim() ?? '',
      image:   extractRSSImage(el),
    }))
    .filter(i => i.title);
}

function extractRSSImage(el) {
  // media:content (most common)
  const mediaContent = el.getElementsByTagName('media:content')[0];
  if (mediaContent?.getAttribute('url')) return mediaContent.getAttribute('url');

  // enclosure tag
  const enclosure = el.querySelector('enclosure');
  if (enclosure) {
    const url  = enclosure.getAttribute('url') ?? '';
    const type = enclosure.getAttribute('type') ?? '';
    if (url && (type.startsWith('image') || /\.(jpe?g|png|webp|gif)/i.test(url))) return url;
  }

  // img tag inside description
  const desc = el.querySelector('description')?.textContent ?? '';
  const m = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m) return m[1];

  return null;
}

function formatPubTime(pubDateStr) {
  if (!pubDateStr) return '';
  const d = new Date(pubDateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function renderNewsPanel(items) {
  const list = document.getElementById('news-list');

  const itemsHtml = items.slice(0, 10).map(item => `
    <div class="news-item">
      ${item.image
        ? `<img class="news-thumb" src="${escapeHtml(item.image)}" onerror="this.style.display='none'" loading="lazy">`
        : '<div class="news-thumb-placeholder"></div>'
      }
      <div class="news-text">
        <div class="news-headline">${escapeHtml(item.title)}</div>
        ${item.pubDate ? `<div class="news-time">${formatPubTime(item.pubDate)}</div>` : ''}
      </div>
    </div>
  `).join('');

  // Duplicate for seamless infinite scroll
  const scroller = document.createElement('div');
  scroller.className = 'news-scroller';
  scroller.innerHTML = itemsHtml + itemsHtml;
  list.innerHTML = '';
  list.appendChild(scroller);

  // ~7 seconds per item — slow enough to read comfortably
  scroller.style.animationDuration = `${items.slice(0, 10).length * 7}s`;
}

function renderTicker(items) {
  const el = document.getElementById('ticker-content');
  const parts = items.map(i => {
    const t = formatPubTime(i.pubDate);
    return `${t ? `<span class="tick-time">${t}</span> ` : ''}${escapeHtml(i.title)}`;
  });
  el.innerHTML = parts.join('&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;');

  const approxChars = items.reduce((n, i) => n + i.title.length + 12, 0);
  el.style.animationDuration = `${Math.max(80, approxChars * 0.18)}s`;
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

// ── Background music ──────────────────────────────────────────────────────────
function startMusic() {
  if (!MUSIC_TRACKS.length) return;

  lobbyAudio = new Audio();
  const audio = lobbyAudio;
  audio.volume = 0.35;

  // Shuffle a copy of the track list
  const queue = [...MUSIC_TRACKS].sort(() => Math.random() - 0.5);
  let idx = 0;

  function playNext() {
    audio.src = queue[idx];
    audio.play().catch(() => {});
    idx = (idx + 1) % queue.length;
    // Reshuffle when we cycle through all tracks
    if (idx === 0) queue.sort(() => Math.random() - 0.5);
  }

  audio.addEventListener('ended', playNext);

  // Try immediately; if blocked by autoplay policy, retry on first interaction
  audio.src = queue[idx++];
  audio.play().catch(() => {
    const resume = () => {
      audio.play().catch(() => {});
      document.removeEventListener('click', resume);
      document.removeEventListener('keydown', resume);
    };
    document.addEventListener('click', resume);
    document.addEventListener('keydown', resume);
  });
}

// ── Shabbat mode ──────────────────────────────────────────────────────────────
let _shabbatModeInterval = null;

function scheduleShabbatMode() {
  // Only register the interval once
  if (_shabbatModeInterval) return;
  checkShabbatMode();
  _shabbatModeInterval = setInterval(checkShabbatMode, 30_000);
}

function checkShabbatMode() {
  const { candleTime, havdalahTime } = shabbatTimes;
  if (!candleTime || !havdalahTime) return;
  const now = Date.now();
  const active = now >= candleTime.getTime() - 30 * 60_000
              && now < havdalahTime.getTime();
  active ? enterShabbatMode() : exitShabbatMode();
}

function enterShabbatMode() {
  if (shabbatModeActive) return;
  shabbatModeActive = true;
  updateShabbatOverlay();
  document.getElementById('shabbat-overlay').classList.add('visible');
  if (lobbyAudio) lobbyAudio.pause();
}

function exitShabbatMode() {
  if (!shabbatModeActive) return;
  shabbatModeActive = false;
  document.getElementById('shabbat-overlay').classList.remove('visible');
  if (lobbyAudio) lobbyAudio.play().catch(() => {});
}

function updateShabbatOverlay() {
  const { candleTime, havdalahTime } = shabbatTimes;
  if (!candleTime || !havdalahTime) return;
  const fmt = d => d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
  document.getElementById('shabbat-candle-time').textContent   = fmt(candleTime);
  document.getElementById('shabbat-havdalah-time').textContent = fmt(havdalahTime);
  const parashaEl = document.getElementById('shabbat-overlay-parasha');
  parashaEl.textContent = shabbatParasha;
  parashaEl.style.display = shabbatParasha ? '' : 'none';
}

function updateOverlayDate() {
  const el = document.getElementById('shabbat-overlay-date');
  const heb  = el.dataset.heb  ?? '';
  const greg = el.dataset.greg ?? '';
  el.textContent = [heb, greg].filter(Boolean).join('  ·  ');
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
  const offsetX = (window.innerWidth  - 1920 * scale) / 2;
  const offsetY = (window.innerHeight - 1080 * scale) / 2;
  const app = document.getElementById('app');
  app.style.transform = `scale(${scale})`;
  app.style.left = offsetX + 'px';
  app.style.top  = offsetY + 'px';
}
scaleToFit();
window.addEventListener('resize', scaleToFit);
