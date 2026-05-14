import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { soundManager } from '../audio/SoundManager';

interface AudioState {
  hydrated: boolean;
  sfxMuted: boolean;
  setSfxMuted: (muted: boolean) => void;
  toggleSfxMuted: () => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      sfxMuted: false,
      setSfxMuted: (muted) => {
        set({ sfxMuted: muted });
        soundManager.setMuted(muted);
      },
      toggleSfxMuted: () => {
        const next = !get().sfxMuted;
        set({ sfxMuted: next });
        soundManager.setMuted(next);
      },
    }),
    {
      name: 'creature-clash-audio',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          soundManager.setMuted(state.sfxMuted);
        }
      },
    },
  ),
);
