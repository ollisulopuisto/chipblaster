/** Headphone space: centered dry + equal/opposite filtered delayed Side.
 * Shared 0.66 gain reserves headroom in both Original and Space for fair A/B.
 * No limiter: clipping would break the mono-sum guarantee.
 */
export const SPACE_HEADROOM = 0.66;
export const SPACE_MAX_SIDE = 0.5;
export function createSpace(context: BaseAudioContext, input: AudioNode, amount = 0) {
  const dry = context.createGain(), highpass = context.createBiquadFilter();
  const delay = context.createDelay(0.05), side = context.createGain();
  const invert = context.createGain(), merge = context.createChannelMerger(2);
  const output = context.createGain();
  dry.channelCount = highpass.channelCount = 1;
  dry.channelCountMode = highpass.channelCountMode = 'explicit';
  highpass.type = 'highpass'; highpass.frequency.value = 150;
  highpass.Q.value = Math.SQRT1_2; delay.delayTime.value = 0.008;
  side.gain.value = Math.max(0, Math.min(100, amount)) / 100 * SPACE_MAX_SIDE;
  invert.gain.value = -1; output.gain.value = SPACE_HEADROOM;
  input.connect(dry); dry.connect(merge, 0, 0); dry.connect(merge, 0, 1);
  input.connect(highpass); highpass.connect(delay); delay.connect(side);
  side.connect(merge, 0, 0); side.connect(invert); invert.connect(merge, 0, 1);
  merge.connect(output);
  return {output, setAmount(value: number) {
    const target = Math.max(0, Math.min(100, value)) / 100 * SPACE_MAX_SIDE;
    const now = context.currentTime;
    side.gain.cancelScheduledValues(now);
    side.gain.setTargetAtTime(target, now, 0.02);
  }};
}
