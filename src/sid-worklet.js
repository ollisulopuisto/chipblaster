// AudioWorklet host for the SID emulator: runs on the audio thread, so background throttling of the page cannot starve it.
import SidCore from './vendor/sid-core.js';

const METER_FRAMES = 1024;
const SEEK_CHUNK = 16384;

class SidProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.core = new SidCore(sampleRate, 0.0002);
    this.frames = 0;
    this.seek = null;
    this.seekTicks = 0;
    this.port.onmessage = e => this.onMessage(e.data);
  }
  state() {
    const c = this.core;
    this.port.postMessage({ type: 'state', levels: Array.from(c.voiceLevels), waves: Array.from(c.voiceWaveforms), time: c.getplaytimeExact(), running: c.isRunning() });
  }
  onMessage(m) {
    const c = this.core;
    switch (m.type) {
      case 'load': c.loadbuffer(m.bytes, m.subtune); this.seek = null; break;
      case 'play': c.playcont(); break;
      case 'pause': c.pause(); break;
      case 'stop': c.stop(); this.seek = null; break;
      case 'start': this.seek = null; c.start(m.subtune); break;
      case 'models': c.setSIDModels(m.primary, m.secondary); break;
      case 'tape': c.tapeRate = m.rate; break;
      case 'seek': this.seek = { id: m.id, target: m.seconds, remaining: null }; break;
      case 'cancelSeek': this.seek = null; break;
    }
    this.state();
  }
  process(inputs, outputs) {
    const out = outputs[0][0], c = this.core, s = this.seek;
    if (s) {
      if (s.remaining === null) {
        c.pause();
        if (s.target < c.getplaytimeExact() - 0.25) c.stop();
        s.remaining = Math.max(0, Math.round((s.target - c.getplaytimeExact()) * sampleRate));
      }
      const n = Math.min(s.remaining, SEEK_CHUNK);
      c.skip(n);
      s.remaining -= n;
      if (s.remaining <= 0) {
        this.seek = null;
        this.port.postMessage({ type: 'seekDone', id: s.id, time: c.getplaytimeExact() });
        this.state();
      } else if (++this.seekTicks % 6 === 0) {
        this.port.postMessage({ type: 'seekProgress', id: s.id, time: c.getplaytimeExact() });
      }
      return true;
    }
    if (c.isRunning() && out) {
      c.process(out, out.length);
      this.frames += out.length;
      if (this.frames >= METER_FRAMES) {
        c.finishMeters(this.frames);
        c.resetMeters();
        this.frames = 0;
        this.state();
      }
    }
    return true;
  }
}
registerProcessor('sid-processor', SidProcessor);
