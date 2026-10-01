// Mechanical key, latch and case sounds, synthesised. They are only a seasoning: quiet in general, and while music plays only the big
// mechanical events are heard (and softly), because small clicks fight with the music. The level is one of off, soft and full.
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

  private noiseBuffer(c: BaseAudioContext): AudioBuffer {
    if (!this.noise || this.noiseCtx !== c) {
      const n = Math.ceil(c.sampleRate * 0.1), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b; this.noiseCtx = c;
    }
    return this.noise;
  }
}
