// Audio-thread end of the libsidplayfp test engine: plays PCM chunks that the fp worker sends over a MessagePort.
const LOW = 0.35, HIGH = 0.8; // seconds of audio kept buffered
const STATE_FRAMES = 2048;

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
    this.time = 0;
    this.fade = null;
    this.since = 0;
    this.worker = null;
    this.load = 0;
    this.peak = 0;
    this.port.onmessage = e => {
      const m = e.data;
      if (m.type === 'worker') { this.worker = m.port; this.worker.onmessage = ev => this.onWorker(ev.data); this.top(); }
      else if (m.type === 'gen') { this.gen = m.gen; this.queue = []; this.pos = 0; this.buffered = 0; this.requested = 0; this.loaded = false; this.time = m.time || 0; }
      else if (m.type === 'play') { this.playing = true; this.top(); }
      else if (m.type === 'pause') this.playing = false;
      else if (m.type === 'fade') this.fade = m.end === null ? null : { end: m.end, len: Math.max(0.1, m.seconds) };
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
  process(inputs, outputs) {
    const L = outputs[0][0], R = outputs[0][1], n = L.length;
    if (!this.playing) return true;
    let i = 0;
    while (i < n && this.queue.length) {
      const c = this.queue[0];
      const take = Math.min(n - i, c.l.length - this.pos);
      for (let k = 0; k < take; k++) {
        let g = 1;
        if (this.fade) {
          const t = c.t0 + (this.pos + k) / sampleRate;
          g = Math.max(0, Math.min(1, (this.fade.end - t) / this.fade.len));
        }
        L[i + k] = c.l[this.pos + k] * g;
        if (R) R[i + k] = c.r[this.pos + k] * g;
      }
      this.time = c.t0 + (this.pos + take) / sampleRate;
      i += take; this.pos += take; this.buffered -= take;
      if (this.pos >= c.l.length) { this.queue.shift(); this.pos = 0; }
    }
    this.since += n;
    if (this.since >= STATE_FRAMES) {
      this.since = 0;
      this.port.postMessage({ type: 'state', time: this.time, underrun: i < n });
      this.top();
    }
    return true;
  }
}
registerProcessor('fp-sink', FpSink);
