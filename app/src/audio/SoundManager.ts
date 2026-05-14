import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { SFX_BASE_VOLUME, SFX_SOURCES, SfxId } from './sounds';

// Re-entrant SFX: same id firing twice quickly should restart, not get
// dropped. We keep one player per sfx id; on play() we seekTo(0) and play().
// On web this is enough; iOS/Android may clip the first instance, which is
// acceptable for short SFX.

type Players = Partial<Record<SfxId, AudioPlayer>>;

class SoundManager {
  private players: Players = {};
  private initialized = false;
  private muted = false;
  private masterVolume = 1.0;

  init() {
    if (this.initialized) return;
    this.initialized = true;
    for (const id of Object.keys(SFX_SOURCES) as SfxId[]) {
      try {
        const player = createAudioPlayer(SFX_SOURCES[id]);
        player.volume = this.effectiveVolume(id);
        this.players[id] = player;
      } catch (e) {
        if (__DEV__) console.warn(`[audio] failed to load ${id}:`, e);
      }
    }
  }

  private effectiveVolume(id: SfxId): number {
    return this.muted ? 0 : SFX_BASE_VOLUME[id] * this.masterVolume;
  }

  play(id: SfxId) {
    if (!this.initialized) this.init();
    if (this.muted) return;
    const player = this.players[id];
    if (!player) return;
    try {
      player.volume = this.effectiveVolume(id);
      // seekTo before play so rapid re-triggers restart the sample.
      // On web, seekTo() returns a promise we don't need to await; native
      // accepts it synchronously.
      const seek = player.seekTo(0);
      if (seek && typeof (seek as Promise<unknown>).then === 'function') {
        (seek as Promise<unknown>).then(() => player.play()).catch(() => {});
      } else {
        player.play();
      }
    } catch (e) {
      if (__DEV__) console.warn(`[audio] play(${id}) failed:`, e);
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    for (const id of Object.keys(this.players) as SfxId[]) {
      const p = this.players[id];
      if (p) p.volume = this.effectiveVolume(id);
    }
  }

  isMuted() {
    return this.muted;
  }

  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    for (const id of Object.keys(this.players) as SfxId[]) {
      const p = this.players[id];
      if (p) p.volume = this.effectiveVolume(id);
    }
  }
}

export const soundManager = new SoundManager();

export function playSfx(id: SfxId) {
  soundManager.play(id);
}
