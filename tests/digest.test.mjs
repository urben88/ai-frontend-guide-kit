import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = join(ROOT, 'tools', 'build-digest.mjs');
const SOURCES = join(ROOT, 'ai-frontend-guide-kit', 'catalog', 'sources');

const entries = () => {
  const all = new Map();
  for (const file of readdirSync(SOURCES).filter((name) => name.endsWith('.json'))) {
    for (const entry of JSON.parse(readFileSync(join(SOURCES, file), 'utf8')).entries) all.set(entry.id, entry);
  }
  return all;
};

const build = () => {
  const out = join(mkdtempSync(join(tmpdir(), 'digest-')), 'digest.md');
  const run = spawnSync(process.execPath, [TOOL, '--out', out], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  return readFileSync(out, 'utf8');
};

test('the digest lists at most five entries per category, two per source, best quality first, all real catalog ids', () => {
  const text = build();
  const catalog = entries();
  const categories = [...new Set([...catalog.values()].filter((e) => e.entry_type !== 'icon').map((e) => e.category))];
  const sections = text.split(/^## /m).slice(1);
  assert.deepEqual(sections.map((s) => s.split('\n')[0].trim()).sort(), categories.sort());
  for (const section of sections) {
    const rows = section.split('\n').filter((line) => line.startsWith('- `'));
    assert.ok(rows.length >= 1 && rows.length <= 5, `${section.split('\n')[0]} has ${rows.length} rows`);
    const perSource = {};
    const qualities = rows.map((row) => {
      const id = row.match(/^- `([^`]+)`/)[1];
      const entry = catalog.get(id);
      assert.ok(entry, `unknown id ${id}`);
      assert.equal(entry.entry_type === 'icon', false);
      perSource[entry.source] = (perSource[entry.source] ?? 0) + 1;
      assert.ok(perSource[entry.source] <= 2, `${entry.source} appears more than twice`);
      return entry.quality ?? 0;
    });
    assert.deepEqual(qualities, [...qualities].sort((a, b) => b - a));
  }
});

test('the digest fits a small fixed budget and is deterministic', () => {
  const first = build();
  assert.ok(Buffer.byteLength(first) <= 20000, `digest is ${Buffer.byteLength(first)} bytes (budget 20000, about 5k tokens)`);
  assert.equal(build(), first);
  assert.match(first, /node tools\/get\.mjs <id>/);
});

test('the shipped catalog/digest.md is the current output', () => {
  const shipped = readFileSync(join(ROOT, 'ai-frontend-guide-kit', 'catalog', 'digest.md'), 'utf8');
  assert.equal(shipped, build(), 'catalog/digest.md is stale: run node tools/build-kit.mjs');
});
