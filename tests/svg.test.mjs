import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildTokens, loadTokens } from '../ai-frontend-guide-kit/tools/tokens.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KIT = join(ROOT, 'ai-frontend-guide-kit');
const TOOL = join(KIT, 'tools', 'svg.mjs');

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};
const svg = (args, cwd) => spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8', env: cleanEnv(), cwd });
const project = (tokens = true) => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-'));
  if (tokens) writeFileSync(join(dir, 'design-tokens.json'), JSON.stringify(buildTokens({ primary: '#2563eb' })));
  return dir;
};
const put = (dir, rel, text) => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), text);
  return rel;
};
const gen = (dir, kind, ...args) => svg(['gen', kind, '--dir', dir, ...args]);
const checkJson = (dir, ...args) => {
  const run = svg(['check', ...args, '--dir', dir, '--json']);
  return { run, data: JSON.parse(run.stdout) };
};
const ids = (data) => data.findings.map((finding) => finding.id);

const KINDS = ['blob', 'wave', 'grid', 'dots', 'pattern', 'rings', 'noise-lines', 'gradient-mesh', 'arrow', 'squiggle', 'badge', 'frame', 'underline', 'icon-base'];
const SEEDED = ['blob', 'wave', 'noise-lines', 'gradient-mesh', 'arrow', 'squiggle', 'underline'];

const CLEAN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>\n';
const wrap = (inner, attrs = 'viewBox="0 0 24 24" aria-hidden="true"') => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${inner}</svg>\n`;

/** Every coordinate of a path made of M, C, L, H, V and Z, as [x, y] pairs. */
function points(d) {
  const out = [];
  let x = 0;
  let y = 0;
  for (const [, command, rest] of d.matchAll(/([MCLHVZ])([^MCLHVZ]*)/g)) {
    const numbers = rest.trim() ? rest.trim().split(/[\s,]+/).map(Number) : [];
    if (command === 'H') [x] = numbers;
    else if (command === 'V') [y] = numbers;
    else for (let i = 0; i + 1 < numbers.length; i += 2) [x, y] = [numbers[i], numbers[i + 1]], out.push([x, y]);
    if (command === 'H' || command === 'V') out.push([x, y]);
  }
  return out;
}

test('gen is deterministic for every kind: same arguments, same bytes; a different seed changes the shape (T8, S6)', () => {
  const dir = project();
  for (const kind of KINDS) {
    const first = gen(dir, kind, '--seed', '7');
    const second = gen(dir, kind, '--seed', '7');
    assert.equal(first.status, 0, `${kind}: ${first.stderr}`);
    assert.equal(first.stdout, second.stdout, `${kind} is not deterministic`);
    assert.match(first.stdout, /^<svg /);
    if (SEEDED.includes(kind)) assert.notEqual(first.stdout, gen(dir, kind, '--seed', '8').stdout, `${kind} ignores the seed`);
  }
});

test('every generated kind passes check --strict, with a tokens file and without one (T8, S6)', () => {
  for (const tokens of [true, false]) {
    const dir = project(tokens);
    for (const kind of KINDS) {
      for (const extra of [[], ['--title', 'A shape']]) {
        const made = gen(dir, kind, '--out', `${kind}.svg`, ...extra);
        assert.equal(made.status, 0, `${kind}: ${made.stderr}`);
        const { run, data } = checkJson(dir, `${kind}.svg`, '--strict');
        assert.equal(run.status, 0, `${kind} (tokens ${tokens}, ${extra.join(' ')}): ${run.stdout}`);
        assert.deepEqual([data.counts.high, data.counts.medium], [0, 0], `${kind}: ${JSON.stringify(data.findings)}`);
        assert.equal(data.tokens, tokens);
      }
    }
  }
});

test('token colors come out as var(--color-...) with the hex fallback; without tokens it is currentColor and says so (T8)', () => {
  const dir = project();
  const primary = loadTokens(join(dir, 'design-tokens.json')).tokens['color.primary'].value;
  const blob = gen(dir, 'blob').stdout;
  assert.ok(blob.includes(`fill="var(--color-primary, ${primary})"`), blob);
  assert.ok(gen(dir, 'blob', '--color', 'accent').stdout.includes('var(--color-accent, #'));
  assert.ok(gen(dir, 'gradient-mesh').stdout.includes('var(--color-accent, #'), 'the second color is used');
  const bad = gen(dir, 'blob', '--color', 'nope');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /nope/);
  assert.match(bad.stderr, /primary/);

  const bare = project(false);
  const plain = gen(bare, 'blob');
  assert.equal(plain.status, 0);
  assert.ok(plain.stdout.includes('currentColor'));
  assert.ok(!plain.stdout.includes('var('));
  assert.match(plain.stderr, /currentColor/);
  assert.match(plain.stderr, /design-tokens\.json/);
});

test('the output is a complete minimal svg: viewBox, no width/height unless --fixed, aria-hidden or role="img" with a title (T8)', () => {
  const dir = project();
  const plain = gen(dir, 'dots').stdout;
  assert.match(plain, /viewBox="0 0 400 400"/);
  assert.doesNotMatch(plain, /\swidth=|\sheight=/);
  assert.match(plain, /aria-hidden="true"/);
  assert.doesNotMatch(plain, /<title>|role=/);
  assert.match(gen(dir, 'dots', '--size', '300x100').stdout, /viewBox="0 0 300 100"/);
  assert.match(gen(dir, 'dots', '--size', '300x100', '--fixed').stdout, /width="300" height="100"/);
  const titled = gen(dir, 'blob', '--title', 'Hills & "sun"').stdout;
  assert.match(titled, /role="img"/);
  assert.match(titled, /<title>Hills &amp; &quot;sun&quot;<\/title>/);
  assert.doesNotMatch(titled, /aria-hidden/);
});

test('blob, wave and noise-lines keep every point, curves included, inside the viewBox (T8)', () => {
  const dir = project();
  for (const [kind, size] of [['blob', [400, 400]], ['wave', [1200, 200]], ['noise-lines', [400, 400]], ['blob', [300, 120]]]) {
    for (const seed of ['1', '2', '3', '4']) {
      const out = gen(dir, kind, '--seed', seed, '--size', size.join('x'), '--irregularity', '0.8').stdout;
      for (const [, d] of out.matchAll(/ d="([^"]+)"/g)) {
        for (const [x, y] of points(d)) assert.ok(x >= 0 && x <= size[0] && y >= 0 && y <= size[1], `${kind} seed ${seed}: ${x},${y} outside ${size}`);
      }
    }
  }
});

test('pattern writes a tileable <pattern> for each motif and refuses an unknown one (T8)', () => {
  const dir = project();
  for (const motif of ['stripes', 'chevron', 'cross', 'circles', 'triangles']) {
    const out = gen(dir, 'pattern', '--motif', motif).stdout;
    assert.match(out, /<pattern id="tile" width="24" height="24" patternUnits="userSpaceOnUse"/, motif);
    assert.match(out, /fill="url\(#tile\)"/);
  }
  assert.match(gen(dir, 'pattern', '--tile', '40').stdout, /width="40" height="40"/);
  assert.equal(gen(dir, 'pattern', '--motif', 'zigzag').status, 2);
});

test('kind options change the shape: layers, points, cell, flip (T8)', () => {
  const dir = project();
  const count = (text, pattern) => (text.match(pattern) ?? []).length;
  assert.equal(count(gen(dir, 'wave', '--layers', '4').stdout, /<path /g), 4);
  assert.equal(count(gen(dir, 'wave', '--layers', '1').stdout, /<path /g), 1);
  assert.notEqual(gen(dir, 'wave').stdout, gen(dir, 'wave', '--flip').stdout);
  assert.ok(count(gen(dir, 'blob', '--points', '12').stdout, /C/g) === 12);
  assert.ok(gen(dir, 'grid', '--cell', '40').stdout.length < gen(dir, 'grid', '--cell', '10').stdout.length);
  assert.equal(count(gen(dir, 'rings', '--count', '3').stdout, /<circle /g), 3);
  assert.equal(count(gen(dir, 'gradient-mesh', '--fields', '4').stdout, /<radialGradient /g), 4);
  assert.match(gen(dir, 'gradient-mesh').stdout, /<feGaussianBlur /);
  assert.equal(count(gen(dir, 'gradient-mesh').stdout, /<fe[A-Z]/g), 1);
  assert.notEqual(gen(dir, 'frame', '--style', 'border').stdout, gen(dir, 'frame').stdout);
});

test('icon-base is the 24x24 template with keylines and refuses another size (T8)', () => {
  const dir = project();
  const out = gen(dir, 'icon-base').stdout;
  assert.match(out, /viewBox="0 0 24 24"/);
  assert.match(out, /<circle cx="12" cy="12" r="10"/);
  assert.match(out, /<rect x="2" y="2" width="20" height="20"/);
  assert.equal(gen(dir, 'icon-base', '--size', '48x48').status, 2);
});

test('gen --list names every kind with its options in under 1 KB; --out writes the file and prints one line (T8)', () => {
  const dir = project();
  const list = svg(['gen', '--list']);
  assert.equal(list.status, 0, list.stderr);
  assert.ok(Buffer.byteLength(list.stdout) < 1024, `${Buffer.byteLength(list.stdout)} bytes`);
  for (const kind of KINDS) assert.ok(list.stdout.includes(kind), kind);
  const made = gen(dir, 'wave', '--out', 'art/wave.svg');
  assert.equal(made.status, 0, made.stderr);
  assert.ok(existsSync(join(dir, 'art', 'wave.svg')));
  assert.match(made.stdout, /art\/wave\.svg/);
  assert.equal(made.stdout.trim().split('\n').length <= 2, true);
  assert.equal(JSON.parse(gen(dir, 'wave', '--json').stdout).svg, gen(dir, 'wave').stdout);
});

test('check: <script>, event handlers, javascript: urls, remote hrefs, foreignObject and entities are high, and exit 1 even without --strict (T8)', () => {
  const dir = project();
  const cases = {
    script: wrap('<script>alert(1)</script>'),
    handler: wrap('<rect width="4" height="4" onclick="x()"/>'),
    'js-url': wrap('<a href="java&#115;cript:alert(1)"><rect width="4" height="4"/></a>'),
    external: wrap('<image href="https://example.com/a.png" width="4" height="4"/>'),
    'foreign-object': wrap('<foreignObject width="4" height="4"><div/></foreignObject>'),
    entity: `<!DOCTYPE svg [<!ENTITY a "b">]>\n${wrap('<rect width="4" height="4"/>')}`,
  };
  for (const [id, text] of Object.entries(cases)) {
    put(dir, `${id}.svg`, text);
    const { run, data } = checkJson(dir, `${id}.svg`);
    assert.ok(ids(data).includes(id), `${id}: ${run.stdout}`);
    assert.equal(data.findings.find((finding) => finding.id === id).severity, 'high');
    assert.equal(run.status, 1, id);
  }
  put(dir, 'local.svg', wrap('<use href="#a"/><rect id="a" width="4" height="4"/>'));
  assert.ok(!ids(checkJson(dir, 'local.svg').data).includes('external'), 'an href to a local id is fine');
});

test('check: viewBox, fixed size, embedded raster, icon canvas not square, filters with more than 2 primitives (T8)', () => {
  const dir = project();
  put(dir, 'none.svg', '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="4" height="4"/></svg>');
  assert.ok(ids(checkJson(dir, 'none.svg').data).includes('viewbox'));
  put(dir, 'fixed.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" aria-hidden="true"><rect width="4" height="4"/></svg>');
  const fixed = ids(checkJson(dir, 'fixed.svg').data);
  assert.ok(fixed.includes('fixed-size') && fixed.includes('viewbox'));
  put(dir, 'raster.svg', wrap(`<image width="4" height="4" href="data:image/png;base64,${'A'.repeat(6000)}"/>`));
  const raster = checkJson(dir, 'raster.svg').data;
  assert.ok(ids(raster).includes('raster'));
  assert.ok(!ids(raster).includes('external'), 'a data: image is not a remote resource');
  put(dir, 'wide.svg', wrap('<rect width="4" height="4"/>', 'viewBox="0 0 24 16" aria-hidden="true"'));
  assert.ok(ids(checkJson(dir, 'wide.svg').data).includes('icon-square'));
  put(dir, 'banner.svg', wrap('<rect width="4" height="4"/>', 'viewBox="0 0 1200 200" aria-hidden="true"'));
  assert.ok(!ids(checkJson(dir, 'banner.svg').data).includes('icon-square'), 'only an icon-sized canvas must be square');
  const primitives = (n) => `<defs><filter id="f">${'<feOffset dx="1"/>'.repeat(n)}</filter></defs><rect width="4" height="4" filter="url(#f)"/>`;
  put(dir, 'f3.svg', wrap(primitives(3)));
  put(dir, 'f2.svg', wrap(primitives(2)));
  assert.ok(ids(checkJson(dir, 'f3.svg').data).includes('filter'));
  assert.ok(!ids(checkJson(dir, 'f2.svg').data).includes('filter'));
});

test('check: colors outside the tokens, with the nearest token, and more than 5 colors (T8)', () => {
  const dir = project();
  const tokens = loadTokens(join(dir, 'design-tokens.json')).tokens;
  const inside = tokens['color.primary'].value;
  put(dir, 'ok.svg', wrap(`<rect width="4" height="4" fill="${inside}"/><rect width="4" height="4" fill="var(--color-primary, ${inside})"/>`));
  assert.ok(!ids(checkJson(dir, 'ok.svg').data).includes('palette'));
  put(dir, 'off.svg', wrap('<rect width="4" height="4" fill="#ff00aa"/><rect width="4" height="4" style="stroke:red"/><rect width="4" height="4" fill="var(--color-nope, #123456)"/>'));
  const off = checkJson(dir, 'off.svg').data;
  const palette = off.findings.filter((finding) => finding.id === 'palette');
  assert.equal(palette.length, 3, JSON.stringify(off.findings));
  assert.ok(palette.every((finding) => finding.severity === 'medium' && /--color-/.test(finding.fix)));
  assert.ok(palette.some((finding) => finding.what.includes('#ff00aa')));
  const without = project(false);
  put(without, 'off.svg', wrap('<rect width="4" height="4" fill="#ff00aa"/>'));
  const free = checkJson(without, 'off.svg').data;
  assert.ok(!ids(free).includes('palette'));
  assert.ok(free.skipped.some((note) => /design-tokens\.json/.test(note)));
  const six = ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'].map((color) => `<rect width="4" height="4" fill="${color}"/>`).join('');
  put(without, 'six.svg', wrap(six));
  assert.ok(ids(checkJson(without, 'six.svg').data).includes('many-colors'));
  put(without, 'five.svg', wrap(six.replace(/<rect[^>]*#666666"\/>/, '')));
  assert.ok(!ids(checkJson(without, 'five.svg').data).includes('many-colors'));
});

test('check: stroke widths, caps and joins, decimals, size and accessibility (T8)', () => {
  const dir = project(false);
  const stroke = (attrs) => `<path d="M1 1L5 5" fill="none" stroke="currentColor" ${attrs}/>`;
  put(dir, 'w3.svg', wrap(stroke('stroke-width="1"') + stroke('stroke-width="2"') + stroke('stroke-width="3"')));
  assert.ok(ids(checkJson(dir, 'w3.svg').data).includes('stroke-widths'));
  put(dir, 'w2.svg', wrap(stroke('stroke-width="1"') + stroke('style="stroke-width:2"') + stroke('stroke-width="1"')));
  assert.ok(!ids(checkJson(dir, 'w2.svg').data).includes('stroke-widths'));
  put(dir, 'caps.svg', wrap(stroke('stroke-linecap="round"') + stroke('stroke-linecap="square"')));
  assert.ok(ids(checkJson(dir, 'caps.svg').data).includes('stroke-caps'));
  put(dir, 'joins.svg', wrap(stroke('stroke-linejoin="round"') + stroke('stroke-linejoin="miter"')));
  assert.ok(ids(checkJson(dir, 'joins.svg').data).includes('stroke-caps'));
  put(dir, 'dec.svg', wrap('<path d="M1.23456 1.5L5 5.12345"/>'));
  assert.ok(ids(checkJson(dir, 'dec.svg').data).includes('decimals'));
  put(dir, 'dec2.svg', wrap('<path d="M1.25 1.5L5 5.12"/>'));
  assert.ok(!ids(checkJson(dir, 'dec2.svg').data).includes('decimals'));

  put(dir, 'icon-big.svg', wrap(`<path d="M0 0${' L1 1'.repeat(3000)}"/>`));
  assert.ok(ids(checkJson(dir, 'icon-big.svg').data).includes('size'), 'over 10 KB on an icon canvas');
  put(dir, 'art-mid.svg', wrap(`<path d="M0 0${' L1 1'.repeat(3000)}"/>`, 'viewBox="0 0 400 400" aria-hidden="true"'));
  assert.ok(!ids(checkJson(dir, 'art-mid.svg').data).includes('size'), '12 KB is fine on a larger canvas');
  put(dir, 'art-big.svg', wrap(`<path d="M0 0${' L1 1'.repeat(14000)}"/>`, 'viewBox="0 0 400 400" aria-hidden="true"'));
  assert.ok(ids(checkJson(dir, 'art-big.svg').data).includes('size'), 'over 50 KB');

  put(dir, 'a11y0.svg', wrap('<rect width="4" height="4"/>', 'viewBox="0 0 24 24"'));
  assert.ok(ids(checkJson(dir, 'a11y0.svg').data).includes('a11y'));
  put(dir, 'a11y1.svg', wrap('<rect width="4" height="4"/>', 'viewBox="0 0 24 24" role="img"'));
  assert.ok(ids(checkJson(dir, 'a11y1.svg').data).includes('a11y'), 'role img without a title');
  put(dir, 'a11y2.svg', wrap('<title>Box</title><rect width="4" height="4"/>', 'viewBox="0 0 24 24" role="img"'));
  assert.ok(!ids(checkJson(dir, 'a11y2.svg').data).includes('a11y'));
});

test('check: editor leftovers are low and the clean file has no finding at all (T8)', () => {
  const dir = project(false);
  const messy = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" viewBox="0 0 24 24" aria-hidden="true" inkscape:version="1.0">
  <!-- made in an editor -->
  <metadata>x</metadata>
  <g></g>
  <path id="unused" d="M1 1L5 5"/>
</svg>
`;
  put(dir, 'messy.svg', messy);
  const { run, data } = checkJson(dir, 'messy.svg', '--strict');
  for (const id of ['leftover-editor', 'leftover-comment', 'leftover-metadata', 'leftover-group', 'leftover-id', 'leftover-xlink']) {
    assert.ok(ids(data).includes(id), `${id}: ${JSON.stringify(ids(data))}`);
    assert.equal(data.findings.find((finding) => finding.id === id).severity, 'low');
  }
  assert.equal(run.status, 0, 'low findings never fail');
  put(dir, 'clean.svg', CLEAN);
  const clean = checkJson(dir, 'clean.svg', '--strict');
  assert.deepEqual(clean.data.findings, []);
  assert.equal(clean.run.status, 0);
});

test('check: one numbered line per finding with its file and a fix; --strict fails on medium, not on low (T8)', () => {
  const dir = project(false);
  put(dir, 'icons/a.svg', wrap('<rect width="4" height="4"/>', 'viewBox="0 0 24 24"'));
  put(dir, 'icons/b.svg', CLEAN);
  const text = svg(['check', 'icons', '--dir', dir]);
  assert.equal(text.status, 0, text.stdout);
  assert.match(text.stdout, /^1\. \[medium\] a11y — icons\/a\.svg — .+ → .+/m);
  assert.match(text.stdout, /Summary: 0 high, 1 medium, 0 low/);
  assert.match(text.stdout, /scanned 2 files/);
  assert.equal(svg(['check', 'icons', '--dir', dir, '--strict']).status, 1);
  assert.equal(svg(['check', 'icons/b.svg', '--dir', dir, '--strict']).status, 0);
});

test('optimize removes editor leftovers and rounds numbers, never moves geometry, and the result passes the leftover checks (T8)', () => {
  const dir = project(false);
  const messy = `<?xml version="1.0" encoding="UTF-8"?>
<!-- editor -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" viewBox="0 0 24 24" aria-hidden="true" inkscape:version="1.0">
  <sodipodi:namedview id="base" inkscape:zoom="2"/>
  <metadata><rdf:RDF xmlns:rdf="x"/></metadata>
  <defs>
    <clipPath id="clip"><rect width="20.123456" height="20"/></clipPath>
  </defs>
  <g></g>
  <g clip-path="url(#clip)" id="layer1">
    <path   id="p1"   d="M1.123456   1.5
      L5.987654 5.1"  inkscape:label="x"  fill="none" stroke="currentColor" stroke-width="2"/>
  </g>
</svg>
`;
  put(dir, 'messy.svg', messy);
  const run = svg(['optimize', 'messy.svg', '--out', 'clean.svg', '--dir', dir]);
  assert.equal(run.status, 0, run.stderr);
  const out = readFileSync(join(dir, 'clean.svg'), 'utf8');
  assert.equal(readFileSync(join(dir, 'messy.svg'), 'utf8'), messy, '--out leaves the input alone');
  assert.ok(Buffer.byteLength(out) < Buffer.byteLength(messy));
  for (const word of ['<?xml', '<!--', 'metadata', 'sodipodi', 'inkscape', 'xmlns:xlink', 'id="p1"', 'id="layer1"', '<g></g>', 'rdf']) assert.ok(!out.includes(word), `${word} is still there:\n${out}`);
  assert.ok(out.includes('id="clip"') && out.includes('url(#clip)'), 'a referenced id stays');
  assert.match(out, /d="M1\.12 1\.5 L5\.99 5\.1"/);
  assert.match(out, /width="20\.12"/);
  assert.match(out, /viewBox="0 0 24 24"/);
  const { data } = checkJson(dir, 'clean.svg');
  assert.deepEqual(ids(data).filter((id) => id.startsWith('leftover') || id === 'decimals'), []);
  assert.match(run.stdout, /clean\.svg/);

  const inPlace = svg(['optimize', 'messy.svg', '--dir', dir]);
  assert.equal(inPlace.status, 0, inPlace.stderr);
  assert.equal(readFileSync(join(dir, 'messy.svg'), 'utf8'), out, 'without --out the file is rewritten');
});

test('optimize refuses a file with a <script> and writes nothing (T8)', () => {
  const dir = project(false);
  const bad = wrap('<script>alert(1)</script><rect width="4" height="4"/>');
  put(dir, 'bad.svg', bad);
  const run = svg(['optimize', 'bad.svg', '--out', 'out.svg', '--dir', dir]);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /script/);
  assert.ok(!existsSync(join(dir, 'out.svg')));
  assert.equal(readFileSync(join(dir, 'bad.svg'), 'utf8'), bad);
});

test('optimize keeps the text of <text> and a clean file stays valid (T8)', () => {
  const dir = project(false);
  put(dir, 'logo.svg', wrap('<title>Acme  logo</title>\n  <text x="1" y="5">Hello   <tspan>big</tspan> world</text>', 'viewBox="0 0 24 24" role="img"'));
  assert.equal(svg(['optimize', 'logo.svg', '--dir', dir]).status, 0);
  const out = readFileSync(join(dir, 'logo.svg'), 'utf8');
  assert.match(out, /<text x="1" y="5">Hello <tspan>big<\/tspan> world<\/text>/);
  assert.match(out, /<title>Acme logo<\/title>/);
  put(dir, 'clean.svg', CLEAN);
  const before = readFileSync(join(dir, 'clean.svg'), 'utf8');
  assert.equal(svg(['optimize', 'clean.svg', '--dir', dir]).status, 0);
  assert.equal(readFileSync(join(dir, 'clean.svg'), 'utf8').replace(/\s+/g, ''), before.replace(/\s+/g, ''));
});

test('sprite builds one <symbol> per icon in file-name order, prints the <use> line, and keeps what the root styled (T8)', () => {
  const dir = project(false);
  put(dir, 'icons/b-star.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path id="s" d="M12 2L15 9L22 9"/></svg>');
  put(dir, 'icons/a-home.svg', CLEAN);
  put(dir, 'icons/c.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><defs><linearGradient id="g"><stop offset="0"/></linearGradient></defs><rect width="16" height="16" fill="url(#g)"/></svg>');
  put(dir, 'icons/readme.txt', 'not an icon');
  const run = svg(['sprite', 'icons', '--out', 'sprite.svg', '--dir', dir]);
  assert.equal(run.status, 0, run.stderr);
  const out = readFileSync(join(dir, 'sprite.svg'), 'utf8');
  const order = [...out.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ['a-home', 'b-star', 'c']);
  assert.match(out, /<symbol id="a-home" viewBox="0 0 24 24">/);
  assert.match(out, /<symbol id="c" viewBox="0 0 16 16">/);
  assert.match(out, /<g fill="none" stroke="currentColor" stroke-width="2">\s*<path d="M12 2L15 9L22 9"\/>/);
  assert.ok(out.includes('id="c-g"') && out.includes('url(#c-g)'), 'ids are prefixed per symbol');
  assert.ok(!out.includes('id="s"'), 'an unreferenced id is dropped');
  assert.match(run.stdout, /<use href="#a-home"\/>/);
  assert.match(run.stdout, /sprite\.svg/);
  assert.equal(svg(['sprite', 'icons', '--dir', dir]).stdout, out, 'without --out the sprite goes to stdout');
  assert.deepEqual(ids(checkJson(dir, 'sprite.svg').data).filter((id) => id !== 'palette'), []);
});

test('sprite refuses a file without a viewBox, a script, and two files that make the same id (T8)', () => {
  const dir = project(false);
  put(dir, 'one/a.svg', '<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>');
  const none = svg(['sprite', 'one', '--dir', dir]);
  assert.equal(none.status, 2);
  assert.match(none.stderr, /a\.svg/);
  assert.match(none.stderr, /viewBox/);
  put(dir, 'two/a.svg', wrap('<script>x</script>'));
  assert.equal(svg(['sprite', 'two', '--dir', dir]).status, 1);
  put(dir, 'three/Home Icon.svg', CLEAN);
  put(dir, 'three/home-icon.svg', CLEAN);
  const clash = svg(['sprite', 'three', '--dir', dir]);
  assert.equal(clash.status, 2);
  assert.match(clash.stderr, /home-icon/);
});

test('usage errors exit 2 and name the problem; --help prints the one command path form (T8)', () => {
  const dir = project();
  const cases = [
    [['nothing'], /unknown command/],
    [[], /Usage/],
    [['gen'], /kind/],
    [['gen', 'cube', '--dir', dir], /cube/],
    [['gen', 'blob', '--nope', '1', '--dir', dir], /--nope/],
    [['gen', 'blob', '--motif', 'stripes', '--dir', dir], /--motif/],
    [['gen', 'blob', '--points', '2', '--dir', dir], /--points/],
    [['gen', 'blob', '--size', '10', '--dir', dir], /--size/],
    [['gen', 'blob', '--seed', 'x', '--dir', dir], /--seed/],
    [['gen', 'blob', '--seed'], /needs a value/],
    [['check', 'missing.svg', '--dir', dir], /missing\.svg/],
    [['check', '--dir', dir], /svg/],
    [['optimize', '--dir', dir], /file/],
    [['sprite', 'nowhere', '--dir', dir], /nowhere/],
  ];
  for (const [args, pattern] of cases) {
    const run = svg(args);
    assert.equal(run.status, 2, `${args.join(' ')}: ${run.stdout}`);
    assert.match(run.stderr, pattern, args.join(' '));
  }
  const help = svg(['--help'], ROOT);
  assert.equal(help.status, 0);
  assert.ok(help.stdout.includes('node ai-frontend-guide-kit/tools/svg.mjs'), help.stdout);
  assert.ok(!/node tools\//.test(help.stdout));
  for (const word of ['gen', 'check', 'optimize', 'sprite', '--dir', '--json', '--strict']) assert.ok(help.stdout.includes(word), word);
});

test('the tool reads files as text only: a script and a remote href are reported, never run or fetched (T8)', () => {
  const dir = project();
  put(dir, 'evil.svg', wrap('<script>require("fs").writeFileSync("pwned.txt","x")</script><image href="http://127.0.0.1:9/x.png"/>'));
  const { run, data } = checkJson(dir, 'evil.svg');
  assert.equal(run.status, 1);
  assert.deepEqual(ids(data).filter((id) => ['script', 'external'].includes(id)).sort(), ['external', 'script']);
  assert.ok(!existsSync(join(dir, 'pwned.txt')));
});
