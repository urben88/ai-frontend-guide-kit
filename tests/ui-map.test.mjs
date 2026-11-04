import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = join(ROOT, 'tests', 'fixtures', 'ui-map');
const TOOL = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'ui-map.mjs');

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};
const node = (args, options = {}) => spawnSync(process.execPath, args, { encoding: 'utf8', env: cleanEnv(), ...options });
const uiMap = (dir, ...args) => node([TOOL, ...args, '--dir', dir]);
const fixture = () => {
  const dir = mkdtempSync(join(tmpdir(), 'ui-map-'));
  cpSync(FIXTURE, dir, { recursive: true });
  return dir;
};
const out = (dir, name) => join(dir, 'ai-frontend-output', name);
const readMap = (dir) => JSON.parse(readFileSync(out(dir, 'ui-map.json'), 'utf8'));
const historyLines = (dir) => readFileSync(out(dir, 'ui-history.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
const later = (path, seconds = 30) => {
  const when = new Date(Date.now() + seconds * 1000);
  utimesSync(path, when, when);
};
const listFiles = (dir, rel = '') => readdirSync(join(dir, rel), { withFileTypes: true })
  .sort((x, y) => x.name.localeCompare(y.name))
  .flatMap((entry) => (entry.isDirectory() ? listFiles(dir, `${rel}${entry.name}/`) : [`${rel}${entry.name}`]));
const hashFiles = (dir, files) => {
  const hash = createHash('sha256');
  for (const file of files) hash.update(file).update(readFileSync(join(dir, file)));
  return hash.digest('hex');
};

test('build writes ui-map.json and UI-MAP.md with components, users, routes, roles, strays and unresolved', () => {
  const dir = fixture();
  const run = uiMap(dir, 'build');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /ui-map/);
  const map = readMap(dir);
  const byName = Object.fromEntries(map.components.map((c) => [c.name, c]));
  for (const name of ['Skeleton', 'Button', 'AppLayout', 'DataTable', 'HeavyChart', 'EmptyState', 'Home', 'About']) {
    assert.ok(byName[name], `component ${name} found`);
  }
  assert.ok(!map.components.some((c) => /test|stories/i.test(c.file)), 'tests and stories are skipped');
  assert.equal(byName.EmptyState.file, 'src/components/EmptyState.vue');
  assert.deepEqual(byName.Skeleton.roles, ['loading']);
  assert.deepEqual(byName.AppLayout.roles, ['layout']);
  assert.deepEqual(byName.EmptyState.roles, ['empty']);
  // Skeleton is used by index (alias + barrel) and about (relative path).
  assert.deepEqual(byName.Skeleton.users, ['src/pages/about.tsx', 'src/pages/index.tsx']);
  assert.equal(byName.Skeleton.usage, 2);
  assert.deepEqual(byName.Skeleton.routes, ['/', '/about']);
  // Button reached through the alias + barrel `export *`.
  assert.deepEqual(byName.Button.users, ['src/components/DataTable.tsx', 'src/components/EmptyState.vue']);
  assert.deepEqual(map.routes.map((r) => r.route), ['/', '/about']);
  // Stray: ad hoc loading in a page that is not the loading component, with file and line.
  const stray = map.strays.find((s) => s.role === 'loading' && s.file === 'src/pages/about.tsx');
  assert.ok(stray, 'stray animate-pulse detected');
  assert.equal(stray.line, 6);
  assert.equal(stray.signal, 'animate-pulse');
  assert.ok(!map.strays.some((s) => s.file === 'src/components/ui/Skeleton.tsx'), 'the owner is not a stray');
  assert.deepEqual(map.roles.loading.owners.map((o) => o.name), ['Skeleton']);
  // Unresolved: the missing import and the dynamic import.
  const reasons = Object.fromEntries(map.unresolved.map((u) => [u.specifier, u.reason]));
  assert.equal(reasons['./Ghost'], 'not found');
  assert.equal(reasons['../components/HeavyChart'], 'dynamic import');
  assert.ok(map.unresolved.every((u) => u.file && u.line > 0));
  const md = readFileSync(out(dir, 'UI-MAP.md'), 'utf8');
  assert.match(md, /^# UI map/m);
  assert.match(md, /Skeleton/);
  assert.match(md, /animate-pulse/);
  assert.match(md, /\.\/Ghost/);
  assert.ok(md.split('\n').length < 80, 'UI-MAP.md stays short');
  assert.doesNotMatch(md + JSON.stringify(map), /\d{4}-\d{2}-\d{2}T/, 'no timestamps in the map');
  assert.ok(!existsSync(join(dir, 'ai-frontend-output', 'ux')), 'build writes only the map files');
});

test('a second build is byte-identical and adds no history line', () => {
  const dir = fixture();
  assert.equal(uiMap(dir, 'build').status, 0);
  const before = ['ui-map.json', 'UI-MAP.md', 'ui-history.jsonl'].map((name) => readFileSync(out(dir, name), 'utf8'));
  const again = uiMap(dir, 'build');
  assert.equal(again.status, 0, again.stderr);
  const after = ['ui-map.json', 'UI-MAP.md', 'ui-history.jsonl'].map((name) => readFileSync(out(dir, name), 'utf8'));
  assert.deepEqual(after, before);
  const lines = historyLines(dir);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].initial, true);
  assert.equal(lines[0].count, readMap(dir).components.length);
  assert.ok(lines[0].names.includes('src/components/ui/Skeleton.tsx#Skeleton'));
  assert.match(lines[0].ts, /^\d{4}-\d{2}-\d{2}T/);
});

test('history records components added and removed between builds', () => {
  const dir = fixture();
  assert.equal(uiMap(dir, 'build').status, 0);
  writeFileSync(join(dir, 'src/components/Badge.tsx'), 'export const Badge = () => <span />;\n');
  assert.equal(uiMap(dir, 'build').status, 0);
  rmSync(join(dir, 'src/components/HeavyChart.tsx'));
  assert.equal(uiMap(dir, 'build').status, 0);
  const lines = historyLines(dir);
  assert.equal(lines.length, 3);
  assert.deepEqual(lines[1].added, ['src/components/Badge.tsx#Badge']);
  assert.deepEqual(lines[1].removed, []);
  assert.deepEqual(lines[2].added, []);
  assert.deepEqual(lines[2].removed, ['src/components/HeavyChart.tsx#HeavyChart']);
  assert.ok(lines.every((line) => line.ts));
});

test('impact on a role shows owner, users, routes, strays and unresolved', () => {
  const dir = fixture();
  const run = uiMap(dir, 'impact', 'loading');
  assert.equal(run.status, 0, run.stderr);
  assert.ok(existsSync(out(dir, 'ui-map.json')), 'impact builds the missing map');
  assert.match(run.stdout, /Owners/);
  assert.match(run.stdout, /Skeleton.*src\/components\/ui\/Skeleton\.tsx/);
  assert.match(run.stdout, /Users[\s\S]*src\/pages\/index\.tsx/);
  assert.match(run.stdout, /Routes[\s\S]*\/about/);
  assert.match(run.stdout, /Strays[\s\S]*src\/pages\/about\.tsx:6/);
  assert.match(run.stdout, /Unresolved[\s\S]*\.\/Ghost/);

  const json = JSON.parse(uiMap(dir, 'impact', 'loading', '--json').stdout);
  assert.equal(json.kind, 'role');
  assert.deepEqual(json.owners.map((o) => o.name), ['Skeleton']);
  assert.deepEqual(json.users, ['src/pages/about.tsx', 'src/pages/index.tsx']);
  assert.deepEqual(json.routes, ['/', '/about']);
  assert.equal(json.strays[0].line, 6);
  assert.ok(json.unresolved.some((u) => u.specifier === './Ghost'));

  const component = JSON.parse(uiMap(dir, 'impact', 'Skeleton', '--json').stdout);
  assert.equal(component.kind, 'component');
  assert.deepEqual(component.owners.map((o) => o.file), ['src/components/ui/Skeleton.tsx']);
  assert.deepEqual(component.users, ['src/pages/about.tsx', 'src/pages/index.tsx']);
});

test('impact with an unknown name says so, suggests close names and exits 1', () => {
  const dir = fixture();
  const run = uiMap(dir, 'impact', 'Skeletn');
  assert.equal(run.status, 1);
  assert.match(run.stdout + run.stderr, /not found|unknown/i);
  assert.match(run.stdout + run.stderr, /Skeleton/);
});

test('impact and have rebuild the map when a scanned file is newer', () => {
  const dir = fixture();
  assert.equal(uiMap(dir, 'build').status, 0);
  const fresh = uiMap(dir, 'have', 'Badge');
  assert.doesNotMatch(fresh.stderr, /rebuilt/i, 'a fresh map is not rebuilt');
  const file = join(dir, 'src/components/Badge.tsx');
  writeFileSync(file, 'export const Badge = () => <span />;\n');
  later(file);
  const run = uiMap(dir, 'have', 'Badge', '--json');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stderr, /rebuilt/i);
  assert.equal(JSON.parse(run.stdout).status, 'exists');
  assert.ok(readMap(dir).components.some((c) => c.name === 'Badge'));
  assert.equal(historyLines(dir).length, 2, 'the rebuild appends its history line');

  rmSync(join(dir, 'src/components/EmptyState.vue'));
  const deleted = uiMap(dir, 'impact', 'EmptyState');
  assert.equal(deleted.status, 1, 'a deleted file also makes the map stale');
});

test('have answers exists, close match and not found with catalog candidates, always exit 0', () => {
  const dir = fixture();
  const exists = uiMap(dir, 'have', 'Skeleton');
  assert.equal(exists.status, 0, exists.stderr);
  assert.match(exists.stdout, /exists/i);
  assert.match(exists.stdout, /src\/components\/ui\/Skeleton\.tsx/);
  assert.match(exists.stdout, /used by 2/i);
  assert.match(exists.stdout, /Decision: reuse/);

  const spaced = JSON.parse(uiMap(dir, 'have', 'data table', '--json').stdout);
  assert.equal(spaced.status, 'exists');
  assert.equal(spaced.matches[0].name, 'DataTable');
  assert.equal(spaced.matches[0].usage, 1);

  const close = uiMap(dir, 'have', 'table');
  assert.equal(close.status, 0);
  assert.match(close.stdout, /close/i);
  assert.match(close.stdout, /DataTable/);
  assert.match(close.stdout, /Decision: check the close match/);

  const none = uiMap(dir, 'have', 'carousel');
  assert.equal(none.status, 0);
  assert.match(none.stdout, /not found/i);
  assert.match(none.stdout, /Candidates/);
  assert.match(none.stdout, /\| .*[Cc]arousel/);
  assert.match(none.stdout, /Decision: search the catalog before creating/);
  const json = JSON.parse(uiMap(dir, 'have', 'carousel', '--json').stdout);
  assert.equal(json.status, 'not-found');
  assert.ok(json.catalog.length >= 1 && json.catalog.length <= 3);
});

test('usage: no arguments and --help exit 0, an unknown command exits 2', () => {
  const none = node([TOOL]);
  assert.equal(none.status, 0);
  assert.match(none.stdout, /Usage/);
  for (const command of ['build', 'impact', 'have']) assert.match(none.stdout, new RegExp(command));
  const help = node([TOOL, '--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--json/);
  const unknown = node([TOOL, 'explode']);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /explode/);
  const missingName = node([TOOL, 'have']);
  assert.equal(missingName.status, 2);
});

test('an empty project with no frontend produces an empty valid map, not an error', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ui-map-empty-'));
  const run = uiMap(dir, 'build', '--json');
  assert.equal(run.status, 0, run.stderr);
  const map = readMap(dir);
  assert.deepEqual([map.components, map.routes, map.strays, map.unresolved], [[], [], [], []]);
  assert.equal(JSON.parse(run.stdout).counts.components, 0);
  assert.ok(existsSync(out(dir, 'UI-MAP.md')));
  assert.equal(historyLines(dir)[0].count, 0);
  const have = uiMap(dir, 'have', 'Button');
  assert.equal(have.status, 0);
  assert.match(have.stdout, /not found/i);
});

test('build honours AI_FRONTEND_OUTPUT', () => {
  const dir = fixture();
  const shared = mkdtempSync(join(tmpdir(), 'ui-map-shared-'));
  const run = node([TOOL, 'build', '--dir', dir], { env: { ...cleanEnv(), AI_FRONTEND_OUTPUT: shared } });
  assert.equal(run.status, 0, run.stderr);
  assert.ok(existsSync(join(shared, 'ui-map.json')));
  assert.ok(!existsSync(join(dir, 'ai-frontend-output')));
});

const install = (target) => node([join(ROOT, 'install.mjs'), '--target', target, '--no-skills', '--no-mcp']);
test('installer always generates the map and history without touching any source file', () => {
  const target = fixture();
  const originals = listFiles(FIXTURE);
  const before = hashFiles(target, originals);
  const run = install(target);
  assert.equal(run.status, 0, run.stderr);
  assert.ok(existsSync(out(target, 'ui-map.json')));
  assert.ok(existsSync(out(target, 'UI-MAP.md')));
  assert.ok(existsSync(out(target, 'ui-history.jsonl')));
  assert.ok(readMap(target).components.some((c) => c.name === 'Skeleton'));
  assert.ok(!readMap(target).components.some((c) => c.file.startsWith('ai-frontend-guide-kit')), 'the installed kit is not scanned');
  assert.equal(hashFiles(target, originals), before, 'every original file is byte-identical');
  assert.match(run.stdout, /ui-map/);
});

test('installer survives a failed scan with a warning and keeps going', () => {
  const target = fixture();
  mkdirSync(out(target, 'ui-map.json'), { recursive: true }); // a directory where the map file belongs
  const run = install(target);
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout + run.stderr, /ui-map.*(failed|warning)|! ui-map/i);
  assert.ok(existsSync(join(target, 'AGENTS.md')), 'the install continued');
  assert.ok(statSync(out(target, 'ui-map.json')).isDirectory());
  assert.ok(!existsSync(out(target, 'ui-history.jsonl')), 'no history line for a failed build');
});

test('reinstalling preserves the history and adds a line only for real changes', () => {
  const target = fixture();
  assert.equal(install(target).status, 0);
  const first = readFileSync(out(target, 'ui-history.jsonl'), 'utf8');
  assert.equal(install(target).status, 0);
  assert.equal(readFileSync(out(target, 'ui-history.jsonl'), 'utf8'), first);
  writeFileSync(join(target, 'src/components/Badge.tsx'), 'export const Badge = () => <span />;\n');
  assert.equal(install(target).status, 0);
  const lines = historyLines(target);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].initial, true);
  assert.deepEqual(lines[1].added, ['src/components/Badge.tsx#Badge']);
});

test('routing block, help and output README announce ui-map', () => {
  const target = fixture();
  assert.equal(install(target).status, 0);
  const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8');
  assert.match(agents, /ui-map\.mjs impact/);
  assert.match(agents, /ui-map\.mjs have/);
  assert.match(agents, /ai-frontend-output\/UI-MAP\.md/);
  const start = agents.indexOf('<!-- ai-frontend-guide-kit:start -->');
  const end = agents.indexOf('<!-- ai-frontend-guide-kit:end -->');
  assert.ok(agents.indexOf('ui-map.mjs impact') > start && agents.indexOf('ui-map.mjs impact') < end, 'inside the markers');
  const help = node([join(ROOT, 'install.mjs'), '--help']);
  assert.match(help.stdout, /ui-map/);
  const fresh = mkdtempSync(join(tmpdir(), 'ui-map-readme-'));
  assert.equal(install(fresh).status, 0);
  assert.match(readFileSync(out(fresh, 'README.md'), 'utf8'), /ui-map\.json/);
});

test('memory.mjs keeps its previous README lines and adds the ui-map files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ui-map-memory-'));
  const memory = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'memory.mjs');
  const env = { ...cleanEnv(), AI_FRONTEND_OUTPUT: join(dir, 'out') };
  const add = node([memory, 'add', '--screen', 'home', '--block', 'hero', '--need', 'headline', '--decision', 'reuse', '--id', 'magicui-text-animated-shiny-text'], { env });
  assert.equal(add.status, 0, add.stderr);
  const readme = readFileSync(join(dir, 'out', 'README.md'), 'utf8');
  for (const old of ['selections.jsonl', 'combinations.json', 'SUMMARY.md', 'memory.mjs']) assert.match(readme, new RegExp(old.replace('.', '\\.')));
  assert.match(readme, /ui-map\.json/);
  assert.match(readme, /ui-history\.jsonl/);
  assert.equal(node([memory, 'list'], { env }).status, 0);
});

test('the kit ships ui-map and every doc lists it', () => {
  const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8');
  assert.match(read('tools', 'build-kit.mjs'), /tools\/ui-map\.mjs/);
  for (const file of [
    ['ai-frontend-guide-kit', 'AGENTS.md'],
    ['ai-frontend-guide-kit', 'guides', '00-START-HERE.md'],
    ['skills', 'ai-frontend-guide', 'SKILL.md'],
    ['README.md'],
    ['README.es.md'],
    ['RESUMEN.md'],
  ]) assert.match(read(...file), /ui-map/, `${file.join('/')} mentions ui-map`);
  for (const guide of ['04-INVENTORY.md', '06-REUSE.md']) assert.match(read('ai-frontend-guide-kit', 'guides', guide), /ui-map\.mjs have/);
  assert.match(read('ai-frontend-guide-kit', 'guides', '10-ITERATE.md'), /ui-map\.mjs impact/);
  const philosophy = read('ai-frontend-guide-kit', 'guides', '08-PHILOSOPHY.md');
  assert.match(philosophy, /## Separation \(always\)/);
  for (const guide of readdirSync(join(ROOT, 'ai-frontend-guide-kit', 'guides'))) {
    assert.ok(read('ai-frontend-guide-kit', 'guides', guide).split('\n').length <= 125, `${guide} stays within ~120 lines`);
  }
});
