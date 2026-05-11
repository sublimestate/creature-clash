// Procedural pixel-art avatars.
//
// Templates are 32×32 (full-body) generated procedurally — see
// spriteGenerator.ts. Each char in a row is a palette index
// (0 = transparent, 1..8 = palette colors).
//
// Palette layout (by index):
//   0 = transparent
//   1 = body / fur primary
//   2 = body shadow (ears inner, jaw shading)
//   3 = highlight (reserved)
//   4 = eye sclera
//   5 = pupil
//   6 = nose
//   7 = mouth / tongue
//   8 = pattern accent (mane / spots)

export type PixelPalette = readonly [
  string, string, string, string, string,
  string, string, string, string,
];

export interface PixelTemplate {
  readonly grid: 16 | 32;
  readonly rows: readonly string[];
}

export interface PixelSpriteData {
  template: TemplateId;
  palette: PixelPalette;
}

// Build a template, validating each row is exactly `grid` chars at module-load.
function tmpl(grid: 16 | 32, rows: readonly string[]): PixelTemplate {
  if (rows.length !== grid) {
    throw new Error(`pixel template: expected ${grid} rows, got ${rows.length}`);
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.length !== grid) {
      throw new Error(
        `pixel template row ${i}: expected ${grid} chars, got ${row.length}: "${row}"`,
      );
    }
    for (const ch of row) {
      if (ch !== '.' && (ch < '0' || ch > '8')) {
        throw new Error(`pixel-row invalid char "${ch}" in: "${row}"`);
      }
    }
  }
  return { grid, rows };
}

// Legacy r() — 16-char alias, kept so the existing 16x16 templates below
// still parse. New templates should use tmpl(32, [...]).
function r(s: string): string {
  if (s.length !== 16) {
    throw new Error(`pixel-row must be 16 chars, got ${s.length}: "${s}"`);
  }
  for (const ch of s) {
    if (ch !== '.' && (ch < '0' || ch > '8')) {
      throw new Error(`pixel-row invalid char "${ch}" in: "${s}"`);
    }
  }
  return s;
}

// ── Templates ────────────────────────────────────────────────────────

// Standard housecat — pointy ears, round face
const cat: PixelTemplate = { grid: 16,
  rows: [
    r('................'),
    r('..11........11..'),
    r('..121......121..'),
    r('..1221....1221..'),
    r('..12221..12221..'),
    r('.12222111122221.'),
    r('.12222222222221.'),
    r('.12244222244221.'),
    r('.12245222254221.'),
    r('.12244222244221.'),
    r('.12222266622221.'),
    r('.12222666662221.'),
    r('..1222266622211.'),
    r('...12222222211..'),
    r('....111111111...'),
    r('................'),
  ],
};

// Slim cat (sphynx) — bigger pointy ears, narrower face
const catSlim: PixelTemplate = { grid: 16,
  rows: [
    r('................'),
    r('.11..........11.'),
    r('.111........111.'),
    r('.1211......1121.'),
    r('.12211....11221.'),
    r('.12211111111221.'),
    r('.12222222222221.'),
    r('.12244222244221.'),
    r('.12245222254221.'),
    r('.12244222244221.'),
    r('.12222266622221.'),
    r('.12222666662221.'),
    r('..1222266622211.'),
    r('....1112222111..'),
    r('......111111....'),
    r('................'),
  ],
};

// Big cat with mane (lion / tiger). Mane = palette index 8.
const bigCat: PixelTemplate = { grid: 16,
  rows: [
    r('................'),
    r('..88........88..'),
    r('.8118......8118.'),
    r('.8121......1218.'),
    r('.8121......1218.'),
    r('81222111111222 18'.replace(/ /g, '').padEnd(16, '8').slice(0, 16)),
    r('8122222222222218'),
    r('8124422222244218'),
    r('8124522222254218'),
    r('8124422222244218'),
    r('8122222266222218'),
    r('8122222666622218'),
    r('.81222666622218.'),
    r('..8122222222218.'),
    r('...888888888888.'),
    r('....8.8..8.8....'),
  ],
};

// Dog with perked ears (terrier / shepherd / doberman)
const dogPerked: PixelTemplate = { grid: 16,
  rows: [
    r('................'),
    r('.11..........11.'),
    r('.121........121.'),
    r('.121........121.'),
    r('.121........121.'),
    r('.122........221.'),
    r('.12211111111221.'),
    r('.12222222222221.'),
    r('.12244222244221.'),
    r('.12245222254221.'),
    r('.12244222244221.'),
    r('.12222266622221.'),
    r('..1222266622211.'),
    r('...12277772211..'),
    r('....111111111...'),
    r('................'),
  ],
};

// Dog with floppy ears (beagle / hound / pup)
const dogFloppy: PixelTemplate = { grid: 16,
  rows: [
    r('................'),
    r('....11111111....'),
    r('...1111111111...'),
    r('..221111111122..'),
    r('..221111111122..'),
    r('.2221111111 1222.'.replace(/ /g, '').padEnd(16, '.').slice(0, 16)),
    r('.22211111111222.'),
    r('.22244222244222.'),
    r('.22245222254222.'),
    r('.22244222244222.'),
    r('.22222266622222.'),
    r('.22222666662222.'),
    r('..2222277722222.'),
    r('...22222222222..'),
    r('....22222222....'),
    r('................'),
  ],
};

// Pug / bulldog — wide squat face, short snout
const dogStocky: PixelTemplate = { grid: 16,
  rows: [
    r('................'),
    r('...11......11...'),
    r('...111....111...'),
    r('..1112....2111..'),
    r('.12211111111221.'),
    r('.12222222222221.'),
    r('.12244222244221.'),
    r('.12245422254221.'),
    r('.12244422244421.'),
    r('.12222266622221.'),
    r('.12222666662221.'),
    r('.12222277722221.'),
    r('..1112222222111.'),
    r('....11111111....'),
    r('................'),
    r('................'),
  ],
};

// Wolf — long pointed ears, narrow face
const wolf: PixelTemplate = { grid: 16,
  rows: [
    r('................'),
    r('11............11'),
    r('121..........121'),
    r('1221........1221'),
    r('12221......12221'),
    r('122221....122221'),
    r('1222221111222221'),
    r('1222222222222221'),
    r('1224422222244221'),
    r('1224522222254221'),
    r('1224422222244221'),
    r('.12222266622221.'),
    r('..1222266622211.'),
    r('...12222266621..'),
    r('....122777221...'),
    r('......11111111..'),
  ],
};

// ── 32×32 full-body templates (procedurally generated) ─────────────────

import {
  generateBird,
  generateCat,
  generateDog,
  generateOwl,
  generateWolf,
} from './spriteGenerator';

const catFull: PixelTemplate = tmpl(32, generateCat({ ears: 'pointy', tail: 'curled' }));
const catSlimFull: PixelTemplate = tmpl(32, generateCat({ ears: 'pointy', build: 'slender', tail: 'curled' }));
const bigCatFull: PixelTemplate = tmpl(32, generateCat({ ears: 'pointy', build: 'stocky', mane: true, tail: 'fluffy' }));
const dogPerkedFull: PixelTemplate = tmpl(32, generateDog({ ears: 'perked', tail: 'short' }));
const dogFloppyFull: PixelTemplate = tmpl(32, generateDog({ ears: 'floppy', tail: 'short' }));
const dogStockyFull: PixelTemplate = tmpl(32, generateDog({ ears: 'floppy', build: 'stocky', tail: 'short' }));
const wolfFull: PixelTemplate = tmpl(32, generateWolf());
const birdFull: PixelTemplate = tmpl(32, generateBird());
const owlFull: PixelTemplate = tmpl(32, generateOwl());

export const TEMPLATES = {
  // Legacy 16×16 — kept for fallback / unmapped creatures during the
  // sprite redesign.
  cat,
  catSlim,
  bigCat,
  dogPerked,
  dogFloppy,
  dogStocky,
  wolf,
  // 32×32 full-body, used by every creature in SPRITES below.
  catFull,
  catSlimFull,
  bigCatFull,
  dogPerkedFull,
  dogFloppyFull,
  dogStockyFull,
  wolfFull,
  birdFull,
  owlFull,
} as const;

export type TemplateId = keyof typeof TEMPLATES;

// ── Palette factory ──────────────────────────────────────────────────

function pal(
  body: string,
  shadow: string,
  highlight: string,
  eye: string,
  pupil: string,
  nose: string,
  mouth: string,
  accent: string,
): PixelPalette {
  return ['transparent', body, shadow, highlight, eye, pupil, nose, mouth, accent];
}

// ── Per-creature sprites ─────────────────────────────────────────────

export const SPRITES: Record<string, PixelSpriteData> = {
  // Common
  tabby: {
    template: 'catFull',
    palette: pal('#D89055', '#A05F2A', '#F2B97A', '#FFE9B0', '#1B1B1B', '#3A1F12', '#7A2C1F', '#7A4623'),
  },
  pup: {
    template: 'dogFloppyFull',
    palette: pal('#E8C57A', '#A07840', '#F4D690', '#FFFFFF', '#1B1B1B', '#3A1F12', '#7A2C1F', '#9C7838'),
  },
  yapper: {
    template: 'dogPerkedFull',
    palette: pal('#F0E0BC', '#B89866', '#FFF2D0', '#FFFFFF', '#1B1B1B', '#3A1F12', '#7A2C1F', '#A88A5A'),
  },
  pugling: {
    template: 'dogStockyFull',
    palette: pal('#D2B48C', '#7A5A3A', '#E8CCA0', '#FFE9B0', '#1B1B1B', '#1B1B1B', '#7A2C1F', '#5C3F22'),
  },
  sphynx: {
    template: 'catSlimFull',
    palette: pal('#E8B89A', '#B07A5A', '#F5D0B6', '#9CD9FF', '#1B1B1B', '#7A2C1F', '#7A2C1F', '#8A5A38'),
  },
  mutt: {
    template: 'dogFloppyFull',
    palette: pal('#7A6450', '#3F3225', '#A28A6E', '#FFFFFF', '#1B1B1B', '#1B1B1B', '#7A2C1F', '#2A1F14'),
  },

  // Uncommon
  bengal: {
    template: 'catFull',
    palette: pal('#E08A2A', '#7C4310', '#FFB35A', '#FFE9B0', '#1B1B1B', '#3A1F12', '#7A2C1F', '#3A2008'),
  },
  beagle: {
    template: 'dogFloppyFull',
    palette: pal('#F2E0B8', '#A05F2A', '#FFF2D0', '#FFFFFF', '#1B1B1B', '#1B1B1B', '#7A2C1F', '#3A1F12'),
  },
  whippet: {
    template: 'dogPerkedFull',
    palette: pal('#C8B89A', '#7A6A4F', '#E0D2B0', '#FFFFFF', '#1B1B1B', '#1B1B1B', '#7A2C1F', '#5A4A30'),
  },
  maine: {
    template: 'catFull',
    palette: pal('#9C6A3A', '#4A2810', '#C48A55', '#FFE9B0', '#3DD68C', '#3A1F12', '#7A2C1F', '#3A2008'),
  },
  vizsla: {
    template: 'dogFloppyFull',
    palette: pal('#C8693A', '#6A3010', '#E08855', '#FFFFFF', '#1B1B1B', '#3A1F12', '#7A2C1F', '#8A3818'),
  },

  // Rare
  sable: {
    template: 'catFull',
    palette: pal('#2A2A2E', '#0E0E12', '#4A4A50', '#3DD68C', '#FFFFFF', '#5A2A1F', '#7A2C1F', '#1A1A20'),
  },
  border: {
    template: 'dogPerkedFull',
    palette: pal('#1F1F23', '#0A0A0E', '#FFFFFF', '#7BCBFF', '#1B1B1B', '#3A1F12', '#7A2C1F', '#FFFFFF'),
  },
  doberman: {
    template: 'dogPerkedFull',
    palette: pal('#2A2018', '#0E0A06', '#7A4A28', '#E54B4B', '#1B1B1B', '#1B1B1B', '#7A2C1F', '#7A4A28'),
  },
  husky: {
    template: 'wolfFull',
    palette: pal('#D8D8D8', '#6A6A6E', '#FFFFFF', '#7BCBFF', '#1B1B1B', '#1B1B1B', '#7A2C1F', '#3A3A40'),
  },

  // Epic
  mastiff: {
    template: 'dogStockyFull',
    palette: pal('#7A4A28', '#3A2008', '#A06A38', '#FFE9B0', '#1B1B1B', '#1B1B1B', '#7A2C1F', '#3A2008'),
  },
  lynx: {
    template: 'catFull',
    palette: pal('#A88555', '#5C3F22', '#D8AC78', '#9CD96A', '#1B1B1B', '#3A1F12', '#7A2C1F', '#3A2008'),
  },

  // Chapter 3: The Park — birds. Reuses cat template (small birds) and
  // wolf template (large bird) — palette differences carry the species feel.
  pigeon: {
    template: 'birdFull',
    palette: pal('#8E96A8', '#3E4658', '#C0C6D4', '#FF7849', '#1B1B1B', '#FFB347', '#7A2C1F', '#2E3340'),
  },
  crow: {
    template: 'birdFull',
    palette: pal('#1A1A20', '#0A0A0E', '#3A3A48', '#FFD93D', '#FFFFFF', '#2E2E36', '#7A2C1F', '#0E0E12'),
  },
  hawk: {
    template: 'birdFull',
    palette: pal('#7A4A28', '#3A2008', '#C48A55', '#FFD93D', '#1B1B1B', '#FFB347', '#7A2C1F', '#3A2008'),
  },
  owl: {
    template: 'owlFull',
    palette: pal('#6A5A40', '#2E2818', '#A89070', '#FFD93D', '#1B1B1B', '#FFB347', '#7A2C1F', '#3A2818'),
  },

  // Legendary
  lion: {
    template: 'bigCatFull',
    palette: pal('#E8B05C', '#7A4520', '#FFD493', '#FFE9B0', '#1B1B1B', '#3A1F12', '#7A2C1F', '#A06A28'),
  },
  tiger: {
    template: 'bigCatFull',
    palette: pal('#E07A1F', '#1B1B1B', '#FFB35A', '#FFE9B0', '#1B1B1B', '#3A1F12', '#7A2C1F', '#1B1B1B'),
  },
  direwolf: {
    template: 'wolfFull',
    palette: pal('#3A3F4A', '#14161E', '#6A7282', '#9CD96A', '#1B1B1B', '#1B1B1B', '#7A2C1F', '#1A1C24'),
  },
};
