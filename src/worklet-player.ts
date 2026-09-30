// Main-thread facade with the same surface as the original jsSID player, but the emulation runs in an AudioWorklet.
// @ts-ignore vendored JS
import SidCore from './vendor/sid-core.js';
import workletUrl from './sid-worklet.js?worker&url';

type Message = Record<string, unknown>;

export class WorkletPlayer {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  outputGain: GainNode;
  masterAnalyser?: AnalyserNode;
  voiceLevels = [0, 0, 0, 0, 0, 0, 0];
  voiceWaveforms = [0, 0, 0, 0, 0, 0];
  private core: any;
  private node: AudioWorkletNode | null = null;
  private queue: Message[] = [];
  private time = 0;
  private tape = 1;
  private seekId = 0;
  private seekWaiters = new Map<number, { done: () => void; progress?: (t: number) => void }>();
  ready: Promise<void>;

  constructor() {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AC();
    this.audioContext = ctx;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.75;
    this.outputGain = ctx.createGain();
    this.analyser.connect(this.outputGain);
    this.outputGain.connect(ctx.destination);
    this.core = new (SidCore as any)(ctx.sampleRate, 0);
    if (import.meta.env.DEV) (window as any).__sidPlayer = this;
    this.ready = ctx.audioWorklet.addModule(workletUrl).then(() => {
      const node = new AudioWorkletNode(ctx, 'sid-processor', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
      node.port.onmessage = e => this.onMessage(e.data);
      node.connect(this.analyser);
      this.node = node;
      for (const m of this.queue) node.port.postMessage(m);
      this.queue = [];
    }).catch(err => { console.error('SID worklet failed to load', err); });
  }

  private send(m: Message) { if (this.node) this.node.port.postMessage(m); else this.queue.push(m); }

  private onMessage(m: any) {
    if (m.type === 'state') {
      for (let i = 0; i < this.voiceLevels.length; i++) this.voiceLevels[i] = m.levels[i] ?? 0;
      for (let i = 0; i < this.voiceWaveforms.length; i++) this.voiceWaveforms[i] = m.waves[i] ?? 0;
      this.time = m.time;
    } else if (m.type === 'seekProgress') {
      this.time = m.time;
      this.seekWaiters.get(m.id)?.progress?.(m.time);
    } else if (m.type === 'seekDone') {
      this.time = m.time;
      const w = this.seekWaiters.get(m.id);
      this.seekWaiters.delete(m.id);
      w?.done();
    }
  }

  get tapeRate() { return this.tape; }
  set tapeRate(rate: number) { if (rate === this.tape) return; this.tape = rate; this.send({ type: 'tape', rate }); }

  setloadcallback(cb: () => void) { this.core.setloadcallback(cb); }
  loadbuffer(bytes: Uint8Array, subtune: number) {
    this.cancelSeeks();
    this.time = 0;
    this.core.loadbuffer(bytes, subtune);
    this.send({ type: 'load', bytes: bytes.slice(), subtune });
  }
  setSIDModels(primary: number, secondary: number) { this.core.setSIDModels(primary, secondary); this.send({ type: 'models', primary, secondary }); }
  start(subtune: number) { this.cancelSeeks(); this.time = 0; this.core.start(subtune); this.send({ type: 'start', subtune }); }
  stop() { this.cancelSeeks(); this.time = 0; this.core.stop(); this.send({ type: 'stop' }); }
  pause() { this.send({ type: 'pause' }); }
  playcont() { this.send({ type: 'play' }); }
  gettitle(): string { return this.core.gettitle(); }
  getauthor(): string { return this.core.getauthor(); }
  getinfo(): string { return this.core.getinfo(); }
  getsubtunes(): number { return this.core.getsubtunes(); }
  getSIDCount(): number { return this.core.getSIDCount(); }
  getplaytime(): number { return Math.floor(this.time); }

  /** Fast-forward silently to `seconds` (restarting the tune first when seeking backwards). Resolves when the emulation has caught up. */
  seek(seconds: number, progress?: (t: number) => void): Promise<void> {
    // The worklet only runs while the context runs; resume inside the caller's user gesture.
    void this.audioContext.resume().catch(() => {});
    this.cancelSeeks();
    const id = ++this.seekId;
    return new Promise<void>(done => {
      this.seekWaiters.set(id, { done, progress });
      this.send({ type: 'seek', id, seconds });
    });
  }
  private cancelSeeks() {
    if (!this.seekWaiters.size) return;
    this.send({ type: 'cancelSeek' });
    for (const w of this.seekWaiters.values()) w.done();
    this.seekWaiters.clear();
  }
}
