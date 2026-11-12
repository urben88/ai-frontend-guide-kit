import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { parseArgs, search } from '../ai-frontend-guide-kit/tools/find.mjs';
import { scoreEntry } from '../tools/quality.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIND = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'find.mjs');
const run = (...args) => spawnSync(process.execPath, [FIND, ...args], { encoding: 'utf8' });
const rows = (stdout) => stdout.split('\n').filter((line) => line.includes(' | '));
const ids = (stdout) => rows(stdout).map((line) => line.split(' | ')[0]);
const jsonIds = (...args) => JSON.parse(run(...args, '--json').stdout).results.map((r) => r.id);

const entry = (over = {}) => ({
  id: 'demo-pricing-a', name: 'Demo Pricing Card', source: 'Demo UI', entry_type: 'component', category: 'pricing',
  description: 'A pricing card.', search_tags: ['pricing'], stack: ['react'], license_type: 'MIT', commercial_use: true, free: true,
  install_method: 'shadcn-cli', dependencies: [], quality: 80, ...over,
});

// S5: positional query
test('positional query works like --text', () => {
  const positional = run('pricing card', '--limit', '5', '--json');
  const flagged = run('--text', 'pricing card', '--limit', '5', '--json');
  assert.equal(positional.status, 0, positional.stderr);
  assert.equal(positional.stdout, flagged.stdout);
  assert.ok(JSON.parse(positional.stdout).total < 2000, 'must not return the whole catalog');
});

test('positional words after a boolean flag stay part of the query', () => {
  const args = parseArgs(['--commercial', 'login', 'form', '--limit', '3']);
  assert.equal(args.commercial, true);
  assert.equal(args.text, 'login form');
  assert.equal(args.limit, '3');
});

// S5: stopwords and partial matching
test('stopwords are ignored and the best pricing components rank first', () => {
  const out = run('--text', 'pricing card with toggle', '--limit', '5');
  assert.equal(out.status, 0, out.stderr);
  const top = rows(out.stdout);
  assert.equal(top.length, 5);
  // Every one of the first five is a pricing or billing/toggle component, none is a stopword hit ("with").
  assert.ok(top.every((row) => /pricing|billing|toggle/i.test(row.split(' | ')[1])), `expected pricing components, got ${top}`);
});

test('a query of only stopwords still returns results instead of nothing', () => {
  const out = run('--text', 'with', '--limit', '3');
  assert.equal(out.status, 0);
});

test('entries matching more words rank above entries matching fewer', () => {
  const a = entry({ id: 'a', name: 'Pricing Card Toggle', search_tags: [] });
  const b = entry({ id: 'b', name: 'Pricing Tabs', category: 'tabs', description: 'Toggle tabs.', search_tags: [] });
  const out = search([b, a], { text: 'pricing card with toggle' });
  assert.deepEqual(out.results.map((e) => e.id), ['a', 'b']);
});

// S4: source order
test('pricing card and login form never rank an unknown-license source first', () => {
  for (const q of ['pricing card', 'login form']) {
    const top = jsonIds(q, '--limit', '5');
    assert.equal(top.length, 5, q);
    assert.ok(top.every((id) => /^(reui|shadcn|shadcnspace)-/.test(id)), `${q}: ${top}`);
  }
  const top = jsonIds('--text', 'pricing card with toggle', '--limit', '5');
  assert.ok(top.every((id) => /^(reui|shadcn|shadcnspace)-/.test(id)), `toggle: ${top}`);
});

test('role order: ReUI, then shadcn/ui, then Shadcn Space, for equally matching entries', () => {
  const mk = (id, source, quality) => entry({ id, name: `${source} Login Form`, source, quality, category: id });
  const out = search([mk('shadcnspace-x', 'Shadcn Space', 90), mk('shadcn-x', 'shadcn/ui', 90), mk('reui-x', 'ReUI', 80), mk('other-x', 'Other', 99)], { text: 'login form' });
  assert.deepEqual(out.results.map((e) => e.id), ['reui-x', 'shadcn-x', 'shadcnspace-x', 'other-x']);
});

test('license and source tier outweigh a plain name hit', () => {
  const unknownNameHit = entry({ id: '21stdev-a', source: '21.dev', name: 'Login Form', license_type: 'unknown', category: 'a' });
  const reuiTagHit = entry({ id: 'reui-a', source: 'ReUI', name: 'Card 12', description: 'Login form card.', search_tags: [], category: 'b' });
  const out = search([unknownNameHit, reuiTagHit], { text: 'login form' });
  assert.equal(out.results[0].id, 'reui-a');
  const unknownLast = search([unknownNameHit, entry({ id: 'misc-a', source: 'Misc', name: 'Login Form', category: 'c' })], { text: 'login form' });
  assert.equal(unknownLast.results[0].id, 'misc-a');
});

test('quality score puts the big free sources above an unknown-license source', () => {
  const reui = scoreEntry(entry(), 'reui');
  const shadcn = scoreEntry(entry(), 'shadcn');
  const space = scoreEntry(entry(), 'shadcnspace');
  const unknown = scoreEntry(entry({ license_type: 'unknown' }), '21stdev');
  assert.ok(reui >= shadcn && shadcn >= space, `${reui} ${shadcn} ${space}`);
  assert.ok(space > unknown + 20);
});

// Existing options keep their previous behavior
test('--category, --stack, --limit and --source still filter', () => {
  const cat = JSON.parse(run('--category', 'pricing', '--limit', '4', '--json').stdout);
  assert.equal(cat.shown, 4);
  assert.ok(cat.results.every((r) => r.category === 'pricing'));
  const stack = JSON.parse(run('--category', 'pricing', '--stack', 'vue', '--limit', '3', '--json').stdout);
  assert.ok(stack.results.every((r) => r.stack.map((s) => s.toLowerCase()).includes('vue')));
  const src = jsonIds('--source', 'reui', '--limit', '5');
  assert.ok(src.length > 0 && src.every((id) => id.startsWith('reui-')));
});

test('--commercial, --type and --all still behave', () => {
  const commercial = JSON.parse(run('--text', 'pricing', '--commercial', '--limit', '50', '--json').stdout);
  assert.ok(commercial.results.every((r) => r.commercial_use !== false));
  const icons = JSON.parse(run('--type', 'icon', '--limit', '3', '--json').stdout);
  assert.ok(icons.results.length > 0 && icons.results.every((r) => r.entry_type === 'icon'));
  const all = JSON.parse(run('--text', 'pricing', '--all', '--limit', '1', '--json').stdout);
  assert.equal(all.hidden_duplicates, 0);
});

test('--text still filters out entries that match no word', () => {
  const out = run('--text', 'zzzqqqxxx');
  assert.equal(out.status, 0);
  assert.match(out.stdout, /0 matches/);
});
