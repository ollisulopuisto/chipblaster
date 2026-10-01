// Same surface as WorkletPlayer, but the sound comes from libsidplayfp (see fp-worker.ts). Metadata still comes from the jsSID parser.
// libsidplayfp gives only the mixed sound, so a jsSID core runs alongside in the worker for the voice meters and the STEREO ENHANCE side signal.
// Tape speed is a resampler in the sink. Multi-SID tunes use libsidplayfp's own chip placement.
// @ts-ignore vendored JS
import SidCore from './vendor/sid-core.js';
import sinkUrl from './fp-sink-worklet.js?worker&url';

type Message = Record<string, unknown>;
export type FpEngine = 'sidlite' | 'residfp';

export class FpPlayer {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  outputGain: GainNode;
  masterAnalyser?: AnalyserNode;
  voiceLevels = [0, 0, 0, 0, 0, 0, 0];
  voiceWaveforms = [0, 0, 0, 0, 0, 0];
  engineName: string;
  /** Render time as a share of audio time, from the worker: average and worst chunk over the last half second. */
  load = 0;
  peak = 0;
  /** Chrome's own measure of the audio thread (AudioContext.renderCapacity), where the browser has it. */
  capacity: { avg: number; peak: number } | null = null;
  private core: any;
  private node: AudioWorkletNode | null = null;
  private worker: Worker;
  private queue: Message[] = [];
  private time = 0;
  private tape = 1;
  private gen = 0;
  private seekId = 0;
  private seekWaiters = new Map<number, { done: () => void; progress?: (t: number) => void }>();
  ready: Promise<void>;

  constructor(engine: FpEngine) {
    this.engineName = 'libsidplayfp ' + (engine === 'residfp' ? 'reSIDfp' : 'SIDLite');
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AC();
    this.audioContext = ctx;
    try {
      const rc = (ctx as any).renderCapacity;
      if (rc) { rc.addEventListener('update', (e: any) => { this.capacity = { avg: e.averageLoad, peak: e.peakLoad }; }); rc.start({ updateInterval: 0.5 }); }
    } catch {}
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.75;
    this.outputGain = ctx.createGain();
    this.analyser.connect(this.outputGain);
    this.outputGain.connect(ctx.destination);
    const entry = this.analyser;
    this.core = new (SidCore as any)(ctx.sampleRate, 0);
    this.worker = new Worker(new URL('./fp-worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = e => this.onWorker(e.data);
    this.ready = ctx.audioWorklet.addModule(sinkUrl).then(() => {
      const node = new AudioWorkletNode(ctx, 'fp-sink', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
      node.port.onmessage = e => {
        const m = e.data;
        if (m.type !== 'state') return;
        this.time = m.time;
        if (m.levels) { for (let i = 0; i < 7; i++) this.voiceLevels[i] = m.levels[i] ?? 0; for (let i = 0; i < 6; i++) this.voiceWaveforms[i] = m.waves[i] ?? 0; }
      };
      node.connect(entry);
      this.node = node;
      const ch = new MessageChannel();
      node.port.postMessage({ type: 'worker', port: ch.port1 }, [ch.port1]);
      this.worker.postMessage({ type: 'init', sampleRate: ctx.sampleRate, engine, port: ch.port2 }, [ch.port2]);
      for (const m of this.queue) this.dispatch(m);
      this.queue = [];
    }).catch(err => { console.error('fp engine failed to load', err); });
  }

  private dispatch(m: Message) {
    if (m.type === 'play' || m.type === 'pause' || m.type === 'fade' || m.type === 'tape' || m.type === 'spread') this.node!.port.postMessage(m);
    else {
      // A message that starts new material first tells the sink to drop what it holds.
      if (typeof m.gen === 'number') this.node!.port.postMessage({ type: 'gen', gen: m.gen, time: 0 });
      this.worker.postMessage(m);
    }
  }
  private send(m: Message) { if (this.node) this.dispatch(m); else this.queue.push(m); }
  private restart(m: Message) {
    this.gen++;
    this.time = 0;
    this.send({ ...m, gen: this.gen });
  }

  private onWorker(m: any) {
    if (m.type === 'load') { this.load = m.load; this.peak = m.peak; }
    else if (m.type === 'seekProgress') { this.time = m.time; this.seekWaiters.get(m.id)?.progress?.(m.time); }
    else if (m.type === 'seekDone') {
      this.time = m.time;
      const w = this.seekWaiters.get(m.id);
      this.seekWaiters.delete(m.id);
      w?.done();
    } else if (m.type === 'error') console.error('fp engine', m.message);
  }

  get tapeRate() { return this.tape; }
  set tapeRate(rate: number) { if (rate === this.tape) return; this.tape = rate; this.send({ type: 'tape', rate }); }

  setloadcallback(cb: () => void) { this.core.setloadcallback(cb); }
  loadbuffer(bytes: Uint8Array, subtune: number) {
    this.cancelSeeks();
    this.core.loadbuffer(bytes, subtune);
    this.restart({ type: 'load', bytes: bytes.slice(), subtune });
  }
  /** STEREO ENHANCE amount (0..1): the side signal made by the analysis core is mixed in at this level. */
  setChipSpread(value: number) { this.send({ type: 'spread', value }); }
  setFadePlan(end: number | null, seconds: number) { this.send({ type: 'fade', end, seconds }); }
  setSIDModels(primary: number, secondary: number) { this.core.setSIDModels(primary, secondary); this.send({ type: 'models', primary, secondary }); }
  start(subtune: number) { this.cancelSeeks(); this.core.start(subtune); this.restart({ type: 'start', subtune }); }
  stop() { this.cancelSeeks(); this.core.stop(); this.restart({ type: 'stop' }); }
  pause() { this.send({ type: 'pause' }); }
  playcont() { this.send({ type: 'play' }); }
  gettitle(): string { return this.core.gettitle(); }
  getauthor(): string { return this.core.getauthor(); }
  getinfo(): string { return this.core.getinfo(); }
  getsubtunes(): number { return this.core.getsubtunes(); }
  getSIDCount(): number { return this.core.getSIDCount(); }
  getplaytime(): number { return Math.floor(this.time); }

  seek(seconds: number, progress?: (t: number) => void): Promise<void> {
    void this.audioContext.resume().catch(() => {});
    this.cancelSeeks();
    const id = ++this.seekId;
    return new Promise<void>(done => {
      this.seekWaiters.set(id, { done, progress });
      this.restart({ type: 'seek', id, seconds });
    });
  }
  private cancelSeeks() {
    if (!this.seekWaiters.size) return;
    this.send({ type: 'cancelSeek' });
    for (const w of this.seekWaiters.values()) w.done();
    this.seekWaiters.clear();
  }
}
