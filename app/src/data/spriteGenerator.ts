// Procedural pixel sprite generator. Builds 32×32 sprite rows by composing
// primitive shapes (ellipses, rects, lines, triangles) onto a char grid.
// Used to produce full-body animal sprites rather than the older 16×16
// face avatars.

type Grid = string[][];

const GRID = 32;

function makeGrid(): Grid {
  return Array.from({ length: GRID }, () => Array(GRID).fill('.'));
}

function setPixel(g: Grid, x: number, y: number, ch: string) {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
  g[y][x] = ch;
}

// Filled ellipse using the standard pixel ellipse formula. Clip to grid.
function ellipse(
  g: Grid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  ch: string,
) {
  for (let y = Math.max(0, cy - ry); y <= Math.min(GRID - 1, cy + ry); y++) {
    for (let x = Math.max(0, cx - rx); x <= Math.min(GRID - 1, cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPixel(g, x, y, ch);
    }
  }
}

// Hollow ellipse (1-pixel ring).
function ellipseRing(
  g: Grid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  ch: string,
) {
  for (let y = Math.max(0, cy - ry); y <= Math.min(GRID - 1, cy + ry); y++) {
    for (let x = Math.max(0, cx - rx); x <= Math.min(GRID - 1, cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 1 && d2 >= 0.6) setPixel(g, x, y, ch);
    }
  }
}

function rect(g: Grid, x: number, y: number, w: number, h: number, ch: string) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(g, x + dx, y + dy, ch);
    }
  }
}

// Filled triangle by three corner points.
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
      const d1 = sign(x, y, ax, ay, bx, by);
      const d2 = sign(x, y, bx, by, cx, cy);
      const d3 = sign(x, y, cx, cy, ax, ay);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(hasNeg && hasPos)) setPixel(g, x, y, ch);
    }
  }
}

function sign(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

// Mirror existing pixels across the vertical centerline (for symmetric features).
function mirrorH(g: Grid) {
  const mid = Math.floor(GRID / 2);
  for (let y = 0; y < GRID; y++) {
    for (let x = mid; x < GRID; x++) {
      const mirrored = GRID - 1 - x;
      if (g[y][mirrored] !== '.') g[y][x] = g[y][mirrored];
    }
  }
}

function gridToRows(g: Grid): string[] {
  return g.map((row) => row.join(''));
}

// ── Composers ────────────────────────────────────────────────────────

export interface AnimalOptions {
  // Ear shape variant for canines/felines.
  ears?: 'pointy' | 'perked' | 'floppy' | 'tufted' | 'none';
  // Body proportions.
  build?: 'normal' | 'stocky' | 'slender';
  // Optional mane (lion/tiger).
  mane?: boolean;
  // Tail style.
  tail?: 'curled' | 'long' | 'short' | 'fluffy' | 'none';
  // Eye color override (palette index).
  eyeColor?: number;
}

// Sitting feline. Cat-like body with vertical pupils.
export function generateCat(opts: AnimalOptions = {}): string[] {
  const g = makeGrid();
  const ears = opts.ears ?? 'pointy';
  const build = opts.build ?? 'normal';

  // Body — sitting cat. Bottom-rooted ellipse.
  const bodyRx = build === 'stocky' ? 10 : build === 'slender' ? 7 : 9;
  const bodyRy = 8;
  const bodyCx = 16;
  const bodyCy = 22;
  ellipse(g, bodyCx, bodyCy, bodyRx, bodyRy, '1');

  // Head — circle above the body
  const headRx = build === 'stocky' ? 8 : 7;
  const headRy = build === 'stocky' ? 7 : 6;
  const headCx = 16;
  const headCy = 12;
  ellipse(g, headCx, headCy, headRx, headRy, '1');

  // Ears
  if (ears === 'pointy') {
    // Solid wedge ears — explicit pixels read better than tiny triangles.
    // Left ear
    rect(g, 8, 4, 2, 1, '1');   // tip
    rect(g, 8, 5, 3, 1, '1');
    rect(g, 8, 6, 4, 1, '1');
    rect(g, 8, 7, 5, 1, '1');
    rect(g, 8, 8, 5, 1, '1');
    // inner shadow
    setPixel(g, 9, 6, '2');
    rect(g, 9, 7, 2, 1, '2');
    rect(g, 9, 8, 3, 1, '2');
    // Right ear (mirror across center x=15.5)
    rect(g, 22, 4, 2, 1, '1');
    rect(g, 21, 5, 3, 1, '1');
    rect(g, 20, 6, 4, 1, '1');
    rect(g, 19, 7, 5, 1, '1');
    rect(g, 19, 8, 5, 1, '1');
    setPixel(g, 22, 6, '2');
    rect(g, 21, 7, 2, 1, '2');
    rect(g, 20, 8, 3, 1, '2');
  } else if (ears === 'tufted') {
    // Owl-style ear tufts: small triangles up + out
    triangle(g, 10, 9, 9, 3, 12, 8, '1');
    triangle(g, 22, 9, 23, 3, 20, 8, '1');
  } else if (ears === 'floppy') {
    // Floppy ears hang down past the head sides
    ellipse(g, 8, 14, 3, 5, '2');
    ellipse(g, 24, 14, 3, 5, '2');
  }

  // Eyes — two darker round pupils with white sclera around
  const eyeY = 12;
  ellipse(g, 13, eyeY, 2, 2, '4'); // left sclera
  ellipse(g, 19, eyeY, 2, 2, '4'); // right sclera
  setPixel(g, 13, eyeY, '5');
  setPixel(g, 14, eyeY, '5');
  setPixel(g, 19, eyeY, '5');
  setPixel(g, 18, eyeY, '5');

  // Nose (triangle / pixel)
  setPixel(g, 16, 16, '6');
  setPixel(g, 15, 15, '6');
  setPixel(g, 17, 15, '6');

  // Mouth
  setPixel(g, 15, 17, '7');
  setPixel(g, 16, 17, '7');
  setPixel(g, 17, 17, '7');

  // Front paws — two small ovals at the bottom of the body
  ellipse(g, 12, 29, 2, 1, '1');
  ellipse(g, 20, 29, 2, 1, '1');

  // Tail — long curved tail along the right side
  if ((opts.tail ?? 'curled') === 'curled') {
    // Curved tail: starts at body lower right, sweeps up to upper right
    const tailPoints: Array<[number, number]> = [
      [25, 24],
      [26, 22],
      [27, 20],
      [28, 18],
      [28, 15],
      [27, 13],
    ];
    for (const [x, y] of tailPoints) {
      ellipse(g, x, y, 1, 1, '1');
    }
  } else if (opts.tail === 'fluffy') {
    ellipse(g, 26, 22, 3, 4, '1');
  } else if (opts.tail === 'long') {
    for (let i = 0; i < 10; i++) {
      setPixel(g, 25 + Math.floor(i * 0.3), 24 - i, '1');
    }
  }

  // Rim shadow on body edges for depth
  drawBodyShadow(g);

  // Add mane on top of head if specified (lion, tiger has stripes instead)
  if (opts.mane) {
    drawMane(g);
  }

  // Chest highlight (lighter)
  rect(g, 14, 20, 4, 3, '3');

  return gridToRows(g);
}

// Sitting canine. Slightly different head shape, longer snout.
export function generateDog(opts: AnimalOptions = {}): string[] {
  const g = makeGrid();
  const ears = opts.ears ?? 'perked';
  const build = opts.build ?? 'normal';

  const bodyRx = build === 'stocky' ? 11 : 9;
  const bodyRy = 8;
  const bodyCx = 16;
  const bodyCy = 22;
  ellipse(g, bodyCx, bodyCy, bodyRx, bodyRy, '1');

  const headRx = build === 'stocky' ? 9 : 7;
  const headRy = build === 'stocky' ? 7 : 6;
  ellipse(g, 16, 11, headRx, headRy, '1');

  // Snout — slight protrusion at the bottom of the head
  ellipse(g, 16, 15, 4, 3, '1');

  // Ears
  if (ears === 'perked') {
    // Solid pointy ears, taller than cat ears
    // Left
    rect(g, 8, 3, 2, 1, '1');
    rect(g, 8, 4, 3, 1, '1');
    rect(g, 8, 5, 4, 1, '1');
    rect(g, 8, 6, 4, 1, '1');
    rect(g, 8, 7, 5, 1, '1');
    rect(g, 9, 5, 1, 3, '2'); // inner shadow stripe
    // Right
    rect(g, 22, 3, 2, 1, '1');
    rect(g, 21, 4, 3, 1, '1');
    rect(g, 20, 5, 4, 1, '1');
    rect(g, 20, 6, 4, 1, '1');
    rect(g, 19, 7, 5, 1, '1');
    rect(g, 22, 5, 1, 3, '2');
  } else if (ears === 'floppy') {
    // Drooping ears past the cheeks
    ellipse(g, 7, 13, 2, 5, '2');
    ellipse(g, 25, 13, 2, 5, '2');
    ellipse(g, 7, 16, 2, 3, '1');
    ellipse(g, 25, 16, 2, 3, '1');
  }

  // Eyes
  ellipse(g, 13, 11, 1, 2, '4');
  ellipse(g, 19, 11, 1, 2, '4');
  setPixel(g, 13, 11, '5');
  setPixel(g, 19, 11, '5');

  // Nose (bigger than cat)
  ellipse(g, 16, 16, 2, 1, '6');

  // Mouth — small wedge
  setPixel(g, 15, 18, '7');
  setPixel(g, 16, 18, '7');
  setPixel(g, 17, 18, '7');

  // Front paws
  ellipse(g, 12, 29, 2, 1, '1');
  ellipse(g, 20, 29, 2, 1, '1');

  // Tail — wag stub
  if ((opts.tail ?? 'short') === 'short') {
    ellipse(g, 26, 21, 2, 2, '1');
  } else if (opts.tail === 'long') {
    for (let i = 0; i < 8; i++) {
      setPixel(g, 25 + Math.floor(i / 2), 22 - i, '1');
    }
  }

  drawBodyShadow(g);
  rect(g, 14, 20, 4, 3, '3');

  return gridToRows(g);
}

// Standing wolf — taller, more angular, longer snout.
export function generateWolf(opts: AnimalOptions = {}): string[] {
  const g = makeGrid();

  // Body — longer horizontally
  ellipse(g, 16, 21, 11, 6, '1');

  // Head — angular
  ellipse(g, 16, 11, 7, 5, '1');
  // Snout extension
  rect(g, 14, 14, 5, 4, '1');
  ellipse(g, 16, 17, 3, 2, '1');

  // Long pointed ears
  triangle(g, 9, 9, 7, 2, 11, 7, '1');
  triangle(g, 23, 9, 25, 2, 21, 7, '1');
  triangle(g, 9, 8, 8, 4, 10, 7, '2');
  triangle(g, 23, 8, 24, 4, 22, 7, '2');

  // Eyes — narrow / mean
  setPixel(g, 12, 11, '4');
  setPixel(g, 13, 11, '4');
  setPixel(g, 19, 11, '4');
  setPixel(g, 20, 11, '4');
  setPixel(g, 13, 11, '5');
  setPixel(g, 19, 11, '5');

  // Nose
  setPixel(g, 16, 17, '6');
  setPixel(g, 15, 17, '6');
  setPixel(g, 17, 17, '6');

  // Mouth — sharper
  setPixel(g, 15, 19, '7');
  setPixel(g, 16, 19, '7');
  setPixel(g, 17, 19, '7');

  // Four legs (standing)
  rect(g, 9, 26, 2, 4, '1');
  rect(g, 13, 26, 2, 4, '1');
  rect(g, 18, 26, 2, 4, '1');
  rect(g, 22, 26, 2, 4, '1');

  // Bushy tail
  for (let i = 0; i < 8; i++) {
    setPixel(g, 27 + Math.floor(i / 4), 22 - i, '1');
  }
  ellipse(g, 28, 17, 2, 2, '1');

  drawBodyShadow(g);
  rect(g, 14, 19, 4, 3, '3');

  return gridToRows(g);
}

// Bird — small, perched.
export function generateBird(opts: AnimalOptions = {}): string[] {
  const g = makeGrid();

  // Plump round body
  ellipse(g, 16, 19, 8, 8, '1');

  // Head — small circle on top of body, offset slightly forward
  ellipse(g, 16, 9, 6, 5, '1');

  // Beak — small triangle protruding right
  triangle(g, 21, 9, 25, 10, 21, 11, '6');

  // Eye — single forward-facing dot (sideways view)
  ellipse(g, 18, 8, 1, 1, '4');
  setPixel(g, 18, 8, '5');

  // Wing — colored accent on body
  ellipse(g, 13, 18, 4, 5, '8');

  // Legs — two thin stick legs
  rect(g, 14, 27, 1, 4, '6');
  rect(g, 18, 27, 1, 4, '6');
  // Feet
  setPixel(g, 13, 30, '6');
  setPixel(g, 14, 30, '6');
  setPixel(g, 15, 30, '6');
  setPixel(g, 17, 30, '6');
  setPixel(g, 18, 30, '6');
  setPixel(g, 19, 30, '6');

  // Tail feathers
  for (let i = 0; i < 5; i++) {
    setPixel(g, 8 - i, 21 + Math.floor(i / 2), '1');
  }

  drawBodyShadow(g);

  return gridToRows(g);
}

// Owl — bigger, fluffier, prominent eyes.
export function generateOwl(): string[] {
  const g = makeGrid();

  // Round body
  ellipse(g, 16, 19, 10, 9, '1');

  // Head — slightly bigger than other birds
  ellipse(g, 16, 9, 8, 7, '1');

  // Ear tufts (great horned owl)
  triangle(g, 10, 5, 8, 1, 12, 6, '1');
  triangle(g, 22, 5, 24, 1, 20, 6, '1');

  // Two BIG round eyes — owl signature
  ellipse(g, 12, 9, 3, 3, '4');
  ellipse(g, 20, 9, 3, 3, '4');
  // Pupils
  ellipse(g, 12, 9, 1, 1, '5');
  ellipse(g, 20, 9, 1, 1, '5');

  // Beak — small triangle between eyes
  triangle(g, 16, 11, 14, 13, 18, 13, '6');

  // Speckled chest pattern (accent color spots)
  setPixel(g, 13, 17, '2');
  setPixel(g, 16, 16, '2');
  setPixel(g, 19, 17, '2');
  setPixel(g, 14, 19, '2');
  setPixel(g, 18, 19, '2');
  setPixel(g, 15, 21, '2');
  setPixel(g, 17, 21, '2');

  // Wings — darker accent on the sides
  ellipse(g, 8, 18, 3, 6, '8');
  ellipse(g, 24, 18, 3, 6, '8');

  // Legs
  rect(g, 13, 27, 2, 3, '6');
  rect(g, 17, 27, 2, 3, '6');
  // Talons
  setPixel(g, 12, 30, '6');
  setPixel(g, 13, 30, '6');
  setPixel(g, 14, 30, '6');
  setPixel(g, 17, 30, '6');
  setPixel(g, 18, 30, '6');
  setPixel(g, 19, 30, '6');

  drawBodyShadow(g);

  return gridToRows(g);
}

// ── Shared helpers ─────────────────────────────────────────────────────

function drawBodyShadow(g: Grid) {
  // Add a 1-pixel dark rim on the outer edge of any "1" pixel where the
  // neighbor is transparent. Cheap "outline" pass that makes the silhouette
  // pop against the dark UI.
  const snapshot = g.map((r) => r.slice());
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (snapshot[y][x] !== '1') continue;
      const neighbors = [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
        if (snapshot[ny][nx] === '.') {
          // Draw shadow ONE cell IN from the edge (so silhouette stays
          // crisp; the inner side gets the shadow).
          continue;
        }
      }
    }
  }

  // Simpler shadow: darken the underside of the head + body. Add a thin
  // dark stripe at the bottom of the body.
  for (let x = 8; x < 24; x++) {
    if (g[27][x] === '1') g[27][x] = '2';
  }
  // Shadow on left edge of body (light coming from upper right)
  for (let y = 16; y < 26; y++) {
    if (g[y][6] === '1') g[y][6] = '2';
    if (g[y][7] === '1') g[y][7] = '2';
  }
}

function drawMane(g: Grid) {
  // Wreath of mane (palette 8) around the head.
  const positions: Array<[number, number]> = [
    [8, 8], [8, 11], [8, 14], [9, 6], [10, 4],
    [13, 3], [16, 2], [19, 3], [22, 4], [23, 6],
    [24, 8], [24, 11], [24, 14],
    [9, 16], [11, 18], [13, 18], [16, 18], [19, 18], [21, 18], [23, 16],
  ];
  for (const [x, y] of positions) {
    setPixel(g, x, y, '8');
  }
  // Fluff out edges
  ellipse(g, 8, 11, 1, 4, '8');
  ellipse(g, 24, 11, 1, 4, '8');
}
