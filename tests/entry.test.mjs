import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkFigures, computeFigures } from '../tools/build-kit.mjs';

// weak-model-design T7 (S5): one short entry, one command path form, generated figures, a skill split by step.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KIT = join(ROOT, 'ai-frontend-guide-kit');
const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8').replace(/\r\n/g, '\n');
const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};

const toolNames = () => readdirSync(join(KIT, 'tools'), { withFileTypes: true }).filter((entry) => entry.isFile() && /\.(mjs|py)$/.test(entry.name)).map((entry) => entry.name);
const routesOf = () => {
  const listed = spawnSync(process.execPath, [join(KIT, 'tools', 'flow.mjs'), 'list'], { encoding: 'utf8', env: cleanEnv() }).stdout;
  return [...listed.matchAll(/^### `([^`]+)`/gm)].map((match) => match[1]);
};

// ---------------------------------------------------------------- the entry

test('INDEX.md is one short page that is enough alone: first command, next, every route, every tool', () => {
  const text = read('ai-frontend-guide-kit', 'INDEX.md');
  const lines = text.trimEnd().split('\n').length;
  assert.ok(lines <= 70, `INDEX.md has ${lines} lines; the limit is 70`);
  assert.ok(text.includes('node ai-frontend-guide-kit/tools/flow.mjs status'), 'names the first command');
  assert.ok(text.includes('flow.mjs next'), 'names flow.mjs next');
  assert.match(text, /do exactly what it prints/i);
  for (const route of routesOf()) assert.ok(text.includes(`\`${route}\``), `INDEX.md misses the route ${route}`);
  for (const tool of toolNames()) assert.ok(text.includes(tool), `INDEX.md misses the tool ${tool}`);
  for (const line of text.split('\n')) {
    assert.ok(!/\b(read|open|follow)\b[^.\n]*(AGENTS\.md|guides\/\d)/i.test(line), `INDEX.md sends the reader to read before acting: ${line}`);
  }
});

test('AGENTS.md and guide 00 are reference only and about half their old size', () => {
  const agents = read('ai-frontend-guide-kit', 'AGENTS.md');
  assert.ok(agents.split('\n').slice(0, 6).join('\n').includes('Reference. You do not need to read this to work: `INDEX.md` and `flow.mjs next` are enough.'));
  assert.ok(statSync(join(KIT, 'AGENTS.md')).size <= 10500, 'AGENTS.md is at most 10.5 KB');
  const router = read('ai-frontend-guide-kit', 'guides', '00-START-HERE.md');
  assert.match(router, /Reference/i);
  assert.ok(statSync(join(KIT, 'guides', '00-START-HERE.md')).size <= 6500, 'guide 00 is at most 6.5 KB');
});

// ---------------------------------------------------------------- one command path form

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};
// Repository maintenance scripts live in the top-level tools/ folder, not in the kit: they keep their own form.
const MAINTENANCE = /^(refresh|build-index|build-kit|validate|sync-ux-skills|check-licenses|build-digest|build-explorer|quality|audit-categories|figures)\.mjs$/;
// Generated from repository scripts (build-index, check-licenses) or a history of past runs: not hand-written kit text.
const GENERATED = [/^ai-frontend-guide-kit\/catalog\//, /^ai-frontend-guide-kit\/VERIFICATION\.md$/];

test('no shipped kit file, skill or the installer shows `node tools/<kit tool>` (one path form)', () => {
  const files = [...walk(KIT), ...walk(join(ROOT, 'skills')), join(ROOT, 'install.mjs')].filter((file) => /\.(md|mjs|py|json|html)$/.test(file));
  const offenders = [];
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    if (GENERATED.some((pattern) => pattern.test(rel))) continue;
    readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
      for (const match of line.matchAll(/\b(?:node|python3?) tools\/([\w.-]+)/g)) {
        if (!MAINTENANCE.test(match[1])) offenders.push(`${rel}:${index + 1} ${match[0]}`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});

const projectWithKit = () => {
  const dir = mkdtempSync(join(tmpdir(), 'entry-'));
  cpSync(join(KIT, 'tools'), join(dir, 'ai-frontend-guide-kit', 'tools'), { recursive: true });
  cpSync(join(KIT, 'experience'), join(dir, 'ai-frontend-guide-kit', 'experience'), { recursive: true });
  cpSync(join(KIT, 'catalog'), join(dir, 'ai-frontend-guide-kit', 'catalog'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"name":"demo"}\n');
  return dir;
};
const inProject = (dir, tool, ...args) => spawnSync(process.execPath, [join(dir, 'ai-frontend-guide-kit', 'tools', tool), ...args], { cwd: dir, encoding: 'utf8', env: cleanEnv() });

test('every JS tool prints its own commands in the one path form when asked for help', () => {
  const dir = projectWithKit();
  const printing = ['flow.mjs', 'find.mjs', 'get.mjs', 'pieces.mjs', 'recipe.mjs', 'scout.mjs', 'tokens.mjs', 'ui-map.mjs', 'context.mjs', 'audit-design.mjs', 'audit-honesty.mjs', 'audit-a11y.mjs', 'audit-perf.mjs', 'memory.mjs'];
  for (const tool of printing) {
    const run = inProject(dir, tool, '--help');
    const text = `${run.stdout}${run.stderr}`;
    assert.ok(!/\b(?:node|python3?) tools\//.test(text), `${tool} --help still prints node tools/: ${text.slice(0, 200)}`);
  }
  for (const tool of ['flow.mjs', 'get.mjs', 'pieces.mjs', 'recipe.mjs', 'scout.mjs', 'tokens.mjs', 'ui-map.mjs', 'audit-design.mjs']) {
    const run = inProject(dir, tool, '--help');
    assert.ok(`${run.stdout}${run.stderr}`.includes(`node ai-frontend-guide-kit/tools/${tool}`), `${tool} --help does not print its own command in the one form`);
  }
});

test('refusals print the one path form and keep their exit code', () => {
  const dir = projectWithKit();
  const noRoute = inProject(dir, 'flow.mjs', 'next');
  assert.equal(noRoute.status, 1);
  assert.ok(noRoute.stderr.includes('node ai-frontend-guide-kit/tools/flow.mjs start <route>'), noRoute.stderr);
  const status = inProject(dir, 'flow.mjs', 'status');
  assert.equal(status.status, 0);
  assert.ok(status.stdout.includes('node ai-frontend-guide-kit/tools/flow.mjs start <route>'), status.stdout);
  assert.ok(!/node tools\//.test(status.stdout));
  const build = inProject(dir, 'memory.mjs', 'add', '--screen', 'a', '--block', 'b', '--need', 'zzz', '--decision', 'build', '--name', 'X');
  assert.notEqual(build.status, 0);
  assert.ok(build.stderr.includes('node ai-frontend-guide-kit/tools/pieces.mjs find "zzz"'), build.stderr);
  const piece = inProject(dir, 'pieces.mjs', 'add', 'x', '--level', 'micro', '--file', 'nope.tsx');
  assert.notEqual(piece.status, 0);
  assert.ok(!/node tools\//.test(`${piece.stdout}${piece.stderr}`));
  const get = inProject(dir, 'get.mjs');
  assert.equal(get.status, 1);
  assert.ok(get.stderr.includes('node ai-frontend-guide-kit/tools/get.mjs <entry-id>'), get.stderr);
  const scout = inProject(dir, 'scout.mjs');
  assert.notEqual(scout.status, 0);
  assert.ok(scout.stderr.includes('node ai-frontend-guide-kit/tools/scout.mjs <url>'), scout.stderr);
});

test('the shared helper quotes a path with spaces and uses an absolute path only outside the project', async () => {
  const { kitPath, runTool, quotePath } = await import('../ai-frontend-guide-kit/tools/kit-path.mjs');
  assert.equal(kitPath(ROOT), 'ai-frontend-guide-kit');
  assert.equal(runTool('find.mjs', '"x"', ROOT), 'node ai-frontend-guide-kit/tools/find.mjs "x"');
  const outside = mkdtempSync(join(tmpdir(), 'entry-outside-'));
  assert.ok(kitPath(outside).startsWith('/') || /^[A-Za-z]:\//.test(kitPath(outside)), kitPath(outside));
  assert.ok(!kitPath(outside).includes('\\'));
  assert.equal(quotePath('a b/c'), '"a b/c"');
});

// ---------------------------------------------------------------- generated figures

test('every marked figure equals the one computed from the catalog and the folders (build-kit fixes it)', () => {
  const figures = computeFigures();
  assert.ok(figures.entries > 1000 && figures.sources >= 30 && figures.skills >= 19, JSON.stringify(figures));
  const result = checkFigures();
  assert.ok(result.checked >= 6, `only ${result.checked} marked figures found`);
  assert.deepEqual(result.stale, [], 'a marked figure is stale: run node tools/build-kit.mjs');
});

test('no unmarked hand-typed catalog figure is left in the docs', () => {
  const files = ['README.md', 'README.es.md', 'install.mjs', 'ai-frontend-guide-kit/README.md', 'ai-frontend-guide-kit/AGENTS.md', 'ai-frontend-guide-kit/INDEX.md', 'ai-frontend-guide-kit/HELP.md', 'ai-frontend-guide-kit/HELP.es.md', 'skills/ai-frontend-guide/SKILL.md'];
  const { entries, sources } = computeFigures();
  const entriesText = [entries.toLocaleString('en-US'), entries.toLocaleString('en-US').replace(/,/g, '.'), String(entries)];
  for (const file of files) {
    const text = read(...file.split('/')).replace(/<!--fig:[\w:]+-->[\s\S]*?<!--\/fig-->/g, '');
    for (const form of entriesText) assert.ok(!text.includes(form), `${file} has an unmarked ${form}`);
    assert.ok(!new RegExp(`\\b${sources} (verified |fuentes|source)`).test(text), `${file} has an unmarked source count`);
  }
});

// ---------------------------------------------------------------- the skill split by step

test('SKILL.md is short and every step of flow list has its steps/<step>.md', () => {
  const skill = read('skills', 'ai-frontend-guide', 'SKILL.md');
  const lines = skill.trimEnd().split('\n').length;
  assert.ok(lines <= 70, `SKILL.md has ${lines} lines; the limit is 70`);
  assert.match(skill, /^---\nname: ai-frontend-guide\ndescription: .{40,}\n---\n/);
  const listed = spawnSync(process.execPath, [join(KIT, 'tools', 'flow.mjs'), 'list'], { encoding: 'utf8', env: cleanEnv() }).stdout;
  const steps = [...new Set([...listed.matchAll(/^\| \d+ \| `([\w-]+)` \|/gm)].map((match) => match[1]))];
  assert.ok(steps.length >= 10, `found ${steps.length} steps`);
  for (const step of steps) {
    const file = join(ROOT, 'skills', 'ai-frontend-guide', 'steps', `${step}.md`);
    assert.ok(existsSync(file), `steps/${step}.md is missing`);
    assert.ok(skill.includes(`steps/${step}.md`), `SKILL.md does not point at steps/${step}.md`);
    assert.ok(readFileSync(file, 'utf8').split('\n').length <= 45, `steps/${step}.md is longer than 45 lines`);
  }
  assert.ok(skill.includes('flow.mjs next') && skill.includes('flow.mjs status'));
});

test('the installer copies the whole skill folder, so steps/ ships', () => {
  const target = mkdtempSync(join(tmpdir(), 'entry-skills-'));
  const run = spawnSync(process.execPath, [join(ROOT, 'install.mjs'), 'init', '--target', target, '--no-mcp', '--no-design-skills'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.ok(existsSync(join(target, '.agents', 'skills', 'ai-frontend-guide', 'steps', 'intake.md')));
});

// ---------------------------------------------------------------- the installer block

const START = '<!-- ai-frontend-guide-kit:start -->';
const END = '<!-- ai-frontend-guide-kit:end -->';

test('the installer block is short, in the one path form, and an older block is replaced in place', () => {
  const target = mkdtempSync(join(tmpdir(), 'entry-block-'));
  const old = `# Mine\n\nbefore\n\n${START}\n## Frontend, UI and design: always this flow\nold text with node tools/flow.mjs status\n${END}\n\nafter\n`;
  writeFileSync(join(target, 'AGENTS.md'), old);
  const run = spawnSync(process.execPath, [join(ROOT, 'install.mjs'), 'update', '--target', target, '--no-skills', '--no-mcp'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const text = readFileSync(join(target, 'AGENTS.md'), 'utf8');
  assert.ok(text.startsWith('# Mine\n\nbefore\n\n'));
  assert.ok(text.endsWith(`${END}\n\nafter\n`));
  assert.equal(text.split(START).length - 1, 1);
  const block = text.slice(text.indexOf(START), text.indexOf(END));
  assert.ok(block.split('\n').length <= 20, `the block has ${block.split('\n').length} lines`);
  assert.ok(!/node tools\//.test(block));
  assert.ok(!block.includes('old text'));
  for (const piece of ['ai-frontend-guide-kit/INDEX.md', 'flow.mjs status', 'flow.mjs next', 'exactly', 'Catalog first', 'HELP.md', 'diseño']) assert.ok(block.includes(piece), `block misses ${piece}`);
});
