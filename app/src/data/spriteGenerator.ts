// Procedural pixel sprite generator. Builds 32x32 sprites by sculpting a few
// big masses (body, head) with a directional light model, then stamping
// species features and markings on top. The output is a grid of palette-index
// chars consumed by pixelSprites.ts.
//
// Palette index legend (chars in the emitted rows):
//   .  transparent      6  nose
//   1  body mid         7  mouth / tongue
//   2  body shadow      8  pattern / marking
//   3  body highlight   9  outline (darkest)
//   4  eye iris         a  eye shine (catchlight)
//   5  pupil            b  inner-ear / accent

type Grid = string[][];

const GRID = 32;

// Char constants for readability.
const T = '.';
const MID = '1';
const SHA = '2';
const HI = '3';
const IRIS = '4';
const PUP = '5';
const NOSE = '6';
const MOUTH = '7';
const PAT = '8';
const OUT = '9';
const SHINE = 'a';
const INNER = 'b';

const BODY_CHARS = new Set([MID, SHA, HI]);

// Light direction (points toward the light, from upper-left).
const LX = -0.55;
const LY = -0.82;

function makeGrid(): Grid {
  return Array.from({ length: GRID }, () => Array(GRID).fill(T));
}

function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID && y < GRID;
}

function setPixel(g: Grid, x: number, y: number, ch: string) {
  if (!inBounds(x, y)) return;
  g[y][x] = ch;
}

// Fill an ellipse with a flat char.
function ellipse(g: Grid, cx: number, cy: number, rx: number, ry: number, ch: string) {
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(GRID - 1, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(GRID - 1, Math.ceil(cx + rx)); x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1) setPixel(g, x, y, ch);
    }
  }
}

// Fill an ellipse, shading each pixel by treating its position as a surface
// normal and lighting it from the upper-left. This is what gives the masses
// volume instead of reading as flat blobs.
function shadeEllipse(
  g: Grid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  opts: { hi?: number; sha?: number; bellyLight?: boolean } = {},
) {
  const hiT = opts.hi ?? 0.5;
  const shaT = opts.sha ?? -0.3;
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(GRID - 1, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(GRID - 1, Math.ceil(cx + rx)); x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const d = nx * LX + ny * LY; // higher = more lit
      let ch = MID;
      if (d > hiT) ch = HI;
      else if (d < shaT) ch = SHA;
      // Core/contact shadow along the bottom rim.
      if (ny > 0.6 && d < 0.15) ch = SHA;
      // Optional lighter belly (lower-front catches bounce light).
      if (opts.bellyLight && ny > 0.15 && Math.abs(nx) < 0.5 && d > -0.2 && d <= hiT) {
        ch = HI;
      }
      setPixel(g, x, y, ch);
    }
  }
}

function rect(g: Grid, x: number, y: number, w: number, h: number, ch: string) {
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) setPixel(g, x + dx, y + dy, ch);
}

function triangle(
  g: Grid,
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
  ch: string,
) {
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
  const maxX = Math.min(GRID - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(GRID - 1, Math.ceil(Math.max(ay, by, cy)));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d1 = edge(x, y, ax, ay, bx, by);
      const d2 = edge(x, y, bx, by, cx, cy);
      const d3 = edge(x, y, cx, cy, ax, ay);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(hasNeg && hasPos)) setPixel(g, x, y, ch);
    }
  }
}

function edge(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

// Thick tapering stroke through waypoints (tails, limbs). radius shrinks
// toward the last point for a natural taper.
function taperStroke(g: Grid, pts: Array<[number, number]>, r0: number, r1: number, ch: string) {
  const segs = pts.length - 1;
  for (let i = 0; i < segs; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)) * 2);
    for (let s = 0; s <= steps; s++) {
      const f = (i + s / steps) / segs;
      const r = r0 + (r1 - r0) * f;
      const x = x0 + ((x1 - x0) * s) / steps;
      const y = y0 + ((y1 - y0) * s) / steps;
      ellipse(g, Math.round(x), Math.round(y), Math.max(1, Math.round(r)), Math.max(1, Math.round(r)), ch);
    }
  }
}

// Deterministic tiny PRNG so pattern placement is stable per creature.
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Features ───────────────────────────────────────────────────────────

interface Eyes {
  y: number;
  dx: number; // half-distance between eye centres
  slit?: boolean; // vertical cat pupil
  big?: boolean; // owl
}

// Eyes are deliberately tiny — at 32px a couple of pixels read as a clean
// beady eye, while anything larger turns into a hollow goggle.
function drawEyes(g: Grid, cx: number, e: Eyes) {
  for (const ex of [cx - e.dx, cx + e.dx]) {
    const inner = ex < cx ? ex + 1 : ex - 1; // pupil leans toward the nose
    const outer = ex < cx ? ex - 1 : ex + 1;
    if (e.big) {
      // Owl: a real iris ring with a dark pupil and a glint.
      ellipse(g, ex, e.y, 2, 2, IRIS);
      setPixel(g, ex, e.y, PUP);
      setPixel(g, ex, e.y + 1, PUP);
      setPixel(g, outer, e.y - 1, SHINE);
    } else {
      // 2x2 eye: iris block, one dark pupil, one white glint.
      setPixel(g, ex, e.y, IRIS);
      setPixel(g, ex, e.y + 1, IRIS);
      setPixel(g, inner, e.y, IRIS);
      setPixel(g, inner, e.y + 1, IRIS);
      setPixel(g, inner, e.y + 1, PUP);
      if (!e.slit) setPixel(g, ex, e.y + 1, PUP);
      setPixel(g, outer, e.y, SHINE);
    }
  }
}

// ── Pattern pass ───────────────────────────────────────────────────────

export type PatternKind =
  | 'none'
  | 'tabby'
  | 'tiger'
  | 'spots'
  | 'mask'
  | 'patch'
  | 'speckle';

// Only paints over existing body pixels so markings hug the silhouette.
function isBody(g: Grid, x: number, y: number): boolean {
  return inBounds(x, y) && BODY_CHARS.has(g[y][x]);
}

function paintBody(g: Grid, x: number, y: number, ch: string) {
  if (isBody(g, x, y)) setPixel(g, x, y, ch);
}

function applyPattern(g: Grid, kind: PatternKind, seed: number) {
  const rnd = mulberry(seed);
  if (kind === 'tabby') {
    // Forehead M + a few back stripes.
    for (const x of [14, 16, 18]) {
      setPixel(g, x, 6, PAT);
      setPixel(g, x, 7, PAT);
    }
    for (let y = 18; y <= 26; y += 3) {
      for (let x = 11; x <= 21; x++) if ((x + y) % 7 < 2) paintBody(g, x, y, PAT);
    }
  } else if (kind === 'tiger') {
    // Short curved ticks across the upper flanks and back only — at 32px a few
    // marks read as a tiger far better than full bars (which look like jail).
    const bars: Array<[number, number, number]> = [
      [11, 15, 18], [13, 14, 17], [19, 14, 17], [21, 15, 18], [16, 18, 20],
    ];
    for (const [x, y0, y1] of bars) {
      for (let y = y0; y <= y1; y++) if (g[y]?.[x] !== HI) paintBody(g, x, y, PAT);
    }
    paintBody(g, 13, 8, PAT);
    paintBody(g, 19, 8, PAT);
  } else if (kind === 'spots') {
    for (let i = 0; i < 16; i++) {
      const x = 9 + Math.floor(rnd() * 14);
      const y = 16 + Math.floor(rnd() * 12);
      if (!isBody(g, x, y)) continue;
      // small rosette
      paintBody(g, x, y, PAT);
      if (rnd() > 0.5) paintBody(g, x + 1, y, PAT);
      if (rnd() > 0.5) paintBody(g, x, y + 1, PAT);
    }
  } else if (kind === 'mask') {
    // Darker cap over the crown + around the eyes; light muzzle stays clear.
    for (let x = 8; x <= 23; x++) {
      for (let y = 3; y <= 9; y++) {
        const nx = (x - 16) / 9;
        const ny = (y - 7) / 5;
        if (nx * nx + ny * ny <= 1) paintBody(g, x, y, PAT);
      }
    }
    paintBody(g, 11, 11, PAT); paintBody(g, 21, 11, PAT);
  } else if (kind === 'patch') {
    // One big irregular patch over an ear/eye and a back blotch.
    for (let x = 7; x <= 14; x++)
      for (let y = 4; y <= 13; y++) {
        const nx = (x - 10) / 4;
        const ny = (y - 9) / 5;
        if (nx * nx + ny * ny <= 1) paintBody(g, x, y, PAT);
      }
    for (let x = 17; x <= 26; x++)
      for (let y = 18; y <= 27; y++) {
        const nx = (x - 21) / 5;
        const ny = (y - 22) / 5;
        if (nx * nx + ny * ny <= 1 && rnd() > 0.25) paintBody(g, x, y, PAT);
      }
  } else if (kind === 'speckle') {
    for (let i = 0; i < 22; i++) {
      const x = 9 + Math.floor(rnd() * 14);
      const y = 14 + Math.floor(rnd() * 14);
      paintBody(g, x, y, PAT);
    }
  }
}

// ── Finish: outline ring + ground shadow ───────────────────────────────

// Wrap the whole silhouette in a 1px outline placed in the transparent cells
// just outside it, so the body keeps its full mass (crisper than eroding the
// edge inward, and a true darkest tone instead of reusing the fur shadow).
function drawOutline(g: Grid) {
  const isFilled = (x: number, y: number) => inBounds(x, y) && g[y][x] !== T && g[y][x] !== OUT;
  const ring: Array<[number, number]> = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (g[y][x] !== T) continue;
      if (
        isFilled(x - 1, y) || isFilled(x + 1, y) || isFilled(x, y - 1) || isFilled(x, y + 1) ||
        isFilled(x - 1, y - 1) || isFilled(x + 1, y - 1) || isFilled(x - 1, y + 1) || isFilled(x + 1, y + 1)
      ) {
        ring.push([x, y]);
      }
    }
  }
  for (const [x, y] of ring) g[y][x] = OUT;
}

function gridToRows(g: Grid): string[] {
  return g.map((row) => row.join(''));
}

// ── Composers ──────────────────────────────────────────────────────────

export interface AnimalSpec {
  species: 'cat' | 'dog' | 'wolf' | 'bird' | 'owl';
  build?: 'normal' | 'stocky' | 'slender';
  ears?: 'pointy' | 'perked' | 'floppy' | 'tufted';
  tail?: 'curled' | 'long' | 'short' | 'fluffy' | 'none';
  mane?: boolean;
  pattern?: PatternKind;
  seed?: number;
}

export function buildAnimal(spec: AnimalSpec): string[] {
  switch (spec.species) {
    case 'cat':
      return composeCat(spec);
    case 'dog':
      return composeDog(spec);
    case 'wolf':
      return composeWolf(spec);
    case 'bird':
      return composeBird(spec);
    case 'owl':
      return composeOwl(spec);
  }
}

function composeCat(spec: AnimalSpec): string[] {
  const g = makeGrid();
  const build = spec.build ?? 'normal';
  const bodyRx = build === 'stocky' ? 9 : build === 'slender' ? 7 : 8;
  const headRx = build === 'stocky' ? 8 : 7;

  // Tail first (behind the body).
  if ((spec.tail ?? 'curled') === 'fluffy') {
    ellipse(g, 26, 21, 4, 6, MID);
  } else if (spec.tail === 'long') {
    taperStroke(g, [[23, 25], [27, 22], [28, 16], [27, 11]], 2, 1, MID);
  } else {
    taperStroke(g, [[23, 25], [27, 22], [28, 18], [26, 14]], 2, 1, MID);
  }

  if (spec.mane) ellipse(g, 16, 13, 11, 10, MID); // mane base under head

  shadeEllipse(g, 16, 22, bodyRx, 8, { bellyLight: true });
  shadeEllipse(g, 16, 12, headRx, 6);

  // Ears (filled triangles sitting on the head) with inner color.
  triangle(g, 9, 7, 11, 1, 14, 7, MID);
  triangle(g, 23, 7, 21, 1, 18, 7, MID);
  triangle(g, 11, 6, 11, 3, 13, 6, INNER);
  triangle(g, 21, 6, 21, 3, 19, 6, INNER);
  setPixel(g, 11, 2, HI);
  setPixel(g, 21, 2, HI);

  // Paws.
  ellipse(g, 12, 29, 2, 1, MID);
  ellipse(g, 20, 29, 2, 1, MID);
  setPixel(g, 16, 30, MID);

  if (spec.mane) {
    drawMane(g);
  }

  applyPattern(g, spec.pattern ?? 'none', spec.seed ?? 1);

  // Face on top of any markings.
  drawEyes(g, 16, { y: 12, dx: 3, slit: true });
  setPixel(g, 16, 15, NOSE);
  setPixel(g, 15, 16, MOUTH);
  setPixel(g, 17, 16, MOUTH);

  drawOutline(g);
  return gridToRows(g);
}

function composeDog(spec: AnimalSpec): string[] {
  const g = makeGrid();
  const build = spec.build ?? 'normal';
  const ears = spec.ears ?? 'floppy';
  const bodyRx = build === 'stocky' ? 10 : 8;
  const headRx = build === 'stocky' ? 8 : 7;

  // Tail.
  if (spec.tail === 'long') {
    taperStroke(g, [[23, 24], [27, 21], [28, 15]], 2, 1, MID);
  } else {
    taperStroke(g, [[23, 24], [26, 21], [27, 17]], 2, 1, MID);
  }

  // Floppy ears: big lobes framing the head, drawn first so the head overlaps
  // their tops and they read as hanging ears rather than side-shading.
  if (ears === 'floppy') {
    shadeEllipse(g, 8, 15, 4, 7);
    shadeEllipse(g, 24, 15, 4, 7);
  }

  shadeEllipse(g, 16, 22, bodyRx, 8, { bellyLight: true });
  shadeEllipse(g, 16, 11, headRx, 6);
  // Muzzle bump.
  shadeEllipse(g, 16, 16, 4, 3);

  if (ears === 'perked') {
    triangle(g, 9, 8, 10, 1, 14, 8, MID);
    triangle(g, 23, 8, 22, 1, 18, 8, MID);
    triangle(g, 11, 7, 11, 3, 13, 7, INNER);
    triangle(g, 21, 7, 21, 3, 19, 7, INNER);
  }

  // Paws.
  ellipse(g, 12, 29, 2, 1, MID);
  ellipse(g, 20, 29, 2, 1, MID);
  setPixel(g, 16, 30, MID);

  applyPattern(g, spec.pattern ?? 'none', spec.seed ?? 1);

  drawEyes(g, 16, { y: 11, dx: 3 });
  // Snout: nose pad + short mouth.
  setPixel(g, 15, 16, NOSE);
  setPixel(g, 16, 16, NOSE);
  setPixel(g, 17, 16, NOSE);
  setPixel(g, 16, 17, MOUTH);
  setPixel(g, 15, 18, MOUTH);
  setPixel(g, 17, 18, MOUTH);

  drawOutline(g);
  return gridToRows(g);
}

function composeWolf(spec: AnimalSpec): string[] {
  const g = makeGrid();

  // Bushy tail sweeping up behind the haunch.
  ellipse(g, 27, 16, 3, 5, MID);
  taperStroke(g, [[23, 21], [27, 17]], 3, 2, MID);

  // Four legs (standing), with a hint of a chest between the front pair.
  for (const lx of [9, 13, 18, 22]) rect(g, lx, 24, 2, 6, MID);

  // Slimmer, higher body + a real neck so the head sits clear of the back.
  shadeEllipse(g, 16, 21, 9, 5);
  rect(g, 13, 14, 6, 6, MID);
  shadeEllipse(g, 16, 10, 6, 5);
  // Tapered snout pushing down off the face.
  shadeEllipse(g, 16, 14, 3, 2);

  // Tall pointed ears.
  triangle(g, 9, 8, 8, 1, 13, 7, MID);
  triangle(g, 23, 8, 24, 1, 19, 7, MID);
  triangle(g, 10, 7, 10, 3, 12, 7, INNER);
  triangle(g, 22, 7, 22, 3, 20, 7, INNER);

  applyPattern(g, spec.pattern ?? 'none', spec.seed ?? 1);

  drawEyes(g, 16, { y: 10, dx: 3, slit: true });
  setPixel(g, 16, 14, NOSE);
  setPixel(g, 15, 14, NOSE);
  setPixel(g, 17, 14, NOSE);
  setPixel(g, 16, 15, MOUTH);

  drawOutline(g);
  return gridToRows(g);
}

function composeBird(spec: AnimalSpec): string[] {
  const g = makeGrid();

  // Tail feathers back-left.
  taperStroke(g, [[11, 19], [5, 21], [2, 22]], 2, 1, MID);
  taperStroke(g, [[11, 21], [5, 24], [2, 25]], 2, 1, MID);

  shadeEllipse(g, 16, 19, 8, 8, { bellyLight: true });
  shadeEllipse(g, 17, 9, 6, 5);

  // Beak (right-facing).
  triangle(g, 22, 8, 27, 10, 22, 12, NOSE);

  // Folded wing.
  ellipse(g, 14, 19, 4, 5, SHA);
  for (let i = 0; i < 4; i++) setPixel(g, 12 + i, 22, OUT);

  // Legs + feet.
  rect(g, 14, 27, 1, 4, NOSE);
  rect(g, 18, 27, 1, 4, NOSE);
  for (const fx of [13, 14, 15, 17, 18, 19]) setPixel(g, fx, 31, NOSE);

  applyPattern(g, spec.pattern ?? 'none', spec.seed ?? 1);

  // Single forward eye.
  ellipse(g, 19, 8, 1, 1, IRIS);
  setPixel(g, 19, 8, PUP);
  setPixel(g, 18, 7, SHINE);

  drawOutline(g);
  return gridToRows(g);
}

function composeOwl(spec: AnimalSpec): string[] {
  const g = makeGrid();

  shadeEllipse(g, 16, 19, 10, 9, { bellyLight: true });
  shadeEllipse(g, 16, 10, 8, 7);

  // Ear tufts.
  triangle(g, 9, 5, 8, 0, 13, 6, MID);
  triangle(g, 23, 5, 24, 0, 19, 6, MID);

  // Wings.
  ellipse(g, 7, 18, 3, 6, SHA);
  ellipse(g, 25, 18, 3, 6, SHA);

  // Beak.
  triangle(g, 16, 11, 14, 14, 18, 14, NOSE);

  // Legs + talons.
  rect(g, 13, 27, 2, 3, NOSE);
  rect(g, 17, 27, 2, 3, NOSE);
  for (const fx of [12, 13, 14, 17, 18, 19]) setPixel(g, fx, 30, NOSE);

  applyPattern(g, spec.pattern ?? 'speckle', spec.seed ?? 1);

  // Two big eyes.
  drawEyes(g, 16, { y: 10, dx: 4, big: true });

  drawOutline(g);
  return gridToRows(g);
}

function drawMane(g: Grid) {
  const cx = 16;
  const cy = 13;
  const outerRx = 12;
  const outerRy = 11;
  const innerRx = 7;
  const innerRy = 6;
  const rnd = mulberry(99);
  for (let y = Math.max(0, cy - outerRy); y <= Math.min(GRID - 1, cy + outerRy); y++) {
    for (let x = Math.max(0, cx - outerRx); x <= Math.min(GRID - 1, cx + outerRx); x++) {
      const odx = (x - cx) / outerRx;
      const ody = (y - cy) / outerRy;
      const idx = (x - cx) / innerRx;
      const idy = (y - cy) / innerRy;
      if (odx * odx + ody * ody <= 1 && idx * idx + idy * idy > 1) {
        const cur = g[y][x];
        if (cur === T || cur === MID) {
          // Ragged edge: drop some outer pixels for a fur silhouette.
          const edge = odx * odx + ody * ody;
          if (edge > 0.82 && rnd() > 0.55) continue;
          g[y][x] = PAT;
        }
      }
    }
  }
}
