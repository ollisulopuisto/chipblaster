# CHIPBLASTER

A browser-based SID/HVSC player in a portable hi-fi interface. Browse a catalog snapshot, play PSID files, choose subtunes, view live voice meters and waveforms, export MP3, and save favorite archive paths in this browser. The player loads SID audio files one at a time from the Modland HVSC mirror; this repository does **not** bundle the copyrighted HVSC tunes. Previously played tunes are cached in the browser (up to 100 entries), subject to storage availability and browser eviction. Local uploads and favorited paths are not synchronized between devices.

## Run locally

Node 22.12 or newer: run `npm ci`, then `npm run dev`. Open the URL printed by Vite. `npm run build` creates `dist/`; `npm run preview` checks that build. No server-side component is required. HTTPS is required for some browser storage features. A cross-origin mirror must allow browser CORS access, or wait for the mirror to return. Some SIDs (RSID) require full C64 emulation and are not supported by this lightweight player.

## Publish on GitHub Pages

This project uses Vite's relative asset base (`./`). The included `.github/workflows/pages.yml` builds and deploys on pushes to `main`, or on manual dispatch.

1. Create a public GitHub repository, e.g. `chipblaster` under your account. Do not initialize it with another README if pushing this folder.
2. In repository **Settings → Pages**, select **GitHub Actions** as the build/deploy source.
3. Initialize this directory as a Git repository, stage and commit its source files, connect it to the repository you created, and push the `main` branch using your own Git client. Do not include `node_modules` or `dist` in the commit (the `.gitignore` excludes them). GitHub may ask you to authenticate on your own machine; use your own credential manager. Do not paste a password or token into a shared chat or repository.
4. After the workflow succeeds, GitHub shows the actual site URL in **Settings → Pages** and the deployment job. Do not assume the URL before checking it.

## Source and rights

The UI code in `src/App.tsx` and `src/style.css` was built for this project. It includes locally bundled third-party libraries: Hermit's jsSID emulator (`src/vendor/hermit-jsSID.js`) and the lamejs MP3 encoder (`src/vendor/lame.all.js`). Hermit's original README grants permissive use with credit: https://github.com/og2t/jsSID/blob/master/README.txt . LAME is LGPL; its notice is included as `src/vendor/LAME-LICENSE.txt`. This repository makes no blanket license claim over the third-party code or the HVSC metadata. The HVSC tunes and commercial game music are copyrighted; this repo contains no music files. See https://hvsc.c64.org/download/C64Music/DOCUMENTS/HVSC.txt .

The catalog paths and metadata are a snapshot of HVSC #85 (June 2026), not a live index. Audio loading depends on the public mirror, and that service can be unavailable. The current SID-only interface does not expose a local file picker. This is an independent fan project, not affiliated with HVSC or the library authors.

## Player design and controls (September 30, 2026)

CHIPBLASTER is SID/HVSC-only. It starts folded on phones, with the title strip and transport keys above the speaker grilles. The handle slides out the visualizer, voice and master analog meters, green master spectrum, SID model selectors, tone controls, and progress rail. Retracting the screen hides the visualizer while audio continues. The title and time use segmented cyan character cells with a true 16-segment LED cell for each character, including VU labels and tape counter. The visual presets include Bitmap zoomer and Sprite raster, original demoscene-inspired patterns rather than an extra bar/VU display. There is no duplicate NOW PLAYING panel beneath the visualizer; the operating notes open over the device as a modal without changing its height.

Eject opens the High Voltage SID Collection browser. The labelled paddle switches between HVSC Search and Playlist. Search includes a saved-only filter and result pagination. The selector keeps the folder and result list within its panel, with internal scrolling. The catalog is an HVSC #85 snapshot, not a live index, and the Modland mirror can lag or fail. Only individual tunes are fetched. Saved links are not stored audio and are not synchronized to other devices. This revision uses a full-height playlist drawer with per-row favorite and remove keys. Its current Played / Playing now / Up next grouping and redundant state cues are an unfinished design study, awaiting feedback. Phone row density is also under review.

The play/pause key is shallow while playing and deeper while paused; its pause lens blinks red while paused and remains grey otherwise. The favorite lens is grey when inactive and green when saved. STOP is separate. Rewind and fast-forward cue while held. The large PREVIOUS/NEXT keys skip songs, not SID subtunes; subtunes have a separate dropdown. The icon-only key faces use a single upper-left lighting direction: depressing a key changes its face but its cast shadow remains anchored. The restored bass/mid/treble rotary controls use the selected K10 hardware-board study: face-on satin aluminum, quiet lathe rings and a shallow upper-left crosslight; no master-level knob is shown. The keyboard +/- controls change output volume. VU labels use the same D2 segment text as the title; the green frequency analyzer uses square LED-matrix blocks and separate peak-hold dashes. The current audio-driven speaker cones move behind fixed grilles.

SID 1 can switch 6581/8580 live. A second selector appears for multi-SID tunes. Three voice meters report register waveform combinations; MASTER meters the mixed output. INFINITE PLAY picks random HVSC tunes using catalog duration estimates (or three minutes when unknown), not detected loop points. MP3 export renders the loaded SID. The bass/mid/treble EQ and volume controls use Web Audio. Right-click a tone knob or long-press it on touch for frequency/Q; double-click to reset. The recessed visual thumbwheel cycles presets vertically, with wheel and keyboard support.

The original JS SID emulator is lightweight: RSID needs full C64 emulation, and some digi effects or unusual players may differ. The ZIP is a source project, not a bundle of licensed SID music. Preview or host it yourself with Vite; GitHub Pages workflow is supplied, but no GitHub publication is claimed.

16-segment glyph bitmaps are based on David Madison's MIT-licensed LED-Segment-ASCII library, https://github.com/dmadison/LED-Segment-ASCII . The full attribution and license are included in `src/vendor/LED-SEGMENT-ASCII-LICENSE.txt`.

## v47 mechanism and display revision

The 3D inspection view has been removed. Normal screen folding, live controls and drawers remain. VU needles use a near-critically-damped velocity model instead of fast first-order tracking. Painted down-right needle/hub shadows and a glass overlay remain CSS/canvas approximations, not physical z planes. The OUTPUT pilot warns at absolute final-tap sample peaks >=0.999 with a 600 ms hold; it does not imply calibrated dB VU or diagnose audible distortion.

Four shared waveform apertures show triangle, saw, pulse and noise. SID 1 lights green, SID 2 cyan, and matching modes use a green glyph with a cyan lower edge. The labels follow live waveform registers independently for the two chips, including combined modes. Switching SID 2 off removes its waveform lights and needle. The visual thumbwheel has denser middle grooves and angular projection while turning. Tone knobs retain fixed broad crosslight and rings, with a subtle moving pointer shadow and faint local surface variation.

## v52 repository package

This package matches public player v52 / generation 29, with a standalone React/Vite wrapper. The waveform/meter performance hotfix is included. Original VU aspect ratios are retained; at 701-1024px widths the spectrum height follows the meter modules. The center tone-scale marking is removed. Flat coaxial bass, mid and tweeter elements have independent band-driven envelopes and different excursion sizes. This is a visual model, not a physical speaker simulation.

Share links point to this deployment, not to the hosted review page. Relative assets work under a repository path, at the domain root, or on a custom domain. Favorites remain local to each browser and origin; existing favorites on another domain do not transfer automatically.

### CI/CD included

`.github/workflows/pages.yml` installs locked dependencies with `npm ci`, checks TypeScript and builds Vite output. Pushes to `main` build and deploy `dist` to GitHub Pages. Pull requests targeting `main` build only; they do not deploy. Manual dispatch on `main` can redeploy. Node 22 is used. The workflow uses checkout/setup-node v6, configure-pages v5, upload-pages-artifact v4 and deploy-pages v4. No personal token is required; deployment uses GitHub's built-in token with scoped Pages permissions.

Unzip the contents into the repository root. Include the hidden `.github` and `.gitignore` files. Do not commit the ZIP itself as the only file. In Settings > Pages > Build and deployment > Source, choose GitHub Actions. Enable Actions if the repository has them disabled. Push `main` (or change both workflow branch filters and the deploy condition if you use another default branch). Watch the Publish GitHub Pages run in Actions; its deployment output and Settings > Pages show the actual live URL. If you enable Pages after the first push, rerun the workflow manually on `main`.

Local check: `npm ci`, `npm run build`, then `npm run preview`. Build output is not included in this source ZIP. The workflow has not been run on your repository, and no repository settings have been changed by this package.

References:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://vite.dev/guide/static-deploy.html
