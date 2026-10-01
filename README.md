# CHIPBLASTER

A portable SID station in the browser: browse and play the High Voltage SID Collection (HVSC) through a hi-fi styled player.

**Live site**: https://chipblaster.sulopuis.to/ (mirror: https://ollisulopuisto.github.io/chipblaster/)

## Screenshots

| Desktop | Tune browser (control lid hinged open) |
| --- | --- |
| ![CHIPBLASTER on desktop](docs/screenshots/desktop.png) | ![Tune browser on desktop](docs/screenshots/desktop-browser.png) |

| Phone (folded case) | Phone tune browser |
| --- | --- |
| <img src="docs/screenshots/phone.png" width="260" alt="CHIPBLASTER on a phone"> | <img src="docs/screenshots/phone-browser.png" width="260" alt="Tune browser on a phone"> |

## Features

- Search a snapshot of the HVSC #85 catalog (June 2026), filter to saved tunes, queue tunes and build a playlist.
- Play PSID files with a lightweight JavaScript SID emulator; pick subtunes, switch SID 1 between 6581 and 8580 live, and choose 6581/8580/off for SID 2 on multi-SID tunes.
- Infinite play and the queue use catalog duration estimates (three minutes when unknown) as the longest a tune may play. A background worker also scans each SID for its loop (`src/sid-loop.ts`); when a whole loop fits inside that time, the tune fades out over four seconds and ends on the loop boundary. Tunes without a detectable loop end at the estimate. A dice key loads one random tune. Infinite play plays the queue first, then draws random tunes from what the browser shows when it is switched on: the search results, the star filter or the open folder.
- Three voice meters with waveform lamps (SID 1 amber, SID 2 cyan), a master meter, a frequency spectrum and audio-driven speaker cones.
- Bass, mid and treble tone knobs with optional parametric frequency/Q (right-click or long-press a knob; double-click resets), plus volume on `+` / `-`.
- WIDE knob for headphones: a mono-safe stereo widener on one-SID tunes, and a chip spread (SID 1 left, SID 2 right) on multi-SID tunes.
- Cycle visualizer presets with the thumbwheel; fold the case to hide the visualizer while music keeps playing.
- Share a link to the current tune, and save favorites in this browser.
- An in-app manual (MANUAL key on the base plate) lists the controls and shortcuts.

Keyboard: `Space` play/pause, `S` stop, `←`/`→` previous/next song, `+`/`-` volume, `F` favorite, `E` eject (open the browser), `[` `]` previous/next subtune, `1` saved tunes, `2`–`4` catalog browser. Shortcuts pause while typing.

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

- SID only. There is no local file picker, drag-and-drop or audio export.
- The emulator is lightweight: RSID tunes need full C64 emulation, and some digi effects or unusual players may sound different.
- The catalog is a snapshot, not a live index; the mirror can lag or be unavailable.

## Sources and rights

The UI code in `src/App.tsx` and `src/style.css` was written for this project. Bundled third-party code: Hermit's jsSID emulator (`src/vendor/hermit-jsSID.js`, permissive use with credit: https://github.com/og2t/jsSID/blob/master/README.txt), and 16-segment glyphs based on David Madison's MIT-licensed [LED-Segment-ASCII](https://github.com/dmadison/LED-Segment-ASCII) (`src/vendor/LED-SEGMENT-ASCII-LICENSE.txt`). This repository makes no blanket license claim over third-party code or the HVSC metadata.

HVSC tunes are copyrighted and are not included; see https://hvsc.c64.org/download/C64Music/DOCUMENTS/HVSC.txt. This is an independent fan project, not affiliated with HVSC or the library authors.

## Last.fm scrobbling (optional)

The LAST.FM key on the bottom plate links the player to a Last.fm account. While linked, a tune is sent as "now playing" when it starts and scrobbled after half its length or four minutes (tunes under 30 seconds are skipped). Artists lose a trailing scene handle: "Marcin Majdzik (Psycho)" becomes "Marcin Majdzik". Scrobbles that cannot be sent wait in the browser and go out later. Each person links their own account in their own browser; the session key never leaves it.

Last.fm signs every write call with a shared secret, so a small Cloudflare Worker (`worker/lastfm-signer`) does the signing and the secret never reaches the page. To switch it on:

1. Create an API account at https://www.last.fm/api/account/create. Note the API key and the shared secret.
2. Deploy the Worker (see `worker/lastfm-signer/README.md`): put the API key and the site origin in `wrangler.toml`, store the secret with `npx wrangler secret put LASTFM_SECRET`, run `npx wrangler deploy`.
3. In the GitHub repository settings add two variables (Settings, Secrets and variables, Actions, Variables): `LASTFM_API_KEY` and `LASTFM_SIGNER_URL` (the Worker URL, without a trailing slash).
4. Build as usual. Without the variables the LAST.FM key is hidden.

For local testing put `VITE_LASTFM_API_KEY` and `VITE_LASTFM_SIGNER` in `.env.local`.

## Trying another SID engine

The default sound comes from the jsSID emulation in an AudioWorklet. For comparison, libsidplayfp (WebAssembly, GPL-2.0-or-later, `libsidplayfp-wasm`) can be chosen with the SID CORE slide selector on the base plate (JS, LITE, RESID). LITE is the default. If the libsidplayfp core cannot start in a browser (no WebAssembly exception support, a blocked worker), the player falls back to JS on its own. The tune carries on from where it was, and the choice is remembered. The address bar does the same:

- `?engine=sidlite` is the fast libsidplayfp engine.
- `?engine=residfp` is the cycle-exact one (several times heavier).
- `?debug` shows the readout without changing the engine.

The engine renders in a Web Worker (`src/fp-worker.ts`) and streams PCM to a small AudioWorklet (`src/fp-sink-worklet.js`); `src/fp-player.ts` presents the same surface as the default player. A readout in the lower left corner shows the engine and its load. For libsidplayfp it is the share of real time spent rendering, measured with a precise clock. For jsSID the worklet has only a coarse clock, so the value is approximate; browsers that provide `AudioContext.renderCapacity` also get the audio thread's own figure.

Feature parity: voice meters and STEREO ENHANCE come from a jsSID core that plays the same tune alongside in the worker, because libsidplayfp gives only the mixed sound. The meters follow the tune, not the exact sound of the chosen core, and the width effect is the same signal added to libsidplayfp's mix. Tape speed is a resampler in the sink and is identical for all cores. Multi-SID tunes use libsidplayfp's own chip placement. RSID tunes that need C64 ROM images do not play, as the ROMs are not bundled.

## Set up hatch and video standard

MANUAL, CLICK, SID CORE and LAST.FM sit under a SET UP hatch below the speaker. Press the hatch: it dips in, swings up and vanishes. The slim tab under the keys closes it. The hatch state is remembered. The title display shows PAL or NTSC from the tune's header; when the header does not say, neither lights and PAL is used.
