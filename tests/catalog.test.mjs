import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

import { parseArgs, matches, relevance, search } from '../ai-frontend-guide-kit/tools/find.mjs';
import { scoreEntry } from '../tools/quality.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KIT = join(ROOT, 'ai-frontend-guide-kit');
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

const entry = (over = {}) => ({
  id: 'demo-hero-a', name: 'Demo Hero A', source: 'Demo UI', entry_type: 'component', category: 'hero',
  description: 'A hero section with a headline and a call to action button.', use_case: 'Landing pages above the fold.',
  search_tags: ['hero', 'landing'], stack: ['react', 'tailwind'], license_type: 'MIT', commercial_use: true, free: true,
  install_method: 'shadcn-cli', docs_url: 'https://example.com', dependencies: [], quality: 80, ...over,
});

test('parseArgs handles flags, values and --json', () => {
  const args = parseArgs(['--category', 'hero', '--commercial', '--limit', '3', '--json']);
  assert.equal(args.category, 'hero');
  assert.equal(args.commercial, true);
  assert.equal(args.limit, '3');
  assert.equal(args.json, true);
});

test('relevance requires every word and weights name over description', () => {
  const e = entry();
  assert.ok(relevance(e, 'hero landing') > 0);
  assert.equal(relevance(e, 'hero pricing'), 0);
  assert.ok(relevance(e, 'demo') > relevance(e, 'headline'));
});

test('--source matches ids ignoring spaces and punctuation (magicui vs Magic UI)', () => {
  assert.ok(matches(entry({ source: 'Magic UI' }), { source: 'magicui' }));
  assert.ok(matches(entry({ source: 'cult/ui' }), { source: 'cultui' }));
  assert.ok(!matches(entry({ source: 'Magic UI' }), { source: 'daisy' }));
});

test('filters: stack, license, licensed, min-quality, icons hidden by default', () => {
  assert.ok(matches(entry(), { stack: 'react' }));
  assert.ok(!matches(entry(), { stack: 'vue' }));
  assert.ok(!matches(entry({ license_type: 'unknown' }), { licensed: true }));
  assert.ok(!matches(entry({ quality: 40 }), { 'min-quality': '60' }));
  assert.ok(!matches(entry({ entry_type: 'icon' }), {}));
  assert.ok(matches(entry({ entry_type: 'icon' }), { type: 'icon' }));
  assert.ok(matches(entry({ entry_type: 'icon' }), { all: true }));
});

test('search collapses near-duplicates across sources but keeps other frameworks', () => {
  // same base name collapses per framework
  const base = (id, source, stack, quality) => entry({ id, source, name: `${source} Accordion`, stack, quality });
  const out = search([base('a1', 'A', ['react'], 70), base('b1', 'B', ['react'], 90), base('c1', 'C', ['vue'], 60)], {});
  assert.equal(out.results.length, 2);
  assert.equal(out.hidden, 1);
  assert.equal(out.results[0].id, 'b1');
  assert.equal(search([base('a1', 'A', ['react'], 70), base('b1', 'B', ['react'], 90)], { all: true }).results.length, 2);
});

test('quality score is bounded and orders by license clarity and install effort', () => {
  const good = scoreEntry(entry(), 'shadcn');
  const weak = scoreEntry(entry({ license_type: 'unknown', install_method: undefined, dependencies: ['a', 'b', 'c', 'd', 'e'] }), 'uiverse');
  const icon = scoreEntry(entry({ entry_type: 'icon' }), 'shadcn');
  assert.ok(good <= 100 && weak >= 0);
  assert.ok(good > weak);
  assert.ok(icon < good);
});

test('every catalog entry has a quality score and licenses are enumerated values', () => {
  const dir = join(ROOT, 'manifest', 'sources');
  const allowed = new Set(['MIT', 'Apache-2.0', 'proprietary', 'custom', 'non-commercial', 'unknown']);
  let total = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const doc = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    for (const e of doc.entries) {
      total += 1;
      assert.ok(Number.isInteger(e.quality), `${e.id} lacks quality`);
      assert.ok(allowed.has(e.license_type), `${e.id} license`);
    }
  }
  assert.ok(total > 3000);
});

test('kit catalog is byte-identical to manifest (run build-kit when this fails)', () => {
  for (const file of ['component-manifest.json', 'component-manifest.md', 'taxonomy.md', 'install-guides.md', 'schema.json']) {
    assert.equal(sha(join(KIT, 'catalog', file)), sha(join(ROOT, 'manifest', file)), file);
  }
  for (const file of readdirSync(join(ROOT, 'manifest', 'sources'))) {
    assert.equal(sha(join(KIT, 'catalog', 'sources', file)), sha(join(ROOT, 'manifest', 'sources', file)), file);
  }
});

test('get prints an entry with quality, and fails clearly for a missing id', () => {
  const ok = spawnSync(process.execPath, [join(KIT, 'tools', 'get.mjs'), 'magicui-text-animated-shiny-text'], { encoding: 'utf8' });
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /Magic UI Animated Shiny Text/);
  assert.match(ok.stdout, /quality: \d+/);
  const bad = spawnSync(process.execPath, [join(KIT, 'tools', 'get.mjs'), 'does-not-exist'], { encoding: 'utf8' });
  assert.notEqual(bad.status, 0);
});

test('find CLI --json returns structured results for the new sources', () => {
  for (const source of ['reactbits', 'arcui', 'cultui', 'kiboui', 'animateui', 'shadcnvue', 'shadcnsvelte']) {
    const run = spawnSync(process.execPath, [join(KIT, 'tools', 'find.mjs'), '--source', source, '--limit', '2', '--json'], { encoding: 'utf8' });
    assert.equal(run.status, 0, source);
    const json = JSON.parse(run.stdout);
    assert.ok(json.total > 0, `${source} has results`);
    assert.ok(json.results.every((r) => r.id.startsWith(source)), source);
  }
});

test('category audit stays under the 3% suspicious threshold', () => {
  const run = spawnSync(process.execPath, [join(ROOT, 'tools', 'audit-categories.mjs'), '--strict'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout);
});
