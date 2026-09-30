# CHIPBLASTER

A portable SID station in the browser: browse and play the High Voltage SID Collection (HVSC) through a hi-fi styled player.

**Live site**: https://chipblaster.sulopuis.to/ (mirror: https://ollisulopuisto.github.io/chipblaster/)

## Features

- Search a snapshot of the HVSC #85 catalog (June 2026), filter to saved tunes, queue tunes and build a playlist.
- Play PSID files with a lightweight JavaScript SID emulator; pick subtunes, switch SID 1 between 6581 and 8580 live, and choose 6581/8580/off for SID 2 on multi-SID tunes.
- Infinite play chooses random tunes using catalog duration estimates (three minutes when unknown), not detected loop points. A dice key loads one random tune.
- Three voice meters with waveform lamps (SID 1 amber, SID 2 cyan), a master meter, a frequency spectrum and audio-driven speaker cones.
- Bass, mid and treble tone knobs with optional parametric frequency/Q (right-click or long-press a knob; double-click resets), plus volume on `+` / `-`.
- Cycle visualizer presets with the thumbwheel; fold the case to hide the visualizer while music keeps playing.
- Share a link to the current tune, and save favorites in this browser.
- An in-app manual (MANUAL key on the base plate) lists the controls and shortcuts.

Keyboard: `Space` play/pause, `S` stop, `←`/`→` previous/next song, `+`/`-` volume, `F` favorite, `E` eject (open the browser), `1` saved tunes, `2`–`4` catalog browser. Shortcuts pause while typing.

## Run locally

Node 22.12 or newer:

```
npm ci
npm run dev       # dev server, URL printed by Vite
npm run build     # production build in dist/
npm run preview   # serve the build
```

No server component is needed. The player fetches individual SID files from the Modland HVSC mirror, so the mirror must be reachable and allow browser (CORS) access. Recently played tunes are cached in the browser (up to 100 entries, subject to storage limits). Favorites and cached tunes stay local to each browser and origin; they do not sync between devices or domains.

## Deployment

`.github/workflows/pages.yml` type-checks, builds and deploys to GitHub Pages on every push to `main` (pull requests build only). The site is served from the custom domain `chipblaster.sulopuis.to` (`public/CNAME`) and works from a repository path or a domain root, since Vite uses relative asset paths.

## Limitations

- SID only. There is no local file picker or drag-and-drop, and no MP3 export in the interface.
- The emulator is lightweight: RSID tunes need full C64 emulation, and some digi effects or unusual players may sound different.
- The catalog is a snapshot, not a live index; the mirror can lag or be unavailable.

## Sources and rights

The UI code in `src/App.tsx` and `src/style.css` was written for this project. Bundled third-party code: Hermit's jsSID emulator (`src/vendor/hermit-jsSID.js`, permissive use with credit: https://github.com/og2t/jsSID/blob/master/README.txt), the lamejs MP3 encoder (`src/vendor/lame.all.js`, LGPL, notice in `src/vendor/LAME-LICENSE.txt`) and 16-segment glyphs based on David Madison's MIT-licensed [LED-Segment-ASCII](https://github.com/dmadison/LED-Segment-ASCII) (`src/vendor/LED-SEGMENT-ASCII-LICENSE.txt`). This repository makes no blanket license claim over third-party code or the HVSC metadata.

HVSC tunes are copyrighted and are not included; see https://hvsc.c64.org/download/C64Music/DOCUMENTS/HVSC.txt. This is an independent fan project, not affiliated with HVSC or the library authors.
