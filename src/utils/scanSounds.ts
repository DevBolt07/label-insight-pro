export type ScanSoundType = 'scanner' | 'beep' | 'chime' | 'click' | 'pop';

export const SCAN_SOUND_OPTIONS: { value: ScanSoundType; label: string }[] = [
  { value: 'scanner', label: 'Scanner' },
  { value: 'beep', label: 'Beep' },
  { value: 'chime', label: 'Chime' },
  { value: 'click', label: 'Click' },
  { value: 'pop', label: 'Pop' }
];

export const playScanSound = (soundType: ScanSoundType = 'scanner') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;

    switch (soundType) {
      case 'scanner':
        playScanner(audioContext, now);
        break;
      case 'beep':
        playBeep(audioContext, now);
        break;
      case 'chime':
        playChime(audioContext, now);
        break;
      case 'click':
        playClick(audioContext, now);
        break;
      case 'pop':
        playPop(audioContext, now);
        break;
    }
  } catch (error) {
    console.warn('Could not play scan sound:', error);
  }
};

// Original scanner sound - ascending chirp with confirmation
const playScanner = (ctx: AudioContext, now: number) => {
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.4, now);

  // Ascending chirp
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(800, now);
  osc1.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
  gain1.gain.setValueAtTime(0.5, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  osc1.start(now);
  osc1.stop(now + 0.1);

  // Confirmation beep
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1200, now + 0.1);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.6, now + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
  osc2.start(now + 0.1);
  osc2.stop(now + 0.25);

  // Harmonic layer
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.connect(gain3);
  gain3.connect(masterGain);
  osc3.type = 'triangle';
  osc3.frequency.setValueAtTime(600, now + 0.1);
  gain3.gain.setValueAtTime(0, now);
  gain3.gain.setValueAtTime(0.3, now + 0.1);
  gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
  osc3.start(now + 0.1);
  osc3.stop(now + 0.2);
};

// Simple beep - classic single tone
const playBeep = (ctx: AudioContext, now: number) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  osc.start(now);
  osc.stop(now + 0.15);
};

// Chime - pleasant dual-tone success sound
const playChime = (ctx: AudioContext, now: number) => {
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.3, now);

  // First note
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, now); // C5
  gain1.gain.setValueAtTime(0.5, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
  osc1.start(now);
  osc1.stop(now + 0.3);

  // Second note (higher)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.5, now + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
  osc2.start(now + 0.1);
  osc2.stop(now + 0.4);

  // Third note (even higher)
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.connect(gain3);
  gain3.connect(masterGain);
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(783.99, now + 0.2); // G5
  gain3.gain.setValueAtTime(0, now);
  gain3.gain.setValueAtTime(0.4, now + 0.2);
  gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  osc3.start(now + 0.2);
  osc3.stop(now + 0.5);
};

// Click - short mechanical click sound
const playClick = (ctx: AudioContext, now: number) => {
  // Use noise burst for click
  const bufferSize = ctx.sampleRate * 0.03;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // High-pass filter for click
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(2000, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.03);

  // Add subtle tonal component
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, now);
  oscGain.gain.setValueAtTime(0.15, now);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
  osc.start(now);
  osc.stop(now + 0.02);
};

// Pop - bubbly pop sound
const playPop = (ctx: AudioContext, now: number) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  // Start high and drop quickly for pop effect
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  osc.start(now);
  osc.stop(now + 0.1);

  // Add subtle harmonic
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1200, now);
  osc2.frequency.exponentialRampToValueAtTime(300, now + 0.08);
  gain2.gain.setValueAtTime(0.2, now);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
  osc2.start(now);
  osc2.stop(now + 0.08);
};
