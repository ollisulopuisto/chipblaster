// Mechanical key, latch and case sounds, synthesised. They are only a seasoning: quiet in general, and while music plays only the big
// mechanical events are heard (and softly), because small clicks fight with the music. The level is one of off, soft and full.
// The disk drive that loads the next visual effect follows the same level and counts as a small sound.
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

export class MechSound {
  level: MechLevel = 'soft';
  private own: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private noiseCtx: BaseAudioContext | null = null;
  private last = 0;
  private driveNoise: AudioBuffer | null = null;
  private driveNoiseCtx: BaseAudioContext | null = null;
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
   * The 1541 loading an effect: the motor winds up, the head rattles to its track (SEARCHING), then the motor whirrs and the head
   * steps now and then while it reads (LOADING), and the motor winds down. Times are seconds from now, as the screen shows them.
   */
  drive(times: { search: number; load: number; ready: number }) {
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
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 150; hp.Q.value = 0.7;
    out.connect(hp); hp.connect(c.destination);
    const nodes: AudioScheduledSourceNode[] = [];
    const noise = this.driveNoiseBuffer(c);
    const burst = (at: number, sec: number, freq: number, q: number, amp: number) => {
      const src = c.createBufferSource(), f = c.createBiquadFilter(), a = c.createGain();
      src.buffer = noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      a.gain.setValueAtTime(amp, at); a.gain.exponentialRampToValueAtTime(0.0001, at + sec);
      src.connect(f); f.connect(a); a.connect(out); src.start(at, Math.random() * 0.5); src.stop(at + sec + 0.01); nodes.push(src);
    };
    const tone = (at: number, from: number, to: number, sec: number, amp: number, type: OscillatorType = 'sine') => {
      const o = c.createOscillator(), a = c.createGain();
      o.type = type; o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(to, at + sec * 0.8);
      a.gain.setValueAtTime(amp, at); a.gain.exponentialRampToValueAtTime(0.0001, at + sec);
      o.connect(a); a.connect(out); o.start(at); o.stop(at + sec + 0.01); nodes.push(o);
    };
    // One step of the head: a dry tick and a short knock from the stepper.
    const step = (at: number, amp: number) => { burst(at, 0.004, 1800, 1.4, amp); tone(at, 260, 120, 0.022, amp * 0.8); tone(at, 2300, 1900, 0.008, amp * 0.25); };
    // The motor: a belt-driven whirr, rising as it spins up and falling as it stops.
    const on = t0 + Math.max(0, times.search - 0.14), off = t0 + times.ready + 0.04, down = 0.32;
    {
      const src = c.createBufferSource(), f = c.createBiquadFilter(), a = c.createGain();
      src.buffer = noise; src.loop = true; f.type = 'bandpass'; f.frequency.setValueAtTime(700, on); f.frequency.linearRampToValueAtTime(1250, on + 0.2); f.frequency.setValueAtTime(1250, off); f.frequency.linearRampToValueAtTime(600, off + down); f.Q.value = 1.1;
      a.gain.setValueAtTime(0.0001, on); a.gain.linearRampToValueAtTime(0.2, on + 0.16); a.gain.setValueAtTime(0.2, off); a.gain.linearRampToValueAtTime(0.0001, off + down);
      src.connect(f); f.connect(a); a.connect(out); src.start(on); src.stop(off + down + 0.02); nodes.push(src);
      const o = c.createOscillator(), lp = c.createBiquadFilter(), b = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(110, on); o.frequency.linearRampToValueAtTime(168, on + 0.22); o.frequency.setValueAtTime(168, off); o.frequency.linearRampToValueAtTime(80, off + down);
      lp.type = 'lowpass'; lp.frequency.value = 520;
      b.gain.setValueAtTime(0.0001, on); b.gain.linearRampToValueAtTime(0.075, on + 0.16); b.gain.setValueAtTime(0.075, off); b.gain.linearRampToValueAtTime(0.0001, off + down);
      o.connect(lp); lp.connect(b); b.connect(out); o.start(on); o.stop(off + down + 0.02); nodes.push(o);
    }
    // SEARCHING: the head runs out to its track, quickening and then slowing, and settles with a last knock.
    let at = t0 + times.search;
    for (const gap of [0.034, 0.03, 0.026, 0.023, 0.021, 0.021, 0.022, 0.026, 0.033, 0.044, 0.06]) { step(at, 0.55 + Math.random() * 0.25); at += gap; }
    tone(at, 150, 70, 0.05, 0.4); burst(at, 0.012, 900, 0.9, 0.35);
    // LOADING: single steps from track to track, a little uneven.
    for (let s = t0 + times.load + 0.1; s < t0 + times.ready - 0.04; s += 0.1 + Math.random() * 0.07) step(s, 0.32 + Math.random() * 0.12);
    this.drv = { out, nodes, timer: window.setTimeout(() => { for (const n of nodes) { try { n.disconnect(); } catch {} } try { hp.disconnect(); out.disconnect(); } catch {} if (this.drv?.out === out) this.drv = null; }, (times.ready + down + 0.3) * 1000) };
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

  private driveNoiseBuffer(c: BaseAudioContext): AudioBuffer {
    if (!this.driveNoise || this.driveNoiseCtx !== c) {
      const n = Math.ceil(c.sampleRate * 1.5), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.driveNoise = b; this.driveNoiseCtx = c;
    }
    return this.driveNoise;
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
