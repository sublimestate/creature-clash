import { writeFileSync } from 'node:fs';
import { CREATURES } from '../src/data/creatures';
import { SPRITES } from '../src/data/pixelSprites';
import { encodePng } from './png';

function charToIndex(ch: string): number {
  const code = ch.charCodeAt(0);
  return code <= 57 ? code - 48 : code - 87;
}

// Renders every creature sprite into one montage PNG for visual review.
// Run: npx tsx scripts/renderSprites.ts [outfile]
//
// Sprites are tiny (16/32px), so each is scaled up with nearest-neighbour
// and laid out in a labelled grid. Order matches CREATURES, also printed
// to stdout so positions can be correlated.

const SCALE = 7; // px per sprite pixel
const PAD = 10; // gap between tiles
const COLS = 6;
const LABEL_H = 14;
const BG: [number, number, number] = [0x14, 0x16, 0x1c]; // app COLORS.bg-ish
const CHECKER: [number, number, number] = [0x20, 0x23, 0x2c];

function hexToRgba(hex: string): [number, number, number, number] {
  if (hex === 'transparent') return [0, 0, 0, 0];
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b, 255];
}

interface Canvas {
  w: number;
  h: number;
  px: Uint8Array;
}

function makeCanvas(w: number, h: number): Canvas {
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = BG[0];
    px[i * 4 + 1] = BG[1];
    px[i * 4 + 2] = BG[2];
    px[i * 4 + 3] = 255;
  }
  return { w, h, px };
}

function put(c: Canvas, x: number, y: number, rgba: [number, number, number, number]) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  const a = rgba[3] / 255;
  if (a === 0) return;
  c.px[i] = Math.round(rgba[0] * a + c.px[i] * (1 - a));
  c.px[i + 1] = Math.round(rgba[1] * a + c.px[i + 1] * (1 - a));
  c.px[i + 2] = Math.round(rgba[2] * a + c.px[i + 2] * (1 - a));
  c.px[i + 3] = 255;
}

function drawSprite(c: Canvas, ox: number, oy: number, creatureId: string) {
  const data = SPRITES[creatureId];
  if (!data) return;
  const tmpl = data.template;
  const grid = tmpl.grid;
  const tile = grid * SCALE;

  // Checkerboard backing so transparent areas and dark sprites read clearly.
  for (let y = 0; y < tile; y++) {
    for (let x = 0; x < tile; x++) {
      const cell = (Math.floor(x / SCALE) + Math.floor(y / SCALE)) % 2 === 0;
      if (cell) put(c, ox + x, oy + y, [CHECKER[0], CHECKER[1], CHECKER[2], 255]);
    }
  }

  tmpl.rows.forEach((row, ry) => {
    Array.from(row).forEach((ch, cx) => {
      if (ch === '.') return;
      const color = data.palette[charToIndex(ch)];
      if (!color || color === 'transparent') return;
      const rgba = hexToRgba(color);
      for (let dy = 0; dy < SCALE; dy++) {
        for (let dx = 0; dx < SCALE; dx++) {
          put(c, ox + cx * SCALE + dx, oy + ry * SCALE + dy, rgba);
        }
      }
    });
  });
}

const ids = CREATURES.map((c) => c.id).filter((id) => SPRITES[id]);
const tile = 32 * SCALE;
const cellW = tile + PAD;
const cellH = tile + LABEL_H + PAD;
const rows = Math.ceil(ids.length / COLS);
const canvas = makeCanvas(COLS * cellW + PAD, rows * cellH + PAD);

ids.forEach((id, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const ox = PAD + col * cellW;
  const oy = PAD + row * cellH;
  drawSprite(canvas, ox, oy, id);
});

const out = process.argv[2] ?? 'sprites-preview.png';
writeFileSync(out, encodePng(canvas.w, canvas.h, canvas.px));

console.log(`Wrote ${out} (${canvas.w}x${canvas.h})`);
console.log('Order (left-to-right, top-to-bottom):');
ids.forEach((id, i) => {
  const tag = i % COLS === 0 ? `\nrow ${Math.floor(i / COLS)}: ` : ' ';
  process.stdout.write(`${tag}${id}`);
});
process.stdout.write('\n');
