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
    this.spread = 0;
    this.fade = null;
    this.fadeFired = false;
    this.gain = 1;
    // Load: time spent in process() against the time the audio lasts. The worklet scope has no performance.now(), so Date.now() is
    // summed over many calls, which averages out its one-millisecond steps.
    this.busy = 0;
    this.audioMs = 0;
    this.load = 0;
    this.peak = 0;
    this.port.onmessage = e => this.onMessage(e.data);
  }
  state() {
    const c = this.core;
    this.port.postMessage({ type: 'state', levels: Array.from(c.voiceLevels), waves: Array.from(c.voiceWaveforms), freqs: Array.from(c.voiceFreqs), time: c.getplaytimeExact(), running: c.isRunning(), load: this.load, peak: this.peak });
  }
  onMessage(m) {
    const c = this.core;
    switch (m.type) {
      case 'load': c.loadbuffer(m.bytes, m.subtune); this.seek = null; this.gain = 1; this.fadeFired = false; break;
      case 'play': c.playcont(); break;
      case 'pause': c.pause(); break;
      case 'stop': c.stop(); this.seek = null; this.gain = 1; this.fadeFired = false; break;
      case 'start': this.seek = null; this.gain = 1; this.fadeFired = false; c.start(m.subtune); break;
      case 'models': c.setSIDModels(m.primary, m.secondary); break;
      case 'tape': c.tapeRate = m.rate; break;
      case 'fade': this.fade = m.end === null ? null : { end: m.end, len: Math.max(0.1, m.seconds) }; this.fadeFired = false; if (!this.fade) this.gain = 1; break;
      case 'spread': this.spread = Math.max(0, Math.min(1, m.value)); break;
      case 'seek': this.seek = { id: m.id, target: m.seconds, remaining: null }; break;
      case 'cancelSeek': this.seek = null; break;
    }
    this.state();
  }
  process(inputs, outputs) {
    const t0 = Date.now();
    const keep = this.render(inputs, outputs);
    this.busy += Date.now() - t0;
    this.audioMs += outputs[0][0].length / sampleRate * 1000;
    if (this.audioMs >= 500) {
      this.load = this.busy / this.audioMs;
      this.peak = Math.max(this.peak * 0.8, this.load);
      this.busy = 0;
      this.audioMs = 0;
    }
    return keep;
  }
  render(inputs, outputs) {
    const out = outputs[0][0], outR = outputs[0][1], c = this.core, s = this.seek;
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
      if (this.spread > 0 && outR) (c.stereoActive() ? c.processStereo : c.processWide)(out, outR, out.length, this.spread);
      else { c.process(out, out.length); if (outR) outR.set(out); }
      if (this.fade) {
        // Linear fade against tune time, so seeking and tape speed keep it in step with the music.
        const start = c.getplaytimeExact() - out.length / sampleRate, f = this.fade;
        for (let i = 0; i < out.length; i++) {
          const target = Math.max(0, Math.min(1, (f.end - (start + i / sampleRate)) / f.len));
          // A plan that arrives late must not drop the sound in one step.
          this.gain += Math.max(-2 / sampleRate, Math.min(2 / sampleRate, target - this.gain));
          const g = this.gain;
          out[i] *= g;
          if (outR) outR[i] *= g;
        }
        if (!this.fadeFired && start + out.length / sampleRate >= f.end - 0.05) { this.fadeFired = true; this.port.postMessage({ type: 'fadeEnd' }); }
        else if (this.fadeFired && start + out.length / sampleRate < f.end - 0.5) this.fadeFired = false; // sought back or restarted
      }
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
