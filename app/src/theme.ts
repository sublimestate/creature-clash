// Game-wide design tokens. Pixel-art / arcade vibe with high contrast.
export const COLORS = {
  bg: '#0E1320',
  bgElev: '#171E33',
  panel: '#1F2742',
  panelLight: '#2C3658',
  border: '#3B466E',
  text: '#F2F4FF',
  textDim: '#A6AECF',
  accent: '#FFD93D',
  accentSoft: '#FBE07F',
  danger: '#FF5A5F',
  good: '#43E37C',
  hp: '#43E37C',
  hpLow: '#FFB347',
  hpCritical: '#FF5A5F',
  goldText: '#FFD93D',
  gemText: '#A4F0FF',
} as const;

export const RARITY_COLORS: Record<string, string> = {
  common: '#9AA1B5',
  uncommon: '#5AD96A',
  rare: '#5BB6FF',
  epic: '#B978FF',
  legendary: '#FFD93D',
};

export const RARITY_GLOW: Record<string, string> = {
  common: '#3D4458',
  uncommon: '#1F4A26',
  rare: '#1F3D5C',
  epic: '#3F2155',
  legendary: '#5C4416',
};
