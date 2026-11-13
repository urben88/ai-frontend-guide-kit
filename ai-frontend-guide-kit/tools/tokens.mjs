#!/usr/bin/env node
/**
 * tokens — the design tokens of a project as data: `design-tokens.json` (W3C Design Tokens format) in
 * the project root, next to DESIGN.md. No dependencies.
 *
 * The model only chooses a few values (colors, fonts, radius, density, type ratio, motion). This tool
 * computes the rest: tonal ramps, semantic colors with text that passes WCAG contrast, the type scale,
 * spacing, radii, motion, breakpoints. It then checks the file, prints the Tailwind v4 theme and keeps
 * the token tables of DESIGN.md. The same input always writes the same bytes.
 *
 * Other tools import the pure functions: contrastRatio, ramp, typeScale, resolveTokens, loadTokens,
 * toCss (and validateTokens, buildTokens, docBlock).
 *
 * Project root: --dir, then AI_FRONTEND_PROJECT, then the folder that holds the kit.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const KIT_DIR = resolve(dirname(SELF), '..');
const TOKENS_FILE = 'design-tokens.json';
const DOC_START = '<!-- tokens:start -->';
const DOC_END = '<!-- tokens:end -->';

class UsageError extends Error {}
class Refusal extends Error {}

// ---------------------------------------------------------------- color math (sRGB, WCAG, OKLCH)

/** A color as "#rrggbb" (lowercase) from "#rgb", "#rrggbb" or the same without "#"; null when it is not a color. */
export function parseHex(value) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(typeof value === 'string' ? value.trim() : '');
  if (!match) return null;
  const hex = match[1].toLowerCase();
  return `#${hex.length === 3 ? [...hex].map((char) => char + char).join('') : hex}`;
}

const toRgb = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
const toHex = (rgb) => `#${rgb.map((value) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0')).join('')}`;
const linear = (value) => (value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4);
const gamma = (value) => (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055);

const luminance = (hex) => {
  const [r, g, b] = toRgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** The WCAG contrast ratio (1 to 21) of two "#rrggbb" colors; NaN when one is not a color. */
export function contrastRatio(foreground, background) {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return NaN;
  const [a, b] = [luminance(fg), luminance(bg)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** A ratio as text without rounding it up: 4.499 is "4.49", never "4.5". */
export const showRatio = (ratio) => `${Math.floor(ratio * 100 + 1e-9) / 100}:1`;

function toOklch(hex) {
  const [r, g, b] = toRgb(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const c = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L: lightness, C: Math.hypot(a, c), h: ((Math.atan2(c, a) * 180) / Math.PI + 360) % 360 };
}

function oklchToLinear(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

/** A color from OKLCH; a chroma outside the sRGB gamut is reduced until the color fits. */
function fromOklch(L, C, h) {
  const fits = (rgb) => rgb.every((value) => value >= -0.0001 && value <= 1.0001);
  let chroma = C;
  if (!fits(oklchToLinear(L, chroma, h))) {
    let [low, high] = [0, C];
    for (let i = 0; i < 24; i += 1) {
      const mid = (low + high) / 2;
      if (fits(oklchToLinear(L, mid, h))) low = mid;
      else high = mid;
    }
    chroma = low;
  }
  return toHex(oklchToLinear(L, chroma, h).map((value) => gamma(Math.min(1, Math.max(0, value))) * 255));
}

export const RAMP_STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const RAMP_LIGHTNESS = [0.975, 0.95, 0.9, 0.83, 0.74, 0.65, 0.56, 0.47, 0.39, 0.31, 0.22];
const RAMP_CHROMA = [0.1, 0.2, 0.4, 0.65, 0.85, 1, 1, 0.9, 0.75, 0.6, 0.45];

/** The 11 steps (50 to 950) of a hue and chroma, light to dark. */
function toneRamp(hue, chroma) {
  return Object.fromEntries(RAMP_STEPS.map((step, at) => [step, fromOklch(RAMP_LIGHTNESS[at], chroma * RAMP_CHROMA[at], hue)]));
}

/** The tonal ramp of a color: steps 50 to 950, same hue, and the step nearest in lightness is the color itself. */
export function ramp(hex) {
  const color = parseHex(hex);
  if (!color) throw new Error(`"${hex}" is not a hex color`);
  const base = toOklch(color);
  const steps = toneRamp(base.h, base.C);
  const nearest = RAMP_LIGHTNESS.reduce((best, value, at) => (Math.abs(value - base.L) < Math.abs(RAMP_LIGHTNESS[best] - base.L) ? at : best), 0);
  steps[RAMP_STEPS[nearest]] = color;
  return steps;
}

// ---------------------------------------------------------------- scales

const TYPE_NAMES = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
const round = (value, digits) => Math.round(value * 10 ** digits) / 10 ** digits;

/** The modular type scale: xs to 5xl from a base size in px, with a unitless line height each (tighter as the size grows). */
export function typeScale(ratio = 1.25, base = 16) {
  return TYPE_NAMES.map((name, at) => {
    const step = at - 2;
    const px = base * ratio ** step;
    const rem = round(Math.max(px, name === 'xs' ? 12 : name === 'sm' ? 14 : 0) / 16, 3);
    return { name, rem, px: round(rem * 16, 1), lineHeight: rem <= 1.125 ? 1.6 : rem <= 1.5 ? 1.4 : rem <= 2.5 ? 1.25 : 1.1 };
  });
}

const SPACING = [1, 2, 3, 4, 6, 8, 12, 16];
const RADIUS = { none: [0, 0, 0], small: [2, 4, 6], medium: [4, 8, 12], large: [8, 16, 24] };
const DENSITY = { compact: { control: 40, gutter: 16, section: 32, sectionLg: 48 }, regular: { control: 44, gutter: 24, section: 48, sectionLg: 64 }, spacious: { control: 48, gutter: 32, section: 64, sectionLg: 96 } };
const MOTION = {
  calm: { fast: 150, base: 250, slow: 400, standard: [0.4, 0, 0.2, 1], enter: [0, 0, 0.2, 1], exit: [0.4, 0, 1, 1] },
  snappy: { fast: 100, base: 160, slow: 240, standard: [0.2, 0, 0, 1], enter: [0.05, 0.7, 0.1, 1], exit: [0.3, 0, 0.8, 0.15] },
  playful: { fast: 150, base: 250, slow: 450, standard: [0.4, 0, 0.2, 1], enter: [0.34, 1.56, 0.64, 1], exit: [0.4, 0, 1, 1] },
};
const BREAKPOINTS = { sm: '40rem', md: '48rem', lg: '64rem', xl: '80rem', '2xl': '96rem' };

export const CHOICES = {
  radius: Object.keys(RADIUS),
  density: Object.keys(DENSITY),
  'type-ratio': ['1.2', '1.25', '1.333'],
  motion: Object.keys(MOTION),
};
const DEFAULTS = { primary: '#2563eb', 'font-display': 'Inter', 'font-body': 'Inter', radius: 'medium', density: 'regular', 'type-ratio': '1.25', motion: 'calm' };

// ---------------------------------------------------------------- build the file from a few choices

const colorRef = (name, step) => `{color.ramp.${name}.${step}}`;
const FONT_FALLBACK = ['ui-sans-serif', 'system-ui', 'sans-serif'];

/** The best step of a ramp on all backgrounds: the first of `order` that reaches `min`, else the one with the highest ratio. */
function pickStep(steps, order, backgrounds, min) {
  const worst = (step) => Math.min(...backgrounds.map((bg) => contrastRatio(steps[step], bg)));
  return order.find((step) => worst(step) >= min) ?? order.reduce((best, step) => (worst(step) > worst(best) ? step : best), order[0]);
}

/** The whole token tree from the choices; `options` holds normalized values (see `init`). Deterministic. */
export function buildTokens(options) {
  const choices = { ...DEFAULTS, ...options };
  const primaryHex = parseHex(choices.primary);
  const primary = ramp(primaryHex);
  const primaryAt = RAMP_STEPS.find((step) => primary[step] === primaryHex);
  const base = toOklch(primaryHex);
  const accentHex = parseHex(choices.accent ?? '') ?? fromOklch(Math.min(Math.max(base.L, 0.5), 0.7), Math.max(base.C, 0.12), (base.h + 150) % 360);
  const accent = ramp(accentHex);
  const accentAt = RAMP_STEPS.find((step) => accent[step] === accentHex);
  const neutralHex = parseHex(choices.neutral ?? '');
  const neutralBase = neutralHex ? toOklch(neutralHex) : { h: base.h, C: 0.012 };
  const neutral = toneRamp(neutralBase.h, Math.min(neutralBase.C, 0.05));
  const ramps = { primary, accent, neutral, danger: toneRamp(25, 0.19), success: toneRamp(145, 0.15), warning: toneRamp(75, 0.15) };

  const light = { surface: neutral['50'], raised: '#ffffff' };
  const dark = { surface: neutral['950'], raised: neutral['900'] };
  const on = (background) => {
    const best = [neutral['50'], neutral['950']].reduce((a, b) => (contrastRatio(a, background) >= contrastRatio(b, background) ? a : b));
    if (contrastRatio(best, background) >= 4.5) return best === neutral['50'] ? colorRef('neutral', '50') : colorRef('neutral', '950');
    return contrastRatio('#ffffff', background) >= contrastRatio('#000000', background) ? '#ffffff' : '#000000';
  };
  const token = (value, description) => ({ $value: value, $description: description });
  const status = (order, backgrounds) => ({
    danger: token(colorRef('danger', pickStep(ramps.danger, order, backgrounds, 4.5)), 'Errors and destructive actions, as text on the surface.'),
    success: token(colorRef('success', pickStep(ramps.success, order, backgrounds, 4.5)), 'Success messages, as text on the surface.'),
    warning: token(colorRef('warning', pickStep(ramps.warning, order, backgrounds, 4.5)), 'Warnings, as text on the surface.'),
  });
  const lightBgs = [light.surface, light.raised];
  const darkBgs = [dark.surface, dark.raised];
  const semantic = {
    primary: token(colorRef('primary', primaryAt), 'Brand color: main actions.'),
    'on-primary': token(on(primaryHex), 'Text and icons on primary.'),
    accent: token(colorRef('accent', accentAt), 'Second brand color: highlights.'),
    'on-accent': token(on(accentHex), 'Text and icons on accent.'),
    surface: token(colorRef('neutral', '50'), 'Page background.'),
    'surface-raised': token('#ffffff', 'Cards and panels above the page.'),
    text: token(colorRef('neutral', pickStep(neutral, ['900', '950', '800'], lightBgs, 7)), 'Body text on the surface.'),
    'text-muted': token(colorRef('neutral', pickStep(neutral, ['600', '700', '800', '900'], lightBgs, 4.5)), 'Secondary text.'),
    border: token(colorRef('neutral', '200'), 'Dividers and outlines.'),
    focus: token(colorRef('primary', pickStep(primary, ['600', '500', '700', '400', '800', '300'], lightBgs, 3)), 'Keyboard focus ring.'),
    ...status(['600', '700', '500', '800', '400', '900', '300'], lightBgs),
  };
  const night = {
    surface: token(colorRef('neutral', '950'), 'Page background in dark mode.'),
    'surface-raised': token(colorRef('neutral', '900'), 'Cards and panels in dark mode.'),
    text: token(colorRef('neutral', pickStep(neutral, ['50', '100', '200'], darkBgs, 7)), 'Body text in dark mode.'),
    'text-muted': token(colorRef('neutral', pickStep(neutral, ['400', '300', '200', '100'], darkBgs, 4.5)), 'Secondary text in dark mode.'),
    border: token(colorRef('neutral', '800'), 'Dividers and outlines in dark mode.'),
    focus: token(colorRef('primary', pickStep(primary, ['400', '300', '500', '200', '600'], darkBgs, 3)), 'Keyboard focus ring in dark mode.'),
    ...status(['400', '300', '500', '200', '600', '100'], darkBgs),
  };

  const families = (name) => ({ $value: [name, ...FONT_FALLBACK] });
  const scale = typeScale(Number(choices['type-ratio']));
  const density = DENSITY[choices.density];
  const radius = RADIUS[choices.radius];
  const motion = MOTION[choices.motion];
  const px = (value) => `${value}px`;
  const bezier = (value) => ({ $value: value });
  const pairs = (names, prefix, tokensOf) => names.flatMap(([foreground, background, min, use]) => {
    const ref = (name) => (name.startsWith('#') ? name : `{${prefix}${name}}`);
    return tokensOf(foreground) && tokensOf(background) ? [{ foreground: ref(foreground), background: ref(background), min, use }] : [];
  });
  const PAIRS = [['on-primary', 'primary', 4.5, 'text on the primary button'], ['on-accent', 'accent', 4.5, 'text on the accent'], ['text', 'surface', 4.5, 'body text'], ['text', 'surface-raised', 4.5, 'body text on cards'], ['text-muted', 'surface', 4.5, 'secondary text'], ['text-muted', 'surface-raised', 4.5, 'secondary text on cards'], ['danger', 'surface', 4.5, 'error text'], ['success', 'surface', 4.5, 'success text'], ['warning', 'surface', 4.5, 'warning text'], ['focus', 'surface', 3, 'focus ring']];
  const contrast = [
    ...pairs(PAIRS, 'color.', (name) => name in semantic),
    ...(choices.dark ? pairs(PAIRS.filter(([fg, bg]) => fg in night && bg in night), 'color.dark.', (name) => name in night) : []),
  ];
  const data = {
    $description: 'Design tokens in the W3C Design Tokens format. Written by tokens.mjs init; edit a value, then run check, css and doc.',
    color: {
      $type: 'color',
      ramp: Object.fromEntries(Object.entries(ramps).map(([name, steps]) => [name, Object.fromEntries(Object.entries(steps).map(([step, hex]) => [step, { $value: hex }]))])),
      ...semantic,
      ...(choices.dark ? { dark: night } : {}),
    },
    font: { $type: 'fontFamily', display: families(choices['font-display']), body: families(choices['font-body']) },
    'font-size': { $type: 'dimension', ...Object.fromEntries(scale.map((entry) => [entry.name, { $value: `${entry.rem}rem` }])) },
    'line-height': { $type: 'number', ...Object.fromEntries(scale.map((entry) => [entry.name, { $value: entry.lineHeight }])) },
    spacing: {
      $type: 'dimension',
      ...Object.fromEntries(SPACING.map((n) => [String(n), { $value: px(n * 4) }])),
      control: { $value: px(density.control), $description: 'Height of buttons and inputs.' },
      gutter: { $value: px(density.gutter), $description: 'Space between neighbouring blocks.' },
      section: { $value: px(density.section), $description: 'Vertical padding of a page section below the md breakpoint.' },
      'section-lg': { $value: px(density.sectionLg), $description: 'Vertical padding of a page section from the md breakpoint up.' },
    },
    radius: { $type: 'dimension', sm: { $value: px(radius[0]) }, md: { $value: px(radius[1]) }, lg: { $value: px(radius[2]) }, full: { $value: '9999px' } },
    duration: { $type: 'duration', fast: { $value: `${motion.fast}ms` }, base: { $value: `${motion.base}ms` }, slow: { $value: `${motion.slow}ms` } },
    easing: { $type: 'cubicBezier', standard: bezier(motion.standard), enter: bezier(motion.enter), exit: bezier(motion.exit) },
    breakpoint: { $type: 'dimension', ...Object.fromEntries(Object.entries(BREAKPOINTS).map(([name, value]) => [name, { $value: value }])) },
    container: { $type: 'dimension', page: { $value: '72rem', $description: 'Maximum width of the page content.' }, prose: { $value: '42rem', $description: 'Maximum width of running text.' }, form: { $value: '28rem', $description: 'Maximum width of a single-column form.' } },
    $extensions: {
      kit: {
        choices: { primary: primaryHex, accent: accentHex, neutral: neutralHex ?? 'from the primary hue', 'font-display': choices['font-display'], 'font-body': choices['font-body'], radius: choices.radius, density: choices.density, 'type-ratio': choices['type-ratio'], motion: choices.motion, dark: Boolean(choices.dark) },
        contrast,
      },
    },
  };
  return data;
}

// ---------------------------------------------------------------- read, resolve and validate

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const REFERENCE = /^\{([^{}]+)\}$/;

/**
 * Every token of a tree with its type, raw and resolved value: `{ tokens: { "color.primary": { path, type, raw, value, description } }, errors }`.
 * A group may set `$type` for its tokens; `{group.token}` references are followed; a missing target or a loop is an error.
 */
export function resolveTokens(data) {
  const raw = {};
  const errors = [];
  const walk = (node, path, inherited) => {
    const type = typeof node.$type === 'string' ? node.$type : inherited;
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      const here = [...path, key];
      if (!isObject(child)) errors.push(`${here.join('.')}: not a token or a group (a token is an object with "$value")`);
      else if ('$value' in child) raw[here.join('.')] = { type: typeof child.$type === 'string' ? child.$type : type, raw: child.$value, description: child.$description };
      else walk(child, here, type);
    }
  };
  if (isObject(data)) walk(data, [], undefined);
  const cache = new Map();
  const lookup = (name, trail) => {
    if (cache.has(name)) return cache.get(name);
    if (!(name in raw)) return { error: `the reference {${name}} does not exist` };
    if (trail.includes(name)) return { error: `the references loop: ${[...trail, name].join(' -> ')}` };
    const match = typeof raw[name].raw === 'string' ? REFERENCE.exec(raw[name].raw.trim()) : null;
    let result = { value: raw[name].raw, type: raw[name].type };
    if (match) {
      const inner = lookup(match[1], [...trail, name]);
      result = inner.error ? inner : { value: inner.value, type: raw[name].type ?? inner.type };
    }
    cache.set(name, result);
    return result;
  };
  const tokens = {};
  for (const [path, token] of Object.entries(raw)) {
    const found = lookup(path, []);
    if (found.error) errors.push(`${path}: ${found.error}`);
    else tokens[path] = { path, type: found.type, raw: token.raw, value: found.value, description: token.description };
  }
  return { tokens, errors };
}

/** Reads and resolves a tokens file: `{ data, tokens, errors }`. Throws when the file is missing or is not JSON. */
export function loadTokens(file) {
  if (!existsSync(file)) throw new Error(`${file} does not exist`);
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`${file} is not valid JSON`);
  }
  return { data, ...resolveTokens(data) };
}

const REQUIRED = ['color.primary', 'color.on-primary', 'color.surface', 'color.text'];
const TYPES = ['color', 'dimension', 'duration', 'number', 'fontFamily', 'cubicBezier', 'fontWeight', 'string'];

function valueProblem(type, value) {
  if (type === undefined) return 'has no $type (set it on the token or on its group)';
  if (!TYPES.includes(type)) return `$type "${type}" is not supported (supported: ${TYPES.join(', ')})`;
  const shown = JSON.stringify(value);
  if (type === 'color') return parseHex(value) ? null : `${shown} is not a hex color (#rgb or #rrggbb)`;
  if (type === 'dimension') return value === 0 || (typeof value === 'string' && /^-?(\d+|\d*\.\d+)(px|rem|em|ch|vw|vh|%)$|^0$/.test(value)) ? null : `${shown} is not a dimension (for example "16px" or "1.25rem")`;
  if (type === 'duration') return typeof value === 'string' && /^(\d+|\d*\.\d+)(ms|s)$/.test(value) ? null : `${shown} is not a duration (for example "150ms")`;
  if (type === 'number' || type === 'fontWeight') return typeof value === 'number' && Number.isFinite(value) ? null : `${shown} is not a number`;
  if (type === 'fontFamily') return (typeof value === 'string' && value.trim()) || (Array.isArray(value) && value.length && value.every((name) => typeof name === 'string' && name.trim())) ? null : `${shown} is not a font name or a list of font names`;
  if (type === 'cubicBezier') return Array.isArray(value) && value.length === 4 && value.every((n) => typeof n === 'number' && Number.isFinite(n)) && value[0] >= 0 && value[0] <= 1 && value[2] >= 0 && value[2] <= 1 ? null : `${shown} is not four numbers with x between 0 and 1`;
  return typeof value === 'string' ? null : `${shown} is not a string`;
}

/** The pairs to measure: the declared ones (`$extensions.kit.contrast`), else the usual ones for the semantic tokens present. */
function declaredPairs(data, tokens) {
  const declared = data?.$extensions?.kit?.contrast;
  if (Array.isArray(declared)) return declared;
  const usual = [['on-primary', 'primary', 4.5], ['on-accent', 'accent', 4.5], ['text', 'surface', 4.5], ['text', 'surface-raised', 4.5], ['text-muted', 'surface', 4.5]];
  return usual.filter(([fg, bg]) => `color.${fg}` in tokens && `color.${bg}` in tokens).map(([fg, bg, min]) => ({ foreground: `{color.${fg}}`, background: `{color.${bg}}`, min }));
}

/**
 * What is wrong with a tokens tree: `{ problems, pairs }`. `problems` are text lines (shape, values, references, contrast);
 * `pairs` is every measured pair `{ foreground, background, ratio, min, pass, use }` (names are token paths or hex colors).
 */
export function validateTokens(data) {
  if (!isObject(data)) return { problems: ['the file is not a JSON object'], pairs: [] };
  const { tokens, errors } = resolveTokens(data);
  const problems = [...errors];
  for (const token of Object.values(tokens)) {
    const bad = valueProblem(token.type, token.value);
    if (bad) problems.push(`${token.path}: ${bad}`);
  }
  for (const name of REQUIRED) if (!(name in tokens) && !errors.some((line) => line.startsWith(`${name}:`))) problems.push(`${name}: the token is missing`);
  const colorOf = (side) => {
    const match = typeof side === 'string' ? REFERENCE.exec(side.trim()) : null;
    if (match) return { name: match[1], hex: tokens[match[1]]?.type === 'color' ? parseHex(tokens[match[1]].value) : null };
    return { name: String(side), hex: parseHex(side) };
  };
  const pairs = [];
  declaredPairs(data, tokens).forEach((pair, at) => {
    const [fg, bg] = [colorOf(pair?.foreground), colorOf(pair?.background)];
    const min = typeof pair?.min === 'number' ? pair.min : 4.5;
    if (!fg.hex || !bg.hex) return problems.push(`contrast pair ${at + 1} (${fg.name} on ${bg.name}): both sides must be color tokens or hex colors`);
    const ratio = contrastRatio(fg.hex, bg.hex);
    pairs.push({ foreground: fg.name, background: bg.name, ratio, min, pass: ratio >= min, use: pair.use });
  });
  for (const pair of pairs) if (!pair.pass) problems.push(`${pair.foreground} on ${pair.background}: ${showRatio(pair.ratio)}, needs ${pair.min}:1`);
  return { problems, pairs };
}

// ---------------------------------------------------------------- CSS

const NAMESPACE = { color: 'color', font: 'font', 'font-size': 'text', spacing: 'spacing', radius: 'radius', duration: 'duration', easing: 'ease', breakpoint: 'breakpoint', container: 'container' };
const GENERIC_FONTS = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong']);

function cssName(path) {
  const [group, ...rest] = path.split('.');
  if (group === 'color' && rest[0] === 'ramp') return `--color-${rest.slice(1).join('-')}`;
  if (group === 'color' && rest[0] === 'dark') return `--color-${rest.slice(1).join('-')}`;
  if (group === 'line-height') return `--text-${rest.join('-')}--line-height`;
  return rest.length ? `--${NAMESPACE[group] ?? group}-${rest.join('-')}` : `--${group}`;
}

function cssValue(token) {
  const { type, value } = token;
  if (type === 'fontFamily') return (Array.isArray(value) ? value : [value]).map((name) => (GENERIC_FONTS.has(name) || /^[\w-]+$/.test(name) ? name : `"${name}"`)).join(', ');
  if (type === 'cubicBezier') return `cubic-bezier(${value.join(', ')})`;
  return String(value);
}

/** The Tailwind v4 theme of a tokens tree: `@theme`, the dark overrides when `color.dark` exists, and a reduced-motion block. */
export function toCss(data) {
  const { tokens, errors } = resolveTokens(data);
  if (errors.length) throw new Error(`the tokens have errors: ${errors[0]}`);
  const all = Object.values(tokens);
  const theme = all.filter((token) => !token.path.startsWith('color.dark.'));
  const night = all.filter((token) => token.path.startsWith('color.dark.'));
  const block = (head, list, indent) => [`${head} {`, ...list.map((token) => `${indent}${cssName(token.path)}: ${cssValue(token)};`), '}'];
  const lines = ['/* Written by tokens.mjs css from design-tokens.json. Change the JSON and run it again, not this file. */', ...block('@theme', theme, '  ')];
  if (night.length) {
    const inner = (indent) => night.map((token) => `${indent}${cssName(token.path)}: ${cssValue(token)};`);
    lines.push('', '@media (prefers-color-scheme: dark) {', '  :root {', ...inner('    '), '  }', '}', '', '.dark {', ...inner('  '), '}');
  }
  const durations = all.filter((token) => token.path.startsWith('duration.'));
  if (durations.length) lines.push('', '@media (prefers-reduced-motion: reduce) {', '  :root {', ...durations.map((token) => `    ${cssName(token.path)}: 0ms;`), '  }', '}');
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------- DESIGN.md

const toPx = (value) => (typeof value === 'string' && value.endsWith('rem') ? round(parseFloat(value) * 16, 1) : typeof value === 'string' ? parseFloat(value) : value);

/** The token tables of DESIGN.md (headings Color to Contrast) between the two marker comments, ending without a newline. */
export function docBlock(data) {
  const { tokens } = resolveTokens(data);
  const inGroup = (prefix) => Object.values(tokens).filter((token) => token.path.startsWith(`${prefix}.`));
  const short = (token, prefix) => token.path.slice(prefix.length + 1);
  const none = 'not defined in design-tokens.json';
  const semantic = inGroup('color').filter((token) => !/^color\.(ramp|dark)\./.test(token.path));
  const night = inGroup('color.dark');
  const ramps = [...new Set(inGroup('color.ramp').map((token) => token.path.split('.')[2]))];
  const table = (rows, uses) => ['| Token | Value |' + (uses ? ' Use |' : ''), `|---|---|${uses ? '---|' : ''}`, ...rows.map((token) => `| --color-${short(token, token.path.startsWith('color.dark.') ? 'color.dark' : 'color')} | ${token.value} |${uses ? ` ${token.description ?? ''} |` : ''}`)];
  const sizes = inGroup('font-size').map((token) => `${short(token, 'font-size')} ${toPx(token.value)}px`);
  const spacing = inGroup('spacing');
  const scale = spacing.filter((token) => /^\d+$/.test(short(token, 'spacing'))).map((token) => toPx(token.value));
  const named = spacing.filter((token) => !/^\d+$/.test(short(token, 'spacing'))).map((token) => `${short(token, 'spacing')} ${toPx(token.value)}px`);
  const radius = inGroup('radius').map((token) => `${short(token, 'radius')} ${token.value}`);
  const duration = inGroup('duration').map((token) => `${short(token, 'duration')} ${token.value}`);
  const easing = inGroup('easing').map((token) => `${short(token, 'easing')} ${cssValue(token)}`);
  const choices = data?.$extensions?.kit?.choices ?? {};
  const { pairs } = validateTokens(data);
  const body = pairs.find((pair) => pair.foreground === 'color.text' && pair.background === 'color.surface') ?? pairs[0];
  const lines = [
    DOC_START,
    '<!-- Written by tokens.mjs doc from design-tokens.json: change the JSON and run it again; text outside these markers is yours. -->',
    '## Color',
    ...(semantic.length ? table(semantic, true) : [none]),
    ...(ramps.length ? ['', `Ramps (50 to 950): ${ramps.map((name) => `--color-${name}-*`).join(', ')}.`] : []),
    ...(night.length ? ['', '### Dark mode', ...table(night, false)] : []),
    '## Type',
    `display: ${tokens['font.display'] ? [].concat(tokens['font.display'].value)[0] : none} · body: ${tokens['font.body'] ? [].concat(tokens['font.body'].value)[0] : none} · scale: ${sizes.length ? sizes.join(', ') : none}${choices['type-ratio'] ? ` (ratio ${choices['type-ratio']})` : ''}`,
    '## Spacing',
    `scale: ${scale.length ? scale.join(', ') : none}${named.length ? ` · ${named.join(' · ')}` : ''}`,
    '## Radius',
    radius.length ? radius.join(' · ') : none,
    '## Motion',
    duration.length || easing.length ? `${choices.motion ?? 'custom'} · ${[...duration, ...easing].join(' · ')}` : none,
    '## Contrast',
    ...(pairs.length
      ? [`body text on surface: ${showRatio((body ?? pairs[0]).ratio)}`, '', '| Pair | Ratio | Needs | Result |', '|---|---|---|---|', ...pairs.map((pair) => `| ${pair.foreground} on ${pair.background} | ${showRatio(pair.ratio)} | ${pair.min}:1 | ${pair.pass ? 'pass' : 'FAIL'} |`)]
      : [none]),
    DOC_END,
  ];
  return lines.join('\n');
}

/** DESIGN.md with the block refreshed: new file, a block added at the end, or the text between the markers replaced. Text outside the markers is never touched. */
export function mergeDoc(existing, block) {
  if (existing === null || !existing.trim()) return `# Design\n\n## Visual intent\n\n<one paragraph you can quote when choosing components>\n\n${block}\n`;
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  const text = block.replace(/\n/g, eol);
  const start = existing.indexOf(DOC_START);
  const end = start === -1 ? existing.indexOf(DOC_END) : existing.indexOf(DOC_END, start);
  if (start === -1 && end === -1) return `${existing.replace(/\s+$/, '')}${eol}${eol}${text}${eol}`;
  if (start === -1 || end === -1) throw new Refusal(`DESIGN.md has only one of the markers ${DOC_START} and ${DOC_END}; restore the pair (or delete both) and run the command again`);
  return `${existing.slice(0, start)}${text}${existing.slice(end + DOC_END.length)}`;
}

// ---------------------------------------------------------------- command line

const USAGE = `tokens — design tokens as data: design-tokens.json (W3C Design Tokens format) in the project root

Usage:
  node tools/tokens.mjs init [--primary <hex>] [--accent <hex>] [--neutral <hex>] [--font-display <name>] [--font-body <name>]
                             [--radius ${CHOICES.radius.join('|')}] [--density ${CHOICES.density.join('|')}]
                             [--type-ratio ${CHOICES['type-ratio'].join('|')}] [--motion ${CHOICES.motion.join('|')}] [--dark] [--force]
      you choose a few values; the tool computes ramps, semantic colors with passing text, type scale, spacing, radii, motion
  node tools/tokens.mjs check              validate the file and measure the contrast of every declared pair; exit 1 on a failure
  node tools/tokens.mjs css [--out <file>] the Tailwind v4 @theme block (dark and reduced-motion blocks when they apply)
  node tools/tokens.mjs doc                write or refresh the token tables of DESIGN.md between ${DOC_START} and ${DOC_END}
  node tools/tokens.mjs contrast <fg> <bg> ratio of two hex colors or token names, and whether it passes AA
Options: --dir <project>, --json (init, check, doc, contrast), --help
Exit: 0 ok, 1 refused or a check failed, 2 wrong usage. init never overwrites design-tokens.json without --force.
`;

const VALUE_OPTIONS = ['dir', 'primary', 'accent', 'neutral', 'font-display', 'font-body', 'radius', 'density', 'type-ratio', 'motion', 'out'];
const ALLOWED = {
  init: ['dir', 'json', 'force', 'dark', 'primary', 'accent', 'neutral', 'font-display', 'font-body', 'radius', 'density', 'type-ratio', 'motion'],
  check: ['dir', 'json'],
  css: ['dir', 'out'],
  doc: ['dir', 'json'],
  contrast: ['dir', 'json'],
};

function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '-h') flags.help = true;
    else if (!token.startsWith('--')) flags._.push(token);
    else {
      const eq = token.indexOf('=');
      const name = (eq === -1 ? token : token.slice(0, eq)).slice(2);
      if (name === 'help') flags.help = true;
      else if (['json', 'force', 'dark'].includes(name) && eq === -1) flags[name] = true;
      else if (VALUE_OPTIONS.includes(name)) {
        const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
        if (value === undefined || value === '' || (eq === -1 && value.startsWith('--'))) throw new UsageError(`option --${name} needs a value`);
        flags[name] = value;
        if (eq === -1) i += 1;
      } else throw new UsageError(`unknown option "${token}"`);
    }
  }
  return flags;
}

function rootOf(flags) {
  return flags.dir ? resolve(flags.dir) : process.env.AI_FRONTEND_PROJECT ? resolve(process.env.AI_FRONTEND_PROJECT) : dirname(KIT_DIR);
}

/** The command line of this tool in the one path form of the project (from its root). */
function selfCommand(root, args) {
  const rel = relative(root, SELF).replace(/\\/g, '/');
  const path = rel && !rel.startsWith('..') && !isAbsolute(rel) ? rel : SELF.replace(/\\/g, '/');
  return `node ${/\s/.test(path) ? `"${path}"` : path} ${args}`;
}

const say = (flags, json, text) => console.log(flags.json ? JSON.stringify(json, null, 2) : text);
const numbered = (lines) => lines.map((line, at) => `${at + 1}. ${line}`).join('\n');

function load(root) {
  const file = join(root, TOKENS_FILE);
  if (!existsSync(file)) throw new Refusal(`${TOKENS_FILE} not found in ${root}; create it with: ${selfCommand(root, 'init --primary <hex>')}`);
  try {
    return { file, ...loadTokens(file) };
  } catch (error) {
    throw new Refusal(error.message);
  }
}

function init(flags) {
  const root = rootOf(flags);
  const file = join(root, TOKENS_FILE);
  if (existsSync(file) && !flags.force) throw new Refusal(`${TOKENS_FILE} already exists and was not changed; use --force to overwrite it (the tokens of the project would be rebuilt from the flags)`);
  const options = {};
  const given = [];
  for (const name of ['primary', 'accent', 'neutral']) {
    if (flags[name] === undefined) continue;
    const hex = parseHex(flags[name]);
    if (!hex) throw new UsageError(`--${name} "${flags[name]}" is not a hex color (#rgb or #rrggbb)`);
    options[name] = hex;
  }
  for (const name of ['font-display', 'font-body']) if (flags[name] !== undefined) options[name] = flags[name].trim();
  for (const name of Object.keys(CHOICES)) {
    if (flags[name] === undefined) continue;
    if (!CHOICES[name].includes(flags[name])) throw new UsageError(`--${name} "${flags[name]}" is not one of: ${CHOICES[name].join(', ')}`);
    options[name] = flags[name];
  }
  if (flags.dark) options.dark = true;
  for (const name of [...Object.keys(DEFAULTS), 'accent', 'neutral']) if (flags[name] === undefined) given.push(name);
  const data = buildTokens(options);
  const { problems, pairs } = validateTokens(data);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  const count = Object.keys(resolveTokens(data).tokens).length;
  const next = ['check', 'css --out <file>', 'doc'].map((args) => selfCommand(root, args)).join(' · ');
  say(flags, { file: TOKENS_FILE, tokens: count, pairs: pairs.length, problems, defaults: given }, `Wrote ${TOKENS_FILE}: ${count} tokens, ${pairs.length} contrast pairs${problems.length ? `, ${problems.length} problem(s)` : ', all passing'}.${given.length ? `\nDefaults used for: ${given.join(', ')}.` : ''}\nNext: ${next}`);
}

function check(flags) {
  const root = rootOf(flags);
  const { data } = load(root);
  const { problems, pairs } = validateTokens(data);
  const count = Object.keys(resolveTokens(data).tokens).length;
  if (problems.length) {
    if (flags.json) console.log(JSON.stringify({ ok: false, problems, pairs }, null, 2));
    else console.error(`${TOKENS_FILE}: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n${numbered(problems)}`);
    process.exitCode = 1;
    return;
  }
  say(flags, { ok: true, tokens: count, pairs }, `${TOKENS_FILE}: ${count} tokens valid, ${pairs.length} contrast pairs pass.`);
}

function css(flags) {
  const root = rootOf(flags);
  const { data } = load(root);
  let text;
  try {
    text = toCss(data);
  } catch (error) {
    throw new Refusal(`${TOKENS_FILE}: ${error.message}; run ${selfCommand(root, 'check')}`);
  }
  if (!flags.out) return process.stdout.write(text);
  const out = resolve(root, flags.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  console.log(`Wrote ${relative(root, out).replace(/\\/g, '/') || flags.out}.`);
}

function doc(flags) {
  const root = rootOf(flags);
  const { data, errors } = load(root);
  if (errors.length) throw new Refusal(`${TOKENS_FILE} has errors, so DESIGN.md was not changed: ${errors[0]}; run ${selfCommand(root, 'check')}`);
  const file = join(root, 'DESIGN.md');
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : null;
  const text = mergeDoc(existing, docBlock(data));
  const created = existing === null || !existing.trim();
  if (text !== existing) writeFileSync(file, text);
  const open = /<one paragraph/.test(text) ? '\nNow replace the <…> line under "Visual intent" with one paragraph you can quote when choosing components.' : '';
  say(flags, { file: 'DESIGN.md', created, changed: text !== existing }, `${created ? 'Wrote' : text === existing ? 'Already current:' : 'Updated'} DESIGN.md (token tables between ${DOC_START} and ${DOC_END}).${open}`);
}

function colorArg(arg, root) {
  const hex = parseHex(arg);
  if (hex) return { name: hex, hex };
  const { tokens } = load(root);
  for (const path of [arg, `color.${arg}`]) {
    if (tokens[path]?.type === 'color' && parseHex(tokens[path].value)) return { name: path, hex: parseHex(tokens[path].value) };
  }
  throw new UsageError(`"${arg}" is neither a hex color nor a color token of ${TOKENS_FILE}`);
}

function contrast(flags) {
  const [fgArg, bgArg, ...extra] = flags._.slice(1);
  if (!fgArg || !bgArg || extra.length) throw new UsageError('contrast needs two colors: contrast <fg> <bg> (hex colors or token names)');
  const root = rootOf(flags);
  const [fg, bg] = [colorArg(fgArg, root), colorArg(bgArg, root)];
  const ratio = contrastRatio(fg.hex, bg.hex);
  const verdict = { body_text: ratio >= 4.5, large_text: ratio >= 3, ui_parts: ratio >= 3 };
  const word = (ok) => (ok ? 'pass' : 'FAIL');
  say(flags, { foreground: fg.hex, background: bg.hex, ratio: Math.floor(ratio * 100 + 1e-9) / 100, ...verdict }, [`${fg.name} (${fg.hex}) on ${bg.name} (${bg.hex}): ${showRatio(ratio)}`, `AA body text (4.5:1): ${word(verdict.body_text)}`, `AA large text (3:1): ${word(verdict.large_text)}`, `AA UI parts (3:1): ${word(verdict.ui_parts)}`].join('\n'));
}

function main() {
  try {
    const flags = parseArgs(process.argv.slice(2));
    if (flags.help) return console.log(USAGE);
    const command = flags._[0];
    if (!command) throw new UsageError('missing command');
    if (!(command in ALLOWED)) throw new UsageError(`unknown command "${command}"`);
    for (const name of Object.keys(flags)) if (!['_', 'help'].includes(name) && !ALLOWED[command].includes(name)) throw new UsageError(`option --${name} does not apply to ${command}`);
    if (command !== 'contrast' && flags._.length > 1) throw new UsageError(`unexpected argument "${flags._[1]}"`);
    if (command === 'init') return init(flags);
    if (command === 'check') return check(flags);
    if (command === 'css') return css(flags);
    if (command === 'doc') return doc(flags);
    return contrast(flags);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`tokens: ${error.message}\n\n${USAGE}`);
      process.exitCode = 2;
    } else if (error instanceof Refusal) {
      console.error(`tokens: ${error.message}`);
      process.exitCode = 1;
    } else throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) main();
