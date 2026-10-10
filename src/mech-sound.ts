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

/** The drive is quiet next to the key clicks; these gains put its voices (tuned in sample units, peak 1 = a full-scale sample) there. */
const DRIVE_GAIN = 1.6;

type Nodes = AudioScheduledSourceNode[];
/** An exponential decay with time constant `tau` seconds (it is gone after about 9 tau). */
const decay = (c: BaseAudioContext, dest: AudioNode, at: number, tau: number, amp: number) => {
  const a = c.createGain();
  a.gain.setValueAtTime(amp, at); a.gain.setTargetAtTime(0, at, tau);
  a.connect(dest); return a;
};
const ring = (c: BaseAudioContext, dest: AudioNode, nodes: Nodes, at: number, freq: number, tau: number, amp: number) => {
  const o = c.createOscillator(); o.frequency.value = freq;
  o.connect(decay(c, dest, at, tau, amp)); o.start(at); o.stop(at + tau * 9); nodes.push(o);
};
const puff = (c: BaseAudioContext, dest: AudioNode, nodes: Nodes, noise: AudioBuffer, at: number, freq: number, q: number, tau: number, amp: number) => {
  const src = c.createBufferSource(), f = c.createBiquadFilter();
  src.buffer = noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  src.connect(f); f.connect(decay(c, dest, at, tau, amp)); src.start(at, Math.random() * 0.5); src.stop(at + tau * 9); nodes.push(src);
};

const slab = (c: BaseAudioContext, dest: AudioNode, nodes: Nodes, noise: AudioBuffer, at: number, freq: number, q: number, sec: number, amp: number) => {
  const src = c.createBufferSource(), f = c.createBiquadFilter(), a = c.createGain();
  src.buffer = noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  a.gain.setValueAtTime(amp, at); a.gain.linearRampToValueAtTime(amp * 0.45, at + sec * 0.6); a.gain.linearRampToValueAtTime(0, at + sec);
  src.connect(f); f.connect(a); a.connect(dest); src.start(at, Math.random() * 0.5); src.stop(at + sec + 0.02); nodes.push(src);
};

/** One step of the head: a 30 ms knock, resonances near 640, 1085 and 2170 Hz. Inner tracks (below 18) are louder and brighter, as in VICE. */
export function driveStep(c: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, nodes: Nodes, at: number, track: number) {
  const vol = (100 - track) / 100;
  if (track < 18) {
    puff(c, dest, nodes, noise, at, 1900, 0.7, 0.003, 0.14 * vol);
    slab(c, dest, nodes, noise, at, 1400, 0.6, 0.031, 0.13 * vol); slab(c, dest, nodes, noise, at, 2500, 1.3, 0.031, 0.045 * vol);
    ring(c, dest, nodes, at, 2170, 0.003, 0.12 * vol); ring(c, dest, nodes, at, 1085, 0.006, 0.07 * vol); ring(c, dest, nodes, at, 638, 0.009, 0.08 * vol);
  } else {
    slab(c, dest, nodes, noise, at, 1100, 0.5, 0.031, 0.19 * vol); slab(c, dest, nodes, noise, at, 2200, 1.3, 0.031, 0.035 * vol);
    ring(c, dest, nodes, at, 940, 0.007, 0.07 * vol); ring(c, dest, nodes, at, 453, 0.01, 0.04 * vol); ring(c, dest, nodes, at, 615, 0.01, 0.02 * vol);
  }
}

/** The head hitting its stop: a heavy knock around 200 to 300 Hz with a rattle at 2 kHz, 120 ms. */
export function driveBump(c: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, nodes: Nodes, at: number, vol: number) {
  ring(c, dest, nodes, at, 202, 0.04, 0.26 * vol); ring(c, dest, nodes, at, 270, 0.03, 0.18 * vol); ring(c, dest, nodes, at, 455, 0.025, 0.16 * vol); ring(c, dest, nodes, at, 312, 0.03, 0.12 * vol);
  puff(c, dest, nodes, noise, at, 1900, 0.8, 0.03, 0.42 * vol); ring(c, dest, nodes, at, 2074, 0.03, 0.12 * vol); ring(c, dest, nodes, at, 2133, 0.025, 0.09 * vol);
}

/**
 * The motor: 100 ms of near silence, then a whine fades in; it hums steadily (band noise around 2.1 kHz, several close tones between
 * 1.6 and 2.3 kHz, a low 205 Hz body, all roughened by a 12 to 40 Hz flutter) and on stopping the tones die before the noise does.
 */
export function driveHum(c: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, nodes: Nodes, on: number, off: number) {
  const up = on + 0.1, fade = 0.07, down = 0.34;
  const bus = c.createGain(); bus.connect(dest);
  bus.gain.setValueAtTime(0.0001, on); bus.gain.setValueAtTime(0.0001, up); bus.gain.linearRampToValueAtTime(1, up + fade);
  bus.gain.setValueAtTime(1, off); bus.gain.linearRampToValueAtTime(0.0001, off + down);
  const tonesEnd = off + down * 0.55;
  const flutter = c.createBufferSource(), lp = c.createBiquadFilter(), depth = c.createGain();
  flutter.buffer = noise; flutter.loop = true; lp.type = 'lowpass'; lp.frequency.value = 26; depth.gain.value = 0.5;
  flutter.connect(lp); lp.connect(depth); flutter.start(on); flutter.stop(off + down + 0.02); nodes.push(flutter);
  // Band noise: the body of the whirr.
  const src = c.createBufferSource(), f = c.createBiquadFilter(), n = c.createGain();
  src.buffer = noise; src.loop = true; f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.62; n.gain.value = 0.085;
  const top = c.createBiquadFilter(); top.type = 'lowpass'; top.frequency.value = 3800; top.Q.value = 0.5;
  src.connect(f); f.connect(top); top.connect(n); n.connect(bus); src.start(on); src.stop(off + down + 0.02); nodes.push(src);
  // The whine: close tones that beat against each other, flickering with the flutter.
  const tone = (freq: number, amp: number) => {
    const o = c.createOscillator(), a = c.createGain();
    o.frequency.value = freq; a.gain.setValueAtTime(amp, on); a.gain.setValueAtTime(amp, off); a.gain.linearRampToValueAtTime(0.0001, tonesEnd);
    depth.connect(a.gain); o.connect(a); a.connect(bus); o.start(on); o.stop(off + down + 0.02); nodes.push(o);
  };
  tone(2070, 0.02); tone(2165, 0.016); tone(1845, 0.013); tone(2330, 0.009); tone(1623, 0.008);
  // The low body of the motor.
  const o = c.createOscillator(), a = c.createGain();
  o.type = 'sine'; o.frequency.value = 205; a.gain.value = 0.019;
  o.connect(a); a.connect(bus); o.start(on); o.stop(off + down + 0.02); nodes.push(o);
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
  private driveNoise: AudioBuffer | null = null;
  private driveNoiseCtx: BaseAudioContext | null = null;
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
   * The 1541 loading an effect, built the way VICE builds it: the motor starts (a short silence, then a whine fades in), hums steadily
   * while it runs and winds down when it stops; every step of the head is one short knock, louder on the inner tracks; and the head
   * hits its stop with a heavy bump when the drive is first homed. The voices are tuned to the spectra of VICE's drive samples
   * (hum: a 2 kHz whine with a low 205 Hz body; step: 0.6 to 2.2 kHz, 30 ms; bump: 200 to 300 Hz, 120 ms). Times are seconds from now.
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
    const out = c.createGain(); out.gain.value = level * DRIVE_GAIN;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 120; hp.Q.value = 0.7;
    out.connect(hp); hp.connect(c.destination);
    const nodes: AudioScheduledSourceNode[] = [];
    const noise = this.driveNoiseBuffer(c);
    const on = t0 + Math.max(0, times.search - 0.16), off = t0 + times.ready + 0.04;
    driveHum(c, out, noise, nodes, on, off);
    // SEARCHING: the head moves from where it was (track 18 at power-up) to the track of the file, one half-track a step. It speeds up
    // and slows down again; a seek to track 1 ends against the stop with a bump. The directory is on track 18, so it needs no seek.
    const from = this.head, steps = Math.round(Math.abs(target - from) * 2), span = Math.max(0.1, times.load - times.search);
    const count = Math.min(steps, Math.floor(span / 0.02)), dir = target < from ? -1 : 1;
    let at = t0 + times.search;
    if (count === 0) driveStep(c, out, noise, nodes, at, from);
    for (let i = 0; i < count; i++) {
      const track = from + dir * (Math.round(((i + 1) / count) * steps) / 2);
      driveStep(c, out, noise, nodes, at, track);
      at += (span / count) * (0.8 + 0.4 * Math.abs(Math.cos((i / count) * Math.PI)));
    }
    if (target <= 1 && steps > 0) driveBump(c, out, noise, nodes, at, 0.6);
    this.head = target;
    // LOADING: as the file is read the head moves on a track now and then.
    let pos = target;
    for (let dt = 0.14; times.load + dt < times.ready - 0.05; dt += 0.2) { driveStep(c, out, noise, nodes, t0 + times.load + dt, pos); pos += 0.5; }
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
