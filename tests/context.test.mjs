import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'context.mjs');

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};
const context = (dir, ...args) => spawnSync(process.execPath, [TOOL, '--dir', dir, ...args], { encoding: 'utf8', env: cleanEnv() });

const project = () => {
  const dir = mkdtempSync(join(tmpdir(), 'context-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'demo',
    dependencies: { react: '19.0.0', '@mui/material': '^6.0.0', 'framer-motion': '^11.0.0', primereact: '^10.0.0', lodash: '^4.0.0' },
    devDependencies: { '@types/react': '^19.0.0' },
  }));
  writeFileSync(join(dir, 'components.json'), JSON.stringify({
    $schema: 'https://ui.shadcn.com/schema.json',
    registries: { '@magicui': 'https://magicui.design/r/{name}.json', '@acme': 'https://acme.dev/r/{name}.json' },
  }));
  return dir;
};

test('context detects UI libraries: covered by a catalog source, compatible, and to research', () => {
  const dir = project();
  const run = context(dir, '--json');
  assert.equal(run.status, 0, run.stderr);
  const { libraries } = JSON.parse(run.stdout);
  const covered = Object.fromEntries(libraries.covered.map((lib) => [lib.package, lib.sources]));
  assert.deepEqual(covered['@mui/material'], ['mui']);
  assert.deepEqual(covered['components.json'], ['shadcn']);
  assert.deepEqual(covered['@magicui'], ['magicui']);
  const compatible = Object.fromEntries(libraries.compatible.map((lib) => [lib.package, lib.sources]));
  assert.ok(compatible['framer-motion']?.length > 0, 'framer-motion is used by catalog sources');
  assert.deepEqual(libraries.toResearch.sort(), ['@acme', 'primereact']);
  const all = JSON.stringify(libraries);
  assert.equal(all.includes('lodash'), false, 'non-UI packages are not listed');
  assert.equal(all.includes('@types/react'), false);
  assert.equal(all.includes('"react"'), false, 'the framework is the stack, not a UI library');
});

test('REPO-CONTEXT.md lists the UI libraries and tells the agent how to use each group', () => {
  const dir = project();
  const run = context(dir);
  assert.equal(run.status, 0, run.stderr);
  const text = readFileSync(join(dir, 'ai-frontend-output', 'ux', 'REPO-CONTEXT.md'), 'utf8');
  assert.match(text, /^## UI libraries$/m);
  assert.match(text, /`@mui\/material` → `mui` \(`node tools\/find\.mjs --source mui`\)/);
  assert.match(text, /To research \(not in the catalog\): `@acme`, `primereact`/);
  assert.match(text, /own documentation/);
});

test('a project without package.json or components.json reports no UI libraries', () => {
  const dir = mkdtempSync(join(tmpdir(), 'context-empty-'));
  const run = context(dir, '--json');
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout).libraries, { covered: [], compatible: [], toResearch: [] });
});
