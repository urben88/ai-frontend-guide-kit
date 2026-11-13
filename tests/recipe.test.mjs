import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadEntries, search } from '../ai-frontend-guide-kit/tools/find.mjs';
import { INVENTORY_COLUMNS } from '../ai-frontend-guide-kit/tools/flow-gates.mjs';
import { buildTokens } from '../ai-frontend-guide-kit/tools/tokens.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KIT = join(ROOT, 'ai-frontend-guide-kit');
const TOOL = join(KIT, 'tools', 'recipe.mjs');
const DATA = join(KIT, 'experience', 'page-recipes.json');
const RULES = join(KIT, 'experience', 'LAYOUT-RULES.md');

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};
const recipe = (...args) => spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8', env: cleanEnv() });
const project = () => mkdtempSync(join(tmpdir(), 'recipe-'));
const put = (dir, rel, text) => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), text);
};
const data = () => JSON.parse(readFileSync(DATA, 'utf8'));
const BRIEF = 'ai-frontend-output/ux/EXPERIENCE-BRIEF.md';
const SPEC = 'ai-frontend-output/ux/UX-SPEC.md';
const REQUIRED_PAGES = ['marketing-landing', 'saas-home', 'pricing-page', 'about-company', 'contact', 'blog-index', 'article', 'docs-page', 'portfolio-case', 'product-page', 'product-listing', 'checkout', 'auth', 'onboarding', 'dashboard-home', 'data-table', 'detail-record', 'settings', 'first-run', 'error-404'];

const BRIEF_TEXT = [
  '# Experience brief',
  '## Context', 'A bakery that sells bread online.',
  '## Goal', 'The visitor places a first order.',
  '## Archetype', 'site archetype: Marketing / conversion · experience archetype: Converter', 'navigation_model: single-page-anchors',
  'pages: Home — sells; Pricing — plans; Zebra workshop — odd', 'why: orders start at home',
  '## Philosophy', 'chosen: warm',
  '',
].join('\n');
const SPEC_TEXT = [
  '# UX spec',
  '## Screens',
  '| Screen | Purpose | Primary action | Empty state | Loading state | Error state | Serves |', '|---|---|---|---|---|---|---|',
  '| Home | sells bread | Order | none | skeleton | retry | G1, P1 |',
  '| Pricing | shows the plans | Choose a plan | none | skeleton | retry | G1, O1 |',
  '| Account settings | change the details | Save | none | skeleton | retry | O2 |',
  '| Zebra workshop | odd | Open | none | skeleton | retry | P1 |',
  '## Flows', '1. Home → Pricing',
  '',
].join('\n');
const PRODUCT_TEXT = [
  '# Product',
  '## Audience', 'Neighbours.',
  '## Primary action', 'G1: place a first order.',
  '## Objections', 'O1: delivery may be late.', 'O2: the price is unknown.',
  '## Proof', 'P1: 2,000 orders delivered.',
  '## Tone', 'Warm.',
  '',
].join('\n');
const fixture = ({ brief = BRIEF_TEXT, spec = SPEC_TEXT, product = PRODUCT_TEXT } = {}) => {
  const dir = project();
  if (brief) put(dir, BRIEF, brief);
  if (spec) put(dir, SPEC, spec);
  if (product) put(dir, 'PRODUCT.md', product);
  return dir;
};

test('check passes on the shipped recipes: 20 page types with ordered sections, every field valid (T6)', () => {
  const run = recipe('check');
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /20 recipes/);
  const recipes = data().recipes;
  assert.deepEqual(REQUIRED_PAGES.filter((id) => !recipes.some((entry) => entry.id === id)), []);
  for (const entry of recipes) {
    assert.ok(entry.sections.length >= 4, `${entry.id} has ${entry.sections.length} sections`);
    assert.ok(entry.sections.some((section) => section.required), `${entry.id} has a required section`);
    for (const section of entry.sections) assert.ok(section.job.length > 30 && section.avoid.length > 15, `${entry.id}/${section.id} has a job and an avoid`);
  }
  assert.equal(JSON.parse(recipe('check', '--json').stdout).ok, true);
});

test('check fails on a broken copy and names every problem; a missing or invalid file is refused (T6)', () => {
  const dir = project();
  const broken = data();
  broken.recipes[0].sections[1].category = 'heroes';
  broken.recipes[0].sections[2].layout = 'zigzag';
  broken.recipes[0].sections[3].narrative = 'joy';
  broken.recipes[0].site_archetypes = ['Marketing / conversion', 'Blog'];
  broken.recipes[1].experience_archetypes = ['Wizard of Oz'];
  broken.recipes[2].id = broken.recipes[3].id;
  delete broken.recipes[4].sections[0].job;
  broken.recipes[5].sections[0].serves = 'X';
  broken.recipes[6].sections[0].query = '';
  const file = join(dir, 'broken.json');
  writeFileSync(file, JSON.stringify(broken));
  const run = recipe('check', '--recipes', file);
  assert.equal(run.status, 1, run.stdout);
  for (const pattern of [/category "heroes"/, /layout "zigzag"/, /narrative "joy"/, /site archetype "Blog"/, /experience archetype "Wizard of Oz"/, /duplicate recipe id/, /"job"/, /serves "X"/, /query/]) assert.match(run.stderr, pattern);
  assert.equal(JSON.parse(recipe('check', '--recipes', file, '--json').stdout).ok, false);

  const bad = join(dir, 'bad.json');
  writeFileSync(bad, '{ nope');
  assert.equal(recipe('check', '--recipes', bad).status, 1);
  assert.equal(recipe('check', '--recipes', join(dir, 'missing.json')).status, 1);
});

test('every query of every section returns at least one catalog entry of its category (T6)', () => {
  const entries = loadEntries();
  const empty = [];
  for (const entry of data().recipes) {
    for (const section of entry.sections) {
      if (search(entries, { text: section.query, category: section.category, limit: 12 }).total < 1) empty.push(`${entry.id}/${section.id}: "${section.query}" in ${section.category}`);
    }
  }
  assert.deepEqual(empty, []);
});

test('list prints one line per recipe, --archetype filters by site or experience archetype, --json gives data (T6)', () => {
  const all = recipe('list');
  assert.equal(all.status, 0, all.stderr);
  const lines = all.stdout.trim().split('\n');
  assert.equal(lines.length, 20);
  assert.match(lines[0], /^marketing-landing — Marketing landing page/);
  assert.ok(Buffer.byteLength(all.stdout) < 3200);
  const converter = recipe('list', '--archetype', 'Converter').stdout.trim().split('\n');
  assert.ok(converter.length >= 3 && converter.length < 20);
  assert.ok(converter.some((line) => line.startsWith('pricing-page')));
  assert.ok(!converter.some((line) => line.startsWith('dashboard-home')));
  const site = recipe('list', '--archetype', 'Internal / operational').stdout;
  assert.match(site, /dashboard-home/);
  assert.equal(recipe('list', '--archetype', 'Nonsense').status, 2);
  const json = JSON.parse(recipe('list', '--json').stdout);
  assert.equal(json.length, 20);
  assert.deepEqual(Object.keys(json[0]).sort(), ['id', 'name', 'navigation_model', 'sections', 'use_when']);
});

test('show prints the sections in order with job, narrative, layout and query; one section in full; unknown id exits 2 (T6)', () => {
  const run = recipe('show', 'pricing-page');
  assert.equal(run.status, 0, run.stderr);
  const expected = data().recipes.find((entry) => entry.id === 'pricing-page').sections;
  const lines = run.stdout.split('\n');
  let at = -1;
  expected.forEach((section, n) => {
    const next = lines.findIndex((line) => line.startsWith(`${n + 1} ${section.id} `));
    assert.ok(next > at, `${section.id} appears in order`);
    at = next;
    assert.ok(lines[next + 1].includes(section.job), `${section.id} job`);
  });
  assert.match(run.stdout, /plans · interest · grid-3 · must · find "pricing plans"/);
  assert.ok(Buffer.byteLength(run.stdout) < 2600, `${Buffer.byteLength(run.stdout)} bytes`);
  const one = recipe('show', 'checkout', 'payment');
  assert.equal(one.status, 0);
  assert.match(one.stdout, /avoid: /);
  assert.match(one.stdout, /states: loading, error/);
  assert.equal(recipe('show', 'checkout', 'nope').status, 2);
  const missing = recipe('show', 'nope');
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /unknown recipe "nope"/);
  assert.equal(recipe('show').status, 2);
  assert.equal(JSON.parse(recipe('show', 'contact', '--json').stdout).id, 'contact');
});

test('suggest reads the spec screens and the brief, proposes a recipe with the reason, and says so when none fits (T6)', () => {
  const dir = fixture();
  const run = recipe('suggest', '--dir', dir);
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Home → marketing-landing/);
  assert.match(run.stdout, /Pricing → pricing-page/);
  assert.match(run.stdout, /Account settings → settings/);
  assert.match(run.stdout, /Zebra workshop → no recipe: describe its blocks by hand/);
  assert.match(run.stdout, /Converter/, 'the archetype of the brief is part of a reason');
  assert.ok(Buffer.byteLength(run.stdout) < 1400, `${Buffer.byteLength(run.stdout)} bytes`);
  const json = JSON.parse(recipe('suggest', '--dir', dir, '--json').stdout);
  assert.deepEqual(json.screens.map((screen) => [screen.screen, screen.recipe]), [['Home', 'marketing-landing'], ['Pricing', 'pricing-page'], ['Account settings', 'settings'], ['Zebra workshop', null]]);

  const briefOnly = fixture({ spec: null });
  const fromBrief = recipe('suggest', '--dir', briefOnly);
  assert.equal(fromBrief.status, 0, fromBrief.stderr);
  assert.match(fromBrief.stdout, /pages of EXPERIENCE-BRIEF\.md/);
  assert.match(fromBrief.stdout, /Pricing → pricing-page/);
  assert.match(fromBrief.stdout, /Zebra workshop → no recipe/);

  const specOnly = fixture({ brief: null });
  assert.match(recipe('suggest', '--dir', specOnly).stdout, /Home → marketing-landing/);

  const empty = fixture({ brief: null, spec: null });
  const refused = recipe('suggest', '--dir', empty);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /UX-SPEC\.md/);
});

test('a screen called home becomes the dashboard when the brief says navigation_model: console; ties and Spanish names resolve (T6)', () => {
  const spec = SPEC_TEXT.replace(/\| Account settings[^\n]*\n/, '| Order detail | one order | Refund | none | skeleton | retry | G1 |\n').replace(/\| Zebra workshop[^\n]*\n/, '| Pedidos | list | Open | none | skeleton | retry | G1 |\n');
  const app = fixture({ brief: BRIEF_TEXT.replace('single-page-anchors', 'console').replace('Marketing / conversion', 'Internal / operational').replace('Converter', 'Operator'), spec });
  const text = recipe('suggest', '--dir', app).stdout;
  assert.match(text, /Home → dashboard-home/);
  assert.match(text, /Order detail → detail-record/);
  assert.match(text, /Pedidos → data-table/);
  assert.match(recipe('suggest', '--dir', fixture({ spec })).stdout, /Home → marketing-landing/);
});

test('inventory builds the wide table from the recipes of the suggested screens; shared blocks become one row; Serves comes from PRODUCT.md (T6)', () => {
  const dir = fixture();
  const run = recipe('inventory', '--dir', dir);
  assert.equal(run.status, 0, run.stderr);
  const lines = run.stdout.trim().split('\n').filter((line) => line.startsWith('|'));
  assert.equal(lines[0], `| ${INVENTORY_COLUMNS.join(' | ')} |`);
  assert.equal(lines[1], `|${INVENTORY_COLUMNS.map(() => '---').join('|')}|`);
  const rows = lines.slice(2).map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()));
  for (const row of rows) assert.equal(row.length, INVENTORY_COLUMNS.length, row.join('|'));
  const cell = (screen, block) => Object.fromEntries(INVENTORY_COLUMNS.map((name, at) => [name, rows.find((row) => row[0] === screen && row[1] === block)?.[at]]));
  const hero = cell('Home', 'hero');
  assert.deepEqual([hero.Category, hero.Priority, hero.Serves, hero.Layout, hero.Query, hero.Candidates, hero.Decision], ['hero', 'must', 'G1', 'split', 'hero', '', '']);
  assert.match(hero.Notes, /In 3 seconds say what it is/);
  assert.equal(cell('Home', 'logos').Priority, 'should');
  assert.equal(cell('Home', 'faq').Serves, 'O1, O2');
  assert.equal(cell('Home', 'testimonials').Serves, 'P1');
  assert.equal(cell('Pricing', 'plans').Serves, 'G1');
  assert.equal(cell('Home', 'benefits').Serves, '', 'a section that serves nothing stays empty');
  assert.equal(cell('Account settings', 'profile-form').Serves, 'G1');
  assert.match(cell('Account settings', 'profile-form').Notes, /States: loading, error\./);
  assert.equal(rows.filter((row) => row[1] === 'footer').length, 1, 'the footer is one shared row');
  const footer = rows.find((row) => row[1] === 'footer');
  assert.equal(footer[0], 'shared');
  assert.match(footer[4], /Used by: Home, Pricing/);
  assert.equal(rows.some((row) => row[0] === 'Zebra workshop'), false, 'no row for a screen without recipe');
  assert.match(run.stderr + run.stdout, /Zebra workshop/, 'the screen without recipe is named');
  assert.equal(rows.some((row) => /[<>]/.test(row.join('|'))), false, 'no template token is left');
  assert.equal(existsSync(join(dir, 'ai-frontend-output', 'INVENTORY.md')), false, 'without --write nothing is written');
});

test('Serves is left empty when PRODUCT.md is missing or has no id of that kind (T6)', () => {
  const dir = fixture({ product: null });
  const rows = recipe('inventory', '--dir', dir).stdout.split('\n').filter((line) => line.startsWith('| Home | hero'));
  assert.equal(rows.length, 1);
  const cells = rows[0].slice(1, -1).split('|').map((cell) => cell.trim());
  assert.equal(cells[INVENTORY_COLUMNS.indexOf('Serves')], '');
  assert.equal(cells[INVENTORY_COLUMNS.indexOf('Layout')], 'split');
});

test('inventory --write writes ai-frontend-output/INVENTORY.md and refuses to overwrite it without --force (T6)', () => {
  const dir = fixture();
  const file = join(dir, 'ai-frontend-output', 'INVENTORY.md');
  const first = recipe('inventory', '--write', '--dir', dir);
  assert.equal(first.status, 0, first.stderr);
  assert.ok(existsSync(file));
  const text = readFileSync(file, 'utf8');
  assert.match(text, /^# Inventory\n/);
  assert.match(text, /\| Home \| hero \| hero \| must \|/);
  assert.match(first.stdout, /Wrote .*INVENTORY\.md/);

  writeFileSync(file, 'my own table\n');
  const refused = recipe('inventory', '--write', '--dir', dir);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /already exists and was not changed; use --force/);
  assert.equal(readFileSync(file, 'utf8'), 'my own table\n');

  const forced = recipe('inventory', '--write', '--force', '--dir', dir);
  assert.equal(forced.status, 0, forced.stderr);
  assert.equal(readFileSync(file, 'utf8'), text, 'the same input writes the same bytes');

  const scaffold = fixture();
  const template = ['# Inventory', `| ${INVENTORY_COLUMNS.join(' | ')} |`, `|${INVENTORY_COLUMNS.map(() => '---').join('|')}|`, '| <screen of the spec> | <block> | <category> | must | <…> | | | <G1, O1, P1> | <layout> | <search words> |', ''].join('\n');
  put(scaffold, 'ai-frontend-output/INVENTORY.md', template);
  assert.equal(recipe('inventory', '--write', '--dir', scaffold).status, 0, 'a file that is only the scaffold of the flow is replaced without --force');
  assert.match(readFileSync(join(scaffold, 'ai-frontend-output', 'INVENTORY.md'), 'utf8'), /\| Home \| hero /);
  const blank = fixture();
  put(blank, 'ai-frontend-output/INVENTORY.md', '\n');
  assert.equal(recipe('inventory', '--write', '--dir', blank).status, 0, 'an empty file is replaced too');

  const rootCopy = fixture();
  put(rootCopy, 'INVENTORY.md', 'kept\n');
  assert.equal(recipe('inventory', '--write', '--dir', rootCopy).status, 1, 'an INVENTORY.md in the root counts too');
  assert.equal(existsSync(join(rootCopy, 'ai-frontend-output', 'INVENTORY.md')), false);
});

test('inventory refuses with no screen that has a recipe, and writes nothing (T6)', () => {
  const dir = fixture({ spec: SPEC_TEXT.replace(/\| (Home|Pricing|Account settings)[^\n]*\n/g, ''), brief: null });
  const run = recipe('inventory', '--write', '--dir', dir);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /no screen has a recipe/);
  assert.equal(existsSync(join(dir, 'ai-frontend-output', 'INVENTORY.md')), false);
});

test('usage errors exit 2 with the usage text; --help exits 0 and names every command (T6)', () => {
  for (const args of [[], ['nope'], ['list', '--nope'], ['check', 'extra'], ['inventory', '--archetype', 'x'], ['list', '--dir']]) {
    const run = recipe(...args);
    assert.equal(run.status, 2, args.join(' '));
    assert.match(run.stderr, /recipe: /);
  }
  const help = recipe('--help');
  assert.equal(help.status, 0);
  for (const word of ['list', 'show', 'suggest', 'inventory', 'check', '--dir', '--json']) assert.ok(help.stdout.includes(word), word);
});

test('LAYOUT-RULES.md stays short and its numbers agree with tokens.mjs: breakpoints, container, spacing, sections (T6)', () => {
  const text = readFileSync(RULES, 'utf8');
  assert.ok(text.trimEnd().split('\n').length <= 120, 'at most 120 lines');
  const tokens = buildTokens({});
  const px = (value) => (String(value).endsWith('rem') ? parseFloat(value) * 16 : parseFloat(value));
  const value = (path) => path.split('.').reduce((node, key) => node[key], tokens).$value;
  const line = (label) => text.split('\n').find((entry) => entry.startsWith(`- ${label}`)) ?? assert.fail(`no line "${label}"`);
  const named = (entry, name) => Number(new RegExp(`${name} (\\d+)`).exec(entry)?.[1]);

  const breakpoints = line('Breakpoints');
  for (const name of ['sm', 'md', 'lg', 'xl', '2xl']) assert.equal(named(breakpoints, name), px(value(`breakpoint.${name}`)), `breakpoint ${name}`);
  const container = line('Container');
  for (const name of ['page', 'prose', 'form']) assert.equal(named(container, name), px(value(`container.${name}`)), `container ${name}`);
  const scale = [1, 2, 3, 4, 6, 8, 12, 16].map((step) => px(value(`spacing.${step}`)));
  assert.deepEqual(line('Spacing scale').match(/\d+/g).slice(0, 8).map(Number), scale);
  assert.match(container, /16 below md, 24 at md, 32 from lg/);
  assert.equal(px(value('spacing.4')), 16);
  assert.equal(px(value('spacing.6')), 24);
  assert.equal(px(value('spacing.8')), 32);

  const sections = line('Section padding');
  const [small, large] = ['below md ([\\d ·]+);', 'from md ([\\d ·]+) '].map((pattern) => new RegExp(pattern).exec(sections)[1].split('·').map((number) => Number(number.trim())));
  const byDensity = (density) => buildTokens({ density });
  assert.deepEqual(['compact', 'regular', 'spacious'].map((density) => px(byDensity(density).spacing.section.$value)), small);
  assert.deepEqual(['compact', 'regular', 'spacious'].map((density) => px(byDensity(density).spacing['section-lg'].$value)), large);
  assert.deepEqual(['compact', 'regular', 'spacious'].map((density) => px(byDensity(density).spacing.gutter.$value)), [16, 24, 32]);
  assert.match(line('Grid'), /spacing\.gutter` \(compact 16, regular 24, spacious 32\)/);
});

test('every layout the recipes use is defined in LAYOUT-RULES.md, and every defined layout is used (T6)', () => {
  const text = readFileSync(RULES, 'utf8');
  const defined = [...text.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((match) => match[1]);
  const used = new Set(data().recipes.flatMap((entry) => entry.sections.map((section) => section.layout)));
  assert.ok(defined.length >= 10);
  assert.deepEqual([...used].filter((name) => !defined.includes(name)), []);
  assert.deepEqual(defined.filter((name) => !used.has(name)), []);
  for (const name of defined) assert.match(text.split('\n').find((row) => row.startsWith(`| \`${name}\``)), /\|.*\|.*\|.*\|.*\|/, `${name} has the 360, 768 and 1280 columns`);
});
