import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'memory.mjs');

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};
const project = () => mkdtempSync(join(tmpdir(), 'memory-libs-'));
const memory = (dir, ...args) => spawnSync(process.execPath, [TOOL, ...args, '--dir', join(dir, 'ai-frontend-output')], { encoding: 'utf8', env: cleanEnv() });
const libs = (dir) => JSON.parse(readFileSync(join(dir, 'ai-frontend-output', 'libraries.json'), 'utf8')).libraries;
const summary = (dir) => readFileSync(join(dir, 'ai-frontend-output', 'SUMMARY.md'), 'utf8');

test('lib add stores a library in use and one to research, and the summary shows both', () => {
  const dir = project();
  const using = memory(dir, 'lib', 'add', '@mui/material', '--status', 'using', '--source', 'mui');
  assert.equal(using.status, 0, using.stderr);
  const research = memory(dir, 'lib', 'add', 'primereact', '--status', 'research', '--notes', 'seen in a reference site');
  assert.equal(research.status, 0, research.stderr);
  const byName = Object.fromEntries(libs(dir).map((lib) => [lib.name, lib]));
  assert.equal(byName['@mui/material'].status, 'using');
  assert.equal(byName['@mui/material'].source, 'mui');
  assert.equal(byName.primereact.status, 'research');
  const text = summary(dir);
  assert.match(text, /^## Libraries in use$/m);
  assert.match(text, /- `@mui\/material` \(catalog source `mui`\)/);
  assert.match(text, /^## To research$/m);
  assert.match(text, /- `primereact` — seen in a reference site/);
});

test('lib add on a known library updates it instead of duplicating it', () => {
  const dir = project();
  memory(dir, 'lib', 'add', 'primereact', '--status', 'research');
  const again = memory(dir, 'lib', 'add', 'primereact', '--status', 'using');
  assert.equal(again.status, 0, again.stderr);
  assert.deepEqual(libs(dir).map((lib) => [lib.name, lib.status]), [['primereact', 'using']]);
});

test('lib add rejects a bad status and writes nothing', () => {
  const dir = project();
  const run = memory(dir, 'lib', 'add', 'primereact', '--status', 'maybe');
  assert.equal(run.status, 1);
  assert.match(run.stderr, /--status must be one of: using, research/);
  assert.equal(existsSync(join(dir, 'ai-frontend-output', 'libraries.json')), false);
});

test('lib list filters by status and prints JSON', () => {
  const dir = project();
  memory(dir, 'lib', 'add', '@mui/material', '--status', 'using');
  memory(dir, 'lib', 'add', 'primereact', '--status', 'research');
  const run = memory(dir, 'lib', 'list', '--status', 'research', '--json');
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout).libraries.map((lib) => lib.name), ['primereact']);
  const text = memory(dir, 'lib', 'list');
  assert.match(text.stdout, /using\s+\| @mui\/material/);
  assert.match(text.stdout, /research\s+\| primereact/);
});

test('lib sync imports what context detects and never overwrites a recorded status', () => {
  const dir = project();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo', dependencies: { react: '19.0.0', '@mui/material': '^6.0.0', primereact: '^10.0.0' } }));
  memory(dir, 'lib', 'add', 'primereact', '--status', 'using', '--notes', 'already chosen');
  const run = memory(dir, 'lib', 'sync');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /lib sync: 1 added/);
  const byName = Object.fromEntries(libs(dir).map((lib) => [lib.name, lib]));
  assert.equal(byName['@mui/material'].status, 'using');
  assert.equal(byName['@mui/material'].source, 'mui');
  assert.equal(byName.primereact.status, 'using', 'sync keeps the recorded status');
  assert.equal(byName.react, undefined);
});
