// LEVEL MATCH: keeps loud and quiet tunes at about the same volume.
// The tune's level is read before the tone controls, averaged over time, and the gain moves slowly toward a fixed target.
// A soft limiter after the gain stage catches peaks. The result is remembered per tune.
const TARGET_DB = -18;
const MIN_DB = -9;
const MAX_DB = 6;
const GATE_DB = -55;
const STORE = 'chipblaster.level.v1';
const MAX_ENTRIES = 400;

const limiterCurve = (() => {
  const n = 4096, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
    c[i] = a <= 0.8 ? x : Math.sign(x) * (0.8 + 0.2 * Math.tanh((a - 0.8) / 0.2));
  }
  return c;
})();

const readStore = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { return {}; }
};
const writeStore = (m: Record<string, number>) => {
  try {
    const keys = Object.keys(m);
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) delete m[k];
    localStorage.setItem(STORE, JSON.stringify(m));
  } catch {}
};

export class Leveler {
  /** Connect the signal to be levelled here. */
  readonly input: GainNode;
  /** Connect this to the next stage. */
  readonly output: WaveShaperNode;
  /** Feed this from the point where the tune's own level should be read. */
  readonly tap: AnalyserNode;
  /** Gain now in dB, null while level matching is off. */
  db: number | null = null;
  onChange: ((db: number | null) => void) | null = null;
  private ctx: AudioContext;
  private enabled = true;
  private key: string | null = null;
  private power = 0;
  private weight = 0;
  private seconds = 0;
  private lastSaved = 0;
  private buf: Float32Array<ArrayBuffer>;
  private timer: number;
  private last = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createWaveShaper();
    this.output.curve = limiterCurve;
    this.input.connect(this.output);
    this.tap = ctx.createAnalyser();
    this.tap.fftSize = 2048;
    this.buf = new Float32Array(2048);
    this.timer = window.setInterval(() => this.step(), 100);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.output.curve = on ? limiterCurve : null;
    if (!on) { this.glide(0, 0.3); this.db = null; this.onChange?.(null); }
    else this.reset(this.key);
  }

  /** A new tune: forget the running estimate and start from what was saved for it, if anything. */
  reset(key: string | null) {
    this.key = key;
    this.power = 0; this.weight = 0; this.seconds = 0; this.lastSaved = 0; this.last = 0;
    if (!this.enabled) return;
    const saved = key ? readStore()[key] : undefined;
    const db = typeof saved === 'number' ? Math.max(MIN_DB, Math.min(MAX_DB, saved)) : 0;
    this.glide(db, 0.05);
    this.db = db;
    this.onChange?.(db);
  }

  dispose() { window.clearInterval(this.timer); }

  private glide(db: number, tc: number) {
    const g = this.input.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(Math.pow(10, db / 20), t, tc);
  }

  private step() {
    if (!this.enabled || this.ctx.state !== 'running') return;
    this.tap.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
    const ms = sum / this.buf.length;
    if (10 * Math.log10(ms + 1e-12) < GATE_DB) return;
    const now = performance.now();
    this.seconds += this.last ? Math.min(0.5, (now - this.last) / 1000) : 0.1;
    this.last = now;
    this.weight = Math.min(this.weight + 1, 150);
    this.power += (ms - this.power) / this.weight;
    if (this.seconds < 2) return;
    const est = 10 * Math.log10(this.power + 1e-12);
    const want = Math.max(MIN_DB, Math.min(MAX_DB, TARGET_DB - est));
    const cur = this.db ?? 0;
    if (Math.abs(want - cur) >= 0.5) {
      this.glide(want, want < cur ? 0.6 : 4);
      this.db = want;
      this.onChange?.(want);
    }
    if (this.key && this.seconds > 20 && this.seconds - this.lastSaved > 5) {
      this.lastSaved = this.seconds;
      const m = readStore();
      delete m[this.key];
      m[this.key] = Math.round((this.db ?? 0) * 10) / 10;
      writeStore(m);
    }
  }
}
