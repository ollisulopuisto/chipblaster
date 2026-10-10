// Mechanical key, latch and case sounds, synthesised. They are only a seasoning: quiet in general, and while music plays only the big
// mechanical events are heard (and softly), because small clicks fight with the music. The level is one of off, soft and full.
// The disk drive that loads the next visual effect follows the same level and counts as a small sound.
import { DRIVE_SAMPLES } from './drive-samples';
export type MechLevel = 'off' | 'soft' | 'full';
export type MechKind = 'key' | 'latch' | 'eject' | 'power' | 'thunk';

const BIG: ReadonlySet<MechKind> = new Set(['eject', 'power', 'thunk']);
/** Peak gain per level: [idle, music playing] for big events and for small ones. */
const GAIN: Record<MechLevel, { bigIdle: number; bigPlaying: number; smallIdle: number; smallPlaying: number }> = {
  off: { bigIdle: 0, bigPlaying: 0, smallIdle: 0, smallPlaying: 0 },
  soft: { bigIdle: 0.7, bigPlaying: 0.12, smallIdle: 0.6, smallPlaying: 0 },
  full: { bigIdle: 1, bigPlaying: 0.3, smallIdle: 1, smallPlaying: 0.1 }
};
const MIN_GAP = 0.07;

/**
 * The disk drive plays the recordings of the 1541 Ultimate, mixed the way it mixes them: the head sounds are the loud part and the
 * motor is a quiet bed under them (the head is 16 times the motor).
 */
type Nodes = AudioScheduledSourceNode[];
type Bank = Record<'hum' | 'in' | 'out' | 'bang', AudioBuffer>;
const SAMPLE_RATE = 22050;
/** Peak gain of a head step; the key clicks peak around 0.8. */
const HEAD_GAIN = 2;
const MOTOR_GAIN = HEAD_GAIN / 16;
const BANG_GAIN = 0.4;

const banks = new WeakMap<BaseAudioContext, Bank>();
function loadBank(c: BaseAudioContext): Bank {
  let bank = banks.get(c);
  if (bank) return bank;
  const made: Partial<Bank> = {};
  for (const [key, b64] of Object.entries(DRIVE_SAMPLES) as [keyof Bank, string][]) {
    const bin = atob(b64), buf = c.createBuffer(1, bin.length, SAMPLE_RATE), d = buf.getChannelData(0);
    for (let i = 0; i < bin.length; i++) { const v = bin.charCodeAt(i); d[i] = (v > 127 ? v - 256 : v) / 128; }
    made[key] = buf;
  }
  banks.set(c, bank = made as Bank);
  return bank;
}

const shot = (c: BaseAudioContext, dest: AudioNode, nodes: Nodes, buf: AudioBuffer, at: number, gain: number) => {
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf; g.gain.value = gain; src.connect(g); g.connect(dest); src.start(at); nodes.push(src);
  return src;
};

/** One step of the head; the Ultimate has one recording for a step inwards (towards higher track numbers) and one for a step outwards. */
export function driveStep(c: BaseAudioContext, dest: AudioNode, nodes: Nodes, at: number, inward: boolean) {
  const bank = loadBank(c);
  return shot(c, dest, nodes, inward ? bank.in : bank.out, at, HEAD_GAIN);
}

/** The head against its stop. */
export function driveBump(c: BaseAudioContext, dest: AudioNode, nodes: Nodes, at: number) {
  return shot(c, dest, nodes, loadBank(c).bang, at, HEAD_GAIN * BANG_GAIN);
}

/** The motor between `on` and `off`: the hum in a loop, faded in and out over 150 ms (there is no spin-up recording). */
export function driveHum(c: BaseAudioContext, dest: AudioNode, nodes: Nodes, on: number, off: number) {
  const bus = c.createGain(), loop = c.createBufferSource();
  bus.connect(dest);
  loop.buffer = loadBank(c).hum; loop.loop = true; loop.connect(bus);
  bus.gain.setValueAtTime(0, on); bus.gain.linearRampToValueAtTime(MOTOR_GAIN, on + 0.15);
  bus.gain.setValueAtTime(MOTOR_GAIN, off); bus.gain.linearRampToValueAtTime(0, off + 0.15);
  loop.start(on); loop.stop(off + 0.16); nodes.push(loop);
}

/** The track a visual effect lives on: spread over 1 to 35 by its name, never on 18 (that is the directory). */
export function trackFor(name: string): number {
  let h = 7;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const t = 1 + (h % 34);
  return t >= 18 ? t + 1 : t;
}

export class MechSound {
  level: MechLevel = 'soft';
  private own: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private noiseCtx: BaseAudioContext | null = null;
  private last = 0;
  private head = 18;
  private drv: { out: GainNode; nodes: AudioScheduledSourceNode[]; timer: number } | null = null;

  /** `getContext` returns the player's AudioContext when there is one; the sounds then share it, which keeps iOS to one audio session. */
  constructor(private getContext: () => AudioContext | null, private isPlaying: () => boolean, private getVolume: () => number) {}

  private context(): AudioContext | null {
    const shared = this.getContext();
    if (shared) return shared;
    if (!this.own) {
      try { const AC = window.AudioContext || (window as any).webkitAudioContext; this.own = new AC(); } catch { return null; }
    }
    return this.own;
  }

  /** Call from a user gesture so the context is running by the time a sound is wanted. */
  ensure() {
    if (this.level === 'off') return;
    const c = this.context();
    if (c && c.state === 'suspended') void c.resume().catch(() => {});
  }

  play(kind: MechKind) {
    if (this.level === 'off' || document.hidden) return;
    const g = GAIN[this.level], big = BIG.has(kind), playing = this.isPlaying();
    const peak = big ? (playing ? g.bigPlaying : g.bigIdle) : playing ? g.smallPlaying : g.smallIdle;
    if (peak <= 0) return;
    const c = this.context();
    if (!c) return;
    if (c.state !== 'running') {
      // First gesture: the context may still be starting. Play once it runs, unless the moment has passed.
      const asked = performance.now();
      void c.resume().then(() => { if (c.state === 'running' && performance.now() - asked < 250) this.play(kind); }).catch(() => {});
      return;
    }
    const t = c.currentTime;
    if (t - this.last < MIN_GAP) return;
    this.last = t;
    // The volume knob scales the sounds too, with a floor so they stay audible at low settings.
    const level = peak * Math.max(0.25, Math.min(1, this.getVolume()));
    const out = c.createGain();
    out.gain.value = level;
    // Small speakers and phones barely reproduce the low end; cut it so the sounds stay bright clicks, not thuds.
    const hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 450; hp.Q.value = 0.7;
    out.connect(hp); hp.connect(c.destination);
    const parts: AudioNode[] = [out, hp];
    const burst = (at: number, ms: number, freq: number, q: number, amp: number, type: BiquadFilterType = 'bandpass') => {
      const src = c.createBufferSource(), f = c.createBiquadFilter(), a = c.createGain();
      src.buffer = this.noiseBuffer(c);
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      a.gain.setValueAtTime(amp, at); a.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
      src.connect(f); f.connect(a); a.connect(out);
      src.start(at); src.stop(at + ms / 1000 + 0.01);
      parts.push(src, f, a);
    };
    const thud = (at: number, from: number, to: number, sec: number, amp: number) => {
      const o = c.createOscillator(), a = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(to, at + sec * 0.8);
      a.gain.setValueAtTime(amp, at); a.gain.exponentialRampToValueAtTime(0.0001, at + sec);
      o.connect(a); a.connect(out);
      o.start(at); o.stop(at + sec + 0.01);
      parts.push(o, a);
    };
    let end = 0.2;
    // Bright and sharp: a few milliseconds of high noise, a short ringing tick, and for the heavier keys a second snap. Little below 500 Hz.
    if (kind === 'key') { burst(t, 6, 6500, 1, 0.8); thud(t, 3400, 2600, 0.014, 0.4); burst(t + 0.004, 5, 3200, 1.2, 0.4); thud(t, 900, 600, 0.02, 0.12); end = 0.1; }
    else if (kind === 'latch') { burst(t, 8, 5500, 1, 0.75); thud(t, 2900, 2200, 0.018, 0.45); burst(t + 0.014, 6, 7500, 1, 0.6); thud(t + 0.014, 4200, 3500, 0.012, 0.35); thud(t, 700, 420, 0.03, 0.18); end = 0.12; }
    else if (kind === 'eject') { burst(t, 12, 3800, 0.8, 0.7); thud(t, 1200, 520, 0.06, 0.3); thud(t, 3000, 2400, 0.02, 0.4); burst(t + 0.05, 8, 5500, 1, 0.6); thud(t + 0.05, 3800, 3000, 0.014, 0.35); end = 0.22; }
    else if (kind === 'power') { burst(t, 10, 4200, 0.9, 0.9); thud(t, 2600, 2000, 0.02, 0.6); thud(t, 640, 380, 0.05, 0.14); burst(t + 0.03, 8, 6000, 1, 0.5); end = 0.18; }
    else { burst(t, 10, 5000, 0.9, 0.7); thud(t, 700, 360, 0.05, 0.35); thud(t, 3000, 2300, 0.02, 0.4); burst(t + 0.02, 6, 6800, 1, 0.45); end = 0.2; }
    window.setTimeout(() => { for (const p of parts) { try { p.disconnect(); } catch {} } }, (end + 0.1) * 1000);
  }

  /**
   * The 1541 loading an effect, as the Ultimate sounds it: the motor runs as a quiet bed, every step of the head is one recorded
   * knock (a different one inwards and outwards), and the head hits its stop at track 1. The head starts on track 18 (as at power-up),
   * moves to the track of each effect half a track a step, and the directory (on track 18) needs no seek. As on the Ultimate, one
   * head sound cuts the one before it. Times are seconds from now.
   */
  drive(times: { search: number; load: number; ready: number }, target = 18) {
    this.driveStop();
    if (this.level === 'off' || document.hidden) return;
    const g = GAIN[this.level], peak = this.isPlaying() ? g.smallPlaying : g.smallIdle;
    if (peak <= 0) return;
    const c = this.context();
    if (!c) return;
    if (c.state !== 'running') { void c.resume().catch(() => {}); return; }
    const t0 = c.currentTime;
    const level = peak * Math.max(0.25, Math.min(1, this.getVolume()));
    const out = c.createGain(); out.gain.value = level;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 40; hp.Q.value = 0.7;
    out.connect(hp); hp.connect(c.destination);
    const nodes: AudioScheduledSourceNode[] = [];
    let prev: AudioBufferSourceNode | null = null;
    const head = (src: AudioBufferSourceNode, at: number) => { try { prev?.stop(at); } catch {} prev = src; };
    const on = t0 + Math.max(0, times.search - 0.16), off = t0 + times.ready + 0.04;
    driveHum(c, out, nodes, on, off);
    // SEARCHING: the head moves from where it was (track 18 at power-up) to the track of the file, one half-track a step. It speeds up
    // and slows down again; a seek to track 1 ends against the stop with a bump. The directory is on track 18, so it needs no seek.
    const from = this.head, steps = Math.round(Math.abs(target - from) * 2), span = Math.max(0.1, times.load - times.search);
    const count = Math.min(steps, Math.floor(span / 0.02)), dir = target < from ? -1 : 1;
    let at = t0 + times.search;
    if (count === 0) head(driveStep(c, out, nodes, at, true), at);
    for (let i = 0; i < count; i++) {
      const track = from + dir * (Math.round(((i + 1) / count) * steps) / 2);
      head(driveStep(c, out, nodes, at, dir > 0), at);
      at += (span / count) * (0.8 + 0.4 * Math.abs(Math.cos((i / count) * Math.PI)));
    }
    if (target <= 1 && steps > 0) head(driveBump(c, out, nodes, at), at);
    this.head = target;
    // LOADING: as the file is read the head moves on a track now and then.
    let pos = target;
    for (let dt = 0.14; times.load + dt < times.ready - 0.05; dt += 0.2) { head(driveStep(c, out, nodes, t0 + times.load + dt, true), t0 + times.load + dt); pos += 0.5; }
    this.head = pos;
    this.drv = { out, nodes, timer: window.setTimeout(() => { for (const n of nodes) { try { n.disconnect(); } catch {} } try { hp.disconnect(); out.disconnect(); } catch {} if (this.drv?.out === out) this.drv = null; }, (times.ready + 0.8) * 1000) };
  }

  /** Cuts the drive short (the effect was changed again, or the screen went away). */
  driveStop() {
    const d = this.drv;
    if (!d) return;
    this.drv = null;
    window.clearTimeout(d.timer);
    const c = d.out.context as AudioContext, now = c.currentTime;
    d.out.gain.cancelScheduledValues(now); d.out.gain.setValueAtTime(d.out.gain.value, now); d.out.gain.linearRampToValueAtTime(0, now + 0.06);
    window.setTimeout(() => { for (const n of d.nodes) { try { n.stop(); } catch {} try { n.disconnect(); } catch {} } try { d.out.disconnect(); } catch {} }, 100);
  }

  private noiseBuffer(c: BaseAudioContext): AudioBuffer {
    if (!this.noise || this.noiseCtx !== c) {
      const n = Math.ceil(c.sampleRate * 0.1), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b; this.noiseCtx = c;
    }
    return this.noise;
  }
}
