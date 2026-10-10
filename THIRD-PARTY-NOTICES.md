# Third-party notices

CHIPBLASTER is licensed under the GNU General Public License, version 3 only (`LICENSE`). The parts below come from other projects and
keep their own licenses and credits. All of the licenses listed here allow use in a GPL-3.0 program.

## Code and data bundled in the repository

| Part | Where | Author | License |
| --- | --- | --- | --- |
| Disk drive samples (hum, spin-up, spin-down, two step sounds, bump) | `src/drive-samples.ts` (`VICE_SAMPLES`) | Kajtar Zsolt, from VICE `src/drive/drive-sound.c` | GPL-2.0-or-later |
| Disk drive samples (hum, disk slip, step in, step out, head bang) | `src/drive-samples.ts` (`ULTIMATE_SAMPLES`) | Gideon Zweijtzer, from 1541 Ultimate `roms/sounds.bin` | GPL-3.0 |
| jsSID emulator (the SidCore engine and voice meter readings) | `src/vendor/hermit-jsSID.js`, `src/vendor/sid-core.js` | Hermit (Mihaly Horvath) | permissive use with credit, see https://github.com/og2t/jsSID/blob/master/README.txt |
| 16-segment glyphs | `src/vendor/LED-SEGMENT-ASCII-LICENSE.txt` | David Madison (LED-Segment-ASCII) | MIT |
| Silkscreen font | `src/fonts/Silkscreen-*.ttf`, `src/fonts/OFL.txt` | The Silkscreen Project Authors | SIL OFL 1.1 |
| C64 Keyboard font | `src/fonts/C64Keyboard-Regular.woff2`, `src/fonts/LICENSE-C64Keyboard.txt` | see the license file | CC0 1.0 |

## Dependencies

| Package | License |
| --- | --- |
| libsidplayfp-wasm (libsidplayfp with SIDLite and reSIDfp, built for the web by Chris Gleissner) | GPL-2.0-or-later |
| react, react-dom | MIT |

The installed packages carry their own license files and notices (`node_modules/*/LICENSE`, and `THIRD-PARTY-NOTICES.md` inside
libsidplayfp-wasm).

## Not covered

The HVSC tunes and metadata (High Voltage SID Collection) are not part of this repository and are not covered by the license of this
program. Commodore and C64 belong to their owners.
