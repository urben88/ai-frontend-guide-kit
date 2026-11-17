import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  assert.match(text, /`@mui\/material` → `mui` \(`node \S*tools\/find\.mjs --source mui`\)/);
  assert.match(text, /To research \(not in the catalog\): `@acme`, `primereact`/);
  assert.match(text, /own documentation/);
});

test('a project without package.json or components.json reports no UI libraries', () => {
  const dir = mkdtempSync(join(tmpdir(), 'context-empty-'));
  const run = context(dir, '--json');
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout).libraries, { covered: [], compatible: [], toResearch: [] });
});

// ---------------------------------------------------------------- one framework list, shared with board.mjs (storybook-board T6)

const BOARD_TOOL = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'board.mjs');
const FRAMEWORK_CASES = [
  [{ next: '15.0.0', react: '19.0.0' }, 'Next.js'],
  [{ nuxt: '3.0.0', vue: '3.5.0' }, 'Nuxt'],
  [{ '@sveltejs/kit': '2.0.0', svelte: '5.0.0' }, 'SvelteKit'],
  [{ svelte: '5.0.0' }, 'Svelte'],
  [{ astro: '5.0.0' }, 'Astro'],
  [{ '@remix-run/react': '2.0.0', react: '19.0.0' }, 'Remix'],
  [{ vue: '3.5.0' }, 'Vue'],
  [{ react: '19.0.0' }, 'React'],
  [{ 'solid-js': '1.9.0' }, 'Solid'],
  [{ '@angular/core': '19.0.0' }, 'Angular'],
  [{ lodash: '4.0.0' }, 'unknown'],
];

test('context and board name the framework the same way for every supported dependency (previous behavior)', () => {
  for (const [dependencies, label] of FRAMEWORK_CASES) {
    const dir = mkdtempSync(join(tmpdir(), 'context-fw-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo', dependencies }));
    assert.equal(context(dir).status, 0);
    const text = readFileSync(join(dir, 'ai-frontend-output', 'ux', 'REPO-CONTEXT.md'), 'utf8');
    assert.ok(text.includes(label === 'unknown' ? '- **Project:** demo\n' : `- **Project:** demo (${label})\n`), `${label}: REPO-CONTEXT.md`);
    const board = spawnSync(process.execPath, [BOARD_TOOL, 'detect', '--json', '--dir', dir], { encoding: 'utf8', env: cleanEnv() });
    assert.equal(JSON.parse(board.stdout).framework, label, `${label}: board detect`);
  }
});

test('board.mjs takes the framework detection from context.mjs instead of keeping its own list (T6)', () => {
  const board = readFileSync(BOARD_TOOL, 'utf8');
  assert.match(board, /from '\.\/context\.mjs'/);
  assert.doesNotMatch(board, /'@sveltejs\/kit'/, 'no second copy of the framework list');
});

test('context.mjs exports frameworkOf and importing it runs nothing (T6)', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'context-import-'));
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify(pathToFileURL(TOOL).href)}); console.log(typeof m.frameworkOf, m.frameworkOf({ vue: '3' }), m.frameworkOf({}));`], { encoding: 'utf8', cwd, env: cleanEnv() });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout.trim(), 'function Vue unknown');
});
