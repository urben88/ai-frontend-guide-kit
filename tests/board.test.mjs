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

// ---------------------------------------------------------------- verification fixes: path aliases and the components board (S7)

import { createHash } from 'node:crypto';

const sha = (text) => createHash('sha256').update(text).digest('hex');

test('check: a store or an API client imported through a project alias is a finding, like the same import by a relative path (S7)', () => {
  const dir = project(REACT_TS, {
    'tsconfig.json': '{\n  // paths with a comment, as tsc allows\n  "compilerOptions": { "paths": { "@data/*": ["src/api/*"], "@app": ["src/app/index.ts"] } }\n}\n',
    'src/board/Alias.board.stories.tsx': [
      "import { useAuthStore } from '@/stores/auth';",
      "import { client } from '@/api/client';",
      "import { other } from '~/api/client';",
      "import { svc } from '#/services/user';",
      "import { rel } from '../api/client';",
      "import { viaPaths } from '@data/client';",
      "import { useQuery } from '@tanstack/react-query';",
      "import { configureStore } from '@reduxjs/toolkit';",
      'export const V1 = {};',
      '',
    ].join('\n'),
  });
  const run = board(dir, 'check');
  assert.equal(run.status, 1, run.stdout);
  for (const needle of ['@/stores/auth', '@/api/client', '~/api/client', '#/services/user', '../api/client', '@data/client', '@tanstack/react-query', '@reduxjs/toolkit']) {
    assert.ok(run.stdout.includes(`"${needle}"`), `finding for ${needle}\n${run.stdout}`);
  }
  assert.equal(JSON.parse(board(dir, 'check', '--json').stdout).findings.length, 8);
});

test('check: aliases that point at presentational code, and scoped packages that are not stores or clients, stay clean (S7)', () => {
  const dir = project(REACT_TS, {
    'src/board/Clean.board.stories.tsx': [
      "import { Button } from '@/components/Button';",
      "import { Card } from '~/ui/Card';",
      "import { theme } from '#/theme';",
      "import * as Dialog from '@radix-ui/react-dialog';",
      "import { formatStore } from '@/lib/format-store';",
      'export const V1 = {};',
      '',
    ].join('\n'),
  });
  const run = board(dir, 'check');
  assert.equal(run.status, 0, run.stdout);
  assert.match(run.stdout, /0 findings/);
});

test('scaffold: the call without --kind keeps its exact output and file (previous behavior, S7)', () => {
  const dir = project(REACT_TS);
  const first = board(dir, 'scaffold', 'login', '--version', 'v1-sidebar');
  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stdout.split('\n')[0], 'board: wrote src/board/Login.board.stories.tsx (story Board/Pages/Login, version v1-sidebar, export V1Sidebar)');
  assert.match(first.stdout.split('\n')[1], /^Next: compose the presentational components with mock data, then run: node .*board\.mjs check$/);
  const file = join(dir, 'src', 'board', 'Login.board.stories.tsx');
  assert.equal(sha(readFileSync(file, 'utf8')), 'e44fb3826a495505fdf46656d2e63a3793091e7eeab51d84f0d7f308a4df2259');
  const explicit = project(REACT_TS);
  assert.equal(board(explicit, 'scaffold', 'login', '--version', 'v1-sidebar', '--kind', 'page').stdout, first.stdout);
  assert.equal(readFileSync(join(explicit, 'src', 'board', 'Login.board.stories.tsx'), 'utf8'), readFileSync(file, 'utf8'));
  board(dir, 'scaffold', 'login', '--version', 'v2-topbar');
  assert.equal(sha(readFileSync(file, 'utf8')), '13d6e605ce215319ae004813fc683d2c93ce7eead6dcf051c1f590b6d76c6d84');
});

test('scaffold --kind component writes Board/Components/<Name> with one story per variant or state, and adds more to the same file (S7)', () => {
  const dir = project(REACT_TS);
  const first = board(dir, 'scaffold', 'button', '--kind', 'component', '--version', 'default');
  assert.equal(first.status, 0, first.stderr);
  const file = join(dir, 'src', 'board', 'components', 'Button.board.stories.tsx');
  assert.ok(existsSync(file), 'story file written under src/board/components');
  assert.match(first.stdout, /Board\/Components\/Button/);
  assert.match(first.stdout, /src\/board\/components\/Button\.board\.stories\.tsx/);
  assert.ok(!existsSync(join(dir, 'src', 'board', 'Button.board.stories.tsx')), 'no page board was made');
  const text = readFileSync(file, 'utf8');
  assert.ok(text.includes("title: 'Board/Components/Button'"));
  assert.ok(!text.includes('Board/Pages'));
  assert.ok(text.includes('export const Default'));
  assert.ok(text.includes('// version: default'));
  assert.match(text, /[Mm]ock props/);
  assert.match(text, /presentational/);

  assert.equal(board(dir, 'scaffold', 'button', '--kind', 'component', '--version', 'disabled').status, 0);
  assert.equal(board(dir, 'scaffold', 'button', '--kind', 'component', '--version', 'loading').status, 0);
  const after = readFileSync(file, 'utf8');
  for (const name of ['Default', 'Disabled', 'Loading']) assert.ok(after.includes(`export const ${name}`), name);
  assert.equal(after.split("title: 'Board/Components/Button'").length - 1, 1, 'one title only');
  const again = board(dir, 'scaffold', 'button', '--kind', 'component', '--version', 'disabled');
  assert.equal(again.status, 1);
  assert.match(again.stderr, /already/);
  assert.equal(readFileSync(file, 'utf8'), after, 'an existing story is never overwritten');

  // a page and a component with the same name are two boards
  assert.equal(board(dir, 'scaffold', 'button', '--version', 'v1-plain').status, 0);
  assert.ok(existsSync(join(dir, 'src', 'board', 'Button.board.stories.tsx')));
  assert.equal(board(dir, 'check').status, 0);
});

test('scaffold: an unknown --kind is a usage error, and a component still needs --version (S7)', () => {
  const dir = project(REACT_TS);
  const bad = board(dir, 'scaffold', 'button', '--kind', 'widget', '--version', 'default');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /component or page/);
  assert.equal(board(dir, 'scaffold', 'button', '--kind', 'component').status, 2);
  assert.ok(!existsSync(join(dir, 'src')), 'nothing written');
});

test('plan proposes a component board per component of ui-map, shared ones first; list shows pages and components (S7)', () => {
  const dir = project(REACT_TS, { 'ai-frontend-output/ui-map.json': JSON.stringify(UI_MAP) });
  const json = JSON.parse(board(dir, 'plan', '--json').stdout);
  assert.deepEqual(json.componentBoards.map((c) => c.name), ['Sidebar', 'LoginForm', 'StatCard']);
  assert.equal(json.componentBoards[0].shared, true);
  assert.equal(json.componentBoards[0].title, 'Board/Components/Sidebar');
  assert.equal(json.componentBoards[1].shared, false);
  assert.equal(json.componentBoards.every((c) => c.exists === false), true);
  assert.equal(json.pages.length, 2, 'the pages are as before');
  assert.equal(json.components, 3, 'the count is as before');
  const text = board(dir, 'plan').stdout;
  assert.match(text, /Board\/Components\/Sidebar .*\[to create\]/);
  assert.match(text, /scaffold Sidebar --kind component --version default/);
  assert.match(text, /Board\/Pages\/Login/);

  board(dir, 'scaffold', 'Sidebar', '--kind', 'component', '--version', 'default');
  board(dir, 'scaffold', 'login', '--version', 'v1-sidebar');
  const after = JSON.parse(board(dir, 'plan', '--json').stdout);
  assert.equal(after.componentBoards.find((c) => c.name === 'Sidebar').exists, true);
  assert.equal(after.pages.find((p) => p.name === 'Login').exists, true);
  const list = board(dir, 'list');
  assert.match(list.stdout, /Board\/Components\/Sidebar .*default/);
  assert.match(list.stdout, /Board\/Pages\/Login .*v1-sidebar/);
  const listed = JSON.parse(board(dir, 'list', '--json').stdout).boards;
  assert.equal(listed.find((b) => b.title === 'Board/Components/Sidebar').kind, 'component');
  assert.equal(listed.find((b) => b.title === 'Board/Pages/Login').kind, 'page');
});
