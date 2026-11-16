#!/usr/bin/env node
/**
 * audit-design — checks the design of a project and prints a numbered list of fixes, most severe first.
 * No dependencies; the rendered layer needs Playwright and runs only with --url.
 *
 * Static layer: reads the source (html, jsx, tsx, vue, svelte, astro, mdx, css) and compares it with
 * design-tokens.json: colors, sizes and spacing outside the tokens, arbitrary values, too many font sizes,
 * motion, focus, z-index, headings, images, buttons, long forms and menus. It never edits the source.
 *
 * Rendered layer: opens each --url at 360, 768 and 1280 px and measures overflow, target size, real
 * contrast, line length, heading order, overlaps, clipped text, font sizes, body text size, the primary
 * actions of the first screen, choices side by side (Hick) and spacing off the scale. The browser part only reads the page (collectPage); every
 * decision is made by pure functions on plain data (analyzeSnapshot), so they run without a browser.
 *
 * Usage: node ai-frontend-guide-kit/tools/audit-design.mjs [paths...] [--url <url> ...] [--report] [--strict] [--json] [--dir <project>]
 * Exit: 0 done, 1 with --strict and a "high" finding, 2 wrong usage.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatio, loadTokens } from './tokens.mjs';
import { toolPath } from './kit-path.mjs';

const SELF = fileURLToPath(import.meta.url);
const KIT_DIR = resolve(dirname(SELF), '..');
const TOKENS_FILE = 'design-tokens.json';
const EXT = new Set(['.html', '.htm', '.tsx', '.jsx', '.vue', '.svelte', '.astro', '.mdx', '.css']);
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'ai-frontend-guide-kit', 'ai-frontend-output']);
const DEFAULT_TARGETS = ['src', 'app', 'pages', 'components', 'public', 'styles', 'index.html'];
export const WIDTHS = [360, 768, 1280];
export const SEVERITIES = ['high', 'medium', 'low'];
export const LIMITS = { choices: 5, minBodyText: 14, fontSizes: 6, fontFamilies: 2, zIndex: 50, zIndexValues: 6, important: 5, formFields: 7, navItems: 7, minTarget: 24, lineMin: 45, lineMax: 90, outputCap: 60, spacingOffenders: 10 };
const NO_TOKENS = `skipped: no ${TOKENS_FILE} (run tokens.mjs init)`;

class UsageError extends Error {}

// ---------------------------------------------------------------- pure helpers (colors, geometry, selectors)

/** A CSS color as `{ r, g, b, a }` (0-255, 0-1) from hex, rgb() or hsl(); null for anything else (oklch, names). */
export function parseColor(text) {
  const source = String(text).trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(source);
  if (hex) {
    const full = hex[1].length <= 4 ? [...hex[1]].map((char) => char + char).join('') : hex[1];
    const [r, g, b] = [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16));
    return { r, g, b, a: full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1 };
  }
  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(source);
  if (!fn) return null;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const amount = (part, whole) => (part.endsWith('%') ? (parseFloat(part) / 100) * whole : parseFloat(part));
  const a = parts[3] === undefined ? 1 : amount(parts[3], 1);
  let rgb;
  if (fn[1].startsWith('rgb')) rgb = parts.slice(0, 3).map((part) => amount(part, 255));
  else {
    const [h, s, l] = [parseFloat(parts[0]) % 360, amount(parts[1], 1), amount(parts[2], 1)];
    const k = (n) => (n + h / 30) % 12;
    const f = (n) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    rgb = [f(0), f(8), f(4)].map((value) => value * 255);
  }
  return rgb.some(Number.isNaN) || Number.isNaN(a) ? null : { r: rgb[0], g: rgb[1], b: rgb[2], a };
}

/** "#rrggbb" of a parsed color (alpha is dropped). */
export const toHexColor = ({ r, g, b }) => `#${[r, g, b].map((value) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0')).join('')}`;

/** `color` over `background` as a parsed opaque color. */
export const blend = (color, background) => ({
  r: color.r * color.a + background.r * (1 - color.a),
  g: color.g * color.a + background.g * (1 - color.a),
  b: color.b * color.a + background.b * (1 - color.a),
  a: 1,
});

/** WCAG large text: 24 px, or 18.66 px and bold. */
export const isLargeText = (fontSize, fontWeight) => fontSize >= 24 || (fontSize >= 18.66 && Number(fontWeight) >= 700);

/** The shortest selector that names an element from plain data: `tag#id`, `tag.class.class` (plain class names only) or `tag:nth-of-type(n)`. */
export function shortSelector({ tag, id, classes = [], nth }) {
  if (id) return `${tag}#${id}`;
  const plain = classes.filter((name) => /^[a-z_][\w-]*$/i.test(name)).slice(0, 2);
  if (plain.length) return `${tag}.${plain.join('.')}`;
  return nth > 1 ? `${tag}:nth-of-type(${nth})` : tag;
}

/** True when `px` is on the scale (a list of px values; 0 always is). */
export const onScale = (px, scale, tolerance = 0.5) => Math.abs(px) < 0.01 || scale.some((step) => Math.abs(Math.abs(px) - step) <= tolerance);

/** The scale value closest to `px`. */
export const nearest = (px, scale) => scale.reduce((best, step) => (Math.abs(step - px) < Math.abs(best - px) ? step : best), scale[0]);

/** Characters per line of a block of text: its width over the average glyph width (about half the font size). */
export const charsPerLine = (widthPx, fontSizePx) => Math.round(widthPx / (fontSizePx * 0.5));

/** The area two rectangles `{ x, y, w, h }` share. */
export function overlapArea(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

const toPx = (value) => (typeof value === 'string' && value.endsWith('rem') ? parseFloat(value) * 16 : parseFloat(value));
const round1 = (value) => Math.round(value * 10) / 10;

/** What the checks need from design-tokens.json: the color set, the spacing and font-size scales (px); null without tokens. */
export function tokenContext(tokens) {
  if (!tokens) return null;
  const colors = new Set();
  const spacing = [];
  const sizes = new Map();
  for (const token of Object.values(tokens)) {
    if (token.type === 'color') {
      const color = parseColor(String(token.value));
      if (color) colors.add(toHexColor(color));
    } else if (token.type === 'dimension' && token.path.startsWith('spacing.')) spacing.push(round1(toPx(token.value)));
    else if (token.type === 'dimension' && token.path.startsWith('font-size.')) sizes.set(token.path.slice('font-size.'.length), round1(toPx(token.value)));
  }
  return { colors, spacing: [...new Set(spacing)].sort((a, b) => a - b), sizes, fontSizes: [...sizes.values()] };
}

// ---------------------------------------------------------------- findings

const finding = (id, severity, layer, where, what, fix) => ({ id, severity, layer, ...where, what, fix });
const fileWhere = (file, line) => ({ file, line });

/** The place of a finding as text: `file:line`, or `selector @360/768`. */
export function whereOf(f) {
  if (f.file) return f.line ? `${f.file}:${f.line}` : f.file;
  if (f.layer === 'static') return 'project';
  const widths = f.widths ?? (f.width ? [f.width] : []);
  return `${f.selector ?? 'page'}${widths.length ? ` @${widths.join('/')}` : ''}`;
}

/** One line per (id, file): the first place, and how many more the file has. */
function collapse(list) {
  const seen = new Map();
  for (const f of list) {
    const key = `${f.id}|${f.file}`;
    if (seen.has(key)) seen.get(key).more += 1;
    else seen.set(key, { ...f, more: 0 });
  }
  return [...seen.values()].map(({ more, ...f }) => (more ? { ...f, what: `${f.what} (+${more} more in this file)` } : f));
}

// ---------------------------------------------------------------- static layer

const TEXT_PX = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72, '8xl': 96, '9xl': 128 };
const COLOR_AT = /(?<![\w&/#[-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b(?![-\w])|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\([^)]*\)/gi;
const SPACING_PREFIX = /^-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|left|right|bottom|basis)$/;
const COLOR_PREFIX = /^(?:bg|text|border|fill|stroke|shadow|ring)$/;
const ARBITRARY = /(?<![\w[-])((?:[a-z0-9-]+:)*)(-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|left|right|bottom|basis|w|h|size|min-[wh]|max-[wh]|text|leading|tracking|rounded(?:-[a-z]{1,2})?|bg|border|fill|stroke|shadow|ring|font))-\[([^\]\s]+)\]/g;
const GENERIC_FAMILY = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[\w-]+|inherit|initial|unset|-apple-system|blinkmacsystemfont|emoji|math|fangsong)$/i;
const ANIMATES = /@keyframes|\banimation(?:-name)?\s*:|(?<![\w-])animate-[a-z]|framer-motion|from ['"]motion|\bmotion\./;
const REDUCES = /prefers-reduced-motion|motion-reduce:|motion-safe:|useReducedMotion|reducedMotion|MotionConfig/;
const LAYOUT_PROPS = 'width|height|top|left|right|bottom|margin(?:-[a-z]+)?|padding(?:-[a-z]+)?';

const count = (text, char) => text.split(char).length - 1;
const lineAt = (text, index) => text.slice(0, index).split('\n').length;

/** The headings, images, buttons, forms, menus and primary buttons of one file (they span lines, so they read the whole text). */
function structureChecks(text, file, found) {
  const levels = [...text.matchAll(/<h([1-6])\b/g)].map((match) => ({ level: Number(match[1]), line: lineAt(text, match.index) }));
  const h1s = levels.filter((heading) => heading.level === 1);
  if (h1s.length > 1) found.push(finding('multiple-h1', 'medium', 'static', fileWhere(file, h1s[1].line), `${h1s.length} <h1> in one file; a page has one`, 'keep one <h1> for the page title and make the others <h2>'));
  levels.forEach((heading, at) => {
    if (at && heading.level > levels[at - 1].level + 1) found.push(finding('heading-skip', 'medium', 'static', fileWhere(file, heading.line), `<h${heading.level}> follows <h${levels[at - 1].level}>: a level is skipped`, `use <h${levels[at - 1].level + 1}> here, and style it with a class if it must look smaller`));
  });
  for (const match of text.matchAll(/<(?:img|Image)\b[^>]*>/g)) {
    if (!/\balt\s*=/.test(match[0]) && !/\{\s*\.\.\./.test(match[0])) found.push(finding('img-no-alt', 'high', 'static', fileWhere(file, lineAt(text, match.index)), 'image without an alt attribute', 'add alt="<what it shows>", or alt="" when it is decoration'));
  }
  for (const match of text.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const inside = match[2].replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim();
    if (!inside && !/aria-label|aria-labelledby|\btitle\s*=/.test(match[1])) found.push(finding('button-no-name', 'high', 'static', fileWhere(file, lineAt(text, match.index)), 'button with no text and no aria-label', 'add aria-label="<what it does>" or visible text'));
  }
  for (const match of text.matchAll(/<form\b[\s\S]*?<\/form>/g)) {
    const inputs = (match[0].match(/<(?:input|Input)\b[^>]*>/g) ?? []).filter((tag) => !/type\s*=\s*["']?(hidden|submit|button|reset|image)/i.test(tag)).length;
    const fields = inputs + (match[0].match(/<(?:select|Select|textarea|Textarea)\b/g) ?? []).length;
    if (fields > LIMITS.formFields) found.push(finding('form-long', 'medium', 'static', fileWhere(file, lineAt(text, match.index)), `review: a form with ${fields} visible fields (more than ${LIMITS.formFields})`, `review: ask only what the next step needs; split the rest into steps (at most ${LIMITS.formFields} fields each)`));
  }
  for (const match of text.matchAll(/<nav\b[\s\S]*?<\/nav>/g)) {
    const items = (match[0].match(/<li\b/g) ?? []).length || (match[0].match(/<(?:a|Link|NavLink)\b/g) ?? []).length;
    if (items > LIMITS.navItems) found.push(finding('nav-long', 'medium', 'static', fileWhere(file, lineAt(text, match.index)), `review: a menu with ${items} items (more than ${LIMITS.navItems})`, `review: group the items, or move the rare ones to a "More" menu (at most ${LIMITS.navItems} visible)`));
  }
  const primaries = [...text.matchAll(/<(?:button|a|Button|Link)\b[^>]*(?:variant=["'{]+primary|class(?:Name)?=["'{`][^"'`]*(?<![\w-])(?:btn-|button-)?primary(?![\w-]))/g)];
  if (primaries.length > 1) found.push(finding('multiple-primary', 'medium', 'static', fileWhere(file, lineAt(text, primaries[1].index)), `review: ${primaries.length} primary buttons in one file; the screen should have one`, 'review: keep one primary button per screen and make the others secondary'));
}

/**
 * The static findings of one file and the facts the project checks add up.
 * `ctx` is tokenContext() or null; without it the checks that compare with the tokens are skipped.
 */
export function scanText(text, file, ctx = null) {
  const found = [];
  const facts = { sizes: new Map(), families: new Map(), zIndex: new Map(), important: 0, animates: ANIMATES.test(text), reduces: REDUCES.test(text) };
  const note = (map, key, line) => map.has(key) || map.set(key, fileWhere(file, line));
  const lines = text.split('\n');
  const focusVisible = /:focus-visible|focus-visible:/.test(text);
  let theme = 0;
  let keyframes = 0;
  lines.forEach((line, at) => {
    const no = at + 1;
    if (/^\s*(\/\/|\/\*|\*|<!--)/.test(line)) return;
    if (theme > 0 || /@theme\b/.test(line)) {
      theme += count(line, '{') - count(line, '}');
      return;
    }
    facts.important += count(line, '!important');
    if (keyframes > 0 || /@keyframes\b/.test(line)) {
      if (keyframes > 0 && new RegExp(`(?<![\\w-])(?:${LAYOUT_PROPS})\\s*:`).test(line)) found.push(finding('animate-layout', 'medium', 'static', fileWhere(file, no), 'a keyframe animates a layout property', 'animate transform and opacity instead (they do not reflow the page)'));
      keyframes += count(line, '{') - count(line, '}');
    }
    // colors
    if (ctx && !(/^\s*#/.test(line) && /[{,]\s*$/.test(line))) {
      for (const match of line.matchAll(COLOR_AT)) {
        if (/href\s*=|url\(#/.test(line.slice(Math.max(0, match.index - 8), match.index)) || line[match.index - 1] === '[') continue;
        const color = parseColor(match[0]);
        if (!color || !ctx.colors.has(toHexColor(color))) found.push(finding('color-literal', 'medium', 'static', fileWhere(file, no), `color ${match[0]} is not a token`, 'use the color token (var(--color-…) or its Tailwind class) from design-tokens.json'));
      }
    }
    // Tailwind arbitrary values
    for (const match of line.matchAll(ARBITRARY)) {
      const [whole, , prefix, value] = match;
      if (/var\(|^--|url\(|:/.test(value)) continue;
      const isColor = /^(#|rgb|hsl|oklch)/i.test(value);
      const number = /^-?\d*\.?\d+(px|rem|em)?$/.test(value) ? toPx(/^-?[\d.]+$/.test(value) ? `${value}px` : value.replace(/(?<!r)em$/, 'rem')) : null;
      if (isColor && COLOR_PREFIX.test(prefix)) found.push(finding('arbitrary-value', 'medium', 'static', fileWhere(file, no), `${whole} is a color written by hand`, 'use the color token class instead'));
      else if (number !== null && prefix === 'text') {
        facts.sizes.has(number) || facts.sizes.set(number, fileWhere(file, no));
        found.push(ctx && !onScale(number, ctx.fontSizes) ? finding('font-size-off-scale', 'low', 'static', fileWhere(file, no), `${whole}: ${number}px is not on the type scale (${ctx.fontSizes.join(', ')})`, `use a type-scale class (text-xs … text-5xl); the closest is ${nearest(number, ctx.fontSizes)}px`) : finding('arbitrary-value', 'low', 'static', fileWhere(file, no), `${whole} is an arbitrary value`, 'use a class of the scale'));
      } else if (number !== null && SPACING_PREFIX.test(prefix) && ctx && !onScale(number, ctx.spacing)) found.push(finding('spacing-off-scale', 'low', 'static', fileWhere(file, no), `${whole}: ${number}px is not on the spacing scale (${ctx.spacing.join(', ')})`, `use a scale class; the closest is ${nearest(number, ctx.spacing)}px`));
      else if (number !== null) found.push(finding('arbitrary-value', 'low', 'static', fileWhere(file, no), `${whole} is an arbitrary value`, 'use a class of the scale'));
    }
    if (/\bstyle\s*[=:]/.test(line)) {
      for (const match of line.matchAll(/(?<![\w-])(?:width|height|top|left|right|bottom)\s*:\s*['"]?\d+(?:\.\d+)?(?:px)?\b/g)) found.push(finding('inline-style-size', 'low', 'static', fileWhere(file, no), `inline style sets ${match[0].replace(/['"]/g, '')}`, 'move the size to a class or a token'));
    }
    // font sizes
    for (const match of line.matchAll(/\bfont-size\s*:\s*([\d.]+)(px|rem)\b|\bfontSize\s*:\s*['"]?([\d.]+)(px|rem)?['"]?/g)) {
      const px = round1(toPx(`${match[1] ?? match[3]}${match[2] ?? match[4] ?? 'px'}`));
      facts.sizes.has(px) || facts.sizes.set(px, fileWhere(file, no));
      if (ctx && !onScale(px, ctx.fontSizes)) found.push(finding('font-size-off-scale', 'low', 'static', fileWhere(file, no), `font size ${px}px is not on the type scale (${ctx.fontSizes.join(', ')})`, `use a font-size token; the closest is ${nearest(px, ctx.fontSizes)}px`));
    }
    for (const match of line.matchAll(/(?<![\w[-])(?:[a-z0-9-]+:)*text-(xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g)) {
      const px = ctx?.sizes.get(match[1]) ?? TEXT_PX[match[1]];
      px === undefined || facts.sizes.has(px) || facts.sizes.set(px, fileWhere(file, no));
    }
    // spacing in CSS
    for (const match of line.matchAll(/(?<![\w-])((?:margin|padding)(?:-[a-z-]+)?|(?:grid-|row-|column-)?gap)\s*:\s*([^;}{]+)/gi)) {
      if (!ctx || /var\(|calc\(|clamp\(|min\(|max\(/.test(match[2])) continue;
      for (const length of match[2].match(/-?\d*\.?\d+(?:px|rem)\b/g) ?? []) {
        const px = round1(toPx(length));
        if (!onScale(px, ctx.spacing)) found.push(finding('spacing-off-scale', 'low', 'static', fileWhere(file, no), `${match[1].toLowerCase()} ${length} (${Math.abs(px)}px) is not on the spacing scale (${ctx.spacing.join(', ')})`, `use a spacing token; the closest is ${nearest(Math.abs(px), ctx.spacing)}px`));
      }
    }
    // font families
    for (const match of line.matchAll(/\bfont-family\s*:\s*([^;}]+)|\bfontFamily\s*:\s*['"]([^'"]+)/g)) {
      const first = (match[1] ?? match[2]).split(',')[0].trim().replace(/^['"]|['"]$/g, '');
      if (first && !GENERIC_FAMILY.test(first) && !/var\(/.test(first)) note(facts.families, first.toLowerCase(), no);
    }
    // motion
    if (/\btransition\s*:\s*all\b|\btransition-property\s*:\s*all\b|(?<![\w-])transition-all(?![\w-])/.test(line)) found.push(finding('transition-all', 'medium', 'static', fileWhere(file, no), 'transition: all animates every property', 'list only the properties that change (opacity, transform, color)'));
    if (new RegExp(`\\btransition(?:-property)?\\s*:[^;]*(?<![\\w-])(?:${LAYOUT_PROPS})(?![\\w-])`).test(line)) found.push(finding('animate-layout', 'medium', 'static', fileWhere(file, no), 'a transition animates a layout property', 'animate transform and opacity instead (they do not reflow the page)'));
    if (/\btransition[^;]*?(?<![\w-])linear(?![\w-])|(?<![\w-])ease-linear(?![\w-])/.test(line)) found.push(finding('linear-easing', 'low', 'static', fileWhere(file, no), 'a UI transition uses linear easing', 'use the easing tokens (standard, enter, exit) from design-tokens.json'));
    // focus
    if (!focusVisible && /\boutline\s*:\s*(?:none|0)\b|(?<![\w-])outline-(?:none|0)(?![\w-])/.test(line)) found.push(finding('outline-removed', 'high', 'static', fileWhere(file, no), 'the focus outline is removed and the file has no :focus-visible style', 'add a :focus-visible rule (or focus-visible: classes) with a visible ring, or keep the outline'));
    // z-index
    for (const pattern of [/\bz-index\s*:\s*(-?\d+)/gi, /\bzIndex\s*:\s*(-?\d+)/g, /(?<![\w-])z-(\d+)(?![\w-])/g, /(?<![\w-])z-\[(\d+)\]/g]) {
      for (const match of line.matchAll(pattern)) {
        const value = Number(match[1]);
        note(facts.zIndex, value, no);
        if (value > LIMITS.zIndex) found.push(finding('z-index-high', 'medium', 'static', fileWhere(file, no), `z-index ${value} is above ${LIMITS.zIndex}`, 'use a short layer scale (for example 10 dropdown, 20 sticky, 30 modal, 40 toast)'));
      }
    }
  });
  structureChecks(text, file, found);
  return { findings: collapse(found), facts };
}

/** Scans `sources` (`[{ file, text }]`) and adds up the project checks: font sizes and families, z-index values, !important, reduced motion. */
export function auditSources(sources, ctx = null) {
  const findings = [];
  const total = { sizes: new Map(), families: new Map(), zIndex: new Map(), important: 0, animates: null, reduces: false };
  const merge = (into, from) => from.forEach((where, key) => into.has(key) || into.set(key, where));
  for (const { file, text } of sources) {
    const { findings: list, facts } = scanText(text, file, ctx);
    findings.push(...list);
    merge(total.sizes, facts.sizes);
    merge(total.families, facts.families);
    merge(total.zIndex, facts.zIndex);
    total.important += facts.important;
    total.reduces ||= facts.reduces;
    if (facts.animates && !total.animates) total.animates = file;
  }
  const project = { file: null, line: null };
  if (total.sizes.size > LIMITS.fontSizes) findings.push(finding('too-many-font-sizes', 'medium', 'static', project, `${total.sizes.size} font sizes in the project (${[...total.sizes.keys()].sort((a, b) => a - b).join(', ')} px); the limit is ${LIMITS.fontSizes}`, 'use the type scale of design-tokens.json: at most 6 sizes, 3 on one screen'));
  if (total.families.size > LIMITS.fontFamilies) findings.push(finding('too-many-font-families', 'medium', 'static', project, `${total.families.size} font families (${[...total.families.keys()].join(', ')}); the limit is ${LIMITS.fontFamilies}`, 'keep one display and one body family (font.display and font.body)'));
  if (total.zIndex.size > LIMITS.zIndexValues) findings.push(finding('too-many-z-index', 'medium', 'static', project, `${total.zIndex.size} distinct z-index values (${[...total.zIndex.keys()].sort((a, b) => a - b).join(', ')}); the limit is ${LIMITS.zIndexValues}`, 'define a short layer scale and use only its values'));
  if (total.important > LIMITS.important) findings.push(finding('important-overuse', 'low', 'static', project, `${total.important} uses of !important; the limit is ${LIMITS.important}`, 'fix the selector order or specificity instead of forcing the rule'));
  if (total.animates && !total.reduces) findings.push(finding('no-reduced-motion', 'medium', 'static', fileWhere(total.animates, null), 'there are animations and no prefers-reduced-motion handling', 'add @media (prefers-reduced-motion: reduce) (or motion-reduce: classes) that turns the motion off'));
  return findings;
}

// ---------------------------------------------------------------- rendered layer

/**
 * Runs inside the page (Playwright serializes it, so it uses nothing from this file): reads the visible
 * elements as plain data. It decides nothing; analyzeSnapshot does. Colors come out as rgba() text.
 */
export function collectPage(limit) {
  const canvas = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const seen = new Map();
  const rgba = (css) => {
    if (!seen.has(css)) {
      canvas.clearRect(0, 0, 1, 1);
      canvas.fillStyle = '#000';
      canvas.fillStyle = css;
      canvas.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = canvas.getImageData(0, 0, 1, 1).data;
      seen.set(css, `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 100) / 100})`);
    }
    return seen.get(css);
  };
  const background = (el) => {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none') return { image: true };
      const color = rgba(style.backgroundColor);
      if (!color.endsWith(', 0)')) return { color };
    }
    return { color: 'rgba(255, 255, 255, 1)' };
  };
  const px = (value) => Math.round((parseFloat(value) || 0) * 2) / 2;
  const interactive = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[tabindex]:not([tabindex="-1"])';
  const index = new Map();
  const nodes = [];
  const elements = document.body ? [...document.body.querySelectorAll('*')] : [];
  for (const el of elements) {
    if (nodes.length >= limit) break;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) continue;
    let parent = el.parentElement;
    while (parent && !index.has(parent)) parent = parent.parentElement;
    const text = [...el.childNodes].filter((child) => child.nodeType === 3).map((child) => child.textContent).join(' ').replace(/\s+/g, ' ').trim();
    const tag = el.tagName.toLowerCase();
    const classes = [...el.classList];
    const margins = [px(style.marginTop), px(style.marginRight), px(style.marginBottom), px(style.marginLeft)];
    if (margins[1] === margins[3] && margins[1] >= 64) margins[1] = margins[3] = 0; // margin: auto centers; its computed value is not a choice
    index.set(el, nodes.length);
    nodes.push({
      tag,
      id: el.id || '',
      classes,
      nth: [...(el.parentElement?.children ?? [])].filter((sibling) => sibling.tagName === el.tagName).indexOf(el) + 1,
      parent: parent ? index.get(parent) : -1,
      rect: { x: Math.round(box.x + scrollX), y: Math.round(box.y + scrollY), w: Math.round(box.width), h: Math.round(box.height) },
      text: text.slice(0, 400),
      textLength: text.length,
      fontSize: parseFloat(style.fontSize) || 0,
      fontWeight: Number(style.fontWeight) || 400,
      color: rgba(style.color),
      background: background(el),
      display: style.display,
      interactive: el.matches(interactive),
      primary: el.matches(interactive) && /(^|[\s_-])(primary|cta)([\s_-]|$)/i.test(`${el.className?.toString?.() ?? ''} ${el.getAttribute('data-variant') ?? ''}`),
      heading: /^h[1-6]$/.test(tag) ? Number(tag[1]) : 0,
      margin: margins,
      padding: [px(style.paddingTop), px(style.paddingRight), px(style.paddingBottom), px(style.paddingLeft)],
      gap: [px(style.rowGap), px(style.columnGap)],
      clipped: style.overflow !== 'visible' && style.textOverflow !== 'ellipsis' && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1),
    });
  }
  return { page: { scrollWidth: document.documentElement.scrollWidth, innerWidth, viewportHeight: innerHeight }, nodes, truncated: elements.length > nodes.length && nodes.length >= limit };
}

const selectorOf = (node) => shortSelector(node);

/**
 * The rendered findings of one snapshot (from collectPage) at `width`. Pure: plain data in, findings out.
 * `ctx` is tokenContext() or null (without it the spacing check is skipped).
 */
export function analyzeSnapshot(snapshot, { width, ctx = null }) {
  const found = [];
  const { nodes, page } = snapshot;
  const at = (node, id, severity, what, fix) => found.push(finding(id, severity, 'rendered', { selector: selectorOf(node), widths: [width] }, what, fix));
  const whole = (id, severity, what, fix) => found.push(finding(id, severity, 'rendered', { selector: 'page', widths: [width] }, what, fix));

  if (page.scrollWidth > width + 1) {
    const wide = nodes.filter((node) => node.rect.x + node.rect.w > width + 1).sort((a, b) => b.rect.x + b.rect.w - (a.rect.x + a.rect.w)).slice(0, 3);
    found.push(finding('overflow-x', 'high', 'rendered', { selector: wide.length ? selectorOf(wide[0]) : 'page', widths: [width] }, `the page scrolls sideways: ${page.scrollWidth}px of content in ${width}px${wide.length ? `; widest: ${wide.map((node) => `${selectorOf(node)} (${node.rect.x + node.rect.w}px)`).join(', ')}` : ''}`, 'give the widest element max-width: 100% (or let it wrap); never a fixed width above the viewport'));
  }

  for (const node of nodes) {
    if (node.interactive && !(node.display === 'inline' && node.tag === 'a') && (node.rect.w < LIMITS.minTarget || node.rect.h < LIMITS.minTarget)) at(node, 'target-small', 'high', `interactive target of ${node.rect.w}x${node.rect.h}px; the minimum is ${LIMITS.minTarget}x${LIMITS.minTarget}`, `give it at least ${LIMITS.minTarget}px (44px is better on touch): padding or min-height, not a bigger icon`);
    if (node.textLength > 0 && !node.background.image) {
      const fg = parseColor(node.color);
      const bg = parseColor(node.background.color);
      if (fg && bg) {
        const solid = fg.a < 1 ? blend(fg, bg) : fg;
        const ratio = contrastRatio(toHexColor(solid), toHexColor(bg));
        const min = isLargeText(node.fontSize, node.fontWeight) ? 3 : 4.5;
        if (ratio < min) at(node, 'contrast-low', 'high', `text contrast ${Math.floor(ratio * 100) / 100}:1 (${toHexColor(solid)} on ${toHexColor(bg)}); the minimum is ${min}:1`, 'use a text color token with enough contrast on this background (tokens.mjs contrast <fg> <bg>)');
      }
    }
    if (/^(p|li|blockquote|dd)$/.test(node.tag) && node.textLength >= 60 && node.fontSize > 0) {
      const chars = Math.min(charsPerLine(node.rect.w, node.fontSize), node.textLength);
      if (chars > LIMITS.lineMax || (chars < LIMITS.lineMin && node.textLength >= 120)) at(node, 'line-length', 'low', `about ${chars} characters per line; body text reads best between ${LIMITS.lineMin} and ${LIMITS.lineMax}`, chars > LIMITS.lineMax ? 'limit the text block to max-width: 65ch (the container.prose token)' : 'widen the text block or reduce its side padding');
    }
    if (/^(p|li|blockquote|dd)$/.test(node.tag) && node.textLength >= 60 && node.fontSize > 0 && node.fontSize < LIMITS.minBodyText) at(node, 'text-small', 'medium', `body text of ${node.fontSize}px; running text under ${LIMITS.minBodyText}px is hard to read on a phone`, 'use the base size token (16px) for running text; sm (14px) is the smallest');
    if (node.clipped && node.textLength > 0) at(node, 'text-clipped', 'medium', 'the text is cut off by its container', 'let the container grow (min-height, not height) or shorten the text; use an ellipsis only on purpose');
  }

  const headings = nodes.filter((node) => node.heading);
  const h1s = headings.filter((node) => node.heading === 1);
  if (h1s.length > 1) at(h1s[1], 'multiple-h1', 'medium', `${h1s.length} <h1> on the page`, 'keep one <h1>; make the others <h2>');
  if (headings.length && headings[0].heading !== 1 && !h1s.length) at(headings[0], 'heading-skip', 'medium', `the page has no <h1>; it starts at <h${headings[0].heading}>`, 'add one <h1> with the page title');
  headings.forEach((node, index) => {
    if (index && node.heading > headings[index - 1].heading + 1) at(node, 'heading-skip', 'medium', `<h${node.heading}> follows <h${headings[index - 1].heading}>: a level is skipped`, `use <h${headings[index - 1].heading + 1}> and style it with a class`);
  });

  const targets = nodes.map((node, index) => ({ node, index })).filter(({ node }) => node.interactive);
  const contains = (outer, inner) => {
    for (let at2 = inner; at2 >= 0; at2 = nodes[at2].parent) if (at2 === outer) return true;
    return false;
  };
  const crossed = new Set();
  for (const [first, a] of targets.entries()) {
    for (const b of targets.slice(first + 1)) {
      if (contains(a.index, b.index) || contains(b.index, a.index)) continue;
      const area = overlapArea(a.node.rect, b.node.rect);
      const small = Math.min(a.node.rect.w * a.node.rect.h, b.node.rect.w * b.node.rect.h);
      const key = `${selectorOf(a.node)}|${selectorOf(b.node)}`;
      if (area > 0 && area / small > 0.2 && !crossed.has(key)) {
        crossed.add(key);
        at(a.node, 'overlap', 'medium', `${selectorOf(a.node)} overlaps ${selectorOf(b.node)} by ${Math.round((area / small) * 100)}%`, 'separate them (gap, wrap or stack at this width) so each can be tapped alone');
      }
    }
  }

  const sizes = [...new Set(nodes.filter((node) => node.textLength > 0).map((node) => Math.round(node.fontSize)))].sort((a, b) => a - b);
  if (sizes.length > LIMITS.fontSizes) whole('too-many-font-sizes', 'medium', `${sizes.length} font sizes rendered (${sizes.join(', ')} px); the limit is ${LIMITS.fontSizes}`, 'use the type scale of design-tokens.json: at most 6 sizes, 3 on one screen');

  const primaries = nodes.filter((node) => node.primary && node.rect.y < page.viewportHeight);
  if (primaries.length > 1) at(primaries[0], 'multiple-primary', 'medium', `review: ${primaries.length} primary-looking actions in the first screen (${primaries.slice(0, 3).map(selectorOf).join(', ')})`, 'review: one primary action per screen; make the others secondary');

  // Hick: more than LIMITS.choices buttons or links side by side in one group slows the decision. Menus (nav) and footers have their own rules; fields are not choices.
  const within = (start, pattern) => {
    for (let at2 = start; at2 >= 0; at2 = nodes[at2].parent) if (pattern.test(nodes[at2].tag)) return true;
    return false;
  };
  const choiceGroups = new Map();
  for (const node of nodes) {
    if (!node.interactive || !/^(a|button|summary)$/.test(node.tag) || node.parent < 0) continue;
    const owner = nodes[node.parent].tag === 'li' && nodes[node.parent].parent >= 0 ? nodes[node.parent].parent : node.parent;
    if (within(owner, /^(nav|footer)$/)) continue;
    choiceGroups.set(owner, (choiceGroups.get(owner) ?? 0) + 1);
  }
  for (const [owner, total] of choiceGroups) {
    if (total > LIMITS.choices) at(nodes[owner], 'choices-many', 'medium', `review: ${total} choices side by side in ${selectorOf(nodes[owner])}; more than ${LIMITS.choices} slows the decision`, `review: keep at most ${LIMITS.choices} visible, highlight the recommended one and move the rest behind "More" or a filter`);
  }

  if (ctx) {
    const groups = new Map();
    for (const node of nodes) {
      const props = [['margin', node.margin], ['padding', node.padding], ['gap', node.gap]];
      for (const [prop, values] of props) {
        for (const value of values) {
          if (onScale(value, ctx.spacing)) continue;
          const key = `${prop} ${Math.abs(value)}px`;
          const group = groups.get(key) ?? { prop, value: Math.abs(value), count: 0, example: node };
          group.count += 1;
          groups.set(key, group);
        }
      }
    }
    [...groups.values()].sort((a, b) => b.count - a.count || a.value - b.value).slice(0, LIMITS.spacingOffenders).forEach((group) => at(group.example, 'spacing-off-scale', 'low', `${group.count} element${group.count === 1 ? '' : 's'} with ${group.prop} ${group.value}px, which is not on the spacing scale (${ctx.spacing.join(', ')})`, `use the spacing token; the closest is ${nearest(group.value, ctx.spacing)}px`));
  }
  return found;
}

/** The same finding found at several widths becomes one finding with all the widths. */
export function mergeWidths(list) {
  const seen = new Map();
  for (const f of list) {
    const key = `${f.id}|${f.selector}|${f.what}`;
    if (seen.has(key)) seen.get(key).widths = [...new Set([...seen.get(key).widths, ...f.widths])].sort((a, b) => a - b);
    else seen.set(key, { ...f, widths: [...f.widths] });
  }
  return [...seen.values()];
}

/** The chromium of Playwright (`playwright`, then `@playwright/test`), or null. `load` is injectable for tests. */
export async function loadChromium(load = (name) => import(name)) {
  for (const name of ['playwright', '@playwright/test']) {
    try {
      const loaded = await load(name);
      if (loaded?.chromium) return loaded.chromium;
    } catch {
      // try the next package
    }
  }
  return null;
}

/** Opens each url at each width and analyzes it: `{ findings, skipped }`. It never throws for a missing browser or a bad page. */
export async function renderAudit(urls, ctx, loader = loadChromium) {
  const chromium = await loader();
  if (!chromium) return { findings: [], skipped: 'rendered checks skipped: Playwright is not installed (npm i -D playwright, then npx playwright install chromium)' };
  let browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    return { findings: [], skipped: `rendered checks skipped: the browser could not start (${String(error.message).split('\n')[0]}); run npx playwright install chromium` };
  }
  const findings = [];
  const problems = [];
  try {
    for (const url of urls) {
      for (const width of WIDTHS) {
        const page = await browser.newPage({ viewport: { width, height: 800 } });
        try {
          await page.goto(url, { waitUntil: 'load', timeout: 30000 });
          const snapshot = await page.evaluate(collectPage, 1500);
          findings.push(...analyzeSnapshot(snapshot, { width, ctx }).map((f) => ({ ...f, url })));
        } catch (error) {
          problems.push(`${url} @${width}: ${String(error.message).split('\n')[0]}`);
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  return { findings: mergeWidths(findings), skipped: problems.length ? `rendered checks failed for: ${problems.join('; ')}` : null };
}

// ---------------------------------------------------------------- output

const ORDER = (f) => SEVERITIES.indexOf(f.severity);

/** Most severe first, then the order found, numbered from 1. */
export function numbered(list) {
  return list.map((f, index) => ({ f, index })).sort((a, b) => ORDER(a.f) - ORDER(b.f) || a.index - b.index).map(({ f }, index) => ({ n: index + 1, ...f }));
}

export const countBySeverity = (list) => Object.fromEntries(SEVERITIES.map((severity) => [severity, list.filter((f) => f.severity === severity).length]));

/** `N. [severity] id — where — what → fix`. */
export const lineOf = (f) => `${f.n}. [${f.severity}] ${f.id} — ${whereOf(f)} — ${f.what} → ${f.fix}`;

function summaryLine(counts, skipped) {
  return `Summary: ${counts.high} high, ${counts.medium} medium, ${counts.low} low. ${skipped.length ? `${skipped.join('. ')}.` : 'Nothing skipped.'}`;
}

function reportMarkdown(result) {
  const lines = ['# Design audit', '', result.summary, '', ...(result.findings.length ? result.findings.map(lineOf) : ['No findings.']), ''];
  return lines.join('\n');
}

// ---------------------------------------------------------------- command line

const USAGE = `audit-design — checks the design and prints a numbered list of fixes, most severe first

Usage:
  node ${toolPath('audit-design.mjs')} [paths...] [--url <url> ...] [--report] [--strict] [--json] [--dir <project>]

  paths     files or folders to scan, relative to the project (default: ${DEFAULT_TARGETS.join(' ')})
  --url     also open this page at 360, 768 and 1280 px (needs Playwright; repeat for several pages)
  --report  write ai-frontend-output/reports/design-audit.md and design-audit.json
  --strict  exit 1 when a high finding exists
  --json    print the data instead of the text
  --dir     the project (default: AI_FRONTEND_PROJECT, then the folder that holds the kit)
Without design-tokens.json the checks that compare with the tokens are skipped (run tokens.mjs init).
`;

function parseArgs(argv) {
  const flags = { _: [], url: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const eq = token.startsWith('--') ? token.indexOf('=') : -1;
    const name = eq === -1 ? token : token.slice(0, eq);
    if (name === '--dir' || name === '--url') {
      const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
      if (!value || (eq === -1 && value.startsWith('--'))) throw new UsageError(`option ${name} needs a value`);
      if (name === '--url') flags.url.push(value);
      else flags.dir = value;
      if (eq === -1) i += 1;
    } else if (eq === -1 && ['--json', '--strict', '--report'].includes(token)) flags[token.slice(2)] = true;
    else if (eq === -1 && (token === '--help' || token === '-h')) flags.help = true;
    else if (token.startsWith('-') && token.length > 1) throw new UsageError(`unknown option "${token}"`);
    else flags._.push(token);
  }
  for (const url of flags.url) if (!/^(https?|file):\/\//i.test(url)) throw new UsageError(`--url "${url}" is not an http(s) or file URL`);
  return flags;
}

function walk(path, out) {
  if (!existsSync(path)) return;
  if (statSync(path).isFile()) {
    if (EXT.has(extname(path))) out.push(path);
    return;
  }
  for (const name of readdirSync(path).sort()) if (!SKIP.has(name)) walk(join(path, name), out);
}

async function main() {
  let flags;
  try {
    flags = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`audit-design: ${error.message}\n\n${USAGE}`);
    process.exitCode = 2;
    return;
  }
  if (flags.help) return console.log(USAGE);

  const root = flags.dir ? resolve(flags.dir) : process.env.AI_FRONTEND_PROJECT ? resolve(process.env.AI_FRONTEND_PROJECT) : dirname(KIT_DIR);
  const outDir = process.env.AI_FRONTEND_OUTPUT ? resolve(process.env.AI_FRONTEND_OUTPUT) : join(root, 'ai-frontend-output');
  const skipped = [];
  let ctx = null;
  const tokensFile = join(root, TOKENS_FILE);
  if (existsSync(tokensFile)) {
    try {
      const loaded = loadTokens(tokensFile);
      if (loaded.errors.length) skipped.push(`token-dependent checks skipped: ${TOKENS_FILE} has errors (run tokens.mjs check)`);
      else ctx = tokenContext(loaded.tokens);
    } catch {
      skipped.push(`token-dependent checks skipped: ${TOKENS_FILE} is not valid JSON (run tokens.mjs check)`);
    }
  } else skipped.push(NO_TOKENS);

  const files = [];
  for (const target of flags._.length ? flags._ : DEFAULT_TARGETS) walk(resolve(root, target), files);
  const sources = files.map((file) => ({ file: relative(root, file).replace(/\\/g, '/'), text: readFileSync(file, 'utf8') }));
  let list = auditSources(sources, ctx);

  let rendered = { ran: false, urls: flags.url };
  if (flags.url.length) {
    const result = await renderAudit(flags.url, ctx);
    list = [...list, ...result.findings];
    rendered = { ran: !result.skipped || result.findings.length > 0, urls: flags.url, widths: WIDTHS, skipped: result.skipped };
    if (result.skipped) skipped.push(result.skipped);
  }

  const findings = numbered(list);
  const counts = countBySeverity(findings);
  const summary = summaryLine(counts, skipped);
  const result = { scanned: sources.length, tokens: Boolean(ctx), counts, skipped, rendered, findings, summary, generated_at: new Date().toISOString() };

  if (flags.report) {
    mkdirSync(join(outDir, 'reports'), { recursive: true });
    writeFileSync(join(outDir, 'reports', 'design-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
    writeFileSync(join(outDir, 'reports', 'design-audit.md'), reportMarkdown(result));
  }
  if (flags.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`audit-design: scanned ${sources.length} files${flags.url.length ? `, ${flags.url.length} page(s) at ${WIDTHS.join('/')} px` : ''}`);
    findings.slice(0, LIMITS.outputCap).forEach((f) => console.log(lineOf(f)));
    if (findings.length > LIMITS.outputCap) console.log(`... ${findings.length - LIMITS.outputCap} more findings omitted (the least severe; fix the list above and run again${flags.report ? ', or read design-audit.md' : ', or add --report'})`);
    console.log(summary);
    if (flags.report) console.log(`Report: ${relative(root, join(outDir, 'reports', 'design-audit.md')).replace(/\\/g, '/')} and design-audit.json`);
  }
  if (flags.strict && counts.high > 0) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) await main();
