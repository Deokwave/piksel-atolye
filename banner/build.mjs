// Deokwave GitHub sayfalarındaki piksel görselleri (banner, buton, başlık, panel) üretir.
// Usage: node build.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.argv[2] || 'out');
for (const d of ['org', 'personal']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

// ---------------------------------------------------------------- helpers
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

class Canvas {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Array(w * h).fill(null); }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.px[y * this.w + x] = c; }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; return this.px[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  sprite(x, y, rows, map) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = map[r[i]]; if (c) this.set(x + i, y + j, c); } }); }
  // one <path> per colour, built from horizontal runs
  paths(ox = 0, oy = 0) {
    const by = new Map();
    for (let y = 0; y < this.h; y++) {
      let x = 0;
      while (x < this.w) {
        const c = this.px[y * this.w + x];
        if (!c) { x++; continue; }
        let e = x + 1;
        while (e < this.w && this.px[y * this.w + e] === c) e++;
        if (!by.has(c)) by.set(c, []);
        by.get(c).push(`M${x + ox} ${y + oy}h${e - x}v1h${x - e}z`);
        x = e;
      }
    }
    return [...by].map(([c, d]) => `<path fill="${c}" d="${d.join('')}"/>`).join('');
  }
}

function svgDoc(w, h, layers, { title, css = '', scale = 3 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<style>${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>
${layers.join('\n')}
</svg>
`;
}

// ---------------------------------------------------------------- pixel font (5x7, Turkish capitals)
const F = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  ',': ['.', '.', '.', '.', '.', '#', '#'],
  ':': ['.', '#', '.', '.', '.', '#', '.'],
  '-': ['...', '...', '...', '###', '...', '...', '...'],
  '·': ['.', '.', '.', '#', '.', '.', '.'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  "'": ['#', '#', '.', '.', '.', '.', '.'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '>': ['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
  '©': ['.#####.', '#.....#', '#..##.#', '#.#...#', '#..##.#', '#.....#', '.#####.'],
};
const ACC = { 'Ç': ['C', 'ced'], 'Ş': ['S', 'ced'], 'Ğ': ['G', 'breve'], 'İ': ['I', 'dot'], 'Ö': ['O', 'diaer'], 'Ü': ['U', 'diaer'] };
const ACCENT = { dot: [[1, '.#.']], diaer: [[1, '.#.#.']], breve: [[0, '#...#'], [1, '.###.']], ced: [[10, '..#..'], [11, '.##..']] };
const CELL_H = 12; // rows 0-1 accents, 3-9 body, 10-11 cedilla

function glyph(ch) {
  if (ch === ' ') return { w: 3, rows: Array(CELL_H).fill('...') };
  const acc = ACC[ch];
  const body = F[acc ? acc[0] : ch];
  if (!body) throw new Error('no glyph for ' + JSON.stringify(ch));
  const w = body[0].length;
  const rows = Array(CELL_H).fill('.'.repeat(w));
  for (let i = 0; i < 7; i++) rows[3 + i] = body[i];
  if (acc) for (const [r, s] of ACCENT[acc[1]]) rows[r] = s.padEnd(w, '.').slice(0, w);
  return { w, rows };
}
const up = (s) => s.toLocaleUpperCase('tr-TR');
function textWidth(str, scale = 1, track = 1) { let w = 0; for (const ch of up(str)) w += (glyph(ch).w + track) * scale; return w - track * scale; }
// returns a Map "x,y" -> cellRow for every lit pixel
function textMask(str, x0, y0, scale = 1, track = 1) {
  const m = new Map(); let x = x0;
  for (const ch of up(str)) {
    const g = glyph(ch);
    g.rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) m.set(`${x + i * scale + a},${y0 + j * scale + b}`, j); });
    x += (g.w + track) * scale;
  }
  return m;
}
function drawText(cv, str, x, y, color, scale = 1) { for (const [k, row] of textMask(str, x, y, scale)) { const [px, py] = k.split(',').map(Number); cv.set(px, py, typeof color === 'function' ? color(row) : color); } }
function drawTitle(cv, str, x, y, scale, { fill, shadow, outline }) {
  const m = textMask(str, x, y, scale, 1);
  const pts = [...m.keys()].map((k) => k.split(',').map(Number));
  const lit = new Set(m.keys());
  const sh = new Set(); for (const [px, py] of pts) for (let d = 1; d <= 2; d++) if (!lit.has(`${px},${py + d}`)) sh.add(`${px},${py + d}`);
  const all = new Set([...lit, ...sh]);
  for (const k of all) { const [px, py] = k.split(',').map(Number); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const n = `${px + dx},${py + dy}`; if (!all.has(n)) cv.set(px + dx, py + dy, outline); } }
  for (const k of sh) { const [px, py] = k.split(',').map(Number); cv.set(px, py, shadow); }
  for (const [k, row] of m) { const [px, py] = k.split(',').map(Number); cv.set(px, py, fill[Math.max(0, Math.min(fill.length - 1, row - 3))]); }
}

// ---------------------------------------------------------------- scene parts
function skyFill(cv, bands, yEnd) {
  for (let y = 0; y < yEnd; y++) {
    let i = 0; while (i + 1 < bands.length && bands[i + 1][0] <= y) i++;
    const cur = bands[i][1], next = bands[i + 1] ? bands[i + 1][1] : cur, prev = i > 0 ? bands[i - 1][1] : cur;
    const toNext = bands[i + 1] ? bands[i + 1][0] - y : 99, fromStart = y - bands[i][0];
    for (let x = 0; x < cv.w; x++) {
      let c = cur;
      if (toNext === 1) c = (x + y) % 2 ? next : cur;
      else if (toNext === 2) c = x % 4 === (y % 2) * 2 ? next : cur;
      else if (fromStart === 0 && i > 0) c = x % 4 === ((y + 1) % 2) * 2 + 1 ? prev : cur;
      cv.set(x, y, c);
    }
  }
}
function starLayers(w, yMax, seed, P, avoid = []) {
  const r = rng(seed); const layers = [new Canvas(w, yMax), new Canvas(w, yMax), new Canvas(w, yMax)];
  const free = (x, y) => !avoid.some(([ax, ay, aw, ah]) => x >= ax && x < ax + aw && y >= ay && y < ay + ah);
  for (let n = 0; n < 70; n++) {
    const x = Math.floor(r() * w), y = Math.floor(r() * (yMax - 2)); if (!free(x, y)) continue;
    const L = layers[n % 3];
    if (n % 11 === 0) { L.set(x, y, P.star); L.set(x - 1, y, P.starDim); L.set(x + 1, y, P.starDim); L.set(x, y - 1, P.starDim); L.set(x, y + 1, P.starDim); }
    else L.set(x, y, n % 4 === 0 ? P.star : P.starDim);
  }
  return layers;
}
function moon(cv, cx, cy, R, P) {
  for (let y = -R - 6; y <= R + 6; y++) for (let x = -R - 6; x <= R + 6; x++) {
    const d = Math.hypot(x + 0.5, y + 0.5); const px = cx + x, py = cy + y;
    if (d <= R) { const s = Math.hypot(x + 0.5 + R * 0.35, y + 0.5 + R * 0.35); cv.set(px, py, s > R * 1.12 ? P.moonShade : P.moon); }
    else if (d <= R + 2) { if ((px + py) % 2 === 0) cv.set(px, py, P.moonGlow); }
    else if (d <= R + 5) { if (px % 3 === 0 && py % 3 === 0) cv.set(px, py, P.moonGlow); }
  }
  const craters = [[-4, -3, 2.2], [3, 2, 2.6], [-1, 6, 1.3], [5, -5, 1.2], [-6, 3, 1.2]];
  for (const [x, y, r] of craters) for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (Math.hypot(i + 0.5, j + 0.5) <= r) cv.set(cx + x + i, cy + y + j, Math.hypot(i + 0.9, j + 0.9) <= r - 0.9 ? P.moonCrater : P.moonShade);
}
function fuji(cv, px, py, base, P) {
  for (let y = py; y < base; y++) {
    const d = y - py; const hw = 2 + Math.round(d * 1.05 + d * d * 0.016);
    for (let x = px - hw; x <= px + hw; x++) {
      const left = x < px;
      const drip = [0, 2, 1, 3, 0, 1, 4, 2][(((x - px) % 8) + 8) % 8];
      const c = y < py + 7 + drip ? (left ? P.snowShade : P.snow) : (left ? P.fuji : P.fujiLit);
      cv.set(x, y, c);
    }
  }
}
function hills(cv, yTop, horizon, P, phase = 0) {
  for (let x = 0; x < cv.w; x++) {
    const t = Math.round(yTop + 2 * Math.sin(x / 11 + phase) + 1.5 * Math.sin(x / 4.7 + 1 + phase));
    for (let y = t; y < horizon; y++) cv.set(x, y, P.hills);
  }
}
function calmSea(cv, y0, y1, P, seed) {
  const r = rng(seed);
  for (let y = y0; y < y1; y++) for (let x = 0; x < cv.w; x++) cv.set(x, y, y === y0 || (y === y0 + 1 && (x + y) % 2) ? P.seaFar : P.sea);
  for (let n = 0; n < 40; n++) { const x = Math.floor(r() * cv.w), y = y0 + 1 + Math.floor(r() * (y1 - y0 - 1)); const l = 2 + Math.floor(r() * 4); for (let i = 0; i < l; i++) cv.set(x + i, y, P.seaLine); }
}
function glints(w, h, cx, y0, y1, P, seed) {
  const cv = new Canvas(w, h); const r = rng(seed);
  for (let y = y0; y < y1; y++) {
    if (r() < 0.3) continue;
    const spread = 2 + Math.round((y - y0) * 0.5);
    const n = 1 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      const x = cx - spread + Math.floor(r() * (2 * spread + 1)); const l = 1 + Math.floor(r() * 3);
      for (let q = 0; q < l; q++) cv.set(x + q, y, Math.abs(x + q - cx) < spread * 0.5 ? P.refl : P.reflDim);
    }
  }
  return cv;
}
// tileable wave strip; returns canvas (w+period wide)
function waveStrip(w, period, h, amp, C, opt = {}) {
  const cv = new Canvas(w + period, h);
  const crest = (t) => (t < 0.22 ? Math.pow(t / 0.22, 0.6) : Math.pow((1 - t) / 0.78, 1.7));
  for (let x = 0; x < cv.w; x++) {
    const t = (x % period) / period; const c = crest(t);
    const top = Math.round((1 - c) * amp);
    for (let y = top; y < h; y++) {
      let col = C.body;
      if (y === top) col = c > 0.55 ? C.foam : C.top;
      else if (y === top + 1 && c > 0.8) col = C.foamSoft;
      else if (y === top + 2 + (x % 3 === 0 ? 1 : 0) && t > 0.3 && t < 0.62) col = C.light;
      else if (y >= h - 2 && (x + y) % 2) col = C.deep;
      cv.set(x, y, col);
    }
  }
  if (opt.curl) {
    const sp = ['..#####.', '.##+++##', '##+.....', '#+......', '#.......', '.#......'];
    for (let x0 = Math.round(period * 0.22); x0 < cv.w + 8; x0 += period) {
      const top = Math.round((1 - crest((x0 % period) / period)) * amp);
      cv.sprite(x0 - 7, top - 1, sp, { '#': C.foam, '+': C.foamSoft });
    }
  }
  if (opt.spray) { const r = rng(opt.spray); for (let n = 0; n < Math.floor(cv.w / 9); n++) { const x = Math.floor(r() * period); const t = (x % period) / period; if (t > 0.12 && t < 0.32) for (let rep = 0; rep * period + x < cv.w; rep++) cv.set(rep * period + x, Math.floor(r() * 2), C.foamSoft); } }
  return cv;
}

// the Deokwave "D" (wave inside a D), drawn from geometry
function dLogo(k, P, sy = 1) {
  const H = 44 * k, R = 22 * k, cy = 22 * k, cx = 18 * k, T = 4 * k;
  const W = Math.ceil(cx + R) + 4, HH = Math.ceil(H * sy) + 4, o = 2; // canvas with room for glow
  const cv = new Canvas(W, HH);
  const xl = (y) => (y <= 8 * k ? 1 * k + (y / (8 * k)) * 8 * k : 9 * k - ((y - 8 * k) / (36 * k)) * 9 * k);
  const outer = (x, y) => y >= 0 && y <= H && x >= xl(y) && (x <= cx || (x - cx) ** 2 + (y - cy) ** 2 <= R * R);
  const inner = (x, y) => y >= T && y <= H - T && x >= xl(y) + T * 1.2 && (x <= cx || (x - cx) ** 2 + (y - cy) ** 2 <= (R - T) ** 2);
  const at = (i, j) => [i - o + 0.5, (j - o + 0.5) / sy];
  const r = rng(7);
  // interior
  for (let j = 0; j < HH; j++) for (let i = 0; i < W; i++) {
    const [x, y] = at(i, j); if (!inner(x, y)) continue;
    let c = P.dBg;
    if (Math.hypot(x - 31 * k, y - 10 * k) <= 2.9 * k) c = P.dMoon;
    // mini Fuji
    const fpx = 21 * k, fpy = 27 * k;
    if (y >= fpy && Math.abs(x - fpx) <= 0.6 + (y - fpy) * 0.95) c = y < fpy + 3 * k ? P.dSnow : P.dFuji;
    // the wave: thick on the left, thinning to a clawed lip on the right
    const wx = 18 * k, wy = 25 * k, ro = 11.5 * k;
    const d = Math.hypot(x - wx, y - wy), ang = (Math.atan2(-(y - wy), x - wx) * 180) / Math.PI;
    const a2 = ang < -90 ? ang + 360 : ang; const u = (215 - a2) / 250; // 0 at the left foot, 1 at the lip
    const ri = ro - (8 * k * (1 - u) + 2.2 * k * u);
    if (u >= 0 && u <= 1 && d <= ro && d >= ri) c = d > ro - 1.5 * k && a2 > -40 && a2 < 130 ? P.dFoam : d > ro - 3 * k ? P.dLight : d < ri + 1.3 * k ? P.dDeep : P.dWave;
    // claws hanging from the lip into the hollow
    if (u > 0.6 && u <= 1.04 && d < ri && d > ri - 1.6 * k && Math.floor(a2 / 12) % 2 === 0) c = P.dFoam;
    // spray above the crest
    if (d > ro + 0.6 * k && d <= ro + 2 * k && a2 > 20 && a2 < 80 && Math.floor(a2 / 7) % 3 === 0) c = P.dFoam;
    // base water
    const bt = 36 * k + 1.2 * k * Math.sin(x / (2.1 * k));
    if (y >= bt) c = y < bt + 1.2 * k ? P.dFoam : (Math.floor(x + y) % 5 === 0 ? P.dLight : P.dWave);
    cv.set(i, j, c);
  }
  for (let n = 0; n < 6; n++) { const i = Math.floor(r() * W), j = Math.floor(r() * HH * 0.5); const [x, y] = at(i, j); if (inner(x, y) && cv.get(i, j) === P.dBg) cv.set(i, j, P.dStar); }
  // stroke + glow
  for (let j = 0; j < HH; j++) for (let i = 0; i < W; i++) {
    const [x, y] = at(i, j);
    if (outer(x, y) && !inner(x, y)) {
      const edge = !outer(x - 1, y) || !outer(x + 1, y) || !outer(x, y - 1) || !outer(x, y + 1);
      cv.set(i, j, edge ? P.dEdge : P.dStroke);
    } else if (!outer(x, y)) {
      let near = 9; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (outer(x + dx, y + dy)) near = Math.min(near, Math.max(Math.abs(dx), Math.abs(dy)));
      if (near === 1) cv.set(i, j, P.dGlow); else if (near === 2 && (i + j) % 2 === 0) cv.set(i, j, P.dGlow2);
    }
  }
  return cv;
}
function blit(dst, src, ox, oy) { for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) { const c = src.get(i, j); if (c) dst.set(ox + i, oy + j, c); } }

// ---------------------------------------------------------------- palettes
const NIGHT = {
  sky: [[0, '#04061a'], [14, '#070b26'], [30, '#0a1033'], [46, '#0e1641'], [58, '#131d52'], [66, '#182562']],
  star: '#dfe7ff', starDim: '#7f8fd4',
  moon: '#f4f7ff', moonShade: '#cdd8f8', moonCrater: '#b3c1ec', moonGlow: '#22307a',
  fuji: '#0a1140', fujiLit: '#24357e', snow: '#eef3ff', snowShade: '#aebdee', hills: '#0b1240',
  seaFar: '#1a2a6e', sea: '#0c1548', seaLine: '#22357f', refl: '#e6eeff', reflDim: '#8ea6f0',
  waves: [
    { body: '#13246a', top: '#2a45a8', foam: '#9fb6f5', foamSoft: '#5d7bd8', light: '#2a45a8', deep: '#0f1d58' },
    { body: '#183192', top: '#3558cc', foam: '#cfdcff', foamSoft: '#7e9ae8', light: '#3a63da', deep: '#132877' },
    { body: '#1d3fb8', top: '#4a74ec', foam: '#ffffff', foamSoft: '#a9c2ff', light: '#4f7cf2', deep: '#16319a' },
  ],
  dBg: '#081038', dMoon: '#e8eeff', dStar: '#8ea6f0', dFuji: '#2a3f95', dSnow: '#eef3ff', dWave: '#1f55d8', dLight: '#6f9bff', dDeep: '#123a9e', dFoam: '#ffffff',
  dStroke: '#f7f9ff', dEdge: '#bcd2ff', dGlow: '#3d6df0', dGlow2: '#1d3a9a',
  title: ['#ffffff', '#ffffff', '#eef3ff', '#dce7ff', '#c6d7ff', '#adc6ff', '#93b3ff'], titleShadow: '#2848c0', titleOutline: '#03051a',
  sub: '#b3c6f7', accent: '#b9a6ff',
  ui: { bg: '#070b22', card: '#0b1236', border: '#22357f', hi: '#2f47a8', text: '#e6edff', dim: '#8fa3dc', accent: '#b9a6ff' },
};
const DUSK = {
  sky: [[0, '#0b0619'], [14, '#120a2b'], [30, '#1b0f3d'], [46, '#26134f'], [58, '#33185f'], [66, '#421d6c']],
  star: '#fbefff', starDim: '#a98fd8',
  moon: '#fff5fc', moonShade: '#ecd3ee', moonCrater: '#d8b9dc', moonGlow: '#3b1d68',
  fuji: '#160a36', fujiLit: '#3a2272', snow: '#f8efff', snowShade: '#c8b2e8', hills: '#150a33',
  seaFar: '#3a1f6e', sea: '#150b3b', seaLine: '#2c1a63', refl: '#fff0fb', reflDim: '#c6a6ee',
  waves: [
    { body: '#22145c', top: '#3f2a8c', foam: '#c1aef2', foamSoft: '#7f62cf', light: '#3f2a8c', deep: '#1b104d' },
    { body: '#2f1e7c', top: '#5a3fb8', foam: '#e2d6ff', foamSoft: '#9c80e6', light: '#5c43c4', deep: '#26176a' },
    { body: '#3e28a0', top: '#7458dc', foam: '#ffffff', foamSoft: '#c6b3ff', light: '#7c62e6', deep: '#321f88' },
  ],
  dBg: '#120a32', dMoon: '#fff0fb', dStar: '#c6a6ee', dFuji: '#3a2a8a', dSnow: '#f8efff', dWave: '#5b45d6', dLight: '#a58cff', dDeep: '#3a2aa0', dFoam: '#ffffff',
  dStroke: '#fbf8ff', dEdge: '#d9c8ff', dGlow: '#7c5cf0', dGlow2: '#3f2a9a',
  title: ['#ffffff', '#ffffff', '#f4eeff', '#e6dbff', '#d6c4ff', '#c4a9ff', '#b08fff'], titleShadow: '#6a3fd0', titleOutline: '#07031a',
  sub: '#d2c2f7', accent: '#86dcff',
  ui: { bg: '#0b0622', card: '#140b36', border: '#3a237f', hi: '#5232a8', text: '#f1eaff', dim: '#a996dc', accent: '#86dcff' },
};

// ---------------------------------------------------------------- banners
const W = 320, H = 100, HORIZON = 74;
const BASE_CSS = `
.t0{animation:tw 2.6s steps(1) infinite}.t1{animation:tw 3.4s steps(1) infinite -1.3s}.t2{animation:tw 4.2s steps(1) infinite -2.1s}
@keyframes tw{0%{opacity:1}50%{opacity:.25}}
.ra{animation:sh 1.4s steps(1) infinite}.rb{animation:sh 1.4s steps(1) infinite -.7s}
@keyframes sh{0%{opacity:1}50%{opacity:0}}
.w0{animation:d0 9s steps(48) infinite}.w1{animation:d1 6s steps(40) infinite}.w2{animation:d2 4s steps(64) infinite}
@keyframes d0{to{transform:translate(-48px,0)}}@keyframes d1{to{transform:translate(-40px,0)}}@keyframes d2{to{transform:translate(-64px,0)}}
.blink{animation:bl 1s steps(1) infinite}@keyframes bl{0%{opacity:1}50%{opacity:0}}`;

function seaLayers(P, seed) {
  const back = waveStrip(W, 48, 9, 3, P.waves[0], { spray: seed + 1 });
  const mid = waveStrip(W, 40, 11, 4, P.waves[1], { spray: seed + 2 });
  const front = waveStrip(W, 64, 13, 6, P.waves[2], { curl: true, spray: seed + 3 });
  return [`<g class="w0">${back.paths(0, 78)}</g>`, `<g class="w1">${mid.paths(0, 83)}</g>`, `<g class="w2">${front.paths(0, 88)}</g>`];
}
function sceneBase(P, { moonX, moonY, fujiX, fujiY, seed, avoid }) {
  const sky = new Canvas(W, H); skyFill(sky, P.sky, HORIZON);
  const stars = starLayers(W, HORIZON - 8, seed, P, avoid);
  const land = new Canvas(W, H);
  moon(land, moonX, moonY, 11, P);
  fuji(land, fujiX, fujiY, HORIZON, P);
  hills(land, 70, HORIZON, P, seed % 7);
  calmSea(land, HORIZON, H, P, seed);
  const ra = glints(W, H, moonX, HORIZON, H, P, seed + 50), rb = glints(W, H, moonX, HORIZON, H, P, seed + 51);
  return [
    `<rect width="${W}" height="${H}" fill="${P.sky[0][1]}"/>`, sky.paths(),
    ...stars.map((s, i) => `<g class="t${i}">${s.paths()}</g>`),
    land.paths(), ...seaLayers(P, seed),
    `<g class="ra">${ra.paths()}</g>`, `<g class="rb">${rb.paths()}</g>`,
  ];
}

function orgBanner() {
  const P = NIGHT;
  const layers = sceneBase(P, { moonX: 286, moonY: 22, fujiX: 262, fujiY: 40, seed: 11, avoid: [[12, 11, 50, 52]] });
  const fg = new Canvas(W, H);
  blit(fg, dLogo(1, P), 12, 12);
  drawTitle(fg, 'DEOKWAVE', 72, 11, 3, { fill: P.title, shadow: P.titleShadow, outline: P.titleOutline });
  drawText(fg, 'ANİME · 4K · TÜRKÇE ALTYAZI', 73, 46, P.sub);
  drawText(fg, '> DEOKWAVE.COM', 73, 58, P.accent);
  layers.push(fg.paths());
  return svgDoc(W, H, layers, { title: 'Deokwave — Türkçe altyazılı anime platformu', css: BASE_CSS });
}

function monitor(P) {
  const cv = new Canvas(46, 44);
  const fr = P.ui.border, hi = P.ui.hi, sc = '#05030f';
  cv.rect(1, 0, 44, 32, fr); cv.rect(0, 1, 46, 30, fr);           // frame with clipped corners
  cv.rect(2, 1, 42, 1, hi); cv.rect(1, 2, 1, 28, hi);             // bevel light
  cv.rect(3, 3, 40, 26, sc);                                      // screen
  const d = dLogo(0.5, P); blit(cv, d, 23 - Math.floor(d.w / 2), 4);
  cv.rect(20, 32, 6, 5, fr); cv.rect(13, 37, 20, 2, fr); cv.rect(13, 37, 20, 1, hi); // stand
  cv.set(41, 30, P.ui.accent); // power led
  return cv;
}
function personalBanner() {
  const P = DUSK;
  const layers = sceneBase(P, { moonX: 286, moonY: 22, fujiX: 262, fujiY: 42, seed: 23, avoid: [[10, 12, 52, 48]] });
  const fg = new Canvas(W, H);
  blit(fg, monitor(P), 12, 20);
  drawTitle(fg, 'DEOKWV', 72, 11, 3, { fill: P.title, shadow: P.titleShadow, outline: P.titleOutline });
  drawText(fg, 'DEOKWAVE KURUCUSU', 73, 46, P.sub);
  drawText(fg, 'WEB · OYNATICI · UYGULAMALAR', 73, 58, P.accent);
  layers.push(fg.paths());
  const cur = new Canvas(W, H); cur.rect(73 + textWidth('WEB · OYNATICI · UYGULAMALAR') + 3, 66, 4, 1, P.accent);
  layers.push(`<g class="blink">${cur.paths()}</g>`);
  return svgDoc(W, H, layers, { title: 'Deokwv — Deokwave kurucusu', css: BASE_CSS });
}

// ---------------------------------------------------------------- UI pieces (all carry their own dark background)
function panelFrame(cv, x, y, w, h, U, fill) {
  cv.rect(x + 1, y, w - 2, h, U.border); cv.rect(x, y + 1, w, h - 2, U.border);
  cv.rect(x + 1, y + 1, w - 2, h - 2, fill);
  cv.rect(x + 2, y + 1, w - 4, 1, U.hi);
}
const ICONS = {
  nami: { rows: ['FFFFFFFFFFFFFFFF', 'FSSSSSSSSSSSSSSF', 'FSTSSTSSTSSTSSSF', 'FSTSSTSSTSTSSSSF', 'FSTTTTSSTTSSSSSF', 'FSSSSTSSTSTSSSSF', 'FSSSSTSSTSSTSSSF', 'FSSSSSSSSSSSSSSF', 'FFFFFFFFFFFFFFFF', '......FFFF......', '....FFFFFFFF....'], map: (U) => ({ F: '#6f9bff', S: '#071034', T: '#ffffff' }) },
  wave: { rows: ['................', '..###......###..', '.#...#....#...#.', '#.....#..#.....#', '.......##.......', '................', '..###......###..', '.#...#....#...#.', '#.....#..#.....#', '.......##.......', '................'], map: () => ({ '#': '#5fd4ff' }) },
  frames: { rows: ['################', '#.#.#.#.#.#.#.##', '################', '#....#....#....#', '#.AA.#.GG.#.AA.#', '#.AA.#.GG.#.AA.#', '#....#....#....#', '################', '#.#.#.#.#.#.#.##', '################'], map: () => ({ '#': '#8d7bff', A: '#cfc6ff', G: '#ffffff' }) },
};
function frcIcon(cv, x, y) {
  const ramp = ['#140a3a', '#2a1670', '#4a24b0', '#7442e6', '#a678ff', '#d7c2ff', '#ffffff'];
  for (let j = 0; j < 10; j++) for (let i = 0; i < 16; i++) {
    const v = (i / 15) * (ramp.length - 1); const a = Math.floor(v), f = v - a;
    const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]][j % 4][i % 4] / 16;
    cv.set(x + i, y + j, ramp[Math.min(ramp.length - 1, f > bayer ? a + 1 : a)]);
  }
}
function techPanel() {
  const P = NIGHT, U = P.ui; const w = 320, h = 124; const cv = new Canvas(w, h);
  panelFrame(cv, 0, 0, w, h, U, U.bg);
  const cards = [
    { t: 'NAMİ 4K', d: ['ANİMEYİ 4K EKRANLARDA', 'DAHA NET GÖSTERİR'], icon: 'nami' },
    { t: 'WAVEGEN', d: ['OYNATICININ GÖRÜNTÜ', 'İYİLEŞTİRME ALTYAPISI'], icon: 'wave' },
    { t: 'FRAME GENERATION', d: ['BÖLÜMLERİ DAHA YÜKSEK', 'KARE HIZINDA OYNATIR'], icon: 'frames' },
    { t: 'FRC · DERİN RENK', d: ['RENK GEÇİŞLERİNİ DAHA', 'YUMUŞAK GÖSTERİR'], icon: 'frc' },
  ];
  cards.forEach((c, n) => {
    const cx = 5 + (n % 2) * 157, cy = 5 + Math.floor(n / 2) * 58, cw = 153, ch = 55;
    panelFrame(cv, cx, cy, cw, ch, U, U.card);
    if (c.icon === 'frc') frcIcon(cv, cx + 7, cy + 7); else { const I = ICONS[c.icon]; cv.sprite(cx + 7, cy + 6, I.rows, I.map(U)); }
    drawText(cv, c.t, cx + 30, cy + 6, U.text);
    drawText(cv, c.d[0], cx + 7, cy + 22, U.dim);
    drawText(cv, c.d[1], cx + 7, cy + 34, U.dim);
  });
  return svgDoc(w, h, [cv.paths()], { title: 'Nami 4K: anime görüntüsünü 4K ekranlarda daha net gösterir. Wavegen: oynatıcının görüntü iyileştirme altyapısı. Frame Generation: bölümleri daha yüksek kare hızında oynatır. FRC (Derin Renkler): renk geçişlerini daha yumuşak gösterir.' });
}
const SMALL = {
  globe: ['..###..', '.#.#.#.', '#..#..#', '#######', '#..#..#', '.#.#.#.', '..###..'],
  chat: ['.#####.', '#.....#', '#.#.#.#', '#.....#', '.####..', '..#....', '.......'],
  camera: ['.#####.', '#....##', '#.###.#', '#.#.#.#', '#.###.#', '#.....#', '.#####.'],
  note: ['...##..', '...#.#.', '...#..#', '...#...', '.###...', '####...', '.##....'],
  play: ['#......', '##.....', '###....', '####...', '###....', '##.....', '#......'],
  window: ['#######', '#.#.#.#', '#######', '#.....#', '#.....#', '#.....#', '#######'],
  phone: ['.####..', '.#..#..', '.#..#..', '.#..#..', '.#..#..', '.####..', '..##...'],
  mail: ['#######', '##...##', '#.#.#.#', '#..#..#', '#.....#', '#######', '.......'],
  arrow: ['...#...', '....#..', '#######', '....#..', '...#...', '.......', '.......'],
};
function button(label, icon, P) {
  const U = P.ui; const tw = textWidth(label); const w = 6 + 7 + 5 + tw + 7, h = 17; const cv = new Canvas(w, h);
  cv.rect(1, 0, w - 2, h, U.border); cv.rect(0, 1, w, h - 2, U.border);
  cv.rect(1, 1, w - 2, h - 2, U.card);
  cv.rect(2, 1, w - 4, 1, U.hi); cv.rect(1, 2, 1, h - 4, U.hi);           // bevel light
  cv.rect(2, h - 2, w - 4, 1, U.bg);                                       // bevel dark
  cv.sprite(6, 5, SMALL[icon], { '#': U.accent });
  drawText(cv, label, 6 + 7 + 5, 2, U.text);
  return svgDoc(w, h, [cv.paths()], { title: label });
}
function header(label, P) {
  const U = P.ui; const w = 320, h = 17; const cv = new Canvas(w, h);
  cv.rect(1, 0, w - 2, h, U.border); cv.rect(0, 1, w, h - 2, U.border); cv.rect(1, 1, w - 2, h - 2, U.bg);
  cv.sprite(6, 6, ['.##...##.', '#..#.#..#', '....#....'], { '#': U.accent });
  drawText(cv, label, 21, 2, U.text);
  const x0 = 21 + textWidth(label) + 6; for (let x = x0; x < w - 6; x += 2) cv.set(x, 8, U.border);
  for (let x = x0 + 1; x < w - 6; x += 4) cv.set(x, 8, U.hi);
  return svgDoc(w, h, [cv.paths()], { title: label });
}
function footer(P, text, seed) {
  const w = 320, h = 22; const cv = new Canvas(w, h);
  cv.rect(0, 0, w, h, P.sea);
  const strip = waveStrip(w, 40, 9, 4, P.waves[1], { spray: seed });
  const strip2 = waveStrip(w, 64, 7, 3, P.waves[2], { curl: false, spray: seed + 1 });
  const t = new Canvas(w, h); drawText(t, text, Math.floor((w - textWidth(text)) / 2), -1, P.ui.dim);
  return svgDoc(w, h, [`<rect width="${w}" height="${h}" fill="${P.sky[2][1]}"/>`, t.paths(), `<g class="w1">${strip.paths(0, 11)}</g>`, `<g class="w2">${strip2.paths(0, 15)}</g>`], { title: text, css: BASE_CSS });
}
function stackPanel(P = DUSK, title = 'Kullandığım teknolojiler: ') {
  const U = P.ui; const groups = [
    ['DİLLER', '#3b6be0', ['JAVASCRIPT', 'TYPESCRIPT', 'PHP', 'PYTHON', 'DART']],
    ['WEB & ARAYÜZ', '#d9653b', ['HTML', 'CSS', 'SVELTE', 'WEBSOCKET', 'WEBRTC']],
    ['UYGULAMA', '#7c4ddb', ['FLUTTER', 'TAURI', 'RUST', 'FIREBASE', 'VITE']],
    ['SUNUCU & ALTYAPI', '#0e9fb0', ['NODE.JS', 'MYSQL', 'CLOUDFLARE']],
    ['GÖRÜNTÜ & MODEL', '#c04fc8', ['WEBGPU', 'WGSL', 'PYTORCH', 'FFMPEG']],
  ];
  const w = 320, rowH = 31, h = 6 + groups.length * rowH + 2; const cv = new Canvas(w, h);
  panelFrame(cv, 0, 0, w, h, U, U.bg);
  groups.forEach(([label, col, items], g) => {
    const y = 5 + g * rowH;
    drawText(cv, label, 8, y - 1, U.dim);
    let x = 8;
    for (const it of items) {
      const bw = 4 + 3 + 3 + textWidth(it) + 6, by = y + 13, bh = 13;
      cv.rect(x + 1, by, bw - 2, bh, col); cv.rect(x, by + 1, bw, bh - 2, col);
      cv.rect(x + 1, by + 1, bw - 2, bh - 2, U.card);
      cv.rect(x + 4, by + 5, 3, 3, col);
      drawText(cv, it, x + 10, by - 1, U.text);
      x += bw + 4;
    }
  });
  const all = groups.flatMap((g) => g[2]).join(', ');
  return svgDoc(w, h, [cv.paths()], { title: title + all });
}

// ---------------------------------------------------------------- write
const write = (rel, s) => { fs.writeFileSync(path.join(OUT, rel), s); console.log(rel.padEnd(34), (s.length / 1024).toFixed(1) + ' KB'); };
write('org/banner.svg', orgBanner());
write('org/tech.svg', techPanel());
write('org/footer.svg', footer(NIGHT, '© 2026 DEOKWAVE', 5));
write('personal/banner.svg', personalBanner());
write('personal/stack.svg', stackPanel());
write('personal/footer.svg', footer(DUSK, 'DEOKWAVE KURUCUSU', 9));
for (const [file, label, icon] of [['btn-site', 'DEOKWAVE.COM', 'globe'], ['btn-discord', 'DISCORD', 'chat'], ['btn-instagram', 'INSTAGRAM', 'camera'], ['btn-tiktok', 'TIKTOK', 'note'], ['btn-web', 'WEB', 'globe'], ['btn-android', 'ANDROID', 'phone'], ['btn-windows', 'WINDOWS', 'window'], ['btn-mail', 'INFO@DEOKWAVE.COM', 'mail']]) write(`org/${file}.svg`, button(label, icon, NIGHT));
for (const [file, label, icon] of [['btn-site', 'DEOKWAVE.COM', 'globe'], ['btn-org', 'GITHUB.COM/DEOKWAVE', 'arrow'], ['btn-discord', 'DISCORD', 'chat']]) write(`personal/${file}.svg`, button(label, icon, DUSK));
for (const [file, label] of [['h-tech', 'OYNATICI TEKNOLOJİLERİ'], ['h-platform', 'PLATFORMLAR'], ['h-community', 'TOPLULUK VE İLETİŞİM']]) write(`org/${file}.svg`, header(label, NIGHT));
for (const [file, label] of [['h-work', 'NELERLE UĞRAŞIYORUM'], ['h-stack', 'NE KULLANIYORUM'], ['h-contact', 'İLETİŞİM']]) write(`personal/${file}.svg`, header(label, DUSK));

// ---------------------------------------------------------------- org avatar (PPM, converted to PNG outside)
function orgAvatar() {
  const P = NIGHT, N = 64; const cv = new Canvas(N, N);
  skyFill(cv, [[0, '#04061a'], [12, '#070b26'], [24, '#0a1033'], [36, '#0e1641'], [46, '#131d52']], N);
  const r = rng(91);
  for (let n = 0; n < 28; n++) { const x = Math.floor(r() * N), y = Math.floor(r() * 46); cv.set(x, y, n % 3 ? P.starDim : P.star); }
  for (const [x, y] of [[7, 9], [55, 14]]) { cv.set(x, y, P.star); cv.set(x - 1, y, P.starDim); cv.set(x + 1, y, P.starDim); cv.set(x, y - 1, P.starDim); cv.set(x, y + 1, P.starDim); }
  blit(cv, waveStrip(N, 32, 9, 3, P.waves[1], { spray: 3 }), 0, 51);
  blit(cv, waveStrip(N, 32, 7, 3, P.waves[2], { curl: true, spray: 4 }), -6, 57);
  const d = dLogo(1.0, P, 0.84); blit(cv, d, Math.floor((N - d.w) / 2) + 1, Math.floor((52 - d.h) / 2) + 1);
  return cv;
}
{
  const cv = orgAvatar(); const rows = [];
  for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) { const c = cv.get(x, y) || '#000000'; rows.push([1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)).join(' ')); }
  fs.writeFileSync(path.join(OUT, 'org-avatar.ppm'), `P3\n${cv.w} ${cv.h}\n255\n${rows.join('\n')}\n`);
  console.log('org-avatar.ppm');
}


// ---------------------------------------------------------------- per-repo banners
function blitScaled(dst, src, ox, oy, k) { for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) { const c = src.get(i, j); if (c) dst.rect(ox + i * k, oy + j * k, k, k, c); } }
function iconCanvas(kind, P) {
  if (kind === 'logo') return dLogo(0.62, P);
  const cv = new Canvas(16, 16);
  if (kind === 'frc') frcIcon(cv, 0, 3); else { const I = ICONS[kind]; cv.sprite(0, kind === 'nami' ? 2 : 3, I.rows, I.map(P.ui)); }
  return cv;
}
function repoBanner(title, tagline, kind) {
  const P = NIGHT, w = 320, h = 64; const sky = new Canvas(w, h);
  skyFill(sky, [[0, '#04061a'], [16, '#070b26'], [30, '#0a1033'], [42, '#0e1641']], 50);
  const stars = starLayers(w, 44, title.length * 7 + 3, P, [[6, 6, 60, 44]]);
  const fg = new Canvas(w, h);
  const ic = iconCanvas(kind, P);
  if (kind === 'logo') blit(fg, ic, 14, 7); else blitScaled(fg, ic, 12, 8, 2);
  drawTitle(fg, title, 58, 4, 2, { fill: P.title, shadow: P.titleShadow, outline: P.titleOutline });
  drawText(fg, tagline, 59, 30, P.sub);
  const sea = new Canvas(w, h); sea.rect(0, 50, w, 14, P.sea);
  const w1 = waveStrip(w, 40, 9, 3, P.waves[1], { spray: 11 }), w2 = waveStrip(w, 64, 7, 3, P.waves[2], { curl: true, spray: 12 });
  return svgDoc(w, h, [`<rect width="${w}" height="${h}" fill="#04061a"/>`, sky.paths(), ...stars.map((s, i) => `<g class="t${i}">${s.paths()}</g>`), sea.paths(), `<g class="w1">${w1.paths(0, 49)}</g>`, `<g class="w2">${w2.paths(0, 56)}</g>`, fg.paths()], { title: title + ' — ' + tagline, css: BASE_CSS });
}
fs.mkdirSync(path.join(OUT, 'repos'), { recursive: true });
for (const [name, title, tag, kind] of [
  ['deokwave', 'DEOKWAVE', 'TÜRKÇE ALTYAZILI ANİME SİTESİ', 'logo'],
  ['nami-4k', 'NAMİ 4K', 'ANİME İÇİN 4K BÜYÜTME MODELİ', 'nami'],
  ['frame-generation', 'FRAME GENERATION', 'ARA KARELERLE DAHA AKICI İZLE', 'frames'],
  ['frc', 'FRC', 'DERİN RENKLER', 'frc'],
  ['wavegen', 'WAVEGEN', 'OYNATICININ GÖRÜNTÜ ALTYAPISI', 'wave'],
]) write(`repos/${name}.svg`, repoBanner(title, tag, kind));

write('org/stack.svg', stackPanel(NIGHT, 'Kullandığımız teknolojiler: '));
write('org/h-stack.svg', header('KULLANDIĞIMIZ TEKNOLOJİLER', NIGHT));
