# hoa-lobby — Project Context for Cursor
_Refreshed 2026-09-27 against `main`@0bdd767_

## What this is
A static digital signage web app for the lobby TV at קרן היסוד 5 (Jerusalem). Hosted on **GitHub Pages** at `https://arielmarcus.github.io/hoa-lobby`. No build step — plain HTML/CSS/JS, runs directly in any browser including Fully Kiosk Browser on the Android lobby TV.

**Repo:** https://github.com/arielmarcus/hoa-lobby (origin, `main` only branch as of this refresh — 7 stale remote branches were just deleted, all fully merged/superseded, no lost work)
**Local path:** `/Users/marcus/hoa-lobby`

## Deploying changes
Every `git push` to `main` deploys automatically via GitHub Pages (~2 min). The lobby screen auto-reloads every 30 minutes, or immediately on manual refresh.
```bash
git add <files> && git commit -m "..." && git push
```

## Local preview
```bash
python3 -m http.server 8765 --directory /Users/marcus/hoa-lobby
# then open http://localhost:8765/index.html
```

## Updating announcements
Edit `announcements.json` directly and push (or use `admin.html`, the standalone admin portal). Up to 3 shown; format:
```json
[{ "text": "...", "date": "..." }]
```
Announcements auto-refresh every 5 min (`CONFIG.announcementsRefreshMs = 5 * 60_000` in `app.js`), not just on full page reload.

## Architecture
Single-page app: `index.html` (structure) + `style.css` (styles) + `app.js` (all logic). Plus `admin.html` (standalone admin portal for editing announcements).

**Layout** — fixed 1920×1080 canvas scaled to fit any screen via `scaleToFit()` in `app.js`. Uses `position: fixed; transform-origin: top left` with explicit `left`/`top` offset calculation — **do not revert to the flex-centering approach**, which clips the right sidebar on Android TV. Three-column RTL grid inside header + main + footer:
- Right sidebar: Shabbat/holiday times + building announcements panels
- Center: rotating background images
- Left: slow-scrolling Ynet news panel with thumbnails

**Data sources** (all free, no API keys):
| Widget | Source |
|--------|--------|
| Weather | Open-Meteo API (Jerusalem lat/lon) |
| Shabbat times | HebCal Zmanim API (lat/lon + `tzid=Asia/Jerusalem`) |
| Parasha/holiday name | HebCal Shabbat API (`geonameid=281184`) |
| Yom Tov ("high holiday") dates | HebCal main calendar API (`maj=on`, `i=on` for Israel day counts) |
| Hebrew date | HebCal converter API |
| News panel (Ynet) | rss2json.com proxy → Ynet RSS |
| News ticker (Channel 14) | rss2json.com proxy → Channel 14 RSS |
| Announcements | `announcements.json` fetched on load, refreshed every 5 min |

### Shabbat/Havdalah time calculation — read this before touching times
This has been wrong twice before and both wrong versions looked plausible, so the reasoning is preserved here deliberately:
- **Candle lighting** = Friday sunset − 35 min (verified against the shul's published PDF schedule across June/July/September/October).
- **Havdalah / end of holy day** = 8.5° *tzeit hakochavim* ("three medium stars"), computed via solar-position trig directly in `app.js` (`solarDeclinationRad()` + `hourAngleDeg()` + `minutesAfterSunsetForTzeit()}`) — **not** a fixed offset, and **not** HebCal Zmanim's own `tzeit85deg` field. A fixed number of minutes cannot be correct year-round: the gap between sunset and 8.5°-below-horizon is ~35–36 min near Sept/Oct but ~42–43 min near June, because twilight itself is longer near the summer solstice at this latitude. Verified against the shul's own PDFs across **six** separate weeks/holidays (two Shabbatot in June, one in Sept, Yom Kippur, Sukkot, Shmini Atzeret/Simchat Torah) — all within 0–2 min.
- **If Havdalah looks off again**: compare a fresh shul PDF (candle lighting + "Motzei"/"Fast ends"). The tunable constant is `TZEIT_DEPRESSION_DEG` (currently 8.5°) in `app.js`. The trig itself was cross-checked against Python's `astral` library before porting — suspect the constant, not the math.
- Sunsets are fetched from HebCal Zmanim using **local date strings**, not `toISOString()` (UTC rollover bug). Display times use explicit `timeZone: 'Asia/Jerusalem'` so the TV's system timezone can't corrupt them.
- **Friday date bug to never reintroduce**: on Erev Shabbat, `daysAhead = (5 - dow + 7) % 7` evaluates to `0` (today, correct). Do **not** add `|| 7` — that skips to next Friday and shows wrong times.

**Stale parasha/holiday title bug (fixed)** — the sidebar's holiday/parasha *name* used to only refetch weekly, so a just-ended holiday's name (e.g. "יום כיפור") could linger up to 6 days after it ended, even though the candle/havdalah *times* self-corrected immediately. Fixed by (a) `isUpcoming()` filtering out any title whose date already passed, and (b) refetching daily instead of weekly.

**News panel scroll** — items duplicated in DOM for seamless infinite loop; animation duration = `itemCount * 7` seconds.

**Ticker speed** — duration = `Math.max(80, approxChars * 0.18)` seconds. Adjust the `0.18` multiplier to change speed.

**CORS** — both RSS feeds go through `api.rss2json.com` (AllOrigins fails for Ynet). Direct fetch also fails due to CORS from GitHub Pages HTTPS origin. There is a `fetchRSS()` function using AllOrigins that is **not currently called** — it's a dead fallback; do not use it for Ynet.

## Android TV / Fully Kiosk Browser compatibility
The lobby TV runs Fully Kiosk Browser on Android, an older Chromium-based WebView. Known constraints:
- **No CSS `inset` shorthand** — use explicit `top: 0; right: 0; bottom: 0; left: 0` instead. `inset` silently collapses absolutely-positioned elements to 0×0.
- **No spaces or parentheses in asset filenames** — the browser fails to load URLs with spaces even when URL-encoded in CSS/JS.
- **Autoplay audio may be blocked** — `startMusic()` gracefully defers to first user interaction if autoplay is denied.
- **`toLocaleTimeString` may ignore `hour12: false`** — always pass `timeZone: 'Asia/Jerusalem'` alongside `hour12: false` so 24-hour IST display doesn't depend on the TV's system timezone.

## Shabbat mode (and Yom Tov / "high holiday" mode)
Auto-activates 30 min before candle lighting every Friday; deactivates after havdalah Saturday night. The **same** overlay/trigger logic also fires for every Yom Tov where melacha is forbidden — Rosh Hashana, Yom Kippur, Sukkot I, Shmini Atzeret/Simchat Torah, Pesach I & VII, Shavuot — but not Chol HaMoed or minor holidays (Hanukkah, Purim, etc.).

**What it shows:** full-screen overlay, greeting banner (שבת שלום, or holiday-specific greeting), parasha/chag name, live clock, date, weather, candle-lighting time, and end-of-holy-day time in large gold text. Background: `images/challah-shabbat.jpg` with 55% dark overlay (same image used for Yom Tov too — no dedicated chag photo yet).

**Music:** pauses on entry, resumes after the holy day ends.

**Yom Tov calculation** — same convention as Shabbat (sunset − 35 min / 8.5° tzeit), but each multi-day block (e.g. Rosh Hashana I+II) computes its **last** day's sunset independently rather than extrapolating from day 1, so the seasonal trig lands on the right calendar date. Verified against shul PDFs for Yom Kippur and Sukkot/Shmini Atzeret-Simchat Torah (0–2 min match). The 2-day Rosh Hashana case is **not independently PDF-verified** (same formula, should hold, but flag if it ever looks off). **Known simplification:** a chag directly adjoining Shabbat (e.g. Erev Sukkot on Motzei Shabbat) isn't merged into one halachic span — the overlay stays up continuously in practice, but the banner wording can flip between "chag" and "שבת" right at the boundary.

**Holiday greetings** (`greetingForHoliday()`): Rosh Hashana → "שנה טובה ומתוקה", Yom Kippur → "צום קל וגמר חתימה טובה", everything else (Sukkot, Simchat Torah, Pesach, Shavuot) → "חג שמח".

**Key implementation details:**
- Module-level vars: `shabbatTimes`, `shabbatParasha`, `holidayBlocks` (Yom Tov blocks), `shabbatModeActive`, `overlayInfo` (whichever of Shabbat/holiday currently drives the overlay), `lobbyAudio`
- `checkShabbatMode()` checks both `shabbatTimes` and `holidayBlocks` every 30s; a holiday takes priority over a concurrent Shabbat window
- `scheduleShabbatMode()` runs unconditionally on page load (not gated on fetch success) so the 30s poll always runs even if the API calls fail
- `title` (parasha) **must be declared before** `shabbatParasha = title` — TDZ pitfall
- After Shabbat/holiday data (re)loads, `checkShabbatMode()` is called again to refresh `overlayInfo` if the overlay is already showing (race condition fix)
- Overlay: `position: absolute; top/right/bottom/left: 0; z-index: 100` — **do not use `inset` shorthand**

**To preview in browser console** (wait ~3s after page load):
```js
shabbatParasha = 'במדבר'; enterShabbatMode();               // plain Shabbat overlay
overlayInfo = { kind: 'holiday', candleTime: new Date(), havdalahTime: new Date(Date.now()+3600000), nameHe: 'ראש השנה', greeting: 'שנה טובה ומתוקה 🍯🍎' }; enterShabbatMode(); // holiday overlay
```

## Background images
Photos live in `images/` (flat directory, plus `fall/`, `spring/`, `summer/`, `winter/`, `holidays/` subfolders). The `IMAGES` array at the top of `app.js` must list their paths. Rotation interval is `CONFIG.imageRotateMs` (currently 30s).

## Background music
11 ambient/instrumental MP3s live in `Music/`. `startMusic()` shuffles and auto-advances them at `volume = 0.35`. To add tracks: drop MP3s into `Music/` and add their paths to `MUSIC_TRACKS` in `app.js`.

## Admin portal
`admin.html` — standalone page for editing announcements without touching JSON/git by hand. Had mobile save-button and Hebrew double-base64-encoding bugs; both long since fixed on `main`.

## Key tuning knobs (all in `app.js`)
| Constant / expression | What it controls |
|-----------------------|-----------------|
| `CONFIG.imageRotateMs` | Seconds between photo transitions |
| `CONFIG.weatherRefreshMs` | Weather API poll interval |
| `CONFIG.newsRefreshMs` | News API poll interval |
| `CONFIG.announcementsRefreshMs` | Announcements poll interval (5 min) |
| `CONFIG.pageReloadMs` | Full page reload interval |
| `TZEIT_DEPRESSION_DEG` | Solar depression angle (8.5°) for Havdalah/end-of-chag — tune this, not the trig, if times drift |
| `itemCount * 7` in `renderNewsPanel` | News scroll speed (seconds per item) |
| `approxChars * 0.18` in `renderTicker` | Ticker scroll speed multiplier |
| `audio.volume = 0.35` in `startMusic` | Music volume |

## Repo hygiene notes
- Untracked `.DS_Store` present locally, not gitignored — consider adding to `.gitignore`.
- This file (`CURSOR_MIGRATION.md`) and `.claude/` (gitignored) are Claude-Code-specific scaffolding, not needed in Cursor once migrated — `.claude/launch.json` was just a local preview launch config, and `.claude/commands/lobby-announce.md` was a slash command that walked through the announcements-update flow above; in Cursor just do those steps manually.
