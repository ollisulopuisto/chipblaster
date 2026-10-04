// Audio-thread end of the libsidplayfp engine: plays the PCM chunks that the fp worker sends over a MessagePort.
// Each chunk also carries a "side" signal (for STEREO ENHANCE) and per-voice meter readings, made by a jsSID core that runs alongside
// in the worker, so the engines can be compared with the same features. Tape speed is a resampler at this end.
const LOW = 0.35, HIGH = 0.8; // seconds of audio kept buffered
const STATE_FRAMES = 1024;
const METER_FRAMES = 1024;
const GAIN_STEP = 2 / sampleRate; // per sample
const WIDE_GAIN = 1; // the side signal is already scaled for amount 1

class FpSink extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.pos = 0;
    this.buffered = 0;
    this.requested = 0;
    this.gen = 0;
    this.playing = false;
    this.loaded = false;
    this.fade = null;
    this.fadeFired = false;
    this.gain = 1;
    this.since = 0;
    this.worker = null;
    this.rate = 1;
    this.spread = 0;
    this.frac = 0;
    this.ready = false;
    this.prev = { l: 0, r: 0, s: 0, t: 0, chunk: null, at: 0 };
    this.next = { l: 0, r: 0, s: 0, t: 0, chunk: null, at: 0 };
    this.port.onmessage = e => {
      const m = e.data;
      if (m.type === 'worker') { this.worker = m.port; this.worker.onmessage = ev => this.onWorker(ev.data); this.top(); }
      else if (m.type === 'gen') {
        this.gen = m.gen; this.queue = []; this.pos = 0; this.buffered = 0; this.requested = 0; this.loaded = false;
        this.ready = false; this.fadeFired = false; this.gain = 1; this.frac = 0; this.prev.t = this.next.t = m.time || 0; this.prev.chunk = this.next.chunk = null;
      }
      else if (m.type === 'play') { this.playing = true; this.top(); }
      else if (m.type === 'pause') this.playing = false;
      else if (m.type === 'fade') { this.fade = m.end === null ? null : { end: m.end, len: Math.max(0.1, m.seconds) }; this.fadeFired = false; }
      else if (m.type === 'tape') this.rate = Math.max(0.28, Math.min(2, m.rate));
      else if (m.type === 'spread') this.spread = Math.max(0, Math.min(1, m.value));
    };
  }
  onWorker(m) {
    if (m.gen !== this.gen) return;
    if (m.type === 'loaded') { this.loaded = true; this.top(); }
    else if (m.type === 'chunk') {
      this.queue.push(m);
      this.buffered += m.l.length;
      this.requested = Math.max(0, this.requested - m.l.length);
    }
  }
  top() {
    if (!this.worker || !this.loaded) return;
    if ((this.buffered + this.requested) / sampleRate < LOW) {
      const frames = Math.ceil(HIGH * sampleRate) - this.buffered - this.requested;
      this.requested += frames;
      this.worker.postMessage({ type: 'need', frames });
    }
  }
  /** Moves the next source sample into `into`; false when the queue ran dry (the sample is then held). */
  pull(into) {
    const c = this.queue[0];
    if (!c) return false;
    into.l = c.l[this.pos]; into.r = c.r[this.pos]; into.s = c.s ? c.s[this.pos] : 0;
    into.t = c.t0 + this.pos / sampleRate; into.chunk = c; into.at = this.pos;
    this.pos++; this.buffered--;
    if (this.pos >= c.l.length) { this.queue.shift(); this.pos = 0; }
    return true;
  }
  process(inputs, outputs) {
    const L = outputs[0][0], R = outputs[0][1], n = L.length;
    if (!this.playing) return true;
    let underrun = false;
    if (!this.ready) {
      if (!this.pull(this.prev)) return true;
      if (!this.pull(this.next)) { this.next.l = this.prev.l; this.next.r = this.prev.r; this.next.s = this.prev.s; this.next.t = this.prev.t; }
      this.frac = 0; this.ready = true;
    }
    const a = this.prev, b = this.next, amount = this.spread * WIDE_GAIN;
    for (let i = 0; i < n; i++) {
      const f = this.frac;
      let l = a.l + (b.l - a.l) * f, r = a.r + (b.r - a.r) * f;
      const side = (a.s + (b.s - a.s) * f) * amount;
      l += side; r -= side;
      let g = 1;
      if (this.fade) g = Math.max(0, Math.min(1, (this.fade.end - a.t) / this.fade.len));
      // A plan that arrives late (the loop scan is still running) must not drop the sound in one step: the gain may move at most half a second per whole range.
      this.gain += Math.max(-GAIN_STEP, Math.min(GAIN_STEP, g - this.gain));
      g = this.gain;
      L[i] = l * g;
      if (R) R[i] = r * g;
      this.frac += this.rate;
      while (this.frac >= 1) {
        this.frac -= 1;
        a.l = b.l; a.r = b.r; a.s = b.s; a.t = b.t; a.chunk = b.chunk; a.at = b.at;
        if (!this.pull(b)) { underrun = true; this.frac = 0; break; }
      }
    }
    // The fade has run out: say so now, so the player moves on at once instead of at the next whole second of the clock.
    if (this.fade && !this.fadeFired && a.t >= this.fade.end - 0.05) { this.fadeFired = true; this.port.postMessage({ type: 'fadeEnd' }); }
    else if (this.fade && this.fadeFired && a.t < this.fade.end - 0.5) this.fadeFired = false; // sought back or restarted
    this.since += n;
    if (this.since >= STATE_FRAMES) {
      this.since = 0;
      const m = { type: 'state', time: a.t, underrun };
      const c = a.chunk;
      if (c && c.levels) {
        const k = Math.min(c.blocks - 1, Math.floor(a.at / METER_FRAMES));
        m.levels = Array.from(c.levels.subarray(k * 7, k * 7 + 7));
        m.waves = Array.from(c.waves.subarray(k * 6, k * 6 + 6));
        if (c.freqs) m.freqs = Array.from(c.freqs.subarray(k * 6, k * 6 + 6));
      }
      this.port.postMessage(m);
      this.top();
    }
    return true;
  }
}
registerProcessor('fp-sink', FpSink);
