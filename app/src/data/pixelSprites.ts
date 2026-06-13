// Per-creature procedural sprites. Each creature is a compact spec fed to the
// generator (see spriteGenerator.ts), which sculpts a shaded full-body sprite
// and stamps species markings. The palette ramp (mid / shadow / highlight /
// outline) is derived from a single base colour so species read by both shape
// and colour, not colour alone.
//
// Palette index legend matches the generator:
//   0 transparent   4 iris      8 pattern    a shine
//   1 body mid      5 pupil     9 outline    b inner-ear
//   2 body shadow   6 nose
//   3 highlight     7 mouth

import { AnimalSpec, buildAnimal, PatternKind } from './spriteGenerator';

export interface PixelTemplate {
  readonly grid: 16 | 32;
  readonly rows: readonly string[];
}

export interface PixelSpriteData {
  template: PixelTemplate;
  palette: readonly string[];
}

// Validate every row is `grid` chars of the allowed alphabet at module load.
function tmpl(grid: 16 | 32, rows: readonly string[]): PixelTemplate {
  if (rows.length !== grid) {
    throw new Error(`pixel template: expected ${grid} rows, got ${rows.length}`);
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.length !== grid) {
      throw new Error(`pixel template row ${i}: expected ${grid} chars, got ${row.length}`);
    }
    for (const ch of row) {
      const ok = ch === '.' || (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f');
      if (!ok) throw new Error(`pixel-row invalid char "${ch}" in row ${i}`);
    }
  }
  return { grid, rows };
}

// ── Colour ramp ────────────────────────────────────────────────────────

function hexToRgb(h: string): [number, number, number] {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
const lighten = (h: string, t: number) => mix(h, '#ffffff', t);
const darken = (h: string, t: number) => mix(h, '#000000', t);

interface CreatureSpec extends AnimalSpec {
  body: string;
  eye?: string;
  pupil?: string;
  nose?: string;
  mouth?: string;
  pattern?: PatternKind;
  patternColor?: string;
  inner?: string;
  outline?: string;
  highlight?: string; // override the derived highlight (e.g. white belly dogs)
}

function build(spec: CreatureSpec): PixelSpriteData {
  const { body } = spec;
  const palette: string[] = [
    'transparent',
    body,
    darken(body, 0.32),
    spec.highlight ?? lighten(body, 0.26),
    spec.eye ?? '#9ECB3F',
    spec.pupil ?? '#15101a',
    spec.nose ?? '#2c1c1e',
    spec.mouth ?? '#2c1c1e',
    spec.patternColor ?? darken(body, 0.5),
    spec.outline ?? mix(darken(body, 0.68), '#170c12', 0.45),
    '#ffffff',
    spec.inner ?? mix(body, '#c77b7b', 0.5),
  ];
  return { template: tmpl(32, buildAnimal(spec)), palette };
}

// ── Per-creature sprites ─────────────────────────────────────────────────

export const SPRITES: Record<string, PixelSpriteData> = {
  // ── Common ──
  tabby: build({
    species: 'cat', tail: 'curled', pattern: 'tabby', seed: 7,
    body: '#D89055', eye: '#E2B43C', patternColor: '#9A5A28', nose: '#9A4636',
  }),
  pup: build({
    species: 'dog', ears: 'floppy', tail: 'short', pattern: 'patch', seed: 3,
    body: '#E8C57A', eye: '#3a2a18', patternColor: '#B07C3C', nose: '#3a2418',
    highlight: '#F7DC9E',
  }),
  yapper: build({
    species: 'dog', ears: 'perked', build: 'slender', tail: 'short', seed: 5,
    body: '#EFDCAE', eye: '#3a2a18', nose: '#3a2418', highlight: '#FBEFCF',
  }),
  pugling: build({
    species: 'dog', ears: 'floppy', build: 'stocky', tail: 'short', pattern: 'mask', seed: 9,
    body: '#D8B27E', eye: '#2a1c10', patternColor: '#4A382A', nose: '#241814',
  }),
  sphynx: build({
    species: 'cat', build: 'slender', tail: 'long', seed: 2,
    body: '#E6B79B', eye: '#7FC9E8', patternColor: '#C08B6E', nose: '#9A5B49',
    inner: '#D98C86',
  }),
  mutt: build({
    species: 'dog', ears: 'floppy', tail: 'long', pattern: 'patch', seed: 11,
    body: '#9C7E60', eye: '#2a1c12', patternColor: '#5A4332', nose: '#241812',
  }),

  // ── Uncommon ──
  bengal: build({
    species: 'cat', tail: 'curled', pattern: 'spots', seed: 13,
    body: '#E0A030', eye: '#86C03A', patternColor: '#5A3410', nose: '#7A3B22',
  }),
  beagle: build({
    species: 'dog', ears: 'floppy', tail: 'short', pattern: 'patch', seed: 17,
    body: '#F0E0B8', eye: '#3a2a18', patternColor: '#8A5326', nose: '#2a1810',
    highlight: '#FCF1D6',
  }),
  whippet: build({
    species: 'dog', ears: 'perked', build: 'slender', tail: 'long', seed: 19,
    body: '#C9B79A', eye: '#2a1c12', patternColor: '#7A6A4F', nose: '#241a12',
  }),
  maine: build({
    species: 'cat', build: 'stocky', tail: 'fluffy', pattern: 'tabby', seed: 23,
    body: '#9C6A3A', eye: '#62C07A', patternColor: '#5A3A1E', nose: '#5A2A1A',
  }),
  vizsla: build({
    species: 'dog', ears: 'floppy', build: 'slender', tail: 'long', seed: 29,
    body: '#C8693A', eye: '#3a2010', patternColor: '#8A3E18', nose: '#5A2410',
    highlight: '#E08A55',
  }),

  // ── Rare ──
  sable: build({
    species: 'cat', tail: 'long', seed: 31,
    body: '#33333A', eye: '#4FD98C', patternColor: '#1A1A20', nose: '#5A2A2A',
    highlight: '#55555E', outline: '#0c0c12',
  }),
  border: build({
    species: 'dog', ears: 'perked', tail: 'long', pattern: 'patch', seed: 37,
    body: '#26262C', eye: '#8FD0F0', patternColor: '#F2F2F4', nose: '#15151a',
    highlight: '#44444E', outline: '#0c0c12',
  }),
  doberman: build({
    species: 'dog', ears: 'perked', build: 'slender', tail: 'short', pattern: 'mask', seed: 41,
    body: '#2E241C', eye: '#E05050', patternColor: '#7A4A24', nose: '#140e0a',
    highlight: '#4A3A2A', outline: '#0c0805',
  }),
  husky: build({
    species: 'wolf', pattern: 'mask', seed: 43,
    body: '#DADDE2', eye: '#7BC4F0', patternColor: '#3A4048', nose: '#1a1a1e',
    highlight: '#FFFFFF',
  }),

  // ── Epic ──
  mastiff: build({
    species: 'dog', ears: 'floppy', build: 'stocky', tail: 'short', pattern: 'mask', seed: 47,
    body: '#A06A38', eye: '#2a1808', patternColor: '#3A2410', nose: '#1e1208',
  }),
  lynx: build({
    species: 'cat', ears: 'tufted', tail: 'short', pattern: 'spots', seed: 53,
    body: '#AC8A5A', eye: '#9AD24A', patternColor: '#4A3018', nose: '#6A3A24',
  }),

  // ── Chapter 3: birds ──
  pigeon: build({
    species: 'bird', seed: 59,
    body: '#909AAE', eye: '#FF7A3C', patternColor: '#3A4252', nose: '#F0A040',
    highlight: '#C2CAD8',
  }),
  crow: build({
    species: 'bird', seed: 61,
    body: '#23232C', eye: '#FFD23D', patternColor: '#12121a', nose: '#2A2A33',
    highlight: '#44444E', outline: '#0a0a10',
  }),
  hawk: build({
    species: 'bird', pattern: 'speckle', seed: 67,
    body: '#7A4A28', eye: '#FFC83D', patternColor: '#3A2410', nose: '#F0A040',
    highlight: '#A8743E',
  }),
  owl: build({
    species: 'owl', pattern: 'speckle', seed: 71,
    body: '#6E5E42', eye: '#FFC83D', patternColor: '#3A301E', nose: '#E0A030',
    highlight: '#9A865E',
  }),

  // ── Legendary ──
  lion: build({
    species: 'cat', build: 'stocky', mane: true, tail: 'fluffy', seed: 73,
    body: '#F2C766', eye: '#8A5A18', patternColor: '#7A3F10', nose: '#7A3A20',
  }),
  tiger: build({
    species: 'cat', build: 'stocky', tail: 'curled', pattern: 'tiger', seed: 79,
    body: '#E67E1E', eye: '#E8C23A', patternColor: '#1c1c20', nose: '#7A3A20',
    highlight: '#F7A24A',
  }),
  direwolf: build({
    species: 'wolf', pattern: 'mask', seed: 83,
    body: '#414754', eye: '#8AD24A', patternColor: '#23262E', nose: '#15161c',
    highlight: '#6A7282', outline: '#0e1016',
  }),
};
