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
python3 -m http.server 8765 --directory /home/user/hoa-lobby
# then open http://localhost:8765/index.html
```

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
| Hebrew date | HebCal converter API |
| News panel (Ynet) | rss2json.com proxy → Ynet RSS |
| News ticker (Channel 14) | rss2json.com proxy → Channel 14 RSS |
| Announcements | `announcements.json` fetched on load |

**Shabbat time calculation** — Israeli Rabbinate standard: candle lighting = Friday sunset − 36 min, havdalah = Saturday sunset + 42 min. Both sunsets fetched from HebCal Zmanim using local date strings (not `toISOString()`, which has UTC rollover bugs).

**News panel scroll** — items duplicated in DOM for seamless infinite loop; animation duration = `itemCount * 7` seconds.

**Ticker speed** — duration = `Math.max(80, approxChars * 0.18)` seconds. Adjust the `0.18` multiplier to change speed.

**CORS** — both RSS feeds go through `api.rss2json.com` (AllOrigins fails for Ynet). Direct fetch also fails due to CORS from GitHub Pages HTTPS origin. There is a `fetchRSS()` function using AllOrigins that is not currently called — it's a dead fallback; do not use it for Ynet.

## Android TV / Fully Kiosk Browser compatibility

The lobby TV runs Fully Kiosk Browser on Android, which uses an older Chromium-based WebView. Known constraints:

- **No CSS `inset` shorthand** — use explicit `top: 0; right: 0; bottom: 0; left: 0` instead. Using `inset` will silently collapse absolutely-positioned elements to 0×0.
- **No spaces or parentheses in asset filenames** — the browser fails to load URLs with spaces even when URL-encoded in CSS/JS.
- **Autoplay audio may be blocked** — `startMusic()` gracefully defers to first user interaction if autoplay is denied.

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
