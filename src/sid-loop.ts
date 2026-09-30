// Loop detection for SID tunes. A headless emulator logs a hash of the SID registers at every player frame;
// a loop is a period P after which the hash sequence repeats all the way to the end of the scanned stretch.

export type FrameLog = { hashes: Uint32Array; coarse: Uint32Array; times: Float64Array };
export type Loop = { start: number; period: number; coarse: boolean };

/** Shortest loop considered, in player frames (about two seconds at 50 Hz). */
export const LOOP_MIN_FRAMES = 100;
/** The scan ends inside a repeat; that repeated stretch must last at least this many seconds to count as a loop. */
export const LOOP_MIN_RUN_SECONDS = 10;
/** The scan runs this many seconds past the allotted time, so a loop that fills the allotted time still shows a repeat. */
export const LOOP_SCAN_EXTRA = 30;
/** Loops are only used to end a tune when a whole one fits before this many seconds. */
export const LOOP_MIN_END = 20;
/** Length of the fade that finishes on the loop boundary. */
export const LOOP_FADE_SECONDS = 4;

function scan(h: Uint32Array, times: Float64Array): { period: number; run: number } | null {
  const n = h.length;
  if (n < 2) return null;
  const minRun = Math.max(1, Math.ceil(LOOP_MIN_RUN_SECONDS * n / times[n - 1]));
  let best: { period: number; run: number } | null = null;
  for (let p = LOOP_MIN_FRAMES; p <= n - minRun; p++) {
    let run = 0;
    for (let i = n - 1; i - p >= 0 && h[i] === h[i - p]; i--) run++;
    // The longest trailing repeat belongs to the true loop: sub-patterns inside it stop matching sooner.
    if (run >= minRun && (!best || run > best.run)) best = { period: p, run };
  }
  return best;
}

/** Tries the exact register hash first, then the pitch/waveform/envelope hash that ignores free-running sweeps. */
export function findLoop(log: FrameLog): Loop | null {
  const n = log.hashes.length;
  for (const coarse of [false, true]) {
    const found = scan(coarse ? log.coarse : log.hashes, log.times);
    if (!found) continue;
    const startFrame = n - found.run - found.period;
    return { start: log.times[startFrame], period: log.times[startFrame + found.period] - log.times[startFrame], coarse };
  }
  return null;
}

/** End of the last whole loop that fits inside `limit` seconds, or null when none does or it would be too short. */
export function loopEnd(loop: Loop | null, limit: number): number | null {
  if (!loop || loop.period <= 0) return null;
  const whole = Math.floor((limit - loop.start) / loop.period);
  if (whole < 1) return null;
  const end = loop.start + whole * loop.period;
  return end >= LOOP_MIN_END ? end : null;
}
