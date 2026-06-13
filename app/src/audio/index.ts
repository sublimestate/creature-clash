export { playBgm, stopBgm, type BgmTrack } from './bgm';
export { playSfx, type SfxName } from './sfx';
export { isMuted, subscribeMuted, toggleMuted } from './synth';

import { syncBgm } from './bgm';
import { getContext, loadAudioSettings } from './synth';

export async function initAudio(): Promise<void> {
  await loadAudioSettings();
}

// Browsers refuse to run an AudioContext before a user gesture. Call this
// from a pointerdown/keydown listener; it resumes the context and starts
// whatever BGM was requested while locked.
export function unlockAudio(): void {
  const c = getContext();
  if (!c) return;
  if (c.state === 'suspended') {
    void c.resume().then(syncBgm);
  } else {
    syncBgm();
  }
}
