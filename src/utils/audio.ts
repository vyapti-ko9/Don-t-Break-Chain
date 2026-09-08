// Audio utility.
//
// V1 ships with a tiny WebAudio synth so there are zero binary assets to load
// and nothing to 404 on. If you later drop real files into /public/audio, set
// SOUND_FILES entries and they will be preferred automatically. Every call is
// wrapped so a missing/blocked AudioContext never crashes the game.

import { getSettings } from './storage';

export type SoundName =
  | 'tap'
  | 'activate'
  | 'energy'
  | 'wrong'
  | 'broken'
  | 'complete'
  | 'levelup'
  | 'achievement'
  | 'click'
  | 'explode';

// Optional real assets (relative to the built app). Leave empty to use the synth.
const SOUND_FILES: Partial<Record<SoundName, string>> = {};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<SoundName, AudioBuffer | null>();

function ac(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Call from a user gesture to satisfy autoplay policies. */
export function unlockAudio(): void {
  const c = ac();
  if (c && c.state === 'suspended') void c.resume().catch(() => {});
}

async function loadFile(name: SoundName): Promise<void> {
  const url = SOUND_FILES[name];
  const c = ac();
  if (!url || !c) {
    buffers.set(name, null);
    return;
  }
  try {
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    buffers.set(name, await c.decodeAudioData(arr));
  } catch {
    buffers.set(name, null);
  }
}

interface Tone {
  freq: number;
  dur: number;
  type: OscillatorType;
  slide?: number;
  gain?: number;
  delay?: number;
}

const SYNTH: Record<SoundName, Tone[]> = {
  click: [{ freq: 420, dur: 0.06, type: 'triangle', gain: 0.25 }],
  tap: [{ freq: 640, dur: 0.05, type: 'sine', gain: 0.22 }],
  activate: [{ freq: 520, dur: 0.12, type: 'sine', slide: 780, gain: 0.28 }],
  energy: [{ freq: 300, dur: 0.09, type: 'sawtooth', slide: 500, gain: 0.12 }],
  wrong: [{ freq: 180, dur: 0.16, type: 'square', slide: 120, gain: 0.25 }],
  broken: [
    { freq: 240, dur: 0.18, type: 'sawtooth', slide: 90, gain: 0.3 },
    { freq: 140, dur: 0.3, type: 'square', slide: 60, gain: 0.25, delay: 0.08 },
  ],
  explode: [{ freq: 90, dur: 0.35, type: 'sawtooth', slide: 40, gain: 0.35 }],
  complete: [
    { freq: 523, dur: 0.14, type: 'sine', gain: 0.3 },
    { freq: 659, dur: 0.14, type: 'sine', gain: 0.3, delay: 0.12 },
    { freq: 784, dur: 0.14, type: 'sine', gain: 0.3, delay: 0.24 },
    { freq: 1047, dur: 0.3, type: 'sine', gain: 0.3, delay: 0.36 },
  ],
  levelup: [
    { freq: 659, dur: 0.12, type: 'triangle', gain: 0.3 },
    { freq: 988, dur: 0.28, type: 'triangle', gain: 0.3, delay: 0.1 },
  ],
  achievement: [
    { freq: 784, dur: 0.1, type: 'sine', gain: 0.3 },
    { freq: 1047, dur: 0.1, type: 'sine', gain: 0.3, delay: 0.09 },
    { freq: 1319, dur: 0.26, type: 'sine', gain: 0.3, delay: 0.18 },
  ],
};

function playSynth(name: SoundName): void {
  const c = ac();
  if (!c || !master) return;
  const now = c.currentTime;
  for (const t of SYNTH[name]) {
    const osc = c.createOscillator();
    const g = c.createGain();
    const start = now + (t.delay ?? 0);
    osc.type = t.type;
    osc.frequency.setValueAtTime(t.freq, start);
    if (t.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, t.slide), start + t.dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(t.gain ?? 0.25, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }
}

export function playSound(name: SoundName): void {
  if (!getSettings().sound) return;
  const c = ac();
  if (!c || !master) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});

  if (SOUND_FILES[name]) {
    if (!buffers.has(name)) {
      void loadFile(name).then(() => playSound(name));
      return;
    }
    const buf = buffers.get(name);
    if (buf) {
      const src = c.createBufferSource();
      const g = c.createGain();
      g.gain.value = 0.8;
      src.buffer = buf;
      src.connect(g);
      g.connect(master);
      src.start();
      return;
    }
  }
  playSynth(name);
}
