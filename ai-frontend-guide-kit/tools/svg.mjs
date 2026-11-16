#!/usr/bin/env node
/**
 * svg — draws, checks and cleans SVG. No dependencies. It reads files as text only: it never runs or fetches anything.
 *
 *   gen <kind>      deterministic shapes from design-tokens.json and a seed (blob, wave, grid, dots, pattern ...)
 *   check <paths>   numbered findings: viewBox, palette, strokes, size, accessibility, scripts, leftovers
 *   optimize <file> safe clean-up (editor leftovers, comments, empty groups, unused ids, rounding)
 *   sprite <dir>    one <svg> with a <symbol> per icon
 *
 * Usage: node ai-frontend-guide-kit/tools/svg.mjs <command> ... [--dir <project>] [--json]
 * Exit: 0 done, 1 a high finding (or --strict and a medium one) or a refused file, 2 wrong usage.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTokens, parseHex } from './tokens.mjs';
import { runTool, toolPath } from './kit-path.mjs';

const SELF = fileURLToPath(import.meta.url);
const KIT_DIR = resolve(dirname(SELF), '..');
const TOKENS_FILE = 'design-tokens.json';
const SEVERITIES = ['high', 'medium', 'low'];
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'ai-frontend-guide-kit', 'ai-frontend-output']);
const DEFAULT_TARGETS = ['public', 'src', 'assets', 'static'];
const LIMITS = { colors: 5, widths: 2, iconBytes: 10240, bytes: 51200, iconSide: 64, raster: 4096, filter: 2, decimals: 2, dots: 3000, lines: 400 };

class UsageError extends Error {}
class Refusal extends Error {}

// ---------------------------------------------------------------- small helpers

const num = (x) => String(Math.round(x * 100) / 100);
const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const slash = (path) => path.replace(/\\/g, '/');

/** mulberry32: the same seed always gives the same sequence in [0, 1). */
function prng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pt = ([x, y]) => `${num(x)} ${num(y)}`;

/** A smooth path through the points: Catmull-Rom turned into cubic Beziers (closed or open). */
function smoothPath(points, closed) {
  const n = points.length;
  const at = (i) => (closed ? points[((i % n) + n) % n] : points[clamp(i, 0, n - 1)]);
  let d = `M${pt(points[0])}`;
  for (let i = 0; i < (closed ? n : n - 1); i += 1) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return closed ? `${d}Z` : d;
}

// ---------------------------------------------------------------- palette from design-tokens.json

/** The colors of the project: `{ ok, vars: Map(--color-x -> #hex), hexes }`, or `{ ok: false, note }`. */
function loadPalette(root) {
  const file = join(root, TOKENS_FILE);
  if (!existsSync(file)) return { ok: false, note: `no ${TOKENS_FILE}: colors are currentColor (run ${runTool('tokens.mjs', 'init', root)} to get the palette)` };
  try {
    const loaded = loadTokens(file);
    if (loaded.errors.length) return { ok: false, note: `${TOKENS_FILE} has errors: colors are currentColor (run ${runTool('tokens.mjs', 'check', root)})` };
    const vars = new Map();
    const hexes = new Set();
    for (const token of Object.values(loaded.tokens)) {
      const hex = token.type === 'color' && token.path.startsWith('color.') ? parseHex(String(token.value)) : null;
      if (!hex) continue;
      hexes.add(hex);
      const rest = token.path.split('.').slice(1);
      if (rest[0] === 'dark') continue;
      vars.set(`--color-${rest[0] === 'ramp' ? rest.slice(1).join('-') : rest.join('-')}`, hex);
    }
    return { ok: true, vars, hexes };
  } catch {
    return { ok: false, note: `${TOKENS_FILE} is not valid JSON: colors are currentColor (run ${runTool('tokens.mjs', 'check', root)})` };
  }
}

const colorKey = (name) => `--color-${String(name).replace(/^--color-/, '').replace(/^color\./, '').replace(/^ramp\./, '').replace(/\./g, '-')}`;

/** The paint of a token as `var(--color-x, #hex)`, or `currentColor` when the project has no palette. */
function paintOf(palette, name, explicit, fallbacks) {
  if (!palette.ok) return 'currentColor';
  const names = explicit ? [name] : [name, ...fallbacks, [...palette.vars.keys()][0]?.replace('--color-', '')];
  for (const candidate of names) {
    const key = colorKey(candidate);
    if (palette.vars.has(key)) return `var(${key}, ${palette.vars.get(key)})`;
  }
  const known = [...palette.vars.keys()].map((key) => key.replace('--color-', ''));
  throw new UsageError(`"${name}" is not a color token (try ${known.slice(0, 12).join(', ')}${known.length > 12 ? ', ...' : ''})`);
}

// ---------------------------------------------------------------- gen: the kinds

const strokeAttrs = (color, width) => `fill="none" stroke="${color}" stroke-width="${num(width)}" stroke-linecap="round" stroke-linejoin="round"`;
const int = (min, max, def) => ({ type: 'num', min, max, def, int: true });
const real = (min, max, def) => ({ type: 'num', min, max, def });
const oneOf = (values) => ({ type: 'enum', values, def: values[0] });

function blob({ w, h, rnd, c1, o }) {
  const R = (Math.min(w, h) / 2) * 0.82;
  const pts = Array.from({ length: o.points }, (_, i) => {
    const angle = (i / o.points) * 2 * Math.PI - Math.PI / 2;
    const radius = R * (1 - o.irregularity * rnd());
    return [w / 2 + radius * Math.cos(angle), h / 2 + radius * Math.sin(angle)];
  });
  return { body: [`<path fill="${c1}" d="${smoothPath(pts, true)}"/>`] };
}

function wave({ w, h, rnd, c1, o }) {
  const steps = 6;
  const swing = o.amplitude * h * 0.25;
  const body = [];
  for (let layer = 0; layer < o.layers; layer += 1) {
    const t = o.layers === 1 ? 0.5 : layer / (o.layers - 1);
    const base = h * (0.3 + 0.35 * t);
    const pts = Array.from({ length: steps + 1 }, (_, j) => {
      const y = base + ((j + layer) % 2 ? 1 : -1) * swing * (0.65 + 0.35 * rnd());
      return [(j * w) / steps, o.flip ? h - y : y];
    });
    const opacity = o.layers === 1 ? '' : ` fill-opacity="${num(0.25 + 0.75 * t)}"`;
    body.push(`<path fill="${c1}"${opacity} d="${smoothPath(pts, false)}V${o.flip ? 0 : num(h)}H0Z"/>`);
  }
  return { body };
}

function grid({ w, h, c1, o, sw }) {
  const cols = Math.floor((w - sw) / o.cell);
  const rows = Math.floor((h - sw) / o.cell);
  if (cols + rows > LIMITS.lines) throw new UsageError(`${cols + rows} lines is too many: raise --cell`);
  const [ox, oy] = [(w - cols * o.cell) / 2, (h - rows * o.cell) / 2];
  let d = '';
  for (let i = 0; i <= cols; i += 1) d += `M${num(ox + i * o.cell)} ${num(oy)}V${num(oy + rows * o.cell)}`;
  for (let j = 0; j <= rows; j += 1) d += `M${num(ox)} ${num(oy + j * o.cell)}H${num(ox + cols * o.cell)}`;
  return { body: [`<path ${strokeAttrs(c1, sw)} d="${d}"/>`] };
}

function dots({ w, h, c1, o }) {
  const cols = Math.floor((w - 2 * o.radius) / o.cell) + 1;
  const rows = Math.floor((h - 2 * o.radius) / o.cell) + 1;
  if (cols * rows > LIMITS.dots) throw new UsageError(`${cols * rows} dots is too many: raise --cell`);
  const [ox, oy] = [(w - (cols - 1) * o.cell) / 2, (h - (rows - 1) * o.cell) / 2];
  let d = '';
  for (let j = 0; j < rows; j += 1) for (let i = 0; i < cols; i += 1) d += `M${num(ox + i * o.cell)} ${num(oy + j * o.cell)}h0`;
  return { body: [`<path fill="none" stroke="${c1}" stroke-width="${num(2 * o.radius)}" stroke-linecap="round" d="${d}"/>`] };
}

function pattern({ w, h, c1, o, sw }) {
  const t = o.tile;
  const motifs = {
    stripes: { rotate: true, shape: `<path d="M${num(t / 2)} 0V${t}"/>` },
    chevron: { shape: `<path d="M${num(-t / 2)} ${num(t * 0.25)}L0 ${num(t * 0.75)}L${num(t / 2)} ${num(t * 0.25)}L${t} ${num(t * 0.75)}L${num(t * 1.5)} ${num(t * 0.25)}"/>` },
    cross: { shape: `<path d="M${num(t / 2 - t / 6)} ${num(t / 2)}h${num(t / 3)}M${num(t / 2)} ${num(t / 2 - t / 6)}v${num(t / 3)}"/>` },
    circles: { shape: `<circle cx="${num(t / 2)}" cy="${num(t / 2)}" r="${num(t / 5)}"/>` },
    triangles: { shape: `<path d="M${num(t / 2)} ${num(t * 0.25)}L${num(t * 0.75)} ${num(t * 0.75)}H${num(t * 0.25)}Z"/>` },
  };
  const motif = motifs[o.motif];
  return {
    defs: [`<pattern id="tile" width="${t}" height="${t}" patternUnits="userSpaceOnUse"${motif.rotate ? ' patternTransform="rotate(45)"' : ''}>`, `  <g ${strokeAttrs(c1, sw)}>${motif.shape}</g>`, '</pattern>'],
    body: [`<rect width="${num(w)}" height="${num(h)}" fill="url(#tile)"/>`],
  };
}

function rings({ w, h, c1, o, sw }) {
  const R = Math.min(w, h) / 2 - sw;
  const circles = Array.from({ length: o.count }, (_, i) => {
    const opacity = 1 - (0.75 * i) / (o.count - 1);
    return `  <circle cx="${num(w / 2)}" cy="${num(h / 2)}" r="${num((R * (i + 1)) / o.count)}"${opacity < 1 ? ` opacity="${num(opacity)}"` : ''}/>`;
  });
  return { body: [`<g ${strokeAttrs(c1, sw)}>`, ...circles, '</g>'] };
}

function noiseLines({ w, h, rnd, c1, o, sw }) {
  const n = o.lines;
  const gap = (h - 2 * sw) / (n - 1 + 2 * o.amplitude);
  const swing = gap * o.amplitude;
  const steps = 6;
  const phase = rnd() * Math.PI;
  const flow = Array.from({ length: steps + 1 }, (_, j) => 0.7 * Math.sin(j * 1.15 + phase) + 0.3 * (rnd() * 2 - 1));
  const paths = Array.from({ length: n }, (_, i) => {
    const calm = 1 - 0.3 * (i / (n - 1));
    const base = sw + swing + i * gap;
    const pts = flow.map((f, j) => [sw + (j * (w - 2 * sw)) / steps, base + swing * clamp(f, -1, 1) * calm]);
    return `  <path d="${smoothPath(pts, false)}"/>`;
  });
  return { body: [`<g ${strokeAttrs(c1, sw)}>`, ...paths, '</g>'] };
}

function gradientMesh({ w, h, rnd, c1, c2, o }) {
  const anchors = { 2: [[0.3, 0.4], [0.7, 0.6]], 3: [[0.25, 0.3], [0.75, 0.4], [0.5, 0.75]], 4: [[0.25, 0.3], [0.75, 0.3], [0.7, 0.78], [0.22, 0.75]] }[o.fields];
  const defs = [];
  const circles = [];
  anchors.forEach(([ax, ay], i) => {
    const color = i % 2 ? c2 : c1;
    const r = Math.max(w, h) * (0.36 + 0.1 * rnd());
    defs.push(`<radialGradient id="g${i + 1}">`, `  <stop offset="0" stop-color="${color}" stop-opacity="${i % 2 ? 0.7 : 0.9}"/>`, `  <stop offset="1" stop-color="${color}" stop-opacity="0"/>`, '</radialGradient>');
    circles.push(`  <circle cx="${num(w * (ax + (rnd() - 0.5) * 0.1))}" cy="${num(h * (ay + (rnd() - 0.5) * 0.1))}" r="${num(r)}" fill="url(#g${i + 1})"/>`);
  });
  defs.push('<filter id="blur" x="-20%" y="-20%" width="140%" height="140%">', `  <feGaussianBlur stdDeviation="${num(Math.min(w, h) / 14)}"/>`, '</filter>');
  return { defs, body: ['<g filter="url(#blur)">', ...circles, '</g>'] };
}

function arrow({ w, h, rnd, c1, sw }) {
  const head = clamp(Math.min(w, h) * 0.18, 10, 22);
  const m = sw + 4;
  const [lo, hi] = [m + head * 0.5, h - m - head * 0.5];
  const [x0, x3] = [m, w - m];
  const [y0, y3] = [clamp(h * (0.6 + 0.15 * rnd()), lo, hi), clamp(h * (0.3 + 0.15 * rnd()), lo, hi)];
  const c1p = [x0 + (x3 - x0) * 0.33, clamp(y0 + (rnd() - 0.2) * h * 0.4, lo, hi)];
  const c2p = [x0 + (x3 - x0) * 0.66, clamp(y3 + (rnd() - 0.8) * h * 0.4, lo, hi)];
  const angle = Math.atan2(y3 - c2p[1], x3 - c2p[0]);
  const wing = (turn) => [x3 - head * Math.cos(angle + turn), y3 - head * Math.sin(angle + turn)];
  const body = `M${pt([x0, y0])}C${pt(c1p)} ${pt(c2p)} ${pt([x3, y3])}M${pt(wing(0.5))}L${pt([x3, y3])}L${pt(wing(-0.5))}`;
  return { body: [`<path ${strokeAttrs(c1, sw)} d="${body}"/>`] };
}

function squiggle({ w, h, rnd, c1, o, sw }) {
  const amp = Math.min(o.amplitude * h, h / 2 - sw);
  const steps = 4 * o.waves;
  const pts = Array.from({ length: steps + 1 }, (_, k) => {
    const level = [0, 1, 0, -1][k % 4];
    return [sw + (k * (w - 2 * sw)) / steps, h / 2 + level * amp * (level ? 0.9 + 0.2 * rnd() : 0) + (level ? 0 : (rnd() - 0.5) * amp * 0.1)];
  });
  return { body: [`<path ${strokeAttrs(c1, sw)} d="${smoothPath(pts, false)}"/>`] };
}

function badge({ w, h, c1, c2, o, sw, tokens }) {
  const R = Math.min(w, h) / 2 - sw;
  const pts = Array.from({ length: 2 * o.points }, (_, i) => {
    const r = i % 2 ? R * o.inner : R;
    const angle = (Math.PI * i) / o.points - Math.PI / 2;
    return [w / 2 + r * Math.cos(angle), h / 2 + r * Math.sin(angle)];
  });
  const fill = tokens ? '' : ' fill-opacity="0.15"';
  return {
    body: [
      `<path fill="${c1}"${fill} stroke="${c1}" stroke-width="${num(sw)}" stroke-linejoin="round" d="M${pts.map(pt).join('L')}Z"/>`,
      `<circle cx="${num(w / 2)}" cy="${num(h / 2)}" r="${num(R * o.inner * 0.78)}" fill="none" stroke="${c2}" stroke-width="${num(sw)}"/>`,
    ],
  };
}

function frame({ w, h, c1, o, sw }) {
  const m = sw;
  if (o.style === 'border') {
    const inset = sw * 3;
    const rect = (i, rx) => `  <rect x="${num(m + i)}" y="${num(m + i)}" width="${num(w - 2 * (m + i))}" height="${num(h - 2 * (m + i))}" rx="${num(Math.max(0, rx))}"/>`;
    return { body: [`<g ${strokeAttrs(c1, sw)}>`, rect(0, o.radius), rect(inset, o.radius - inset), '</g>'] };
  }
  const L = Math.min(w, h) * o.length;
  const d = `M${num(m)} ${num(m + L)}V${num(m)}H${num(m + L)}M${num(w - m - L)} ${num(m)}H${num(w - m)}V${num(m + L)}M${num(w - m)} ${num(h - m - L)}V${num(h - m)}H${num(w - m - L)}M${num(m + L)} ${num(h - m)}H${num(m)}V${num(h - m - L)}`;
  return { body: [`<path ${strokeAttrs(c1, sw)} d="${d}"/>`] };
}

function underline({ w, h, rnd, c1, o, sw }) {
  const m = sw;
  const line = (y, from, to, tilt) => `M${num(from)} ${num(y + tilt)}L${num(to)} ${num(y - tilt)}`;
  let d;
  if (o.style === 'curve') d = smoothPath([[m, h * 0.6], [w * 0.3, h * 0.38], [w * 0.7, h * 0.55 + rnd() * h * 0.05], [w - m, h * 0.3]], false);
  else if (o.style === 'straight') d = line(h / 2, m, w - m, h * 0.12 * rnd());
  else d = `${line(sw, m, w - m, 0.5 * rnd())}${line(h - sw, w * 0.1, w * 0.9, 0.5 * rnd())}`;
  return { body: [`<path ${strokeAttrs(c1, sw)} d="${d}"/>`] };
}

function iconBase({ c1 }) {
  let grid = '';
  for (let i = 0; i <= 24; i += 1) grid += `M${i} 0V24M0 ${i}H24`;
  return {
    body: [
      '<g opacity="0.6" fill="none">',
      `  <path stroke="${c1}" stroke-width="0.1" d="${grid}"/>`,
      `  <g stroke="${c1}" stroke-width="0.25">`,
      '    <rect x="2" y="2" width="20" height="20"/>',
      '    <circle cx="12" cy="12" r="10"/>',
      '    <rect x="3" y="3" width="18" height="18"/>',
      '    <rect x="4" y="2" width="16" height="20"/>',
      '    <rect x="2" y="4" width="20" height="16"/>',
      '    <path d="M2 2L22 22M22 2L2 22M12 0V24M0 12H24"/>',
      '  </g>',
      '</g>',
    ],
  };
}

// size [w, h], stroke default (undefined: no --stroke), colors (token names), opts, build
const KINDS = {
  blob: { size: [400, 400], colors: ['primary'], opts: { points: int(3, 16, 7), irregularity: real(0, 0.8, 0.3) }, build: blob },
  wave: { size: [1200, 200], colors: ['primary'], opts: { layers: int(1, 5, 3), amplitude: real(0.1, 1, 0.5), flip: { type: 'flag' } }, build: wave },
  grid: { size: [400, 400], colors: ['neutral-300', 'border'], stroke: 1, opts: { cell: real(4, 200, 20) }, build: grid },
  dots: { size: [400, 400], colors: ['neutral-300', 'border'], opts: { cell: real(4, 200, 24), radius: real(0.5, 20, 2) }, build: dots },
  pattern: { size: [400, 300], colors: ['neutral-300', 'border'], stroke: 2, opts: { motif: oneOf(['stripes', 'chevron', 'cross', 'circles', 'triangles']), tile: real(8, 200, 24) }, build: pattern },
  rings: { size: [400, 400], colors: ['primary'], stroke: 2, opts: { count: int(2, 12, 5) }, build: rings },
  'noise-lines': { size: [400, 400], colors: ['primary'], stroke: 2, opts: { lines: int(3, 40, 12), amplitude: real(0.5, 4, 1.5) }, build: noiseLines },
  'gradient-mesh': { size: [800, 500], colors: ['primary', 'accent'], opts: { fields: int(2, 4, 3) }, build: gradientMesh },
  arrow: { size: [240, 120], colors: ['text', 'neutral-700'], stroke: 3, opts: {}, build: arrow },
  squiggle: { size: [200, 24], colors: ['accent', 'primary'], stroke: 3, opts: { waves: int(2, 20, 8), amplitude: real(0.1, 0.5, 0.3) }, build: squiggle },
  badge: { size: [200, 200], colors: ['primary', 'on-primary'], stroke: 2, opts: { points: int(5, 32, 12), inner: real(0.5, 0.95, 0.85) }, build: badge },
  frame: { size: [400, 300], colors: ['primary'], stroke: 3, opts: { style: oneOf(['brackets', 'border']), length: real(0.05, 0.4, 0.15), radius: real(0, 60, 12) }, build: frame },
  underline: { size: [200, 12], colors: ['accent', 'primary'], stroke: 3, opts: { style: oneOf(['curve', 'straight', 'double']) }, build: underline },
  'icon-base': { size: [24, 24], colors: ['neutral-300', 'border'], fixedSize: true, opts: {}, build: iconBase },
};

const COMMON_OPTS = ['dir', 'seed', 'size', 'color', 'color2', 'out', 'title', 'fixed', 'json'];

/** `gen --list`: the kinds and their options, short enough to read at a glance. */
function listKinds() {
  const rows = Object.entries(KINDS).map(([name, kind]) => {
    const opts = Object.entries(kind.opts).map(([key, spec]) => `--${key} ${spec.type === 'num' ? `${spec.min}-${spec.max}` : spec.type === 'enum' ? spec.values.join('|') : ''}`.trim());
    if (kind.stroke !== undefined) opts.push('--stroke');
    return `${name}: ${opts.join(' ') || '-'}`;
  });
  return [`svg gen <kind> [--seed n] [--size WxH] [--color t] [--color2 t] [--title s] [--fixed] [--out f]`, ...rows, ''].join('\n');
}

function parseSize(text, kind) {
  if (text === undefined) return kind.size;
  const match = /^(\d+)x(\d+)$/.exec(text);
  if (!match || [match[1], match[2]].some((v) => Number(v) < 4 || Number(v) > 4000)) throw new UsageError(`--size "${text}" must be <width>x<height>, 4 to 4000 (for example 400x300)`);
  if (kind.fixedSize) throw new UsageError(`${kind === KINDS['icon-base'] ? 'icon-base' : 'this kind'} is always ${kind.size.join('x')}: do not set --size`);
  return [Number(match[1]), Number(match[2])];
}

function readOptions(kindName, flags) {
  const kind = KINDS[kindName];
  const allowed = new Set([...COMMON_OPTS, ...Object.keys(kind.opts), ...(kind.stroke !== undefined ? ['stroke'] : [])]);
  for (const name of [...Object.keys(flags.opts), ...flags.bool]) {
    if (!allowed.has(name)) throw new UsageError(`--${name} does not apply to ${kindName} (see: ${runTool('svg.mjs', 'gen --list')})`);
  }
  const o = {};
  for (const [name, spec] of Object.entries(kind.opts)) {
    const raw = flags.opts[name];
    if (spec.type === 'flag') o[name] = flags.bool.has(name);
    else if (spec.type === 'enum') {
      if (raw !== undefined && !spec.values.includes(raw)) throw new UsageError(`--${name} "${raw}" must be one of ${spec.values.join(', ')}`);
      o[name] = raw ?? spec.def;
    } else o[name] = numberOption(name, raw, spec);
  }
  const sw = kind.stroke === undefined ? 0 : numberOption('stroke', flags.opts.stroke, real(0.5, 8, kind.stroke));
  return { o, sw };
}

function numberOption(name, raw, spec) {
  if (raw === undefined) return spec.def;
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(value) || value < spec.min || value > spec.max || (spec.int && !Number.isInteger(value))) {
    throw new UsageError(`--${name} "${raw}" must be ${spec.int ? 'a whole number' : 'a number'} from ${spec.min} to ${spec.max}`);
  }
  return value;
}

/** One complete SVG for a kind: deterministic for the same kind, options, size, seed and palette. */
function generate(kindName, flags, palette) {
  const kind = KINDS[kindName];
  const { o, sw } = readOptions(kindName, flags);
  const [w, h] = parseSize(flags.opts.size, kind);
  const seedText = flags.opts.seed ?? '1';
  if (!/^-?\d+$/.test(seedText)) throw new UsageError(`--seed "${seedText}" must be a whole number`);
  const [first, ...others] = kind.colors;
  const c1 = paintOf(palette, flags.opts.color ?? first, flags.opts.color !== undefined, others);
  const second = kind.colors.length > 1 && kind.colors[0] === 'primary' ? kind.colors[1] : null;
  const c2 = paintOf(palette, flags.opts.color2 ?? second ?? first, flags.opts.color2 !== undefined, others);
  const made = kind.build({ w, h, rnd: prng(Number(seedText)), c1, c2, o, sw, tokens: palette.ok });
  const title = flags.opts.title;
  const head = [`xmlns="http://www.w3.org/2000/svg"`, `viewBox="0 0 ${num(w)} ${num(h)}"`, ...(flags.bool.has('fixed') ? [`width="${num(w)}" height="${num(h)}"`] : []), title ? 'role="img"' : 'aria-hidden="true"'];
  const lines = [`<svg ${head.join(' ')}>`];
  if (title) lines.push(`  <title>${esc(title)}</title>`);
  if (made.defs?.length) lines.push('  <defs>', ...made.defs.map((line) => `    ${line}`), '  </defs>');
  lines.push(...made.body.map((line) => `  ${line}`), '</svg>');
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------- reading SVG as text

const TAG_RE = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^\[>]*(?:\[[\s\S]*?\])?\s*>|<!(?:ELEMENT|ENTITY|ATTLIST)[^>]*>|<(\/?)([A-Za-z_][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
const ATTR_RE = /([^\s=\/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function readAttrs(source) {
  const attrs = [];
  for (const m of source.matchAll(ATTR_RE)) attrs.push({ name: m[1], value: m[2] ?? m[3] ?? m[4] ?? '', quote: m[3] !== undefined ? "'" : '"' });
  return attrs;
}

/** Splits svg text into tokens: `{ kind: 'tag'|'text'|'comment'|'decl', ... }`. */
function tokenize(text) {
  const tokens = [];
  let last = 0;
  for (const m of text.matchAll(TAG_RE)) {
    if (m.index > last) tokens.push({ kind: 'text', raw: text.slice(last, m.index) });
    last = m.index + m[0].length;
    if (m[2] === undefined) tokens.push({ kind: m[0].startsWith('<!--') ? 'comment' : 'decl', raw: m[0] });
    else tokens.push({ kind: 'tag', raw: m[0], closing: m[1] === '/', name: m[2], attrs: readAttrs(m[3]), self: m[4] === '/' });
  }
  if (last < text.length) tokens.push({ kind: 'text', raw: text.slice(last) });
  return tokens;
}

const decode = (value) => value
  .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);?/g, (_, dec) => String.fromCodePoint(Number(dec)))
  .replace(/&(quot|amp|lt|gt|apos|colon|Tab|NewLine);/g, (_, name) => ({ quot: '"', amp: '&', lt: '<', gt: '>', apos: "'", colon: ':', Tab: '\t', NewLine: '\n' })[name]);

const attrOf = (token, name) => token.attrs.find((attr) => attr.name === name)?.value;

function declarations(css) {
  return [...css.matchAll(/([\w-]+)\s*:\s*([^;}]+)/g)].map((m) => [m[1].toLowerCase(), m[2].trim()]);
}

const COLOR_PROPS = new Set(['fill', 'stroke', 'stop-color', 'flood-color', 'color', 'lighting-color']);
const NAMED = { white: '#ffffff', black: '#000000' };
const IGNORED_COLORS = new Set(['', 'none', 'currentcolor', 'inherit', 'transparent', 'context-fill', 'context-stroke', 'initial', 'unset']);

/** A paint value as `{ key, hex?, varName? }`, or null when it is no color to judge (none, currentColor, url(#...)). */
function readColor(value) {
  const text = value.trim().toLowerCase().replace(/\s*!important$/, '');
  if (IGNORED_COLORS.has(text) || text.startsWith('url(')) return null;
  const fn = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.*))?\)$/.exec(text);
  if (fn) return { key: `var:${fn[1]}`, varName: fn[1], fallback: fn[2] ? readColor(fn[2])?.hex : undefined, label: value.trim() };
  const hex = text.startsWith('#') ? parseHex(text) : NAMED[text];
  if (hex) return { key: hex, hex, label: hex };
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(text);
  if (rgb) {
    const out = `#${[rgb[1], rgb[2], rgb[3]].map((v) => clamp(Number(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;
    return { key: out, hex: out, label: value.trim() };
  }
  return { key: text, named: true, label: value.trim() };
}

const rgbOf = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
function nearest(hex, palette) {
  const a = rgbOf(hex);
  let best = null;
  for (const [name, value] of palette.vars) {
    const b = rgbOf(value);
    const distance = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    if (!best || distance < best.distance) best = { name, value, distance };
  }
  return best;
}

const EDITOR = /^(sodipodi|inkscape|serif)(:|$)|^xmlns:(sodipodi|inkscape|serif|dc|cc|rdf|i|x|ns\d*)$|^data-name$/;

const finding = (id, severity, file, what, fix) => ({ id, severity, file, what, fix });

/** Every finding of one svg text. `palette` is the loadPalette result (or null to skip the palette check). */
export function checkSvg(text, file, palette) {
  const out = [];
  const add = (...args) => out.push(finding(args[0], args[1], file, args[2], args[3]));
  const tokens = tokenize(text);
  const tags = tokens.filter((token) => token.kind === 'tag');
  const opens = tags.filter((token) => !token.closing);
  const root = opens.find((token) => token.name.toLowerCase() === 'svg');
  if (!root) {
    add('no-root', 'high', 'there is no <svg> root element', 'start the file with <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">');
    return out;
  }
  const named = (name) => opens.filter((token) => token.name.toLowerCase() === name.toLowerCase());

  // Active content: the reason a file must not be placed.
  if (named('script').length) add('script', 'high', `<script> (${named('script').length})`, 'delete the <script> element: an image never needs code');
  const handlers = opens.flatMap((token) => token.attrs.filter((attr) => /^on[a-z]+$/i.test(attr.name)).map((attr) => `${token.name} ${attr.name}`));
  if (handlers.length) add('handler', 'high', `event handler attributes: ${[...new Set(handlers)].slice(0, 4).join(', ')}`, 'delete every on... attribute; use CSS or the page script instead');
  const jsUrl = opens.some((token) => token.attrs.some((attr) => /^javascript:/i.test(decode(attr.value).replace(/[\s\u0000-\u001f]/g, ''))));
  if (jsUrl) add('js-url', 'high', 'a javascript: url in an attribute', 'delete the link or point it to a normal url');
  const remote = [];
  for (const token of opens) {
    for (const attr of token.attrs) {
      if (/^(xlink:)?href$/.test(attr.name)) {
        const value = decode(attr.value).trim();
        if (!value.startsWith('#') && !/^data:/i.test(value)) remote.push(value);
      }
    }
  }
  const styleText = named('style').length ? tokens.filter((token) => token.kind === 'text').map((token) => token.raw).join('\n') : '';
  const allStyle = `${styleText}\n${opens.map((token) => attrOf(token, 'style') ?? '').join('\n')}`;
  for (const m of allStyle.matchAll(/@import\s+(?:url\()?['"]?([^'")\s;]+)|url\(\s*['"]?(?!#|data:)([^'")\s]+)/gi)) remote.push(m[1] ?? m[2]);
  if (remote.length) add('external', 'high', `it loads from outside the file: ${[...new Set(remote)].slice(0, 3).join(', ')}`, 'embed the shape in this file or remove the reference; only #id references are allowed');
  if (named('foreignObject').length) add('foreign-object', 'high', '<foreignObject> embeds HTML', 'redraw the content with svg shapes; put real text in the page');
  if (/<!ENTITY/i.test(text)) add('entity', 'high', 'a DOCTYPE declares entities', 'delete the DOCTYPE; svg in a page needs none');

  // Canvas.
  const viewBox = attrOf(root, 'viewBox');
  const box = viewBox ? viewBox.trim().split(/[\s,]+/).map(Number) : null;
  const validBox = box && box.length === 4 && box.every(Number.isFinite);
  if (!validBox) {
    add('viewbox', 'medium', viewBox ? `the viewBox "${viewBox}" is not four numbers` : 'there is no viewBox', 'add viewBox="0 0 <width> <height>" so the image scales');
    if (!viewBox && (attrOf(root, 'width') || attrOf(root, 'height'))) add('fixed-size', 'medium', 'fixed width/height without a viewBox: it cannot scale', 'add the viewBox, then remove width and height and size it with CSS');
  }
  const side = validBox ? Math.max(box[2], box[3]) : null;
  const isIcon = side !== null && side <= LIMITS.iconSide;
  if (isIcon && box[2] !== box[3]) add('icon-square', 'medium', `an icon canvas of ${box[2]}x${box[3]} is not square`, 'draw icons on a square viewBox such as 0 0 24 24');

  // Raster, size.
  for (const token of opens) {
    const href = attrOf(token, 'href') ?? attrOf(token, 'xlink:href') ?? '';
    if (/^data:image\/(png|jpe?g|gif|webp|avif)/i.test(href) && href.length > LIMITS.raster) {
      add('raster', 'medium', `an embedded ${Math.round(href.length / 1024)} KB raster image`, 'redraw it as vector shapes, or reference a normal image file from the page');
      break;
    }
  }
  const bytes = Buffer.byteLength(text);
  const cap = isIcon ? LIMITS.iconBytes : LIMITS.bytes;
  if (bytes > cap) add('size', 'medium', `${(bytes / 1024).toFixed(1)} KB, over the ${cap / 1024} KB limit for ${isIcon ? 'an icon' : 'an image'}`, 'run optimize, then simplify: fewer points, no hidden detail');

  // Colors, strokes.
  const colors = new Map();
  const widths = new Set();
  const caps = new Set();
  const joins = new Set();
  const take = (prop, value) => {
    if (COLOR_PROPS.has(prop)) {
      const color = readColor(value);
      if (color && !colors.has(color.key)) colors.set(color.key, color);
    } else if (prop === 'stroke-width') {
      const width = parseFloat(value);
      if (Number.isFinite(width)) widths.add(width);
    } else if (prop === 'stroke-linecap') caps.add(value.trim());
    else if (prop === 'stroke-linejoin') joins.add(value.trim());
  };
  for (const token of opens) {
    for (const attr of token.attrs) take(attr.name, decode(attr.value));
    for (const [prop, value] of declarations(attrOf(token, 'style') ?? '')) take(prop, value);
  }
  for (const [prop, value] of declarations(styleText)) take(prop, value);
  if (palette?.ok) {
    const offenders = [...colors.values()].filter((color) => (color.varName ? !palette.vars.has(color.varName) : color.hex ? !palette.hexes.has(color.hex) : true));
    for (const color of offenders.slice(0, 8)) {
      const close = color.hex ? nearest(color.hex, palette) : color.fallback ? nearest(color.fallback, palette) : null;
      add('palette', 'medium', `${color.label} is not in ${TOKENS_FILE}`, close ? `use var(${close.name}, ${close.value}) (the nearest token)` : 'use var(--color-<token>, #hex) with a token of design-tokens.json');
    }
    if (offenders.length > 8) add('palette', 'medium', `${offenders.length - 8} more colors are not in ${TOKENS_FILE}`, 'replace each with a token');
  }
  if (colors.size > LIMITS.colors) add('many-colors', 'medium', `${colors.size} different colors (limit ${LIMITS.colors})`, 'keep 2 or 3 colors from the tokens plus one neutral');
  if (widths.size > LIMITS.widths) add('stroke-widths', 'medium', `${widths.size} different stroke widths (${[...widths].join(', ')})`, 'use one stroke width for the whole drawing (2 on a 24 canvas)');
  if (caps.size > 1 || joins.size > 1) add('stroke-caps', 'low', `mixed stroke-linecap (${[...caps].join(', ') || 'none'}) or stroke-linejoin (${[...joins].join(', ') || 'none'})`, 'use stroke-linecap="round" and stroke-linejoin="round" everywhere');

  // Decimals, filters.
  const longNumber = opens.flatMap((token) => token.attrs.map((attr) => attr.value)).concat(styleText).find((value) => /\d\.\d{3,}/.test(value));
  if (longNumber) add('decimals', 'low', `coordinates with more than ${LIMITS.decimals} decimals ("${longNumber.match(/\d*\.\d{3,}/)[0]}")`, 'run optimize: it rounds every number to 2 decimals');
  let inFilter = 0;
  let primitives = 0;
  for (const token of tags) {
    if (token.name.toLowerCase() === 'filter') {
      if (token.closing) {
        if (primitives > LIMITS.filter) add('filter', 'medium', `a filter chains ${primitives} primitives (limit ${LIMITS.filter})`, 'drop the filter or keep one feGaussianBlur; a heavy filter slows paint');
        inFilter = 0;
      } else if (!token.self) [inFilter, primitives] = [1, 0];
    } else if (inFilter && !token.closing && /^fe[A-Z]/.test(token.name)) primitives += 1;
  }

  // Accessibility.
  const hidden = attrOf(root, 'aria-hidden') === 'true';
  const titled = /<title\b[^>]*>\s*\S[\s\S]*?<\/title>/i.test(text) || Boolean(attrOf(root, 'aria-label'));
  if (!hidden && !(attrOf(root, 'role') === 'img' && titled)) {
    add('a11y', 'medium', attrOf(root, 'role') === 'img' ? 'role="img" has no <title>' : 'it is neither hidden nor labelled', 'decoration: aria-hidden="true" on <svg>; meaningful: role="img" plus <title>text</title> as its first child');
  }

  // Editor leftovers.
  const editor = [...new Set(tags.flatMap((token) => [token.name, ...token.attrs.map((attr) => attr.name)]).filter((name) => EDITOR.test(name)))];
  if (editor.length) add('leftover-editor', 'low', `editor data: ${editor.slice(0, 4).join(', ')}`, 'run optimize to remove it');
  if (tokens.some((token) => token.kind === 'comment')) add('leftover-comment', 'low', 'comments in the file', 'run optimize to remove them');
  if (named('metadata').length) add('leftover-metadata', 'low', '<metadata> block', 'run optimize to remove it');
  if (/<(g|defs)\b[^>]*\/>|<(g|defs)\b[^>]*>\s*<\/(g|defs)>/i.test(text)) add('leftover-group', 'low', 'an empty <g> or <defs>', 'run optimize to remove it');
  const referenced = unreferencedIds(text, opens);
  if (referenced.length) add('leftover-id', 'low', `ids nobody uses: ${referenced.slice(0, 4).join(', ')}`, 'run optimize to remove them');
  if (/xmlns:xlink=/.test(text) && !opens.some((token) => token.attrs.some((attr) => attr.name.startsWith('xlink:')))) add('leftover-xlink', 'low', 'xmlns:xlink is declared and never used', 'run optimize to remove it');
  return out;
}

/** The ids no `#id`, `url(#id)` or aria-labelledby/describedby points to. */
function unreferencedIds(text, opens) {
  const used = new Set();
  for (const m of text.matchAll(/#([\w.:-]+)/g)) used.add(m[1]);
  for (const token of opens) for (const name of ['aria-labelledby', 'aria-describedby']) for (const id of (attrOf(token, name) ?? '').split(/\s+/)) used.add(id);
  return opens.filter((token) => token.name !== 'symbol').map((token) => attrOf(token, 'id')).filter((id) => id && !used.has(id));
}

// ---------------------------------------------------------------- optimize

const TEXTISH = new Set(['text', 'tspan', 'title', 'desc', 'style']);
const roundLong = (value) => value.replace(/-?\d*\.\d{3,}/g, (m) => num(Number(m)));
const KEEP_AS_IS = /^(id|class|href|xlink:href|aria-label|aria-labelledby|aria-describedby|xmlns.*)$/;

/** Safe clean-up of svg text. It never touches geometry beyond rounding to 2 decimals; it refuses a <script>. */
export function optimizeSvg(text) {
  if (/<script\b/i.test(text)) throw new Refusal('the file has a <script>: remove it by hand first; optimize will not touch active content');
  let tokens = tokenize(text).filter((token) => token.kind !== 'comment' && token.kind !== 'decl');

  // Drop metadata and editor elements with everything inside them.
  const kept = [];
  let skipDepth = 0;
  let skipName = '';
  for (const token of tokens) {
    if (skipDepth) {
      if (token.kind === 'tag' && token.name === skipName && !token.self) skipDepth += token.closing ? -1 : 1;
      continue;
    }
    if (token.kind === 'tag' && !token.closing && (token.name.toLowerCase() === 'metadata' || /^(sodipodi|inkscape):/.test(token.name))) {
      if (!token.self) [skipDepth, skipName] = [1, token.name];
      continue;
    }
    kept.push(token);
  }
  tokens = kept;

  // Attributes: no editor data, rounded numbers, collapsed spaces.
  for (const token of tokens) {
    if (token.kind !== 'tag' || token.closing) continue;
    token.attrs = token.attrs.filter((attr) => !EDITOR.test(attr.name));
    for (const attr of token.attrs) {
      if (KEEP_AS_IS.test(attr.name)) continue;
      attr.value = roundLong(attr.value).replace(/\s+/g, ' ').trim();
    }
  }

  // Empty groups, again until none is left.
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token.kind !== 'tag' || token.closing || !['g', 'defs'].includes(token.name)) continue;
      if (token.self) {
        tokens.splice(i, 1);
        changed = true;
        break;
      }
      let j = i + 1;
      while (tokens[j]?.kind === 'text' && !tokens[j].raw.trim()) j += 1;
      if (tokens[j]?.kind === 'tag' && tokens[j].closing && tokens[j].name === token.name) {
        tokens.splice(i, j - i + 1);
        changed = true;
        break;
      }
    }
  }

  // Ids nobody uses, and xmlns:xlink when nothing uses it.
  const probe = tokens.map((token) => (token.kind === 'tag' ? [token.raw, ...token.attrs.map((attr) => attr.value)].join(' ') : token.raw)).join('\n');
  const opens = tokens.filter((token) => token.kind === 'tag' && !token.closing);
  const unused = new Set(unreferencedIds(probe.replace(/\sid="[^"]*"/g, ''), opens));
  const xlinkUsed = opens.some((token) => token.attrs.some((attr) => attr.name.startsWith('xlink:')));
  for (const token of opens) {
    token.attrs = token.attrs.filter((attr) => !(attr.name === 'id' && unused.has(attr.value)) && !(attr.name === 'xmlns:xlink' && !xlinkUsed));
  }

  // Write it back: one tag per line, text kept, whitespace collapsed.
  let out = '';
  let depthText = 0;
  let previousTag = false;
  for (const token of tokens) {
    if (token.kind === 'text') {
      const value = token.raw.replace(/\s+/g, ' ');
      if (depthText) out += value.trim() === '' ? ' ' : value;
      else if (value.trim()) out += value.trim();
      previousTag = false;
      continue;
    }
    if (previousTag && !depthText) out += '\n';
    const attrs = token.closing ? '' : token.attrs.map((attr) => ` ${attr.name}=${attr.quote}${attr.value}${attr.quote}`).join('');
    out += token.closing ? `</${token.name}>` : `<${token.name}${attrs}${token.self ? '/' : ''}>`;
    if (TEXTISH.has(token.name.toLowerCase()) && !token.self) depthText += token.closing ? -1 : 1;
    depthText = Math.max(0, depthText);
    previousTag = true;
  }
  return `${out.trim()}\n`;
}

// ---------------------------------------------------------------- sprite

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'icon';
const SYMBOL_ATTRS = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'fill-rule', 'clip-rule', 'opacity', 'color'];

/** One <svg> with a <symbol> per icon file, in file-name order. Returns `{ svg, ids }`. */
export function buildSprite(files) {
  const symbols = [];
  const seen = new Map();
  for (const { name, text } of files) {
    const id = slug(name.replace(/\.svg$/i, ''));
    if (seen.has(id)) throw new UsageError(`${seen.get(id)} and ${name} both make the id "${id}": rename one`);
    seen.set(id, name);
    const clean = optimizeSvg(text);
    const root = tokenize(clean).find((token) => token.kind === 'tag' && !token.closing && token.name === 'svg');
    const viewBox = root && attrOf(root, 'viewBox');
    if (!viewBox) throw new UsageError(`${name} has no viewBox: add one first (run ${runTool('svg.mjs', `check ${name}`)})`);
    let inner = clean.slice(clean.indexOf('>', clean.indexOf('<svg')) + 1, clean.lastIndexOf('</svg>')).trim();
    if (root.self) inner = '';
    for (const own of [...inner.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])) {
      inner = inner.replaceAll(`id="${own}"`, `id="${id}-${own}"`).replaceAll(`#${own})`, `#${id}-${own})`).replaceAll(`"#${own}"`, `"#${id}-${own}"`).replaceAll(`'#${own}')`, `'#${id}-${own}')`);
    }
    const carried = root.attrs.filter((attr) => SYMBOL_ATTRS.includes(attr.name)).map((attr) => ` ${attr.name}="${attr.value}"`).join('');
    const body = carried ? `<g${carried}>\n${inner}\n</g>` : inner;
    symbols.push(`<symbol id="${id}" viewBox="${viewBox}">\n${body}\n</symbol>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0 0" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">\n${symbols.join('\n')}\n</svg>\n`;
  return { svg, ids: [...seen.keys()] };
}

// ---------------------------------------------------------------- command line

const USAGE = `svg — draws, checks and cleans SVG (reads files as text; never runs or fetches anything)

Usage:
  node ${toolPath('svg.mjs')} gen <kind> [--seed <n>] [--size <w>x<h>] [--color <token>] [--color2 <token>] [--title "<text>"] [--fixed] [--out <file>] [kind options]
  node ${toolPath('svg.mjs')} gen --list
  node ${toolPath('svg.mjs')} check <file.svg|dir> ... [--strict] [--json]
  node ${toolPath('svg.mjs')} optimize <file.svg> [--out <file>]
  node ${toolPath('svg.mjs')} sprite <dir> [--out <file>]

  gen       deterministic: the same arguments give the same bytes. Colors are design-tokens.json tokens
            (var(--color-x, #hex)); without that file they are currentColor. No --out: the svg goes to stdout.
  check     numbered findings with a fix; exit 1 on a high finding, and with --strict on a medium one
  optimize  safe clean-up (editor data, comments, empty groups, unused ids, 2 decimals); refuses a <script>; no --out rewrites the file
  sprite    one <svg> with a <symbol id="<file-name>"> per icon, and the <use href="#id"/> line
  --dir     the project (default: AI_FRONTEND_PROJECT, then the folder that holds the kit); paths are relative to it
  --json    print the data instead of the text
`;

const VALUE_OPTS = new Set(['dir', 'seed', 'size', 'color', 'color2', 'out', 'title', 'stroke', ...Object.values(KINDS).flatMap((kind) => Object.entries(kind.opts).filter(([, spec]) => spec.type !== 'flag').map(([name]) => name))]);
const BOOL_OPTS = new Set(['json', 'strict', 'fixed', 'flip', 'list', 'help']);

function parseArgs(argv) {
  const flags = { _: [], opts: {}, bool: new Set() };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const eq = token.startsWith('--') ? token.indexOf('=') : -1;
    const name = (eq === -1 ? token : token.slice(0, eq)).replace(/^--/, '');
    if (token === '-h') flags.bool.add('help');
    else if (token.startsWith('--') && VALUE_OPTS.has(name)) {
      const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
      if (value === undefined || (eq === -1 && value.startsWith('--'))) throw new UsageError(`option --${name} needs a value`);
      flags.opts[name] = value;
      if (eq === -1) i += 1;
    } else if (token.startsWith('--') && eq === -1 && BOOL_OPTS.has(name)) flags.bool.add(name);
    else if (token.startsWith('-') && token.length > 1) throw new UsageError(`unknown option "${token}"`);
    else flags._.push(token);
  }
  return flags;
}

function collect(path, out, top = true) {
  const info = statSync(path);
  if (info.isFile()) return void ((top || extname(path).toLowerCase() === '.svg') && out.push(path));
  for (const name of readdirSync(path).sort()) {
    if (SKIP.has(name) && !top) continue;
    const child = join(path, name);
    if (statSync(child).isDirectory()) collect(child, out, false);
    else if (extname(name).toLowerCase() === '.svg') out.push(child);
  }
}

const writeOut = (root, file, text) => {
  const target = resolve(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
  return slash(relative(root, target)) || file;
};

const needsFile = (root, name) => {
  const path = resolve(root, name);
  if (!existsSync(path)) throw new UsageError(`${name} does not exist`);
  return path;
};

function cmdGen(flags, root) {
  if (flags.bool.has('list')) return process.stdout.write(listKinds());
  const kind = flags._[1];
  if (!kind) throw new UsageError(`gen needs a kind: ${Object.keys(KINDS).join(', ')}`);
  if (!KINDS[kind]) throw new UsageError(`unknown kind "${kind}" (kinds: ${Object.keys(KINDS).join(', ')})`);
  const palette = loadPalette(root);
  const svg = generate(kind, flags, palette);
  const note = palette.ok ? null : palette.note;
  if (flags.opts.out) {
    const file = writeOut(root, flags.opts.out, svg);
    if (flags.bool.has('json')) console.log(JSON.stringify({ kind, file, bytes: Buffer.byteLength(svg), note }, null, 2));
    else console.log(`svg: wrote ${file} (${kind}, ${Buffer.byteLength(svg)} bytes). Check it: ${runTool('svg.mjs', `check ${file} --strict`, root)}${note ? `\nnote: ${note}` : ''}`);
  } else if (flags.bool.has('json')) console.log(JSON.stringify({ kind, svg, note }, null, 2));
  else {
    process.stdout.write(svg);
    if (note) console.error(`note: ${note}`);
  }
}

function cmdCheck(flags, root) {
  const given = flags._.slice(1);
  const targets = given.length ? given : DEFAULT_TARGETS.filter((name) => existsSync(join(root, name)));
  if (!targets.length) throw new UsageError(`check needs a .svg file or a folder (for example: ${runTool('svg.mjs', 'check public', root)})`);
  const files = [];
  for (const target of targets) collect(needsFile(root, target), files);
  const palette = loadPalette(root);
  const where = (file) => (relative(root, file).startsWith('..') ? slash(file) : slash(relative(root, file)));
  const list = files.flatMap((file) => checkSvg(readFileSync(file, 'utf8'), where(file), palette));
  const order = (f) => SEVERITIES.indexOf(f.severity);
  const findings = list.map((f, index) => ({ f, index })).sort((a, b) => order(a.f) - order(b.f) || a.index - b.index).map(({ f }, index) => ({ n: index + 1, ...f }));
  const counts = Object.fromEntries(SEVERITIES.map((severity) => [severity, findings.filter((f) => f.severity === severity).length]));
  const skipped = palette.ok ? [] : [`palette not checked: ${palette.note.replace(/: colors are currentColor/, '')}`];
  const summary = `Summary: ${counts.high} high, ${counts.medium} medium, ${counts.low} low. ${skipped.length ? `${skipped.join('. ')}.` : 'Nothing skipped.'}`;
  if (flags.bool.has('json')) console.log(JSON.stringify({ scanned: files.length, tokens: palette.ok, counts, skipped, findings, summary }, null, 2));
  else {
    console.log(`svg check: scanned ${files.length} file${files.length === 1 ? '' : 's'}`);
    for (const f of findings) console.log(`${f.n}. [${f.severity}] ${f.id} — ${f.file} — ${f.what} → ${f.fix}`);
    console.log(summary);
  }
  if (counts.high > 0 || (flags.bool.has('strict') && counts.medium > 0)) process.exitCode = 1;
}

function cmdOptimize(flags, root) {
  const name = flags._[1];
  if (!name) throw new UsageError('optimize needs one .svg file');
  const path = needsFile(root, name);
  const before = readFileSync(path, 'utf8');
  const after = optimizeSvg(before);
  const file = writeOut(root, flags.opts.out ?? name, after);
  const left = checkSvg(after, file, null).filter((f) => f.severity !== 'low' || f.id === 'decimals');
  console.log(`svg: optimized ${file} (${Buffer.byteLength(before)} -> ${Buffer.byteLength(after)} bytes)`);
  console.log(left.length ? `Still to fix by hand: ${left.map((f) => f.id).join(', ')}. Run: ${runTool('svg.mjs', `check ${file}`, root)}` : `Next: ${runTool('svg.mjs', `check ${file} --strict`, root)}`);
}

function cmdSprite(flags, root) {
  const name = flags._[1];
  if (!name) throw new UsageError('sprite needs a folder of .svg files');
  const dir = needsFile(root, name);
  if (!statSync(dir).isDirectory()) throw new UsageError(`${name} is not a folder`);
  const names = readdirSync(dir).filter((file) => extname(file).toLowerCase() === '.svg').sort();
  if (!names.length) throw new UsageError(`${name} has no .svg files`);
  const { svg, ids } = buildSprite(names.map((file) => ({ name: file, text: readFileSync(join(dir, file), 'utf8') })));
  const use = `<svg width="24" height="24" aria-hidden="true"><use href="#${ids[0]}"/></svg>`;
  if (flags.opts.out) {
    const file = writeOut(root, flags.opts.out, svg);
    console.log(`svg: wrote ${file} with ${ids.length} symbols: ${ids.join(', ')}\nUse: ${use}`);
  } else {
    process.stdout.write(svg);
    console.error(`symbols: ${ids.join(', ')}\nUse: ${use}`);
  }
}

function main() {
  let flags;
  try {
    flags = parseArgs(process.argv.slice(2));
    if (flags.bool.has('help')) return console.log(USAGE);
    const command = flags._[0];
    if (!command) throw new UsageError('give a command: gen, check, optimize or sprite');
    const root = flags.opts.dir ? resolve(flags.opts.dir) : process.env.AI_FRONTEND_PROJECT ? resolve(process.env.AI_FRONTEND_PROJECT) : dirname(KIT_DIR);
    const commands = { gen: cmdGen, check: cmdCheck, optimize: cmdOptimize, sprite: cmdSprite };
    if (!commands[command]) throw new UsageError(`unknown command "${command}"`);
    commands[command](flags, root);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`svg: ${error.message}\n\n${USAGE}`);
      process.exitCode = 2;
    } else if (error instanceof Refusal) {
      console.error(`svg: ${error.message}`);
      process.exitCode = 1;
    } else throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) main();
