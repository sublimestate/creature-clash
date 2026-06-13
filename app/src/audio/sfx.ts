import { getContext, midiToFreq, noise, tone } from './synth';

// One recipe per game sound. Each takes the context's current time so
// multi-part sounds can stagger their pieces on the same clock.

export type SfxName =
  | 'tap'
  | 'fight'
  | 'hit'
  | 'crit'
  | 'super'
  | 'weak'
  | 'miss'
  | 'heal'
  | 'buff'
  | 'status'
  | 'faint'
  | 'victory'
  | 'defeat'
  | 'levelup'
  | 'recruit';

function thump(t: number, gain: number): void {
  noise({
    when: t,
    duration: 0.08,
    gain: gain * 1.2,
    filter: { type: 'lowpass', freq: 900 },
  });
  tone({ when: t, freq: 160, endFreq: 70, type: 'square', duration: 0.1, gain });
}

function arp(t: number, midis: number[], stepS: number, type: OscillatorType, gain: number, lastLong = true): void {
  midis.forEach((m, i) => {
    const last = i === midis.length - 1;
    tone({
      when: t + i * stepS,
      freq: midiToFreq(m),
      type,
      duration: last && lastLong ? stepS * 3 : stepS * 1.2,
      gain,
    });
  });
}

const RECIPES: Record<SfxName, (t: number) => void> = {
  tap: (t) => {
    tone({ when: t, freq: 660, type: 'square', duration: 0.05, gain: 0.06 });
  },
  fight: (t) => {
    tone({ when: t, freq: 220, endFreq: 523, type: 'sawtooth', duration: 0.22, gain: 0.1 });
    noise({ when: t + 0.16, duration: 0.1, gain: 0.08, filter: { type: 'highpass', freq: 2500 } });
  },
  hit: (t) => thump(t, 0.12),
  crit: (t) => {
    thump(t, 0.16);
    tone({ when: t + 0.02, freq: 1100, endFreq: 1600, type: 'triangle', duration: 0.09, gain: 0.1 });
  },
  super: (t) => {
    thump(t, 0.14);
    arp(t + 0.04, [76, 83], 0.05, 'square', 0.07, false);
  },
  weak: (t) => {
    tone({ when: t, freq: 120, endFreq: 75, type: 'sine', duration: 0.12, gain: 0.1 });
  },
  miss: (t) => {
    tone({ when: t, freq: 880, endFreq: 320, type: 'sine', duration: 0.13, gain: 0.05 });
  },
  heal: (t) => {
    tone({ when: t, freq: midiToFreq(76), type: 'sine', duration: 0.12, gain: 0.08 });
    tone({ when: t + 0.09, freq: midiToFreq(83), type: 'sine', duration: 0.18, gain: 0.08 });
  },
  buff: (t) => {
    tone({ when: t, freq: 330, endFreq: 660, type: 'triangle', duration: 0.16, gain: 0.08 });
  },
  status: (t) => {
    tone({ when: t, freq: 440, endFreq: 392, type: 'square', duration: 0.07, gain: 0.06 });
    tone({ when: t + 0.08, freq: 415, endFreq: 370, type: 'square', duration: 0.09, gain: 0.06 });
  },
  faint: (t) => {
    tone({ when: t, freq: 330, endFreq: 55, type: 'square', duration: 0.32, gain: 0.09 });
  },
  victory: (t) => {
    arp(t, [72, 76, 79, 84], 0.11, 'square', 0.09);
    arp(t + 0.05, [60, 64, 67, 72], 0.11, 'triangle', 0.07);
  },
  defeat: (t) => {
    arp(t, [57, 53, 50, 45], 0.22, 'triangle', 0.09);
  },
  levelup: (t) => {
    arp(t, [76, 79, 83, 88], 0.07, 'triangle', 0.08);
  },
  recruit: (t) => {
    arp(t, [79, 84, 88, 91], 0.09, 'sine', 0.08);
    noise({ when: t, duration: 0.25, gain: 0.02, filter: { type: 'highpass', freq: 7000 } });
  },
};

export function playSfx(name: SfxName): void {
  const c = getContext();
  if (!c || c.state !== 'running') return;
  try {
    RECIPES[name](c.currentTime);
  } catch {
    // A failed sound effect should never take the game down with it.
  }
}
