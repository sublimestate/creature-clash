import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Runtime Web Audio synthesis — the audio analog of spriteGenerator.ts: no
// binary assets, everything generated from code. Web-only for now: every
// entry point no-ops on native (and in browsers without AudioContext), so
// callers never need to guard. If higher-fidelity audio lands later, swap
// these internals for expo-audio behind the same src/audio API.

const SETTINGS_KEY = 'creature-clash-audio';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let noiseBuffer: AudioBuffer | null = null;
const muteListeners = new Set<() => void>();

function supported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.AudioContext !== 'undefined'
  );
}

export function getContext(): AudioContext | null {
  if (!supported()) return null;
  if (!ctx) {
    ctx = new window.AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function masterBus(): GainNode | null {
  getContext();
  return master;
}

// ── Mute state (persisted separately from the game save) ────────────

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  if (ctx && master) master.gain.setValueAtTime(next ? 0 : 1, ctx.currentTime);
  muteListeners.forEach((l) => l());
  AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted: next })).catch(
    () => {},
  );
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

export function subscribeMuted(listener: () => void): () => void {
  muteListeners.add(listener);
  return () => muteListeners.delete(listener);
}

export async function loadAudioSettings(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed.muted === 'boolean') {
      muted = parsed.muted;
      if (ctx && master) master.gain.value = muted ? 0 : 1;
      muteListeners.forEach((l) => l());
    }
  } catch {
    // Corrupted settings are not worth surfacing; defaults apply.
  }
}

// ── Synthesis primitives ────────────────────────────────────────────

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface ToneOpts {
  freq: number;
  endFreq?: number; // glide target over the full duration
  type?: OscillatorType;
  duration?: number; // seconds
  when?: number; // absolute context time; defaults to now
  gain?: number; // peak amplitude
  attack?: number; // seconds
  out?: AudioNode; // defaults to the master bus
}

export function tone(o: ToneOpts): void {
  const c = getContext();
  const bus = o.out ?? master;
  if (!c || !bus || c.state !== 'running') return;
  const start = o.when ?? c.currentTime;
  const dur = o.duration ?? 0.15;

  const osc = c.createOscillator();
  osc.type = o.type ?? 'square';
  osc.frequency.setValueAtTime(o.freq, start);
  if (o.endFreq) {
    osc.frequency.exponentialRampToValueAtTime(o.endFreq, start + dur);
  }

  const env = c.createGain();
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(o.gain ?? 0.15, start + (o.attack ?? 0.005));
  env.gain.exponentialRampToValueAtTime(0.001, start + dur);

  osc.connect(env).connect(bus);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export interface NoiseOpts {
  duration?: number;
  when?: number;
  gain?: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number };
  out?: AudioNode;
}

export function noise(o: NoiseOpts = {}): void {
  const c = getContext();
  const bus = o.out ?? master;
  if (!c || !bus || c.state !== 'running') return;
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const start = o.when ?? c.currentTime;
  const dur = o.duration ?? 0.1;

  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;

  const env = c.createGain();
  env.gain.setValueAtTime(o.gain ?? 0.1, start);
  env.gain.exponentialRampToValueAtTime(0.001, start + dur);

  let head: AudioNode = src;
  if (o.filter) {
    const f = c.createBiquadFilter();
    f.type = o.filter.type;
    f.frequency.value = o.filter.freq;
    if (o.filter.q !== undefined) f.Q.value = o.filter.q;
    head = src.connect(f);
  }
  head.connect(env).connect(bus);
  src.start(start);
  src.stop(start + dur + 0.02);
}
