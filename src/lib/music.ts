// A tiny generative ambient loop — no audio asset files, generated at
// runtime with the Web Audio API on the same context as lib/sound.ts. A
// slow four-chord pad progression with a soft plucked note over each chord,
// looped indefinitely. Deliberately generic and unobtrusive: it's there to
// fill silence in the park, not to be a song anyone hums along to.

import { getAudioContext } from './sound';

const STORAGE_KEY = 'anderpark-music-settings';
const LOOP_SECONDS = 8;

// C major - A minor - F major - G major, one octave down from middle C —
// warm and low enough to sit under sound effects without competing.
const CHORDS: number[][] = [
  [261.63, 329.63, 392.0], // C E G
  [220.0, 261.63, 329.63], // A C E
  [174.61, 220.0, 261.63], // F A C
  [196.0, 246.94, 293.66], // G B D
];

interface MusicSettings {
  volume: number; // 0..1
  muted: boolean;
}

function loadSettings(): MusicSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MusicSettings>;
      return { volume: parsed.volume ?? 0.25, muted: parsed.muted ?? false };
    }
  } catch {
    // ignore malformed storage
  }
  return { volume: 0.25, muted: false };
}

let settings = loadSettings();
const listeners = new Set<() => void>();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function getMusicSettings(): MusicSettings {
  return settings;
}

export function subscribeMusicSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function effectiveVolume(): number {
  return settings.muted ? 0 : settings.volume;
}

let masterGain: GainNode | null = null;
let loopTimer: number | null = null;
let gestureListenersAttached = false;

function ensureGraph(audioCtx: AudioContext): GainNode {
  if (!masterGain) {
    masterGain = audioCtx.createGain();
    masterGain.gain.value = effectiveVolume();
    masterGain.connect(audioCtx.destination);
  }
  return masterGain;
}

// A sustained note with a slow attack/release — the harmonic bed.
function padTone(audioCtx: AudioContext, gain: GainNode, freq: number, t0: number, duration: number, peak: number) {
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(peak, t0 + duration * 0.35);
  env.gain.linearRampToValueAtTime(peak * 0.7, t0 + duration * 0.7);
  env.gain.linearRampToValueAtTime(0, t0 + duration);
  osc.connect(env).connect(gain);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

// A single soft plucked note over the top of a chord — gentle melodic
// motion so the loop doesn't feel static.
function pluckTone(audioCtx: AudioContext, gain: GainNode, freq: number, t0: number, peak: number) {
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(peak, t0 + 0.05);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + 1.6);
  osc.connect(env).connect(gain);
  osc.start(t0);
  osc.stop(t0 + 1.7);
}

function scheduleLoop(audioCtx: AudioContext) {
  const gain = ensureGraph(audioCtx);
  const start = audioCtx.currentTime + 0.05;
  const chordDur = LOOP_SECONDS / CHORDS.length;
  CHORDS.forEach((chord, i) => {
    const t0 = start + i * chordDur;
    chord.forEach((freq, j) => padTone(audioCtx, gain, freq, t0, chordDur, 0.11 - j * 0.02));
    pluckTone(audioCtx, gain, chord[chord.length - 1] * 2, t0 + chordDur * 0.5, 0.05);
  });
}

function applyMusicState() {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;
  const gain = ensureGraph(audioCtx);
  gain.gain.cancelScheduledValues(audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(effectiveVolume(), audioCtx.currentTime + 0.4);

  if (!settings.muted && loopTimer === null) {
    scheduleLoop(audioCtx);
    loopTimer = window.setInterval(() => scheduleLoop(audioCtx), LOOP_SECONDS * 1000);
  } else if (settings.muted && loopTimer !== null) {
    window.clearInterval(loopTimer);
    loopTimer = null;
  }
}

// Browsers won't start/resume an AudioContext before a user gesture, so the
// loop (if enabled) starts on the page's first click/keypress rather than
// on load.
function attachGestureListeners() {
  if (gestureListenersAttached || typeof window === 'undefined') return;
  gestureListenersAttached = true;
  const start = () => {
    applyMusicState();
    window.removeEventListener('pointerdown', start);
    window.removeEventListener('keydown', start);
  };
  window.addEventListener('pointerdown', start);
  window.addEventListener('keydown', start);
}

attachGestureListeners();

export function setMusicVolume(v: number) {
  settings = { ...settings, volume: Math.max(0, Math.min(1, v)) };
  persist();
  notify();
  applyMusicState();
}

export function setMusicMuted(muted: boolean) {
  settings = { ...settings, muted };
  persist();
  notify();
  applyMusicState();
}
