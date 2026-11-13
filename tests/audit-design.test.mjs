import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  analyzeSnapshot, blend, charsPerLine, isLargeText, loadChromium, mergeWidths, nearest, numbered, onScale, overlapArea, parseColor, renderAudit, scanText, shortSelector, tokenContext, toHexColor,
} from '../ai-frontend-guide-kit/tools/audit-design.mjs';
import { loadTokens } from '../ai-frontend-guide-kit/tools/tokens.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = join(ROOT, 'ai-frontend-guide-kit', 'tools');
const TOOL = join(TOOLS, 'audit-design.mjs');
const FIXTURES = join(ROOT, 'tests', 'fixtures', 'audit-design');

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};
const audit = (dir, ...args) => spawnSync(process.execPath, [TOOL, ...args, '--dir', dir], { encoding: 'utf8', env: cleanEnv() });
const json = (dir, ...args) => JSON.parse(audit(dir, ...args, '--json').stdout);
/** A project made of one fixture folder, with the tokens the clean fixture was written against. */
const project = (fixture, { tokens = true } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-design-'));
  cpSync(join(FIXTURES, fixture), dir, { recursive: true });
  if (tokens) assert.equal(spawnSync(process.execPath, [join(TOOLS, 'tokens.mjs'), 'init', '--primary', '#8a4b08', '--dir', dir], { encoding: 'utf8' }).status, 0);
  return dir;
};
const idsAt = (result, file) => result.findings.filter((f) => f.file === file).map((f) => f.id);
const treeHash = (dir) => {
  const hash = createHash('sha256');
  const walk = (path) => {
    for (const name of readdirSync(path).sort()) {
      const full = join(path, name);
      if (statSync(full).isDirectory()) walk(full);
      else hash.update(full.slice(dir.length)).update(readFileSync(full));
    }
  };
  walk(dir);
  return hash.digest('hex');
};

// ---------------------------------------------------------------- static layer: one bad and one clean file per family

test('the bad fixture trips every static check, each at its file (colors, arbitrary values, spacing, type, motion, focus, layers, !important, structure)', () => {
  const result = json(project('bad'));
  assert.deepEqual(idsAt(result, 'src/colors.css'), ['color-literal']);
  assert.match(result.findings.find((f) => f.id === 'color-literal').what, /#123456 is not a token.*\(\+2 more in this file\)/);
  const tailwind = idsAt(result, 'src/tailwind.html');
  for (const id of ['arbitrary-value', 'spacing-off-scale', 'font-size-off-scale', 'inline-style-size']) assert.ok(tailwind.includes(id), `tailwind.html: ${id}`);
  assert.deepEqual(idsAt(result, 'src/spacing.css'), ['spacing-off-scale']);
  assert.match(result.findings.find((f) => f.file === 'src/spacing.css').what, /padding 13px/);
  assert.ok(idsAt(result, 'src/type.css').includes('font-size-off-scale'));
  assert.ok(result.findings.some((f) => f.id === 'too-many-font-sizes' && /^\d+ font sizes/.test(f.what)));
  assert.ok(result.findings.some((f) => f.id === 'too-many-font-families' && /inter.*georgia.*roboto mono/.test(f.what)));
  for (const id of ['transition-all', 'animate-layout', 'linear-easing']) assert.ok(idsAt(result, 'src/motion.css').includes(id), `motion.css: ${id}`);
  assert.ok(result.findings.some((f) => f.id === 'no-reduced-motion' && f.file === 'src/motion.css'));
  assert.deepEqual(idsAt(result, 'src/focus.css'), ['outline-removed']);
  assert.equal(result.findings.find((f) => f.id === 'outline-removed').severity, 'high');
  assert.deepEqual(idsAt(result, 'src/layers.css'), ['z-index-high']);
  assert.ok(result.findings.some((f) => f.id === 'too-many-z-index' && /7 distinct/.test(f.what)));
  assert.ok(result.findings.some((f) => f.id === 'important-overuse' && /6 uses/.test(f.what)));
  const page = idsAt(result, 'src/page.html');
  for (const id of ['multiple-h1', 'heading-skip', 'img-no-alt', 'button-no-name', 'multiple-primary', 'nav-long', 'form-long']) assert.ok(page.includes(id), `page.html: ${id}`);
});

test('every finding names its place and a fix; the review checks are medium and say "review"', () => {
  const result = json(project('bad'));
  for (const f of result.findings) {
    assert.ok(f.what && f.fix, `${f.id} has a what and a fix`);
    assert.ok(['high', 'medium', 'low'].includes(f.severity), f.id);
  }
  for (const id of ['form-long', 'nav-long', 'multiple-primary']) {
    const f = result.findings.find((candidate) => candidate.id === id);
    assert.equal(f.severity, 'medium', id);
    assert.match(f.what, /^review: /, id);
    assert.match(f.what + f.fix, /review/, id);
  }
  assert.equal(result.findings.find((f) => f.id === 'form-long').what.match(/\d+ visible fields/)[0], '8 visible fields', 'the hidden input is not counted');
});

test('the clean fixture has no finding, with the tokens', () => {
  const result = json(project('clean'));
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.counts, { high: 0, medium: 0, low: 0 });
  assert.equal(result.tokens, true);
  assert.deepEqual(result.skipped, []);
});

test('a color that is a token value passes, and one that is not is named with the token to use', () => {
  const ctx = tokenContext(loadTokens(join(project('clean'), 'design-tokens.json')).tokens);
  assert.deepEqual(scanText('.a { color: #8a4b08; background: rgb(138 75 8); }', 'a.css', ctx).findings, []);
  const off = scanText('.a { color: #8a4b09; }', 'a.css', ctx).findings;
  assert.equal(off.length, 1);
  assert.match(off[0].fix, /color token/);
  assert.equal(scanText('.a { color: oklch(60% 0.1 50); }', 'a.css', ctx).findings.length, 1, 'oklch cannot be matched to a token');
  assert.deepEqual(scanText('<a href="#abc">x</a>', 'a.html', ctx).findings, [], 'an anchor is not a color');
});

test('colors written inside a @theme block are the theme itself and are not flagged', () => {
  const ctx = tokenContext(loadTokens(join(project('clean'), 'design-tokens.json')).tokens);
  const css = '@theme {\n  --color-x: #123456;\n}\n.b { color: #654321; }\n';
  const found = scanText(css, 'theme.css', ctx).findings;
  assert.equal(found.length, 1);
  assert.equal(found[0].line, 4);
});

test('outline: none is fine when the file has a :focus-visible style, and a Tailwind outline-none needs focus-visible: classes', () => {
  assert.equal(scanText('a { outline: none; }\na:focus-visible { outline: 2px solid; }', 'a.css').findings.length, 0);
  assert.equal(scanText('<a class="outline-none focus-visible:ring-2">x</a>', 'a.html').findings.length, 0);
  assert.equal(scanText('<a class="outline-none">x</a>', 'a.html').findings[0].id, 'outline-removed');
});

test('heading and image checks: an image with alt="" is decoration, a button with text or aria-label has a name', () => {
  assert.equal(scanText('<img src="a" alt="">', 'a.html').findings.length, 0);
  assert.equal(scanText('<button>Save</button><button aria-label="Close"><svg></svg></button>', 'a.html').findings.length, 0);
  assert.equal(scanText('<button><svg></svg></button>', 'a.html').findings[0].id, 'button-no-name');
  assert.equal(scanText('<h2>a</h2><h3>b</h3>', 'a.html').findings.length, 0, 'a component may start at any level');
});

test('without design-tokens.json the token checks are skipped once and the others still run (S: skipped line)', () => {
  const dir = project('bad', { tokens: false });
  const result = json(dir);
  assert.deepEqual(result.skipped, ['skipped: no design-tokens.json (run tokens.mjs init)']);
  assert.equal(result.tokens, false);
  assert.ok(!result.findings.some((f) => f.id === 'color-literal'));
  assert.ok(!result.findings.some((f) => f.id === 'font-size-off-scale' || f.id === 'spacing-off-scale'));
  assert.ok(result.findings.some((f) => f.id === 'img-no-alt'), 'the rest still runs');
  assert.ok(result.findings.some((f) => f.id === 'too-many-font-sizes'), 'font sizes are counted without tokens');
  const text = audit(dir).stdout;
  assert.equal(text.match(/no design-tokens\.json/g).length, 1, 'said once');
  assert.match(text, /\. skipped: no design-tokens\.json \(run tokens\.mjs init\)\.$/m);
});

test('a design-tokens.json that is not valid skips the token checks and says why, without crashing', () => {
  const dir = project('bad', { tokens: false });
  writeFileSync(join(dir, 'design-tokens.json'), '{ nope');
  const result = json(dir);
  assert.match(result.skipped[0], /design-tokens\.json is not valid JSON/);
  assert.ok(result.findings.some((f) => f.id === 'img-no-alt'));
});

// ---------------------------------------------------------------- output, exit codes, report

test('the text output is a numbered list, most severe first, one finding per line, with a summary', () => {
  const run = audit(project('bad'));
  assert.equal(run.status, 0, run.stderr);
  const lines = run.stdout.trim().split('\n');
  assert.match(lines[0], /^audit-design: scanned \d+ files$/);
  const items = lines.filter((line) => /^\d+\. /.test(line));
  assert.ok(items.length > 10);
  items.forEach((line, index) => assert.match(line, new RegExp(`^${index + 1}\\. \\[(high|medium|low)\\] [a-z0-9-]+ — \\S.* — .+ → .+$`)));
  const order = items.map((line) => ['high', 'medium', 'low'].indexOf(line.match(/\[(\w+)\]/)[1]));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'high before medium before low');
  assert.match(lines.at(-1), /^Summary: \d+ high, \d+ medium, \d+ low\. Nothing skipped.$/);
  assert.match(items.find((line) => line.includes('outline-removed')), /src\/focus\.css:1 — /);
});

test('--json carries the same findings, numbered, and the counts', () => {
  const dir = project('bad');
  const result = json(dir);
  const text = audit(dir).stdout.split('\n').filter((line) => /^\d+\. /.test(line));
  assert.equal(result.findings.length, text.length);
  assert.deepEqual(result.findings.map((f) => f.n), result.findings.map((_, index) => index + 1));
  assert.equal(result.counts.high + result.counts.medium + result.counts.low, result.findings.length);
  assert.match(result.summary, /^Summary: /);
});

test('the text output stops at 60 findings and says how many were left out', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-design-many-'));
  mkdirSync(join(dir, 'src'));
  for (let i = 0; i < 70; i += 1) writeFileSync(join(dir, 'src', `p${String(i).padStart(2, '0')}.html`), '<img src="a">\n');
  const run = audit(dir);
  assert.equal(run.stdout.split('\n').filter((line) => /^\d+\. /.test(line)).length, 60);
  assert.match(run.stdout, /\.\.\. 10 more findings omitted/);
  assert.match(run.stdout, /Summary: 70 high, 0 medium, 0 low/);
  assert.equal(JSON.parse(audit(dir, '--json').stdout).findings.length, 70, 'the data is not capped');
});

test('--strict exits 1 on a high finding, 0 without one (medium and low do not fail it)', () => {
  assert.equal(audit(project('bad'), '--strict').status, 1);
  assert.equal(audit(project('bad')).status, 0, 'without --strict the exit code is 0');
  assert.equal(audit(project('clean'), '--strict').status, 0);
  const mediumOnly = project('clean');
  writeFileSync(join(mediumOnly, 'src', 'two.html'), '<h1>a</h1><h1>b</h1>\n');
  const run = audit(mediumOnly, '--strict');
  assert.equal(run.status, 0, run.stdout);
  assert.match(run.stdout, /multiple-h1/);
});

test('--report writes design-audit.md and design-audit.json under ai-frontend-output/reports and never touches the source', () => {
  const dir = project('bad');
  const before = treeHash(join(dir, 'src'));
  const run = audit(dir, '--report');
  assert.equal(run.status, 0, run.stderr);
  const md = readFileSync(join(dir, 'ai-frontend-output', 'reports', 'design-audit.md'), 'utf8');
  const data = JSON.parse(readFileSync(join(dir, 'ai-frontend-output', 'reports', 'design-audit.json'), 'utf8'));
  assert.match(md, /^# Design audit/);
  assert.match(md, /^1\. \[high\]/m);
  assert.ok(data.counts.high > 0 && Array.isArray(data.findings));
  assert.equal(treeHash(join(dir, 'src')), before, 'the source is unchanged');
  assert.equal(existsSync(join(dir, 'ai-frontend-output', 'reports')), true);
  assert.equal(existsSync(join(project('clean'), 'ai-frontend-output')), false, 'nothing is written without --report');
});

test('usage errors exit 2 with the usage; --help exits 0', () => {
  const dir = project('clean');
  for (const args of [['--nope'], ['--url'], ['--url', 'not-a-url'], ['--dir']]) {
    const run = spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8', env: cleanEnv() });
    assert.equal(run.status, 2, args.join(' '));
    assert.match(run.stderr, /Usage:/);
  }
  const help = audit(dir, '--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
});

test('paths limit the scan to what is named, relative to the project', () => {
  const dir = project('bad');
  const result = json(dir, 'src/focus.css');
  assert.equal(result.scanned, 1);
  assert.deepEqual(result.findings.map((f) => f.id), ['outline-removed']);
});

// ---------------------------------------------------------------- rendered layer: no browser here

test('--url without Playwright prints one clear line, still reports the static result and exits as it dictates', () => {
  // A copy of the tool outside the repository, so no node_modules above it can supply Playwright.
  const base = mkdtempSync(join(tmpdir(), 'audit-design-nopw-'));
  mkdirSync(join(base, 'kit', 'tools'), { recursive: true });
  for (const name of ['audit-design.mjs', 'tokens.mjs']) cpSync(join(TOOLS, name), join(base, 'kit', 'tools', name));
  const dir = project('bad');
  const run = spawnSync(process.execPath, [join(base, 'kit', 'tools', 'audit-design.mjs'), '--url', 'http://localhost:9', '--dir', dir], { encoding: 'utf8', env: cleanEnv() });
  assert.equal(run.status, 0, run.stderr);
  const said = run.stdout.split('\n').filter((line) => /rendered checks skipped/.test(line));
  assert.equal(said.length, 1, run.stdout);
  assert.match(said[0], /. rendered checks skipped: Playwright is not installed/);
  assert.ok(run.stdout.includes('img-no-alt'), 'the static result is there');
  assert.equal(spawnSync(process.execPath, [join(base, 'kit', 'tools', 'audit-design.mjs'), '--url', 'http://localhost:9', '--strict', '--dir', dir], { encoding: 'utf8', env: cleanEnv() }).status, 1);
  const clean = spawnSync(process.execPath, [join(base, 'kit', 'tools', 'audit-design.mjs'), '--url', 'http://localhost:9', '--strict', '--dir', project('clean')], { encoding: 'utf8', env: cleanEnv() });
  assert.equal(clean.status, 0, 'a skipped rendered layer never fails a clean project, and is never reported as passed');
  assert.match(clean.stdout, /rendered checks skipped/);
});

test('loadChromium tries playwright, then @playwright/test, then gives up with null', async () => {
  const tried = [];
  assert.equal(await loadChromium(async (name) => { tried.push(name); throw new Error('nope'); }), null);
  assert.deepEqual(tried, ['playwright', '@playwright/test']);
  const chromium = { launch() {} };
  assert.equal(await loadChromium(async (name) => (name === '@playwright/test' ? { chromium } : Promise.reject(new Error('no')))), chromium);
});

/** A snapshot node with the defaults of a plain visible block. */
const node = (over = {}) => ({
  tag: 'div', id: '', classes: [], nth: 1, parent: -1, rect: { x: 0, y: 0, w: 300, h: 40 }, text: '', textLength: 0, fontSize: 16, fontWeight: 400,
  color: 'rgba(51, 47, 45, 1)', background: { color: 'rgba(247, 246, 246, 1)' }, display: 'block', interactive: false, primary: false, heading: 0,
  margin: [0, 0, 0, 0], padding: [0, 0, 0, 0], gap: [0, 0], clipped: false, ...over,
});
const snap = (nodes, page = {}) => ({ page: { scrollWidth: 360, innerWidth: 360, viewportHeight: 800, ...page }, nodes });
const ids = (found) => found.map((f) => f.id);

test('renderAudit with no browser installed or one that cannot start skips with a reason and does not throw', async () => {
  const none = await renderAudit(['http://x'], null, async () => null);
  assert.deepEqual(none.findings, []);
  assert.match(none.skipped, /Playwright is not installed/);
  const broken = await renderAudit(['http://x'], null, async () => ({ launch: async () => { throw new Error("Executable doesn't exist\nrun npx playwright install"); } }));
  assert.match(broken.skipped, /the browser could not start \(Executable doesn't exist\)/);
});

test('renderAudit opens each url at 360, 768 and 1280 and merges the same finding across widths', async () => {
  const widths = [];
  const chromium = {
    launch: async () => ({
      newPage: async ({ viewport }) => ({
        goto: async () => widths.push(viewport.width),
        evaluate: async () => snap([node({ tag: 'button', interactive: true, rect: { x: 0, y: 0, w: 20, h: 20 } })], { scrollWidth: viewport.width }),
        close: async () => {},
      }),
      close: async () => {},
    }),
  };
  const result = await renderAudit(['http://x'], null, async () => chromium);
  assert.deepEqual(widths, [360, 768, 1280]);
  assert.equal(result.skipped, null);
  assert.equal(result.findings.length, 1);
  assert.deepEqual(result.findings[0].widths, [360, 768, 1280]);
  assert.equal(result.findings[0].id, 'target-small');
});

test('renderAudit reports a page that does not load and goes on', async () => {
  const chromium = { launch: async () => ({ newPage: async () => ({ goto: async () => { throw new Error('net::ERR_CONNECTION_REFUSED\nat x'); }, evaluate: async () => snap([]), close: async () => {} }), close: async () => {} }) };
  const result = await renderAudit(['http://x'], null, async () => chromium);
  assert.match(result.skipped, /http:\/\/x @360: net::ERR_CONNECTION_REFUSED/);
});

// ---------------------------------------------------------------- the pure parts of the rendered layer

test('shortSelector: id first, then up to two plain classes (Tailwind utilities are dropped), then the position', () => {
  assert.equal(shortSelector({ tag: 'button', id: 'buy', classes: ['btn'] }), 'button#buy');
  assert.equal(shortSelector({ tag: 'a', classes: ['md:flex', 'btn', 'w-1/2', 'btn-primary', 'extra'] }), 'a.btn.btn-primary');
  assert.equal(shortSelector({ tag: 'li', classes: ['p-[13px]'], nth: 3 }), 'li:nth-of-type(3)');
  assert.equal(shortSelector({ tag: 'section', classes: [], nth: 1 }), 'section');
});

test('onScale accepts zero, the steps and a half pixel of rounding, and nothing else; nearest picks the closest step', () => {
  const scale = [4, 8, 12, 16, 24, 32, 48, 64];
  assert.equal(onScale(0, scale), true);
  assert.equal(onScale(16, scale), true);
  assert.equal(onScale(-16, scale), true, 'a negative margin uses the same scale');
  assert.equal(onScale(16.4, scale), true);
  assert.equal(onScale(13, scale), false);
  assert.equal(nearest(13, scale), 12);
  assert.equal(nearest(40, scale), 32);
});

test('charsPerLine is the width over half the font size', () => {
  assert.equal(charsPerLine(640, 16), 80);
  assert.equal(charsPerLine(300, 16), 38);
  assert.equal(charsPerLine(1200, 16), 150);
});

test('overlapArea is the shared area of two rectangles, 0 when they only touch or are apart', () => {
  assert.equal(overlapArea({ x: 0, y: 0, w: 100, h: 50 }, { x: 50, y: 25, w: 100, h: 50 }), 50 * 25);
  assert.equal(overlapArea({ x: 0, y: 0, w: 100, h: 50 }, { x: 100, y: 0, w: 10, h: 10 }), 0);
  assert.equal(overlapArea({ x: 0, y: 0, w: 10, h: 10 }, { x: 50, y: 50, w: 10, h: 10 }), 0);
});

test('parseColor reads hex, rgb() and hsl(), blends alpha and gives back hex; isLargeText follows WCAG', () => {
  assert.deepEqual(parseColor('#abc'), { r: 170, g: 187, b: 204, a: 1 });
  assert.deepEqual(parseColor('rgb(10 20 30 / 50%)'), { r: 10, g: 20, b: 30, a: 0.5 });
  assert.equal(toHexColor(parseColor('hsl(0 100% 50%)')), '#ff0000');
  assert.equal(parseColor('oklch(60% 0.1 50)'), null);
  assert.equal(toHexColor(blend({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 })), '#808080');
  assert.equal(isLargeText(24, 400), true);
  assert.equal(isLargeText(19, 700), true);
  assert.equal(isLargeText(19, 400), false);
});

test('analyzeSnapshot: horizontal overflow names the width and the widest element', () => {
  const found = analyzeSnapshot(snap([node({ tag: 'table', classes: ['wide'], rect: { x: 0, y: 0, w: 700, h: 200 } })], { scrollWidth: 700 }), { width: 360 });
  assert.equal(found[0].id, 'overflow-x');
  assert.equal(found[0].severity, 'high');
  assert.equal(found[0].selector, 'table.wide');
  assert.deepEqual(found[0].widths, [360]);
  assert.match(found[0].what, /700px of content in 360px/);
  assert.deepEqual(ids(analyzeSnapshot(snap([node()]), { width: 360 })), []);
});

test('analyzeSnapshot: targets under 24x24 are high, inline links in text are exempt', () => {
  const found = analyzeSnapshot(snap([node({ tag: 'button', classes: ['x'], interactive: true, rect: { x: 0, y: 0, w: 20, h: 44 } }), node({ tag: 'a', interactive: true, display: 'inline', rect: { x: 0, y: 60, w: 30, h: 16 } }), node({ tag: 'a', interactive: true, rect: { x: 0, y: 100, w: 44, h: 44 } })]), { width: 360 });
  assert.deepEqual(ids(found), ['target-small']);
  assert.equal(found[0].severity, 'high');
  assert.match(found[0].what, /20x44px/);
});

test('analyzeSnapshot: real contrast below 4.5 (3 for large text) is high, with the colors and the ratio', () => {
  const grey = { text: 'Hello', textLength: 5, color: 'rgba(170, 170, 170, 1)', background: { color: 'rgba(255, 255, 255, 1)' } };
  const found = analyzeSnapshot(snap([node({ tag: 'p', ...grey }), node({ tag: 'h2', ...grey, color: 'rgba(130, 130, 130, 1)', fontSize: 32 }), node({ tag: 'p', ...grey, background: { image: true } })]), { width: 768 });
  assert.deepEqual(ids(found), ['contrast-low']);
  assert.match(found[0].what, /2\.3\d:1 \(#aaaaaa on #ffffff\); the minimum is 4\.5:1/);
  const big = analyzeSnapshot(snap([node({ tag: 'h2', ...grey, color: 'rgba(130, 130, 130, 1)', fontSize: 32 })]), { width: 768 });
  assert.deepEqual(ids(big), [], '3.5:1 passes for large text');
  const alpha = analyzeSnapshot(snap([node({ tag: 'p', text: 'x', textLength: 1, color: 'rgba(0, 0, 0, 0.3)' })]), { width: 768 });
  assert.deepEqual(ids(alpha), ['contrast-low'], 'translucent text is blended over its background first');
});

test('analyzeSnapshot: body text longer than 90 characters a line, or shorter than 45 in a long paragraph, is flagged', () => {
  const long = analyzeSnapshot(snap([node({ tag: 'p', text: 'x'.repeat(300), textLength: 300, rect: { x: 0, y: 0, w: 1200, h: 80 } })]), { width: 1280 });
  assert.deepEqual(ids(long), ['line-length']);
  assert.match(long[0].what, /about 150 characters/);
  const narrow = analyzeSnapshot(snap([node({ tag: 'p', text: 'x'.repeat(300), textLength: 300, rect: { x: 0, y: 0, w: 200, h: 300 } })]), { width: 360 });
  assert.deepEqual(ids(narrow), ['line-length']);
  const fine = analyzeSnapshot(snap([node({ tag: 'p', text: 'x'.repeat(300), textLength: 300, rect: { x: 0, y: 0, w: 640, h: 80 } }), node({ tag: 'p', text: 'Short.', textLength: 6, rect: { x: 0, y: 0, w: 1200, h: 20 } })]), { width: 1280 });
  assert.deepEqual(ids(fine), []);
});

test('analyzeSnapshot: heading order (no h1, two h1, a skipped level)', () => {
  const head = (level) => node({ tag: `h${level}`, heading: level, text: 'T', textLength: 1 });
  assert.deepEqual(ids(analyzeSnapshot(snap([head(1), head(2), head(3)]), { width: 360 })), []);
  assert.deepEqual(ids(analyzeSnapshot(snap([head(1), head(3)]), { width: 360 })), ['heading-skip']);
  assert.deepEqual(ids(analyzeSnapshot(snap([head(1), head(1)]), { width: 360 })), ['multiple-h1']);
  assert.deepEqual(ids(analyzeSnapshot(snap([head(2)]), { width: 360 })), ['heading-skip']);
});

test('analyzeSnapshot: overlapping interactive elements are found; a button inside a link or two apart are not', () => {
  const button = (rect, over = {}) => node({ tag: 'button', interactive: true, rect, ...over });
  const found = analyzeSnapshot(snap([button({ x: 0, y: 0, w: 100, h: 40 }, { classes: ['a'] }), button({ x: 50, y: 0, w: 100, h: 40 }, { classes: ['b'] })]), { width: 360 });
  assert.deepEqual(ids(found), ['overlap']);
  assert.match(found[0].what, /button\.a overlaps button\.b by 50%/);
  const nested = analyzeSnapshot(snap([node({ tag: 'a', interactive: true, rect: { x: 0, y: 0, w: 200, h: 60 } }), button({ x: 10, y: 10, w: 100, h: 40 }, { parent: 0 })]), { width: 360 });
  assert.deepEqual(ids(nested), []);
  assert.deepEqual(ids(analyzeSnapshot(snap([button({ x: 0, y: 0, w: 100, h: 40 }), button({ x: 120, y: 0, w: 100, h: 40 })]), { width: 360 })), []);
});

test('analyzeSnapshot: clipped text, too many rendered font sizes and several primary actions in the first screen', () => {
  assert.deepEqual(ids(analyzeSnapshot(snap([node({ tag: 'p', text: 'cut', textLength: 3, clipped: true })]), { width: 360 })), ['text-clipped']);
  const sizes = [11, 13, 15, 17, 20, 24, 30].map((fontSize) => node({ tag: 'p', text: 'x', textLength: 1, fontSize }));
  const many = analyzeSnapshot(snap(sizes), { width: 360 });
  assert.deepEqual(ids(many), ['too-many-font-sizes']);
  assert.match(many[0].what, /7 font sizes rendered/);
  const cta = (y, classes) => node({ tag: 'a', interactive: true, primary: true, classes, rect: { x: 0, y, w: 100, h: 44 } });
  const primary = analyzeSnapshot(snap([cta(100, ['buy']), cta(300, ['join']), cta(1500, ['later'])]), { width: 1280 });
  assert.deepEqual(ids(primary), ['multiple-primary'], 'the one below the first screen is not counted');
  assert.equal(primary[0].severity, 'medium');
  assert.match(primary[0].what, /^review: 2 primary-looking actions/);
});

test('analyzeSnapshot: spacing off the token scale, capped to the 10 most frequent offenders; no tokens, no check', () => {
  const ctx = tokenContext(loadTokens(join(project('clean'), 'design-tokens.json')).tokens);
  const odd = [];
  for (let value = 5; value < 5 + 25; value += 1) odd.push(...Array.from({ length: value }, () => node({ padding: [value + 0.5, 16, 16, 16], classes: [`c${value}`] })));
  const found = analyzeSnapshot(snap(odd), { width: 768, ctx });
  const spacing = found.filter((f) => f.id === 'spacing-off-scale');
  assert.equal(spacing.length, 10);
  assert.match(spacing[0].what, /^29 elements with padding 29\.5px/);
  assert.match(spacing[0].fix, /closest is 32px/);
  assert.equal(analyzeSnapshot(snap(odd), { width: 768 }).filter((f) => f.id === 'spacing-off-scale').length, 0);
  assert.deepEqual(ids(analyzeSnapshot(snap([node({ padding: [16, 24, 0, 8] })]), { width: 768, ctx })), []);
});

test('mergeWidths and numbered: one finding with its widths, and most severe first from 1', () => {
  const same = { id: 'overlap', severity: 'medium', layer: 'rendered', selector: 'a', what: 'x', fix: 'y' };
  const merged = mergeWidths([{ ...same, widths: [768] }, { ...same, widths: [360] }, { ...same, selector: 'b', widths: [360] }]);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged[0].widths, [360, 768]);
  const list = numbered([{ id: 'a', severity: 'low' }, { id: 'b', severity: 'high' }, { id: 'c', severity: 'medium' }, { id: 'd', severity: 'high' }]);
  assert.deepEqual(list.map((f) => `${f.n}${f.id}`), ['1b', '2d', '3c', '4a']);
});
