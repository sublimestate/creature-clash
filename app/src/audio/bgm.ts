import { getContext, masterBus, midiToFreq, noise, tone } from './synth';

// Chiptune step sequencer. Tracks are 16th-note grids; a lookahead timer
// schedules a short window of notes ahead of the clock so playback survives
// timer jitter. requestBgm() can be called before the AudioContext is
// unlocked — the track is remembered and started by syncBgm() on unlock.

export type BgmTrack = 'theme' | 'battle';

interface ChannelDef {
  type: OscillatorType;
  gain: number;
  notes: Array<[step: number, midi: number, lengthInSteps?: number]>;
}

interface TrackDef {
  bpm: number;
  steps: number;
  channels: ChannelDef[];
  hats?: number[]; // steps that get a noise tick
}

// Four bars in C major (C → Am → F → G), unhurried — home and campaign.
function strolls(): TrackDef {
  const roots = [48, 45, 41, 43];
  const bass: ChannelDef = {
    type: 'square',
    gain: 0.045,
    notes: roots.flatMap((root, bar): ChannelDef['notes'] => {
      const b = bar * 16;
      return [
        [b, root, 2],
        [b + 4, root + 7, 2],
        [b + 8, root, 2],
        [b + 12, root + 7, 2],
      ];
    }),
  };
  const lead: ChannelDef = {
    type: 'triangle',
    gain: 0.06,
    notes: [
      [0, 76, 2], [4, 79], [8, 72, 2], [12, 74],
      [16, 76, 2], [20, 72], [24, 69, 3], [30, 71],
      [32, 72, 2], [36, 69], [40, 77, 2], [44, 76],
      [48, 74, 2], [52, 71], [56, 67, 4],
    ],
  };
  return { bpm: 92, steps: 64, channels: [bass, lead] };
}

// Two driving bars in A minor — battles.
function scrap(): TrackDef {
  const bassNotes: ChannelDef['notes'] = [];
  for (let s = 0; s <= 14; s += 2) bassNotes.push([s, 45]);
  for (let s = 16; s <= 22; s += 2) bassNotes.push([s, 43]);
  for (let s = 24; s <= 26; s += 2) bassNotes.push([s, 48]);
  for (let s = 28; s <= 30; s += 2) bassNotes.push([s, 47]);
  return {
    bpm: 148,
    steps: 32,
    channels: [
      { type: 'square', gain: 0.06, notes: bassNotes },
      {
        type: 'square',
        gain: 0.05,
        notes: [
          [0, 69], [4, 72], [6, 71], [8, 69], [12, 76, 2],
          [16, 67], [18, 69], [20, 72, 2], [24, 71], [26, 67], [28, 69, 3],
        ],
      },
    ],
    hats: [2, 6, 10, 14, 18, 22, 26, 30],
  };
}

const TRACKS: Record<BgmTrack, TrackDef> = {
  theme: strolls(),
  battle: scrap(),
};

const LOOKAHEAD_S = 0.3;
const TICK_MS = 120;

interface Playing {
  name: BgmTrack;
  timer: ReturnType<typeof setInterval>;
  bus: GainNode;
}

let playing: Playing | null = null;
let desired: BgmTrack | null = null;

export function playBgm(name: BgmTrack): void {
  desired = name;
  startDesired();
}

export function stopBgm(): void {
  desired = null;
  stopPlaying();
}

// Re-attempt the desired track; called after the AudioContext unlocks.
export function syncBgm(): void {
  startDesired();
}

function startDesired(): void {
  const c = getContext();
  if (!c) return;
  if (desired && playing?.name === desired) return;
  stopPlaying();
  if (!desired || c.state !== 'running') return;

  const def = TRACKS[desired];
  const bus = c.createGain();
  bus.gain.value = 1;
  bus.connect(masterBus()!);

  const stepDur = 60 / def.bpm / 4;
  let next = c.currentTime + 0.05;
  let step = 0;
  const timer = setInterval(() => {
    while (next < c.currentTime + LOOKAHEAD_S) {
      scheduleStep(def, step, next, stepDur, bus);
      next += stepDur;
      step = (step + 1) % def.steps;
    }
  }, TICK_MS);
  playing = { name: desired, timer, bus };
}

function stopPlaying(): void {
  if (!playing) return;
  clearInterval(playing.timer);
  const c = getContext();
  const bus = playing.bus;
  if (c) {
    bus.gain.setValueAtTime(bus.gain.value, c.currentTime);
    bus.gain.linearRampToValueAtTime(0, c.currentTime + 0.15);
  }
  setTimeout(() => bus.disconnect(), 400);
  playing = null;
}

function scheduleStep(
  def: TrackDef,
  step: number,
  when: number,
  stepDur: number,
  bus: GainNode,
): void {
  for (const ch of def.channels) {
    for (const [s, midi, len] of ch.notes) {
      if (s !== step) continue;
      tone({
        when,
        freq: midiToFreq(midi),
        type: ch.type,
        gain: ch.gain,
        duration: (len ?? 1) * stepDur * 0.9,
        out: bus,
      });
    }
  }
  if (def.hats?.includes(step)) {
    noise({
      when,
      duration: 0.03,
      gain: 0.02,
      filter: { type: 'highpass', freq: 6000 },
      out: bus,
    });
  }
}
