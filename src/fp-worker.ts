// Test engine: libsidplayfp (WebAssembly, GPL-2.0+) renders PCM in this worker and streams it to the fp-sink AudioWorklet.
// Reached with ?engine=sidlite or ?engine=residfp. The default jsSID engine in the worklet is untouched.
// @ts-ignore vendored JS
import SidCore from './vendor/sid-core.js';
import { SidAudioEngine } from 'libsidplayfp-wasm';
import residWasm from 'libsidplayfp-wasm/dist/libsidplayfp.wasm?url';
import liteWasm from 'libsidplayfp-wasm/dist/sidlite/libsidplayfp.wasm?url';

const CHUNK = 4096;
const BLOCK = 1024; // meter readings per block, four to a chunk
type Cmd =
  | { type: 'init'; sampleRate: number; engine: 'sidlite' | 'residfp'; port: MessagePort }
  | { type: 'load'; bytes: Uint8Array; subtune: number; gen: number }
  | { type: 'start'; subtune: number; gen: number }
  | { type: 'stop'; gen: number }
  | { type: 'models'; primary: number; secondary: number }
  | { type: 'seek'; id: number; seconds: number; gen: number }
  | { type: 'cancelSeek' };

let engine: SidAudioEngine | null = null;
// A jsSID core plays the same tune alongside, only to feed what libsidplayfp cannot: per-voice meters and the side signal for STEREO ENHANCE.
let analysis: any = null;
let models: [number, number] = [6581, 6581];
const tmpL = new Float32Array(BLOCK), tmpR = new Float32Array(BLOCK);
let sink: MessagePort;
let sampleRate = 44100;
let kind: 'sidlite' | 'residfp' = 'sidlite';
let bytes: Uint8Array | null = null;
let subtune = 0;
let gen = 0;
let wanted = 0; // frames the sink has asked for and not yet received
let busy = false;
let seekCancelled = false;
let renderMs = 0, renderFrames = 0, lastReport = 0, peak = 0;

// The loader finds its .wasm next to its own script, which a bundler or the dev server moves; name the files explicitly.
const locateFile = (path: string) => path.endsWith('.wasm') ? (kind === 'residfp' ? residWasm : liteWasm) : path;
const fresh = () => new SidAudioEngine({ engine: kind, sampleRate, stereo: true, locateFile } as any);

let sidModel: 'MOS6581' | 'MOS8580' = 'MOS6581';
const applyModel = () => engine!.setEmulationConfig({ sidModel, forceSidModel: false } as any);

async function reload(song: number) {
  if (!bytes) return;
  engine?.dispose();
  engine = fresh();
  await engine.loadSidBuffer(bytes, song);
  await applyModel();
  analysis = new (SidCore as any)(sampleRate, 0);
  analysis.setSIDModels(models[0], models[1]);
  analysis.loadbuffer(bytes, song);
  analysis.playcont();
  subtune = song;
}

async function pump() {
  if (busy) return;
  busy = true;
  try {
    while (engine && wanted > 0) {
      const myGen = gen;
      const t0 = engine.getTimeMs() / 1000;
      const a = performance.now();
      const pcm = await engine.renderFrames(CHUNK);
      const spent = performance.now() - a;
      if (myGen !== gen) { continue; }
      const l = new Float32Array(CHUNK), r = new Float32Array(CHUNK), side = new Float32Array(CHUNK);
      const blocks = CHUNK / BLOCK, levels = new Float32Array(blocks * 7), waves = new Float32Array(blocks * 6);
      for (let i = 0; i < CHUNK; i++) { l[i] = pcm[2 * i] / 32768; r[i] = pcm[2 * i + 1] / 32768; }
      if (analysis) {
        const chips = analysis.stereoActive();
        for (let k = 0; k < blocks; k++) {
          analysis.processWide(tmpL, tmpR, BLOCK, 1);
          if (!chips) for (let i = 0; i < BLOCK; i++) side[k * BLOCK + i] = (tmpL[i] - tmpR[i]) / 2;
          analysis.finishMeters(BLOCK);
          for (let v = 0; v < 7; v++) levels[k * 7 + v] = analysis.voiceLevels[v];
          for (let v = 0; v < 6; v++) waves[k * 6 + v] = analysis.voiceWaveforms[v];
          analysis.resetMeters();
        }
      }
      sink.postMessage({ type: 'chunk', gen: myGen, t0, l, r, s: side, levels, waves, blocks }, [l.buffer, r.buffer, side.buffer]);
      wanted -= CHUNK;
      renderMs += spent; renderFrames += CHUNK;
      const ratio = spent / (CHUNK / sampleRate * 1000);
      if (ratio > peak) peak = ratio;
      const now = performance.now();
      if (now - lastReport > 500) {
        postMessage({ type: 'load', load: renderMs / (renderFrames / sampleRate * 1000), peak });
        renderMs = 0; renderFrames = 0; peak = 0; lastReport = now;
      }
      await new Promise(res => setTimeout(res, 0));
    }
  } catch (err) {
    // A restart disposes the engine while a chunk is rendering; that is expected, anything else is not.
    if (!/disposed/.test(String(err))) postMessage({ type: 'error', message: String(err) });
  } finally { busy = false; }
}

// Commands run one at a time: a reload disposes the engine, which must not happen while another command still uses it.
let chain: Promise<void> = Promise.resolve();
self.onmessage = (e: MessageEvent<Cmd>) => {
  if (e.data.type === 'cancelSeek') { seekCancelled = true; return; }
  chain = chain.then(() => handle(e.data));
};

async function handle(m: Cmd) {
  try {
    if (m.type === 'init') {
      sampleRate = m.sampleRate; kind = m.engine; sink = m.port;
      sink.onmessage = ev => { if (ev.data.type === 'need') { wanted = Math.max(wanted, 0) + ev.data.frames; void pump(); } };
      engine = fresh();
      postMessage({ type: 'ready' });
    } else if (m.type === 'load') {
      gen = m.gen; wanted = 0; bytes = m.bytes; await reload(m.subtune); sink.postMessage({ type: 'loaded', gen });
    } else if (m.type === 'start') {
      gen = m.gen; wanted = 0; await reload(m.subtune); sink.postMessage({ type: 'loaded', gen });
    } else if (m.type === 'stop') {
      gen = m.gen; wanted = 0; await reload(subtune); sink.postMessage({ type: 'loaded', gen });
    } else if (m.type === 'models') {
      sidModel = m.primary === 8580 ? 'MOS8580' : 'MOS6581';
      models = [m.primary, m.secondary];
      analysis?.setSIDModels(m.primary, m.secondary);
      if (bytes) await applyModel();
    } else if (m.type === 'seek') {
      gen = m.gen; wanted = 0; seekCancelled = false;
      if (engine && engine.getTimeMs() / 1000 > m.seconds - 0.25) await reload(subtune);
      let n = 0;
      while (engine && !seekCancelled && engine.getTimeMs() / 1000 < m.seconds) {
        await engine.renderFrames(CHUNK * 4);
        analysis?.skip(CHUNK * 4);
        if (++n % 8 === 0) { postMessage({ type: 'seekProgress', id: m.id, time: engine.getTimeMs() / 1000 }); await new Promise(res => setTimeout(res, 0)); }
      }
      sink.postMessage({ type: 'loaded', gen });
      postMessage({ type: 'seekDone', id: m.id, time: engine ? engine.getTimeMs() / 1000 : 0 });
    }
  } catch (err) { postMessage({ type: 'error', message: String(err) }); }
}
