// A tiny synthesized sound engine — no audio asset files, everything here is
// generated at runtime with the Web Audio API. Fits the pixel-art/8-bit
// aesthetic directly and sidesteps needing to source real SFX files.

export type SoundName =
  | 'food'
  | 'water'
  | 'shelter'
  | 'weather'
  | 'rest'
  | 'health'
  | 'levelup'
  | 'purchase'
  | 'click'
  | 'error'
  | 'death'
  | 'shoot'
  | 'hit'
  | 'eat'
  | 'powerup';

const STORAGE_KEY = 'anderpark-sound-settings';

interface SoundSettings {
  volume: number; // 0..1
  muted: boolean;
}

function loadSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SoundSettings>;
      return { volume: parsed.volume ?? 0.6, muted: parsed.muted ?? false };
    }
  } catch {
    // ignore malformed storage
  }
  return { volume: 0.6, muted: false };
}

let settings = loadSettings();
const listeners = new Set<() => void>();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function getSoundSettings(): SoundSettings {
  return settings;
}

export function setSoundVolume(v: number) {
  settings = { ...settings, volume: Math.max(0, Math.min(1, v)) };
  persist();
  notify();
}

export function setSoundMuted(muted: boolean) {
  settings = { ...settings, muted };
  persist();
  notify();
}

export function subscribeSoundSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  // Browsers start contexts suspended until a user gesture; every playSound
  // call is already the result of one (a click, a key press), so this is a
  // safe place to resume.
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// Shared with lib/music.ts — background music and one-shot effects sit on
// the same AudioContext instead of opening a second one.
export function getAudioContext(): AudioContext | null {
  return getCtx();
}

function effectiveVolume(): number {
  return settings.muted ? 0 : settings.volume;
}

interface ToneOpts {
  freqStart: number;
  freqEnd?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone(opts: ToneOpts) {
  const vol = effectiveVolume();
  if (vol <= 0) return;
  const audioCtx = getCtx();
  if (!audioCtx) return;
  const { freqStart, freqEnd = freqStart, duration, type = 'square', gain = 0.2, delay = 0 } = opts;
  const t0 = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
  gainNode.gain.setValueAtTime(0, t0);
  gainNode.gain.linearRampToValueAtTime(gain * vol, t0 + 0.008);
  gainNode.gain.exponentialRampToValueAtTime(0.0015, t0 + duration);
  osc.connect(gainNode).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

function noiseBurst(opts: { duration: number; gain?: number; delay?: number; filterFreq?: number }) {
  const vol = effectiveVolume();
  if (vol <= 0) return;
  const audioCtx = getCtx();
  if (!audioCtx) return;
  const { duration, gain = 0.15, delay = 0, filterFreq } = opts;
  const t0 = audioCtx.currentTime + delay;
  const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(gain * vol, t0);
  gainNode.gain.exponentialRampToValueAtTime(0.0015, t0 + duration);
  let tail: AudioNode = src;
  if (filterFreq) {
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    src.connect(filter);
    tail = filter;
  }
  tail.connect(gainNode).connect(audioCtx.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.03);
}

const players: Record<SoundName, () => void> = {
  // Bite/chomp — two quick low descending blips.
  food: () => {
    tone({ freqStart: 320, freqEnd: 180, duration: 0.08, type: 'square', gain: 0.22 });
    tone({ freqStart: 280, freqEnd: 150, duration: 0.09, type: 'square', gain: 0.2, delay: 0.09 });
  },
  // Droplet — descending sine plus a soft splash of noise.
  water: () => {
    tone({ freqStart: 900, freqEnd: 380, duration: 0.16, type: 'sine', gain: 0.18 });
    noiseBurst({ duration: 0.08, gain: 0.05, delay: 0.03, filterFreq: 2800 });
  },
  // Hammer knock — two short percussive thuds (building/tidying).
  shelter: () => {
    tone({ freqStart: 160, freqEnd: 90, duration: 0.08, type: 'triangle', gain: 0.26 });
    tone({ freqStart: 160, freqEnd: 90, duration: 0.08, type: 'triangle', gain: 0.22, delay: 0.13 });
  },
  // Breeze — a light sweeping whoosh.
  weather: () => {
    tone({ freqStart: 450, freqEnd: 950, duration: 0.22, type: 'sine', gain: 0.1 });
    noiseBurst({ duration: 0.28, gain: 0.04, filterFreq: 1800 });
  },
  // Yawn — a slow soft descending tone.
  rest: () => {
    tone({ freqStart: 520, freqEnd: 200, duration: 0.42, type: 'sine', gain: 0.14 });
  },
  // Uplifting two-note chime.
  health: () => {
    tone({ freqStart: 523, duration: 0.12, type: 'triangle', gain: 0.2 });
    tone({ freqStart: 784, duration: 0.18, type: 'triangle', gain: 0.2, delay: 0.12 });
  },
  // Level-up fanfare — four-note ascending arpeggio.
  levelup: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freqStart: f, duration: 0.16, type: 'square', gain: 0.2, delay: i * 0.09 }),
    );
  },
  purchase: () => {
    tone({ freqStart: 400, freqEnd: 720, duration: 0.12, type: 'square', gain: 0.18 });
  },
  click: () => {
    tone({ freqStart: 700, duration: 0.03, type: 'square', gain: 0.07 });
  },
  error: () => {
    tone({ freqStart: 180, freqEnd: 110, duration: 0.2, type: 'sawtooth', gain: 0.16 });
  },
  // A slow minor-feeling descending tone for the memorial moment.
  death: () => {
    tone({ freqStart: 392, freqEnd: 196, duration: 0.7, type: 'sine', gain: 0.14 });
    tone({ freqStart: 330, freqEnd: 165, duration: 0.7, type: 'sine', gain: 0.1, delay: 0.08 });
  },
  shoot: () => {
    tone({ freqStart: 900, freqEnd: 1400, duration: 0.05, type: 'square', gain: 0.1 });
  },
  hit: () => {
    tone({ freqStart: 220, freqEnd: 80, duration: 0.1, type: 'square', gain: 0.16 });
    noiseBurst({ duration: 0.06, gain: 0.08, filterFreq: 2200 });
  },
  eat: () => {
    tone({ freqStart: 700, freqEnd: 500, duration: 0.05, type: 'square', gain: 0.12 });
  },
  powerup: () => {
    [500, 700, 950].forEach((f, i) => tone({ freqStart: f, duration: 0.09, type: 'square', gain: 0.16, delay: i * 0.05 }));
  },
};

export function playSound(name: SoundName) {
  try {
    players[name]?.();
  } catch {
    // Audio can legitimately fail (autoplay policy, unsupported browser) —
    // never let a sound effect break the actual game action it's tied to.
  }
}
