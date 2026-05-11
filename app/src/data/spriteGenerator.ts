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

// Bresenham-style line between two points, drawing thickness-2 disks at each
// step so the resulting stroke survives the outline pass (interior survives
// as body color, edge becomes outline). Use for tails, antennae, snake bodies.
function thickLine(
  g: Grid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  ch: string,
) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (;;) {
    // 2x2 disk at this step
    setPixel(g, x, y, ch);
    setPixel(g, x + 1, y, ch);
    setPixel(g, x, y + 1, ch);
    setPixel(g, x + 1, y + 1, ch);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

// Draws a thick polyline that connects a sequence of waypoints.
function polyline(g: Grid, pts: Array<[number, number]>, ch: string) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    thickLine(g, x0, y0, x1, y1, ch);
  }
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

  // Tail — continuous thick curve, sweeps up the right side of the body
  if ((opts.tail ?? 'curled') === 'curled') {
    polyline(g, [
      [24, 24],
      [26, 22],
      [27, 19],
      [27, 16],
      [26, 14],
    ], '1');
  } else if (opts.tail === 'fluffy') {
    ellipse(g, 26, 22, 3, 5, '1');
    ellipse(g, 28, 19, 2, 3, '1');
  } else if (opts.tail === 'long') {
    polyline(g, [[24, 24], [26, 21], [27, 17], [27, 13]], '1');
  }

  // Mane drawn BEFORE finish so it participates in outline + highlight.
  if (opts.mane) {
    drawMane(g);
  }

  finish(g);
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

  finish(g);

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

  finish(g);

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

  // Tail feathers — a small wedge extending back-left from the body
  polyline(g, [[8, 20], [5, 22], [3, 23]], '1');
  polyline(g, [[8, 22], [5, 24], [3, 25]], '1');

  finish(g);

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

  finish(g);

  return gridToRows(g);
}

// ── Shared helpers ─────────────────────────────────────────────────────

// Outline pass: any body-silhouette pixel (palette 1 or 8 — body or accent
// like mane / wing) whose 4-neighborhood contains transparency becomes the
// outline color (palette 2). Produces a clean 1-pixel ring around the
// whole silhouette — the single biggest "feels finished" trick.
function drawOutline(g: Grid) {
  const snap = g.map((r) => r.slice());
  const isBody = (ch: string) => ch === '1' || ch === '8';
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!isBody(snap[y][x])) continue;
      const left = x > 0 ? snap[y][x - 1] : '.';
      const right = x < GRID - 1 ? snap[y][x + 1] : '.';
      const up = y > 0 ? snap[y - 1][x] : '.';
      const down = y < GRID - 1 ? snap[y + 1][x] : '.';
      if (left === '.' || right === '.' || up === '.' || down === '.') {
        g[y][x] = '2';
      }
    }
  }
}

// Highlight pass: the topmost remaining body pixel (palette 1) in each
// column becomes highlight (palette 3). Suggests light coming from above
// and gives the silhouette depth.
function drawTopHighlight(g: Grid) {
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      if (g[y][x] === '1') {
        g[y][x] = '3';
        break;
      }
    }
  }
}

// Standard finish pipeline: outline first, then highlight the topmost
// interior pixel per column. Called at the end of every animal composer.
function finish(g: Grid) {
  drawOutline(g);
  drawTopHighlight(g);
}

function drawMane(g: Grid) {
  // Thick fluffy ring around the head — drawn as the AREA between two
  // concentric ellipses, then trimmed back so it only covers space that's
  // currently transparent or already mane.
  const cx = 16;
  const cy = 12;
  const outerRx = 11;
  const outerRy = 10;
  const innerRx = 7;
  const innerRy = 6;
  for (let y = Math.max(0, cy - outerRy); y <= Math.min(GRID - 1, cy + outerRy); y++) {
    for (let x = Math.max(0, cx - outerRx); x <= Math.min(GRID - 1, cx + outerRx); x++) {
      const odx = (x - cx) / outerRx;
      const ody = (y - cy) / outerRy;
      const idx = (x - cx) / innerRx;
      const idy = (y - cy) / innerRy;
      const inOuter = odx * odx + ody * ody <= 1;
      const inInner = idx * idx + idy * idy <= 1;
      if (inOuter && !inInner) {
        // Only place mane where it wouldn't overwrite head body or features
        const cur = g[y][x];
        if (cur === '.' || cur === '1') g[y][x] = '8';
      }
    }
  }
  // Fluff tufts at the top
  setPixel(g, 11, 1, '8');
  setPixel(g, 16, 0, '8');
  setPixel(g, 21, 1, '8');
}
