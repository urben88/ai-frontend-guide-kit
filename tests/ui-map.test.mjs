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

// ---- correction batch: argument parsing, close-match candidates, full component list

const decoyRun = (args) => {
  const decoy = mkdtempSync(join(tmpdir(), 'ui-map-decoy-'));
  const run = node([TOOL, ...args], { env: { ...cleanEnv(), AI_FRONTEND_PROJECT: decoy } });
  return { run, decoy, wrote: existsSync(join(decoy, 'ai-frontend-output')) };
};

test('--dir=<path> is accepted for valued options', () => {
  const dir = fixture();
  const { run, wrote } = decoyRun(['build', `--dir=${dir}`]);
  assert.equal(run.status, 0, run.stderr);
  assert.ok(existsSync(out(dir, 'ui-map.json')), 'written to the given project');
  assert.ok(!wrote, 'the default root is untouched');
  assert.ok(readMap(dir).components.some((c) => c.name === 'Skeleton'));
});

test('an unknown option names itself, exits 2 and writes nothing', () => {
  const dir = fixture();
  for (const command of [['build'], ['impact', 'loading'], ['have', 'Skeleton']]) {
    const { run, wrote } = decoyRun([...command, '--jsno', '--dir', dir]);
    assert.equal(run.status, 2, command.join(' '));
    assert.match(run.stderr, /--jsno/);
    assert.ok(!wrote);
    assert.ok(!existsSync(out(dir, 'ui-map.json')), 'nothing written to the project');
  }
  const equals = decoyRun(['build', '--json=1', '--dir', dir]);
  assert.equal(equals.run.status, 2);
  assert.match(equals.run.stderr, /--json=1/);
});

test('--dir without a value exits 2 and writes nothing', () => {
  for (const args of [['build', '--dir'], ['build', '--dir', '--json'], ['build', '--dir=']]) {
    const { run, wrote } = decoyRun(args);
    assert.equal(run.status, 2, args.join(' '));
    assert.match(run.stderr, /--dir/);
    assert.ok(!wrote, 'no fallback to the default root');
  }
});

test('extra positional arguments exit 2; impact and have need a name', () => {
  const dir = fixture();
  const extra = decoyRun(['build', 'foo', '--dir', dir]);
  assert.equal(extra.run.status, 2);
  assert.match(extra.run.stderr, /foo/);
  assert.match(extra.run.stderr, /Usage/);
  assert.ok(!existsSync(out(dir, 'ui-map.json')));
  for (const command of ['impact', 'have']) {
    const { run, wrote } = decoyRun([command, '--dir', dir]);
    assert.equal(run.status, 2, command);
    assert.match(run.stderr, /Usage/);
    assert.ok(!wrote);
    assert.ok(!existsSync(out(dir, 'ui-map.json')));
  }
  assert.equal(node([TOOL, '--help', '--dir', dir]).status, 0, 'valid flags still work');
});

test('have on a close match also lists up to 3 catalog candidates and still exits 0', () => {
  const dir = fixture();
  const close = uiMap(dir, 'have', 'table');
  assert.equal(close.status, 0, close.stderr);
  assert.match(close.stdout, /DataTable/);
  assert.match(close.stdout, /Candidates \(catalog\)/);
  assert.match(close.stdout, /Decision: check the close match/);
  const json = JSON.parse(uiMap(dir, 'have', 'table', '--json').stdout);
  assert.equal(json.status, 'close');
  assert.ok(json.catalog.length >= 1 && json.catalog.length <= 3);
  const exists = JSON.parse(uiMap(dir, 'have', 'Skeleton', '--json').stdout);
  assert.deepEqual(exists.catalog, [], 'an exact match needs no catalog candidates');
});

test('UI-MAP.md lists every component sorted by path, capped at 300 lines, byte-identical on rebuild', () => {
  const dir = fixture();
  assert.equal(uiMap(dir, 'build').status, 0);
  const md = readFileSync(out(dir, 'UI-MAP.md'), 'utf8');
  const section = md.split('## Components')[1]?.split(/\n## /)[0];
  assert.ok(section, 'has a Components section');
  const lines = section.split('\n').filter((line) => line.startsWith('- '));
  const map = readMap(dir);
  assert.equal(lines.length, map.components.length);
  assert.ok(lines.some((l) => l.includes('Skeleton') && l.includes('src/components/ui/Skeleton.tsx') && /used by 2/.test(l) && l.includes('loading')));
  assert.ok(lines.some((l) => l.includes('DataTable') && /used by 1/.test(l)));
  const paths = lines.map((l) => l.match(/`([^`]+)`/)[1]);
  assert.deepEqual(paths, [...paths].sort(), 'sorted by path');
  assert.equal(uiMap(dir, 'build').status, 0);
  assert.equal(readFileSync(out(dir, 'UI-MAP.md'), 'utf8'), md);

  const big = mkdtempSync(join(tmpdir(), 'ui-map-big-'));
  mkdirSync(join(big, 'src'));
  for (let i = 0; i < 320; i += 1) writeFileSync(join(big, 'src', `Item${String(i).padStart(3, '0')}.tsx`), `export const Item${String(i).padStart(3, '0')} = () => <i />;\n`);
  assert.equal(uiMap(big, 'build').status, 0);
  const bigMd = readFileSync(out(big, 'UI-MAP.md'), 'utf8');
  const bigLines = bigMd.split('## Components')[1].split(/\n## /)[0].split('\n').filter((line) => line.startsWith('- '));
  assert.equal(bigLines.filter((l) => l.includes('Item')).length, 300);
  assert.match(bigMd, /20 more components omitted.*ui-map\.json/);
});

// ---- component types, context documents and profiles (S5, S6, S7, S8)

const typesCatalog = () => JSON.parse(readFileSync(join(ROOT, 'ai-frontend-guide-kit', 'catalog', 'component-types.json'), 'utf8'));
const taxonomyCategories = () => {
  const md = readFileSync(join(ROOT, 'ai-frontend-guide-kit', 'catalog', 'taxonomy.md'), 'utf8');
  const table = md.split('## Canonical categories')[1].split(/\n## /)[0];
  return [...table.matchAll(/^\|\s*`([a-z-]+)`\s*\|/gm)].map((m) => m[1]);
};
const writeSource = (dir, rel, name) => {
  mkdirSync(join(dir, rel.split('/').slice(0, -1).join('/')), { recursive: true });
  writeFileSync(join(dir, rel), `export function ${name}() {\n  return <div />;\n}\n`);
};

test('component-types.json names and aliases are unique, with known categories, layers and no copied descriptions', () => {
  const catalog = typesCatalog();
  const categories = new Set(taxonomyCategories());
  assert.ok(categories.size >= 20, `parsed ${categories.size} categories from taxonomy.md`);
  const layers = new Set(Object.keys(catalog.layers));
  assert.deepEqual([...layers].sort(), ['entities', 'features', 'pages', 'shared', 'widgets']);
  assert.ok(catalog.types.length >= 45, `${catalog.types.length} types`);
  const claimed = new Map();
  for (const type of catalog.types) {
    assert.match(type.name, /^[A-Z][A-Za-z]*$/, `${type.name} is PascalCase`);
    assert.ok(categories.has(type.category), `${type.name} category ${type.category} is canonical`);
    assert.ok(layers.has(type.layer), `${type.name} layer ${type.layer} is known`);
    assert.ok(Array.isArray(type.aliases) && type.aliases.length > 0, `${type.name} has aliases`);
    assert.equal(type.description, undefined, `${type.name} carries no copied description`);
    for (const surface of [type.name, ...type.aliases]) {
      const key = surface.toLowerCase().replace(/[^a-z0-9]/g, '');
      const owner = claimed.get(key);
      assert.ok(!owner || owner === type.name, `"${surface}" is claimed by both ${owner} and ${type.name}`);
      claimed.set(key, type.name);
    }
  }
  assert.equal(catalog.sources['open-ui-matrix'].url, 'https://open-ui.org/research/component-matrix/');
  assert.equal(catalog.sources['component-gallery'].url, 'https://component.gallery/components/');
  assert.match(catalog.limits.join(' '), /name and (file )?path/);
});

test('ui-map types reports coverage, the most specific type, unclassified components and duplicates', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ui-map-types-'));
  writeSource(dir, 'src/components/ui/Button.tsx', 'Button');
  writeSource(dir, 'src/components/ui/Dialog.tsx', 'Dialog');
  writeSource(dir, 'src/components/ui/Modal.tsx', 'Modal');
  writeSource(dir, 'src/components/ui/Card.tsx', 'Card');
  writeSource(dir, 'src/components/ProductCard.tsx', 'ProductCard');
  writeSource(dir, 'src/components/Thing.tsx', 'Thing');
  const json = uiMap(dir, 'types', '--json');
  assert.equal(json.status, 0, json.stderr);
  const report = JSON.parse(json.stdout);
  assert.ok(report.coverage.present >= 3 && report.coverage.total === typesCatalog().types.length);
  const byType = new Map(report.types.map((t) => [t.name, t.components.map((c) => c.name)]));
  assert.deepEqual(byType.get('Button'), ['Button']);
  assert.deepEqual(byType.get('Dialog'), ['Dialog', 'Modal']);
  assert.deepEqual(byType.get('Card'), ['Card'], 'ProductCard is not collapsed into Card');
  assert.deepEqual(byType.get('ProductCard'), ['ProductCard']);
  assert.deepEqual(report.unclassified.map((c) => c.name), ['Thing']);
  assert.deepEqual(report.duplicates.map((d) => d.type), ['Dialog']);
  assert.match(report.limit, /name and (file )?path/);

  const text = uiMap(dir, 'types');
  assert.equal(text.status, 0, text.stderr);
  assert.match(text.stdout, /types: \d+ of \d+ present/);
  assert.match(text.stdout, /unclassified \(1\): Thing/);
  assert.match(text.stdout, /possible duplicates \(by name or alias, review only\) \(1\):/);
  assert.match(text.stdout, /Dialog: Dialog \(src\/components\/ui\/Dialog\.tsx\), Modal \(src\/components\/ui\/Modal\.tsx\)/);
  assert.match(text.stdout, /Limit:/);
});

test('have resolves a component through the type aliases', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ui-map-have-alias-'));
  writeSource(dir, 'src/components/ui/Dialog.tsx', 'Dialog');
  const run = uiMap(dir, 'have', 'modal');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /exists/);
  assert.match(run.stdout, /Dialog — src\/components\/ui\/Dialog\.tsx/);
  assert.match(run.stdout, /reuse src\/components\/ui\/Dialog\.tsx/);
});

test('ui-map docs lists the documents of each profile and which are missing', () => {
  const fromTypes = (() => {
    const dir = mkdtempSync(join(tmpdir(), 'ui-map-docs-'));
    writeSource(dir, 'src/components/ui/Button.tsx', 'Button');
    return dir;
  })();
  const readJson = (dir, ...args) => {
    const run = uiMap(dir, 'docs', '--json', ...args);
    assert.equal(run.status, 0, run.stderr);
    return JSON.parse(run.stdout);
  };
  const standard = readJson(fromTypes);
  assert.equal(standard.profile, 'standard');
  assert.ok(standard.documents.filter((d) => d.missing).length >= 3, 'a fresh project misses most documents');
  for (const doc of standard.documents) {
    assert.ok(doc.purpose.length > 10, `${doc.path} has a purpose`);
    assert.match(doc.structure, /guides\/13-CONTEXT-DOCS\.md/, `${doc.path} points at the structure`);
  }
  const sprint = readJson(fromTypes, '--profile', 'sprint');
  const longTerm = readJson(fromTypes, '--profile', 'long-term');
  const paths = (report) => report.documents.map((d) => d.path);
  for (const path of paths(sprint)) assert.ok(paths(standard).includes(path), `sprint ${path} is also standard`);
  assert.ok(paths(standard).length > paths(sprint).length && paths(longTerm).length > paths(standard).length);

  writeFileSync(join(fromTypes, 'README.md'), '# Project\n');
  writeFileSync(join(fromTypes, 'DESIGN.md'), '# Design\n');
  assert.equal(uiMap(fromTypes, 'build').status, 0);
  const partial = readJson(fromTypes);
  assert.deepEqual(partial.documents.filter((d) => !d.missing).map((d) => d.path).sort(), ['DESIGN.md', 'README.md', 'ai-frontend-output/UI-MAP.md']);

  const text = uiMap(fromTypes, 'docs');
  assert.equal(text.status, 0, text.stderr);
  assert.match(text.stdout, /docs \(profile: standard\)/);
  assert.match(text.stdout, /missing/);
  const bad = uiMap(fromTypes, 'docs', '--profile', 'enterprise');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /enterprise/);
  assert.match(bad.stderr, /sprint, standard, long-term/);
});

// ---- profile gate and stack recipes (S6 recipes, S7)

const CONTEXT_FILES = ['README.md', 'DESIGN.md', 'PRODUCT.md', 'UX-SPEC.md', 'ARCHITECTURE.md', 'docs/DECISIONS.md', 'docs/CONTRIBUTING.md', 'docs/ACCESSIBILITY.md', 'docs/PERFORMANCE.md'];
const writeDocs = (dir, files = CONTEXT_FILES) => {
  for (const file of files) {
    const folder = join(dir, ...file.split('/').slice(0, -1));
    if (folder !== dir) mkdirSync(folder, { recursive: true });
    writeFileSync(join(dir, file), `# ${file}\n`);
  }
};
const findingsOf = (dir, profile) => {
  const run = uiMap(dir, 'check', '--json', ...(profile ? ['--profile', profile] : []));
  return { status: run.status, stderr: run.stderr, report: JSON.parse(run.stdout) };
};

test('check lists every finding and the profile only decides which of them block', () => {
  const dir = fixture();
  const sprint = uiMap(dir, 'check', '--profile', 'sprint');
  assert.equal(sprint.status, 0, sprint.stderr);
  assert.match(sprint.stdout.split('\n')[0], /^check \(profile: sprint\) — \d+ findings, 0 blocking$/);
  assert.match(sprint.stdout, /^\s+advisory unresolved — src\/pages\/about\.tsx:\d+ \.\/Ghost not found$/m);
  assert.match(sprint.stdout, /^\s+advisory missing-doc — README\.md$/m);
  assert.match(sprint.stdout, /^\s+advisory stray — loading: /m);
  assert.match(sprint.stdout, /^Next: /m);

  const standard = uiMap(dir, 'check');
  assert.equal(standard.status, 1);
  assert.match(standard.stdout.split('\n')[0], /^check \(profile: standard\) — \d+ findings, \d+ blocking$/);
  assert.match(standard.stdout, /^\s+blocking unresolved — /m);
  assert.match(standard.stdout, /^\s+blocking missing-doc — UX-SPEC\.md$/m);
  assert.match(standard.stdout, /^\s+advisory stray — /m, 'a stray does not block at standard');
  assert.match(standard.stdout, /^Next: /m);

  const longTerm = uiMap(dir, 'check', '--profile', 'long-term');
  assert.equal(longTerm.status, 1);
  assert.match(longTerm.stdout, /^\s+blocking stray — /m);
  assert.match(longTerm.stdout, /^\s+blocking missing-doc — docs\/DECISIONS\.md$/m);

  const counts = (text) => text.split('\n')[0].match(/(\d+) findings, (\d+) blocking/).slice(1).map(Number);
  const mapKinds = (text) => text.split('\n')
    .filter((line) => /^\s+(blocking|advisory) /.test(line))
    .map((line) => line.trim().split(' ')[1])
    .filter((kind) => kind !== 'missing-doc');
  assert.deepEqual(mapKinds(sprint.stdout), mapKinds(standard.stdout), 'the profile never changes the map findings');
  assert.deepEqual(mapKinds(standard.stdout), mapKinds(longTerm.stdout));
  assert.equal(counts(sprint.stdout)[1], 0);
  assert.ok(counts(longTerm.stdout)[1] > counts(standard.stdout)[1], 'long-term blocks more than standard');
  assert.ok(counts(standard.stdout)[1] > counts(sprint.stdout)[1], 'standard blocks more than sprint');
});

test('check exits 0 on a complete project, 1 on a missing document and on a duplicate component type', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ui-map-check-clean-'));
  writeSource(dir, 'src/components/ui/Button.tsx', 'Button');
  writeDocs(dir, ['README.md', 'DESIGN.md', 'PRODUCT.md', 'UX-SPEC.md', 'ARCHITECTURE.md']);
  const standard = uiMap(dir, 'check');
  assert.equal(standard.status, 0, standard.stdout + standard.stderr);
  assert.match(standard.stdout.split('\n')[0], /^check \(profile: standard\) — 0 findings, 0 blocking$/);
  assert.match(standard.stdout, /^Next: /m);

  const strict = uiMap(dir, 'check', '--profile', 'long-term');
  assert.equal(strict.status, 1, 'long-term blocks the documents standard does not need');
  assert.match(strict.stdout, /^\s+blocking missing-doc — docs\/DECISIONS\.md$/m);

  writeDocs(dir, ['docs/DECISIONS.md', 'docs/CONTRIBUTING.md', 'docs/ACCESSIBILITY.md', 'docs/PERFORMANCE.md']);
  assert.equal(uiMap(dir, 'check', '--profile', 'long-term').status, 0);

  writeSource(dir, 'src/components/ui/Dialog.tsx', 'Dialog');
  writeSource(dir, 'src/components/ui/Modal.tsx', 'Modal');
  const duplicate = findingsOf(dir, 'long-term');
  assert.equal(duplicate.status, 1);
  const duplicateType = duplicate.report.findings.find((f) => f.kind === 'duplicate-type');
  assert.ok(duplicateType, 'duplicate component type reported');
  assert.equal(duplicateType.blocking, true);
  assert.match(duplicateType.detail, /^Dialog: Dialog \(src\/components\/ui\/Dialog\.tsx\), Modal \(src\/components\/ui\/Modal\.tsx\)$/);
  assert.equal(findingsOf(dir, 'standard').status, 0, 'the same duplicate is advisory at standard');
});

test('long-term blocks an ownerless role with strays; standard lists it as advisory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ui-map-check-stray-'));
  writeDocs(dir);
  writeSource(dir, 'src/components/ui/Button.tsx', 'Button');
  assert.equal(uiMap(dir, 'check', '--profile', 'long-term').status, 0);
  writeFileSync(join(dir, 'src/components/Panel.tsx'), 'export const Panel = () => <div className="animate-pulse" />;\n');

  const strict = findingsOf(dir, 'long-term');
  assert.equal(strict.status, 1);
  const stray = strict.report.findings.find((f) => f.kind === 'stray');
  const ownerless = strict.report.findings.find((f) => f.kind === 'ownerless-role');
  assert.ok(stray && stray.blocking, 'strays block at long-term');
  assert.match(stray.detail, /^loading: 1 stray\(s\) — src\/components\/Panel\.tsx:1$/);
  assert.ok(ownerless && ownerless.blocking, 'a role with no owner and a stray blocks at long-term');
  assert.match(ownerless.detail, /^loading: no owner, 1 stray\(s\)/);
  const lax = findingsOf(dir, 'standard');
  assert.equal(lax.status, 0);
  assert.equal(lax.report.counts.findings, strict.report.counts.findings, 'same findings, different rigor');
  assert.ok(lax.report.findings.filter((f) => f.blocking).length < strict.report.counts.blocking);
});

test('check --json reports profile, per-finding kind and blocking, counts and exit', () => {
  const dir = fixture();
  const run = uiMap(dir, 'check', '--json');
  assert.equal(run.status, 1);
  const report = JSON.parse(run.stdout);
  assert.equal(report.profile, 'standard');
  assert.equal(report.exit, 1);
  assert.equal(report.counts.findings, report.findings.length);
  assert.equal(report.counts.blocking, report.findings.filter((f) => f.blocking).length);
  for (const finding of report.findings) {
    assert.ok(['unresolved', 'duplicate-type', 'stray', 'ownerless-role', 'missing-doc'].includes(finding.kind), finding.kind);
    assert.equal(typeof finding.blocking, 'boolean');
    assert.ok(finding.detail.length > 0);
  }
  assert.ok(report.findings.some((f) => f.kind === 'unresolved' && /^src\/pages\/about\.tsx:\d+ \.\/Ghost not found$/.test(f.detail)));
  assert.ok(report.findings.some((f) => f.kind === 'missing-doc' && f.detail === 'PRODUCT.md'));
  assert.ok(!report.findings.some((f) => f.kind === 'missing-doc' && f.detail.startsWith('ai-frontend-output/')), 'the generated map counts as present after the load');

  const sprint = findingsOf(dir, 'sprint');
  assert.equal(sprint.status, 0);
  assert.equal(sprint.report.exit, 0);
  assert.equal(sprint.report.profile, 'sprint');
  const withoutDocs = (report) => report.findings.filter((f) => f.kind !== 'missing-doc').map((f) => `${f.kind} ${f.detail}`);
  assert.deepEqual(withoutDocs(sprint.report), withoutDocs(report), 'the profile never changes the map findings');
  assert.ok(sprint.report.counts.findings < report.counts.findings, 'sprint owes fewer documents');
  assert.equal(sprint.report.counts.blocking, 0);

  const help = node([TOOL, '--help']);
  assert.match(help.stdout, /ui-map\.mjs check/);
  assert.match(help.stdout, /docs and check: sprint\|standard\|long-term/);
});

test('check rejects an unknown profile and any positional argument', () => {
  const dir = fixture();
  const bad = uiMap(dir, 'check', '--profile', 'enterprise');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /enterprise/);
  assert.match(bad.stderr, /sprint, standard, long-term/);
  const extra = decoyRun(['check', 'all', '--dir', dir]);
  assert.equal(extra.run.status, 2);
  assert.match(extra.run.stderr, /all/);
  assert.ok(!extra.wrote, 'nothing written outside the project');
  assert.ok(!existsSync(out(dir, 'ui-map.json')), 'nothing written to the project either');
});

test('every place that documents the map also documents check', () => {
  const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8');
  const mentionsCheck = (...parts) => read(...parts).split('\n')
    .filter((line) => line.includes('ui-map'))
    .some((line) => line.includes('check'));
  assert.ok(read('ai-frontend-guide-kit', 'AGENTS.md').includes('ui-map.mjs check'));
  assert.ok(read('skills', 'ai-frontend-guide', 'SKILL.md').includes('ui-map.mjs check'));
  assert.ok(read('ai-frontend-guide-kit', 'README.md').split('\n').some((line) => line.includes('ui-map.mjs') && line.includes('check')));
  for (const file of [
    ['ai-frontend-guide-kit', 'guides', '00-START-HERE.md'],
    ['ai-frontend-guide-kit', 'HELP.md'],
    ['ai-frontend-guide-kit', 'HELP.es.md'],
  ]) assert.ok(mentionsCheck(...file), `${file.join('/')} names check in its ui-map line`);
  assert.match(read('ai-frontend-guide-kit', 'guides', '13-CONTEXT-DOCS.md'), /experience\/STACK-RECIPES\.md/);
  assert.match(read('tools', 'build-kit.mjs'), /'experience\/STACK-RECIPES\.md'/);
});

test('experience/STACK-RECIPES.md combines six project types with source, date and evidence level', () => {
  const text = readFileSync(join(ROOT, 'ai-frontend-guide-kit', 'experience', 'STACK-RECIPES.md'), 'utf8');
  assert.ok(text.split('\n').length <= 120, `${text.split('\n').length} lines`);
  const recipes = text.split(/^## /m).slice(1);
  assert.ok(recipes.length >= 6, `${recipes.length} recipes`);
  for (const recipe of recipes) {
    const title = recipe.split('\n')[0];
    for (const label of ['Source:', 'Checked:', 'Evidence:']) assert.ok(recipe.includes(label), `${title} carries ${label}`);
    assert.ok(recipe.includes('Architecture:'), `${title} names the architecture mode`);
    assert.match(recipe, /Documents:/, `${title} names the documents`);
  }
  assert.doesNotMatch(text, /\bbest\b/i);
  assert.match(text, /not measured|no survey|documented combination/i);
  const lowered = text.toLowerCase();
  for (const type of ['saas dashboard', 'marketing landing page', 'e-commerce', 'documentation site', 'internal tool', 'pwa']) {
    assert.ok(lowered.includes(type), `covers ${type}`);
  }
});
