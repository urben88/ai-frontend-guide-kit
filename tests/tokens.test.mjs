import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { contrastRatio, loadTokens, ramp, resolveTokens, toCss, typeScale } from '../ai-frontend-guide-kit/tools/tokens.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'tokens.mjs');

const tokens = (dir, ...args) => spawnSync(process.execPath, [TOOL, ...args, '--dir', dir], { encoding: 'utf8' });
const project = () => mkdtempSync(join(tmpdir(), 'tokens-'));
const FILE = (dir) => join(dir, 'design-tokens.json');
const read = (dir, name) => readFileSync(join(dir, name), 'utf8');
const made = (...args) => {
  const dir = project();
  assert.equal(tokens(dir, 'init', ...args).status, 0);
  return dir;
};

test('contrast: black on white is 21:1, #777 on white fails body text, token names work (S4)', () => {
  const dir = made('--primary', '#8a4b08');
  const black = tokens(dir, 'contrast', '#000', '#fff');
  assert.equal(black.status, 0, black.stderr);
  assert.match(black.stdout, /21:1/);
  assert.match(black.stdout, /AA body text \(4\.5:1\): pass/);
  const grey = tokens(dir, 'contrast', '#777', '#ffffff');
  assert.equal(grey.status, 0);
  assert.match(grey.stdout, /AA body text \(4\.5:1\): FAIL/);
  assert.match(grey.stdout, /AA large text \(3:1\): pass/);
  const named = tokens(dir, 'contrast', 'text', 'surface');
  assert.equal(named.status, 0, named.stderr);
  assert.match(named.stdout, /AA body text \(4\.5:1\): pass/);
  const json = JSON.parse(tokens(dir, 'contrast', '#000', '#fff', '--json').stdout);
  assert.deepEqual([json.ratio, json.body_text, json.large_text, json.ui_parts], [21, true, true, true]);
  assert.equal(tokens(dir, 'contrast', '#000').status, 2);
  assert.equal(tokens(dir, 'contrast', 'nope', '#fff').status, 2);
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.ok(contrastRatio('#777777', '#ffffff') < 4.5);
});

test('init writes design-tokens.json in the W3C format with the semantic colors, the scales and the contrast pairs, all passing (S4)', () => {
  const dir = made('--primary', '#8a4b08', '--font-display', 'Fraunces', '--radius', 'large', '--density', 'compact', '--type-ratio', '1.2', '--motion', 'snappy', '--dark');
  const data = JSON.parse(read(dir, 'design-tokens.json'));
  const { tokens: all, errors } = resolveTokens(data);
  assert.deepEqual(errors, []);
  for (const name of ['primary', 'on-primary', 'accent', 'on-accent', 'surface', 'surface-raised', 'text', 'text-muted', 'border', 'focus', 'danger', 'success', 'warning']) assert.ok(all[`color.${name}`], `color.${name}`);
  for (const name of ['primary', 'accent', 'neutral']) for (const step of ['50', '500', '950']) assert.match(all[`color.ramp.${name}.${step}`].value, /^#[0-9a-f]{6}$/);
  assert.equal(all['color.primary'].value, '#8a4b08');
  assert.equal(all['color.primary'].raw.startsWith('{color.ramp.primary.'), true, 'semantic tokens reference the ramp');
  assert.deepEqual(all['font.display'].value.slice(0, 1), ['Fraunces']);
  assert.equal(all['radius.md'].value, '16px');
  assert.equal(all['spacing.control'].value, '40px');
  assert.equal(all['duration.fast'].value, '100ms');
  assert.ok(all['font-size.base'] && all['line-height.base'] && all['spacing.4'] && all['breakpoint.md'] && all['container.page'] && all['easing.standard']);
  assert.ok(all['color.dark.text'], 'dark tokens exist with --dark');
  assert.ok(contrastRatio(all['color.text'].value, all['color.surface'].value) >= 4.5);
  assert.ok(contrastRatio(all['color.dark.text'].value, all['color.dark.surface'].value) >= 4.5);
  const checked = tokens(dir, 'check');
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /contrast pairs pass/);
});

test('init is deterministic: the same choices write the same bytes (S4)', () => {
  const args = ['--primary', '#0a7a5a', '--accent', '#d4551f', '--neutral', '#667085', '--dark'];
  const [a, b] = [made(...args), made(...args)];
  assert.equal(read(a, 'design-tokens.json'), read(b, 'design-tokens.json'));
  assert.equal(tokens(a, 'css').stdout, tokens(b, 'css').stdout);
  assert.ok(!read(a, 'design-tokens.json').includes('\r'), 'LF line endings');
});

test('init picks text colors that pass 4.5:1 for light, dark and mid-tone primaries (S4)', () => {
  for (const primary of ['#ffd400', '#0b1f3a', '#808080', '#e11d48', '#00a67e']) {
    const dir = made('--primary', primary, '--dark');
    const checked = tokens(dir, 'check');
    assert.equal(checked.status, 0, `${primary}: ${checked.stderr}`);
  }
});

test('init refuses to overwrite without --force and leaves the file byte-identical; --force rebuilds it (S4)', () => {
  const dir = made('--primary', '#8a4b08');
  const before = read(dir, 'design-tokens.json');
  const refused = tokens(dir, 'init', '--primary', '#0a7a5a');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /already exists/);
  assert.equal(read(dir, 'design-tokens.json'), before);
  assert.equal(tokens(dir, 'init', '--primary', '#0a7a5a', '--force').status, 0);
  assert.notEqual(read(dir, 'design-tokens.json'), before);
});

test('init rejects wrong values with exit 2 and writes nothing (S4)', () => {
  for (const args of [['--primary', 'blue'], ['--radius', 'round'], ['--density', 'tight'], ['--type-ratio', '1.5'], ['--motion', 'slow'], ['--primary'], ['--nope', 'x']]) {
    const dir = project();
    const run = tokens(dir, 'init', ...args);
    assert.equal(run.status, 2, args.join(' '));
    assert.equal(existsSync(FILE(dir)), false);
  }
  assert.equal(tokens(project(), 'nope').status, 2);
  assert.equal(tokens(project(), 'check', '--out', 'x').status, 2);
  const help = spawnSync(process.execPath, [TOOL, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /tokens\.mjs init/);
});

test('check fails a hand-edited low-contrast pair with one numbered line naming both tokens, the measured and the required ratio (S4)', () => {
  const dir = made('--primary', '#8a4b08');
  const data = JSON.parse(read(dir, 'design-tokens.json'));
  data.color.text.$value = '#9a9a9a';
  writeFileSync(FILE(dir), JSON.stringify(data, null, 2));
  const run = tokens(dir, 'check');
  assert.equal(run.status, 1);
  assert.match(run.stderr, /^1\. color\.text on color\.surface: \d\.\d{1,2}:1, needs 4\.5:1$/m);
  assert.match(run.stderr, /^\d+\. color\.text on color\.surface-raised: /m);
  const json = JSON.parse(tokens(dir, 'check', '--json').stdout);
  assert.equal(json.ok, false);
  assert.ok(json.pairs.some((pair) => !pair.pass && pair.foreground === 'color.text'));
});

test('check reports wrong values, broken references, a loop and a missing required token (S4)', () => {
  const dir = made('--primary', '#8a4b08');
  const base = JSON.parse(read(dir, 'design-tokens.json'));
  const run = (edit) => {
    const data = structuredClone(base);
    edit(data);
    writeFileSync(FILE(dir), JSON.stringify(data));
    const result = tokens(dir, 'check');
    assert.equal(result.status, 1, result.stdout);
    return result.stderr;
  };
  assert.match(run((d) => { d.color.primary.$value = 'blue'; }), /color\.primary: "blue" is not a hex color/);
  assert.match(run((d) => { d.color.primary.$value = '{color.ramp.nope.1}'; }), /color\.primary: the reference \{color\.ramp\.nope\.1\} does not exist/);
  assert.match(run((d) => { d.color.primary.$value = '{color.accent}'; d.color.accent.$value = '{color.primary}'; }), /the references loop/);
  assert.match(run((d) => { d.spacing['4'].$value = '16'; }), /spacing\.4: "16" is not a dimension/);
  assert.match(run((d) => { d.duration.fast.$value = 'quick'; }), /duration\.fast: "quick" is not a duration/);
  assert.match(run((d) => { d.easing.standard.$value = [0.4, 0]; }), /easing\.standard: .* four numbers/);
  assert.match(run((d) => { delete d.color.text; }), /color\.text: the token is missing/);
  writeFileSync(FILE(dir), '{not json');
  const broken = tokens(dir, 'check');
  assert.equal(broken.status, 1);
  assert.match(broken.stderr, /not valid JSON/);
  const missing = tokens(project(), 'check');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /design-tokens\.json not found/);
});

test('css prints the Tailwind v4 @theme with semantic names, dark blocks when dark tokens exist and a reduced-motion block (S4)', () => {
  const dir = made('--primary', '#8a4b08', '--font-display', 'Playfair Display', '--dark');
  const css = tokens(dir, 'css');
  assert.equal(css.status, 0, css.stderr);
  const text = css.stdout;
  assert.match(text, /^@theme \{$/m);
  for (const name of ['--color-primary: #8a4b08;', '--color-surface:', '--color-primary-500:', '--text-xl:', '--text-xl--line-height:', '--spacing-4: 16px;', '--radius-md:', '--ease-standard: cubic-bezier(', '--breakpoint-md:', '--duration-fast:']) assert.ok(text.includes(name), name);
  assert.ok(text.includes('--font-display: "Playfair Display", ui-sans-serif, system-ui, sans-serif;'));
  assert.match(text, /@media \(prefers-color-scheme: dark\) \{\n {2}:root \{\n {4}--color-surface: #/);
  assert.match(text, /^\.dark \{$/m);
  assert.match(text, /@media \(prefers-reduced-motion: reduce\) \{\n {2}:root \{\n {4}--duration-fast: 0ms;/);
  const lightOnly = made('--primary', '#8a4b08');
  assert.doesNotMatch(tokens(lightOnly, 'css').stdout, /prefers-color-scheme|\.dark/);
  const file = join(dir, 'out', 'theme.css');
  const written = tokens(dir, 'css', '--out', 'out/theme.css');
  assert.equal(written.status, 0, written.stderr);
  assert.equal(readFileSync(file, 'utf8'), text);
  assert.equal(toCss(loadTokens(FILE(dir)).data), text, 'the exported function gives the same text');
});

test('css refuses a tokens file with errors and writes nothing (S4)', () => {
  const dir = made('--primary', '#8a4b08');
  const data = JSON.parse(read(dir, 'design-tokens.json'));
  data.color.primary.$value = '{color.ramp.nope.1}';
  writeFileSync(FILE(dir), JSON.stringify(data));
  const run = tokens(dir, 'css', '--out', 'theme.css');
  assert.equal(run.status, 1);
  assert.equal(existsSync(join(dir, 'theme.css')), false);
});

test('doc creates DESIGN.md with the headings of the tokens gate, then refreshes only the text between the markers (S4)', () => {
  const dir = made('--primary', '#8a4b08', '--dark');
  const first = tokens(dir, 'doc');
  assert.equal(first.status, 0, first.stderr);
  const created = read(dir, 'DESIGN.md');
  for (const heading of ['# Design', '## Visual intent', '## Color', '## Type', '## Spacing', '## Radius', '## Motion', '## Contrast']) assert.ok(created.includes(heading), heading);
  assert.ok(created.includes('<!-- tokens:start -->') && created.includes('<!-- tokens:end -->'));
  assert.match(created, /\| --color-primary \| #8a4b08 \|/);
  assert.match(created, /body text on surface: \d+(\.\d+)?:1/);

  const edited = created.replace('<one paragraph you can quote when choosing components>', 'Warm and plain, like a corner bakery.').replace('# Design', '# Design\n\nMy own notes above the tables.') + '\nMy notes after the block.\n';
  writeFileSync(join(dir, 'DESIGN.md'), edited);
  const again = tokens(dir, 'doc');
  assert.equal(again.status, 0);
  assert.equal(read(dir, 'DESIGN.md'), edited, 'unchanged tokens leave the file byte-identical');

  const data = JSON.parse(read(dir, 'design-tokens.json'));
  data.color.primary.$value = '#0a7a5a';
  writeFileSync(FILE(dir), JSON.stringify(data));
  assert.equal(tokens(dir, 'doc').status, 0);
  const refreshed = read(dir, 'DESIGN.md');
  assert.match(refreshed, /\| --color-primary \| #0a7a5a \|/);
  assert.doesNotMatch(refreshed, /#8a4b08/);
  assert.ok(refreshed.startsWith('# Design\n\nMy own notes above the tables.'));
  assert.ok(refreshed.includes('Warm and plain, like a corner bakery.'));
  assert.ok(refreshed.endsWith('\nMy notes after the block.\n'));
});

test('doc adds the block to the end of an existing DESIGN.md without markers, and refuses a lone marker leaving the file untouched (S4)', () => {
  const dir = made('--primary', '#8a4b08');
  const own = '# Design\n\nOur own text.\n';
  writeFileSync(join(dir, 'DESIGN.md'), own);
  assert.equal(tokens(dir, 'doc').status, 0);
  const text = read(dir, 'DESIGN.md');
  assert.ok(text.startsWith(own.trimEnd()));
  assert.ok(text.includes('<!-- tokens:end -->'));
  const lone = '# Design\n\n<!-- tokens:start -->\nhalf a block\n';
  writeFileSync(join(dir, 'DESIGN.md'), lone);
  const refused = tokens(dir, 'doc');
  assert.equal(refused.status, 1);
  assert.equal(read(dir, 'DESIGN.md'), lone);
  assert.equal(tokens(project(), 'doc').status, 1, 'no tokens file, no DESIGN.md');
});

test('the exported functions: ramp has 11 steps with the chosen color in it, typeScale grows by the ratio (S4)', () => {
  const steps = ramp('#8a4b08');
  assert.deepEqual(Object.keys(steps), ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']);
  assert.ok(Object.values(steps).includes('#8a4b08'));
  assert.ok(contrastRatio(steps['50'], steps['950']) > 12, 'light to dark');
  const scale = typeScale(1.25);
  assert.deepEqual(scale.map((entry) => entry.name), ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl']);
  assert.equal(scale.find((entry) => entry.name === 'base').px, 16);
  assert.equal(scale.find((entry) => entry.name === 'xl').px, 25);
  assert.ok(scale.find((entry) => entry.name === 'xs').px >= 12);
  assert.ok(scale.find((entry) => entry.name === '5xl').lineHeight < scale.find((entry) => entry.name === 'base').lineHeight);
  assert.throws(() => ramp('blue'));
});

test('init writes the layout tokens of LAYOUT-RULES.md: section-lg by density (96 only here), container.form, and css prints them (T6)', () => {
  const by = { compact: [32, 48], regular: [48, 64], spacious: [64, 96] };
  for (const [density, [small, large]] of Object.entries(by)) {
    const dir = made('--primary', '#8a4b08', '--density', density);
    const { tokens: all } = resolveTokens(JSON.parse(read(dir, 'design-tokens.json')));
    assert.equal(all['spacing.section'].value, `${small}px`, density);
    assert.equal(all['spacing.section-lg'].value, `${large}px`, density);
    assert.equal(all['container.form'].value, '28rem');
    assert.equal(all['container.page'].value, '72rem');
    assert.equal(all['container.prose'].value, '42rem');
  }
  const dir = made('--primary', '#8a4b08');
  const css = tokens(dir, 'css');
  assert.equal(css.status, 0, css.stderr);
  assert.match(css.stdout, /--spacing-section-lg: 64px;/);
  assert.match(css.stdout, /--container-form: 28rem;/);
  assert.equal(tokens(dir, 'check').status, 0);
  assert.match(read(dir, 'design-tokens.json'), /"section-lg"/);
  assert.equal(tokens(dir, 'doc').status, 0);
  assert.match(read(dir, 'DESIGN.md'), /section-lg 64px/);
});
