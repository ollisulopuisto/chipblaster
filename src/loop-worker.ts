// Scans a SID tune in the background and reports where it loops. Runs the emulator far faster than real time.
// @ts-ignore vendored JS
import SidCore from './vendor/sid-core.js';
import { findLoop, type FrameLog, type Loop } from './sid-loop';

export type LoopRequest = { id: number; bytes: Uint8Array; subtune: number; seconds: number; primary: number; secondary: number };
export type LoopReply = { id: number; loop: Loop | null; scanned: number; error?: string };

const SAMPLE_RATE = 44100, CHUNK = 16384;

self.onmessage = (e: MessageEvent<LoopRequest>) => {
  const { id, bytes, subtune, seconds, primary, secondary } = e.data;
  try {
    const core = new (SidCore as any)(SAMPLE_RATE, 0);
    core.setSIDModels(primary, secondary);
    core.loadbuffer(bytes, subtune);
    core.start(subtune);
    core.pause();
    const hashes: number[] = [], coarse: number[] = [], times: number[] = [];
    core.attachFrameLog({ hashes, coarse, times });
    const total = Math.floor(SAMPLE_RATE * seconds);
    for (let done = 0; done < total; done += CHUNK) core.skip(Math.min(CHUNK, total - done));
    const log: FrameLog = { hashes: Uint32Array.from(hashes), coarse: Uint32Array.from(coarse), times: Float64Array.from(times) };
    (self as unknown as Worker).postMessage({ id, loop: findLoop(log), scanned: seconds } satisfies LoopReply);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, loop: null, scanned: 0, error: String(err) } satisfies LoopReply);
  }
};
