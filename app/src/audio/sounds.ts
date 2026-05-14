export type SfxId =
  | 'tap'
  | 'hit'
  | 'dodge'
  | 'faint'
  | 'victory'
  | 'defeat'
  | 'level_up'
  | 'recruit';

export const SFX_SOURCES: Record<SfxId, number> = {
  tap: require('../../assets/audio/tap.wav'),
  hit: require('../../assets/audio/hit.wav'),
  dodge: require('../../assets/audio/dodge.wav'),
  faint: require('../../assets/audio/faint.wav'),
  victory: require('../../assets/audio/victory.wav'),
  defeat: require('../../assets/audio/defeat.wav'),
  level_up: require('../../assets/audio/level_up.wav'),
  recruit: require('../../assets/audio/recruit.wav'),
};

export const SFX_BASE_VOLUME: Record<SfxId, number> = {
  tap: 0.45,
  hit: 0.7,
  dodge: 0.55,
  faint: 0.7,
  victory: 0.85,
  defeat: 0.8,
  level_up: 0.8,
  recruit: 0.8,
};
