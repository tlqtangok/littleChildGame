export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

let audioContext: AudioContext | null = null;

export const getAudioContext = () => {
  if (!audioContext) {
    // Remove sampleRate config to be safe on iOS Safari which requires hardware-matched rate
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  return audioContext;
};

// iOS Safari requires audio context to be resumed inside a user gesture (click/touch)
export const unlockAudioContext = () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  // Play a tiny silent buffer to ensure the audio engine is fully engaged
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
};

export const playAudioBuffer = (buffer: AudioBuffer) => {
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
};

// --- SYNTHESIZED SOUND EFFECTS (Instant Feedback) ---

const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 0.1) => {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
  
  gain.gain.setValueAtTime(vol, ctx.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + startTime);
  osc.stop(ctx.currentTime + startTime + duration);
};

export const playClickSound = () => {
  // High pitched pop
  playTone(800, 'sine', 0.1, 0, 0.1);
};

export const playDeleteSound = () => {
  // Lower sweeping sound
  playTone(400, 'triangle', 0.15, 0, 0.1);
};

export const playStepSound = () => {
  // Soft tick
  playTone(600, 'sine', 0.05, 0, 0.05);
};

export const playBonkSound = () => {
  // Low dissonant sound
  playTone(150, 'sawtooth', 0.3, 0, 0.1);
  playTone(100, 'square', 0.3, 0, 0.1);
};

export const playWinSound = () => {
  // Major arpeggio (C E G C)
  const now = 0;
  playTone(523.25, 'sine', 0.2, now, 0.1);       // C5
  playTone(659.25, 'sine', 0.2, now + 0.1, 0.1); // E5
  playTone(783.99, 'sine', 0.2, now + 0.2, 0.1); // G5
  playTone(1046.50, 'sine', 0.4, now + 0.3, 0.1); // C6
};

export const playVictorySound = () => {
  // Celebratory sequence
  const now = 0;
  playTone(523.25, 'square', 0.1, now, 0.1); // C
  playTone(523.25, 'square', 0.1, now + 0.1, 0.1); // C
  playTone(523.25, 'square', 0.1, now + 0.2, 0.1); // C
  playTone(1046.50, 'square', 0.6, now + 0.3, 0.1); // High C
  
  // Sparkle effect
  setTimeout(() => {
    playTone(1567.98, 'sine', 0.1, 0, 0.05);
    playTone(1975.53, 'sine', 0.1, 0.1, 0.05);
  }, 400);
};