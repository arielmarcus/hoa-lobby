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

A preview server config exists at `~/.claude/launch.json`. Start it with `/preview` in Claude Code, or manually:

```bash
python3 -m http.server 8765 --directory /Users/marcus/hoa-lobby
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

**CORS** — both RSS feeds go through `api.rss2json.com` (AllOrigins fails for Ynet). Direct fetch also fails due to CORS from GitHub Pages HTTPS origin.

## Background images

Current photos live in `images/` (flat, not in season subfolders). The `IMAGES` array at the top of `app.js` must be updated to reference them. **Filenames must not contain spaces or parentheses** — Android TV's browser fails to load URLs with spaces even when quoted in CSS.

## Background music

11 ambient/instrumental MP3s live in `Music/`. `startMusic()` in `app.js` shuffles and auto-advances them at `volume = 0.35`. If Android TV's autoplay policy blocks audio, playback starts on first user interaction. To add tracks: drop MP3s into `Music/` and add their paths to the `MUSIC_TRACKS` array at the top of `app.js`. No spaces in filenames.
