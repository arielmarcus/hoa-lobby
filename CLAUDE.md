# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static digital signage web app for the lobby TV at קרן היסוד 5 (Jerusalem). Hosted on GitHub Pages at `https://arielmarcus.github.io/hoa-lobby`. No build step — plain HTML/CSS/JS, runs directly in any browser including Fully Kiosk Browser on the Android lobby TV.

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
Or use the `/preview` skill in Claude Code (launch config is at `~/.claude/launch.json`).

## Updating announcements

Use the `/lobby-announce` project command (interactive), or edit `announcements.json` directly and push. Up to 3 shown; format:
```json
[{ "text": "...", "date": "..." }]
```

## Architecture

Single-page app: `index.html` (structure) + `style.css` (styles) + `app.js` (all logic).

**Layout** — fixed 1920×1080 canvas scaled to fit any screen via `scaleToFit()` in `app.js`. Uses `position: fixed; transform-origin: top left` with explicit `left`/`top` offset calculation — do not revert to the flex-centering approach, which clips the right sidebar on Android TV. Three-column RTL grid inside a header + main + footer:
- Right sidebar: Shabbat times + building announcements panels
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
| Announcements | `announcements.json` fetched on load |

**Shabbat time calculation** — candle lighting = Friday sunset − 35 min (verified against the shul's published schedule year-round: matches exactly, both in July and in September/October). Havdalah = `endOfHolyDay()`'s **candle lighting time + 25h10m**, not a sunset-based calculation at all. This is the shul's actual printed rule (confirmed against their own PDFs for four separate weeks/holidays — a regular Shabbat, Yom Kippur, Sukkot, and Shmini Atzeret/Simchat Torah — all matching within 0–1 minute; see git history on this file for the two earlier, wrong attempts: a fixed `sunset+42min` and HebCal's degree-based `tzeit85deg` zman, each off by several minutes in different directions). Sunsets fetched from HebCal Zmanim using local date strings (not `toISOString()`, which has UTC rollover bugs). Times formatted with explicit `timeZone: 'Asia/Jerusalem'` so display is correct regardless of Android TV system timezone.

**If Havdalah still looks off** — compare against a fresh shul PDF (candle lighting time + "Motzei"/"Fast ends" time). `endOfHolyDay()` takes `numDays` for multi-day chagim (e.g. 2 for Rosh Hashana) so it adds `numDays × 24h + 70min` from the first day's candle lighting — if a multi-day case looks wrong, check that math first before doubting the 25h10m constant itself, which is well-verified for single-day cases.

**Friday date calculation** — on Erev Shabbat (`dow === 5`) `daysAhead = (5 - dow + 7) % 7` evaluates to `0`, meaning friday = today (correct). Do **not** add `|| 7` — that skips to next Friday and shows wrong times.

**News panel scroll** — items duplicated in DOM for seamless infinite loop; animation duration = `itemCount * 7` seconds.

**Ticker speed** — duration = `Math.max(80, approxChars * 0.18)` seconds. Adjust the `0.18` multiplier to change speed.

**CORS** — both RSS feeds go through `api.rss2json.com` (AllOrigins fails for Ynet). Direct fetch also fails due to CORS from GitHub Pages HTTPS origin. There is a `fetchRSS()` function using AllOrigins that is not currently called — it's a dead fallback; do not use it for Ynet.

## Android TV / Fully Kiosk Browser compatibility

The lobby TV runs Fully Kiosk Browser on Android, which uses an older Chromium-based WebView. Known constraints:

- **No CSS `inset` shorthand** — use explicit `top: 0; right: 0; bottom: 0; left: 0` instead. Using `inset` will silently collapse absolutely-positioned elements to 0×0.
- **No spaces or parentheses in asset filenames** — the browser fails to load URLs with spaces even when URL-encoded in CSS/JS.
- **Autoplay audio may be blocked** — `startMusic()` gracefully defers to first user interaction if autoplay is denied.
- **`toLocaleTimeString` may ignore `hour12: false`** — always pass `timeZone: 'Asia/Jerusalem'` alongside `hour12: false` in time formatting calls to ensure 24-hour IST display regardless of the TV's system timezone.

## Shabbat mode (and Yom Tov / "high holiday" mode)

Auto-activates 30 minutes before candle lighting every Friday; deactivates after havdalah Saturday night. The same overlay and the same trigger logic also activate for every Yom Tov day where melacha is forbidden — Rosh Hashana, Yom Kippur, Sukkot I, Shmini Atzeret/Simchat Torah, Pesach I & VII, Shavuot — but **not** Chol HaMoed or minor holidays (Hanukkah, Purim, etc.), which stay normal days.

**What it shows:** Full-screen overlay with a greeting banner (שבת שלום, or a holiday-specific greeting — see below), the parasha/chag name, live clock, date, weather, "candle lighting" time and an end-of-holy-day time in large gold text. Background: `images/challah-shabbat.jpg` with a 55% dark overlay (same image for Yom Tov — there's no dedicated chag photo yet).

**Music:** pauses on entry, resumes after the holy day ends.

**Yom Tov time calculation** — same convention as Shabbat: candle lighting = sunset (evening before the chag starts) − 35 min, end of chag = `endOfHolyDay(candleTime, numDays)` (candle + `numDays × 24h + 70min`, `numDays` = the block's length so a 2-day chag like Rosh Hashana correctly lands after day 2, not day 1). This is **verified** against the shul's own PDFs for Yom Kippur (1 day) and Sukkot/Shmini Atzeret-Simchat Torah (each treated as 1 day in Israel) — all matched exactly. The 2+-day case (Rosh Hashana) is *not* independently verified since no PDF for it was available, but it's the same formula that nailed every single-day case, so it should hold. `loadHolidayTimes()` fetches a rolling 120-day window from HebCal's main calendar API and groups consecutive Yom Tov days (e.g. Rosh Hashana I+II) into one block per chag. **Known simplification:** a chag directly adjoining Shabbat (e.g. Erev Sukkot on Motzei Shabbat, or Yom Tov running into Shabbat) is not merged into one halachically-continuous span — in practice the overlay still stays up continuously (the two windows' active ranges overlap), but the banner/label can flip between "chag" and "שבת" wording right at the boundary instead of showing a combined message.

**Holiday greetings** (`greetingForHoliday()` in `app.js`): Rosh Hashana → "שנה טובה ומתוקה", Yom Kippur → "צום קל וגמר חתימה טובה", everything else (Sukkot, Simchat Torah, Pesach, Shavuot) → "חג שמח".

**Key implementation details:**
- Module-level vars: `shabbatTimes`, `shabbatParasha`, `holidayBlocks` (Yom Tov blocks), `shabbatModeActive`, `overlayInfo` (whichever of Shabbat/holiday is currently driving the overlay), `lobbyAudio`
- `checkShabbatMode()` checks both `shabbatTimes` and `holidayBlocks` every 30s; a holiday takes priority over a concurrent Shabbat window in `overlayInfo`
- `scheduleShabbatMode()` is called unconditionally on page load (not just after a successful fetch) so the 30s poll always runs even if the times/holiday API calls fail; registered once via `_shabbatModeInterval` guard
- `title` (parasha) **must be declared before** `shabbatParasha = title` — TDZ pitfall
- After Shabbat or holiday data (re)loads, `checkShabbatMode()` is called again to refresh `overlayInfo` if the overlay is already showing (race condition fix)
- Overlay uses `position: absolute; top/right/bottom/left: 0; z-index: 100` — **do not use `inset` shorthand** (breaks on Fully Kiosk Browser)

**To preview in browser console** (wait ~3 seconds after page load):
```js
shabbatParasha = 'במדבר'; enterShabbatMode();               // plain Shabbat overlay
overlayInfo = { kind: 'holiday', candleTime: new Date(), havdalahTime: new Date(Date.now()+3600000), nameHe: 'ראש השנה', greeting: 'שנה טובה ומתוקה 🍯🍎' }; enterShabbatMode(); // holiday overlay
```

## Background images

Photos live in `images/` (flat directory). The `IMAGES` array at the top of `app.js` must list their paths. Rotation interval is `CONFIG.imageRotateMs` (currently 30 s).

## Background music

11 ambient/instrumental MP3s live in `Music/`. `startMusic()` in `app.js` shuffles and auto-advances them at `volume = 0.35`. To add tracks: drop MP3s into `Music/` and add their paths to the `MUSIC_TRACKS` array at the top of `app.js`.

## Key tuning knobs (all in `app.js`)

| Constant / expression | What it controls |
|-----------------------|-----------------|
| `CONFIG.imageRotateMs` | Seconds between photo transitions |
| `CONFIG.weatherRefreshMs` | Weather API poll interval |
| `CONFIG.newsRefreshMs` | News API poll interval |
| `CONFIG.pageReloadMs` | Full page reload interval |
| `itemCount * 7` in `renderNewsPanel` | News scroll speed (seconds per item) |
| `approxChars * 0.18` in `renderTicker` | Ticker scroll speed multiplier |
| `audio.volume = 0.35` in `startMusic` | Music volume |
