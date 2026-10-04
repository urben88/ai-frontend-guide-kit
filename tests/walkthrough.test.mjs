import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EX = join(ROOT, 'examples', 'walkthrough');
const read = (...p) => readFileSync(join(EX, ...p), 'utf8');

const catalogIds = new Set();
const sources = join(ROOT, 'manifest', 'sources');
for (const file of readdirSync(sources).filter((f) => f.endsWith('.json'))) {
  for (const entry of JSON.parse(readFileSync(join(sources, file), 'utf8')).entries) catalogIds.add(entry.id);
}
const experienceIds = new Set(JSON.parse(readFileSync(join(ROOT, 'ai-frontend-guide-kit', 'experience', 'experience-manifest.json'), 'utf8')).entries.map((e) => e.id));

test('UX-SPEC cites only catalog ids that exist', () => {
  const ids = [...read('ai-frontend-output', 'ux', 'UX-SPEC.md').matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)+)`/g)].map((m) => m[1]).filter((id) => /^(daisyui|hyperui|shadcn|magicui)/.test(id));
  assert.ok(ids.length >= 4);
  for (const id of ids) assert.ok(catalogIds.has(id), `${id} exists in the catalog`);
});

test('brief cites experience-manifest ids and reference cards that exist', () => {
  const brief = read('ai-frontend-output', 'ux', 'EXPERIENCE-BRIEF.md');
  for (const id of brief.match(/exp-[a-z0-9-]+/g)) assert.ok(experienceIds.has(id), `${id} exists`);
  for (const slug of [...brief.matchAll(/\[ref: ([a-z0-9-]+)\]/g)].map((m) => m[1])) {
    assert.ok(readdirSync(join(ROOT, 'ai-frontend-guide-kit', 'experience', 'references')).includes(`reference-${slug}.md`), `card ${slug}`);
  }
  for (const heading of ['## Context', '## Goal and archetype', '## Philosophy and style', '## References used', '## Journey (emotion)', '## Constraints']) {
    assert.ok(brief.includes(heading), heading);
  }
});

test('selection memory ids exist and combination was saved', () => {
  const lines = read('ai-frontend-output', 'selections.jsonl').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(lines.length >= 6);
  for (const row of lines.filter((r) => r.decision !== 'build')) assert.ok(catalogIds.has(row.id ?? row.entry_id), `${row.id} exists`);
  assert.ok(read('ai-frontend-output', 'combinations.json').includes('tidewatch-landing'));
});

test('every token in DESIGN.md is defined in tokens.css and the page uses the stylesheet', () => {
  const design = read('ai-frontend-output', 'ux', 'DESIGN.md');
  const css = read('site', 'tokens.css');
  for (const token of ['--color-bg', '--color-surface', '--color-text', '--color-muted', '--color-accent', '--color-focus', '--radius']) {
    assert.ok(design.includes(token) && css.includes(`${token}:`), token);
  }
  assert.ok(read('site', 'index.html').includes('href="tokens.css"'));
});

test('the page passes the honesty audit in strict mode and keeps basic accessibility hooks', () => {
  const run = spawnSync(process.execPath, [join(ROOT, 'ai-frontend-guide-kit', 'tools', 'audit-honesty.mjs'), join(EX, 'site'), '--strict'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout);
  const html = read('site', 'index.html');
  assert.match(html, /<html lang="en">/);
  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
  assert.match(html, /autocomplete="email"/);
  assert.match(html, /Reject optional/);
});
