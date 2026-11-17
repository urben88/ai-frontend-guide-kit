import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { STORYBOOK_VERSION } from '../ai-frontend-guide-kit/tools/board.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'board.mjs');

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};
const board = (dir, ...args) => spawnSync(process.execPath, [TOOL, ...args, '--dir', dir], { encoding: 'utf8', env: cleanEnv() });

/** A project in the system temp dir (never in the worktree): package.json from `pkg`, plus `files` ({ path: text }). */
function project(pkg, files = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'board-'));
  if (pkg) writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

const REACT_TS = { name: 'demo', dependencies: { react: '^19.0.0' }, devDependencies: { typescript: '^5.0.0' } };

const UI_MAP = {
  version: 1,
  counts: { files: 3, components: 3, routes: 2, strays: 0, unresolved: 0 },
  components: [
    { name: 'LoginForm', file: 'src/components/LoginForm.tsx', line: 1, kind: 'function', roles: ['form'], usage: 1, users: ['src/app/login/page.tsx'], routes: ['/login'] },
    { name: 'Sidebar', file: 'src/components/Sidebar.tsx', line: 1, kind: 'function', roles: ['navigation'], usage: 2, users: [], routes: ['/login', '/dashboard'] },
    { name: 'StatCard', file: 'src/components/StatCard.tsx', line: 1, kind: 'function', roles: ['card'], usage: 1, users: [], routes: ['/dashboard'] },
  ],
  roles: {},
  routes: [{ route: '/login', file: 'src/app/login/page.tsx' }, { route: '/dashboard', file: 'src/app/dashboard/page.tsx' }],
  imports: {},
  strays: [],
  unresolved: [],
};

test('detect: Storybook missing prints the framework, the glob and the pinned install command, and installs nothing', () => {
  const dir = project(REACT_TS);
  const run = board(dir, 'detect');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /storybook: missing/);
  assert.match(run.stdout, /framework: React/);
  assert.match(run.stdout, /story glob: .*stories/);
  assert.ok(run.stdout.includes(`npx storybook@${STORYBOOK_VERSION} init`), run.stdout);
  assert.match(STORYBOOK_VERSION, /^\d+\.\d+\.\d+$/);
  assert.ok(run.stdout.toLowerCase().includes('ask the user'), 'tells the agent to ask first');
  assert.ok(!existsSync(join(dir, '.storybook')) && !existsSync(join(dir, 'node_modules')), 'nothing installed');
  const json = JSON.parse(board(dir, 'detect', '--json').stdout);
  assert.equal(json.present, false);
  assert.equal(json.framework, 'React');
  assert.equal(json.install, `npx storybook@${STORYBOOK_VERSION} init`);
});

test('detect: Storybook present (dependency and .storybook folder) reports the configured glob and no install command', () => {
  const dir = project(
    { ...REACT_TS, devDependencies: { typescript: '^5.0.0', '@storybook/react': '^9.0.0' } },
    { '.storybook/main.ts': "export default { stories: ['../src/**/*.stories.@(ts|tsx)'] };\n" },
  );
  const run = board(dir, 'detect');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /storybook: present/);
  assert.ok(run.stdout.includes('../src/**/*.stories.@(ts|tsx)'), run.stdout);
  assert.ok(!run.stdout.includes('npx storybook@'), 'no install proposed when present');
  const json = JSON.parse(board(dir, 'detect', '--json').stdout);
  assert.equal(json.present, true);
  assert.equal(json.configFolder, true);
});

test('plan: proposes one composition board per page from ui-map.json, and names the command that builds the map when it is missing', () => {
  const dir = project(REACT_TS, { 'ai-frontend-output/ui-map.json': JSON.stringify(UI_MAP) });
  const run = board(dir, 'plan');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Board\/Pages\/Login/);
  assert.match(run.stdout, /Board\/Pages\/Dashboard/);
  assert.match(run.stdout, /LoginForm/);
  assert.match(run.stdout, /StatCard/);
  assert.match(run.stdout, /scaffold login --version v1-/);
  assert.match(run.stdout, /Board\/Components/);
  const json = JSON.parse(board(dir, 'plan', '--json').stdout);
  assert.equal(json.pages.length, 2);
  assert.deepEqual(json.pages.find((p) => p.route === '/dashboard').components, ['Sidebar', 'StatCard']);

  const empty = project(REACT_TS);
  const none = board(empty, 'plan');
  assert.equal(none.status, 1);
  assert.match(none.stdout + none.stderr, /ui-map\.mjs build/);
});

test('scaffold: writes a board story with the rules and mock data, adds a version to an existing file, refuses a duplicate and a bad name', () => {
  const dir = project(REACT_TS);
  const first = board(dir, 'scaffold', 'login', '--version', 'v1-sidebar');
  assert.equal(first.status, 0, first.stderr);
  const file = join(dir, 'src', 'board', 'Login.board.stories.tsx');
  assert.ok(existsSync(file), 'story file written');
  const text = readFileSync(file, 'utf8');
  assert.ok(text.includes("title: 'Board/Pages/Login'"));
  assert.ok(text.includes('export const V1Sidebar'));
  assert.ok(text.includes('// version: v1-sidebar'));
  assert.match(text, /[Mm]ock data/);
  assert.match(text, /presentational/);
  assert.match(text, /stores|router|API/);
  assert.match(first.stdout, /src\/board\/Login\.board\.stories\.tsx/);

  const second = board(dir, 'scaffold', 'login', '--version', 'v2-topbar');
  assert.equal(second.status, 0, second.stderr);
  const after = readFileSync(file, 'utf8');
  assert.ok(after.includes('export const V1Sidebar') && after.includes('export const V2Topbar'));
  assert.equal(after.split("title: 'Board/Pages/Login'").length - 1, 1, 'one title only');

  const again = board(dir, 'scaffold', 'login', '--version', 'v1-sidebar');
  assert.equal(again.status, 1);
  assert.match(again.stderr, /already/);
  assert.equal(readFileSync(file, 'utf8'), after, 'an existing version is never overwritten');

  const bad = board(dir, 'scaffold', 'login', '--version', 'V1 Sidebar');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /kebab-case/);

  const js = project({ name: 'plain', dependencies: { react: '^19.0.0' } });
  assert.equal(board(js, 'scaffold', 'Expedientes', '--version', 'v3-compact').status, 0);
  assert.ok(existsSync(join(js, 'src', 'board', 'Expedientes.board.stories.jsx')), 'jsx without typescript');
});

test('list: shows each board with its versions, from the story files', () => {
  const dir = project(REACT_TS);
  board(dir, 'scaffold', 'login', '--version', 'v1-sidebar');
  board(dir, 'scaffold', 'login', '--version', 'v2-topbar');
  board(dir, 'scaffold', 'dashboard', '--version', 'v1-sidebar');
  const run = board(dir, 'list');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Board\/Pages\/Login .*v1-sidebar, v2-topbar/);
  assert.match(run.stdout, /Board\/Pages\/Dashboard .*v1-sidebar/);
  const json = JSON.parse(board(dir, 'list', '--json').stdout);
  assert.equal(json.boards.length, 2);
  assert.deepEqual(json.boards.find((b) => b.title === 'Board/Pages/Login').versions, ['v1-sidebar', 'v2-topbar']);
  const empty = board(project(REACT_TS), 'list');
  assert.equal(empty.status, 0);
  assert.match(empty.stdout, /no boards/);
});

test('check: a scaffolded board is clean; stores, routers, API clients and data hooks are numbered findings with exit 1', () => {
  const dir = project(REACT_TS);
  board(dir, 'scaffold', 'login', '--version', 'v1-sidebar');
  const clean = board(dir, 'check');
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  assert.match(clean.stdout, /0 findings/);

  writeFileSync(
    join(dir, 'src', 'board', 'Bad.board.stories.tsx'),
    [
      "import { useStore } from 'zustand';",
      "import { useRouter } from 'next/navigation';",
      "import axios from 'axios';",
      "import { useQuery } from '@tanstack/react-query';",
      "import { getUser } from '../services/user';",
      "// fetch('/not-code') in a comment is ignored",
      "export const V1 = { render: () => { fetch('/api/me'); return null; } };",
      '',
    ].join('\n'),
  );
  const dirty = board(dir, 'check');
  assert.equal(dirty.status, 1);
  for (const needle of ['zustand', 'next/navigation', 'axios', '@tanstack/react-query', '../services/user', 'fetch(']) {
    assert.ok(dirty.stdout.includes(needle), `finding for ${needle}`);
  }
  assert.match(dirty.stdout, /^1\. \[high\]/m);
  assert.match(dirty.stdout, /^6\. \[high\]/m);
  assert.ok(!/^7\./m.test(dirty.stdout), 'the comment is not a finding');
  assert.ok(dirty.stdout.includes('Bad.board.stories.tsx:1'));
  const json = JSON.parse(board(dir, 'check', '--json').stdout);
  assert.equal(json.findings.length, 6);
});

test('usage: no command or an unknown one exits 2', () => {
  const dir = project(REACT_TS);
  assert.equal(board(dir).status, 2);
  assert.equal(board(dir, 'nope').status, 2);
  assert.match(board(dir, '--help').stdout, /scaffold/);
});
