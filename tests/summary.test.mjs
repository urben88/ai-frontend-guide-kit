import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('RESUMEN.md figures match the catalog, skills and package version', () => {
  const summary = readFileSync(join(ROOT, 'RESUMEN.md'), 'utf8');
  const { totals } = JSON.parse(readFileSync(join(ROOT, 'manifest', 'component-manifest.json'), 'utf8'));
  const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const skills = readdirSync(join(ROOT, 'skills'), { withFileTypes: true }).filter((d) => d.isDirectory()).length;
  const expected = `**Versión:** ${version} · **Cifras:** ${totals.sources} fuentes · ${totals.entries} entradas · `
    + `${Object.keys(totals.categories).length} categorías · ${skills} skills propias`;
  assert.ok(summary.includes(expected), `RESUMEN.md is stale; expected the line:\n${expected}`);
});
