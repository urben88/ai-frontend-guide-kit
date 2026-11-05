import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'flow.mjs');

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};
const flow = (dir, ...args) => spawnSync(process.execPath, [TOOL, ...args, '--dir', dir], { encoding: 'utf8', env: cleanEnv() });
const project = ({ kit = true } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'flow-'));
  if (kit) {
    mkdirSync(join(dir, 'ai-frontend-guide-kit'), { recursive: true });
    writeFileSync(join(dir, 'ai-frontend-guide-kit', 'AGENTS.md'), '# kit\n');
  }
  return dir;
};
const out = (dir, rel) => join(dir, 'ai-frontend-output', rel);
const put = (dir, rel, text = 'x\n') => {
  mkdirSync(dirname(out(dir, rel)), { recursive: true });
  writeFileSync(out(dir, rel), text);
};
const state = (dir) => JSON.parse(readFileSync(out(dir, 'flow-state.json'), 'utf8'));
const raw = (dir) => readFileSync(out(dir, 'flow-state.json'), 'utf8');

test('status says whether the kit is installed and that no flow is active yet', () => {
  const dir = project();
  const run = flow(dir, 'status');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Kit: installed/);
  assert.match(run.stdout, /Flow: none/);
  assert.match(run.stdout, /Decisions recorded: 0/);
  assert.equal(existsSync(out(dir, 'flow-state.json')), false);

  const bare = project({ kit: false });
  const other = flow(bare, 'status');
  assert.equal(other.status, 0, other.stderr);
  assert.match(other.stdout, /Kit: not installed/);
});

test('status reports what the project has recorded', () => {
  const dir = project();
  put(dir, 'selections.jsonl', '{"a":1}\n{"a":2}\n');
  put(dir, 'UI-MAP.md');
  put(dir, 'libraries.json', JSON.stringify({ version: 1, libraries: [{ name: 'a', status: 'using' }, { name: 'b', status: 'research' }, { name: 'c', status: 'research' }] }));
  const run = flow(dir, 'status');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Decisions recorded: 2/);
  assert.match(run.stdout, /Libraries: 1 in use · 2 to research/);
  assert.match(run.stdout, /UI-MAP\.md: yes/);
  assert.match(run.stdout, /REPO-CONTEXT\.md: no/);
});

test('start writes the route with its first step as the current one', () => {
  const dir = project();
  const run = flow(dir, 'start', 'new');
  assert.equal(run.status, 0, run.stderr);
  const s = state(dir);
  assert.equal(s.route, 'new');
  assert.deepEqual(s.steps.map((step) => step.id), ['intake', 'direction', 'ux', 'tokens', 'compose', 'polish']);
  assert.ok(s.steps.every((step) => step.status === 'pending'));
  assert.match(run.stdout, /Next step: intake/);
  assert.match(run.stdout, /guides\/00-START-HERE\.md/);
  const status = flow(dir, 'status');
  assert.match(status.stdout, /Flow: new · step 1\/6 · intake/);
});

test('done refuses a step that is not the current one and leaves the state unchanged', () => {
  const dir = project();
  flow(dir, 'start', 'new');
  const before = raw(dir);
  const run = flow(dir, 'done', 'ux');
  assert.equal(run.status, 1);
  assert.match(run.stderr, /step "ux" is not the current step \(current: intake\)/);
  assert.equal(raw(dir), before);
});

test('done refuses a step whose artifact is missing and leaves the state unchanged', () => {
  const dir = project();
  flow(dir, 'start', 'new');
  const before = raw(dir);
  const run = flow(dir, 'done', 'intake');
  assert.equal(run.status, 1);
  assert.match(run.stderr, /missing ai-frontend-output\/ux\/REPO-CONTEXT\.md/);
  assert.equal(raw(dir), before);
});

test('done advances when the artifacts exist, and the route closes on its last step', () => {
  const dir = project();
  flow(dir, 'start', 'direction');
  put(dir, 'ux/REPO-CONTEXT.md');
  put(dir, 'UI-MAP.md');
  const first = flow(dir, 'done', 'intake');
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /Next step: direction/);
  assert.equal(state(dir).steps[0].status, 'done');

  put(dir, 'ux/EXPERIENCE-BRIEF.md');
  const last = flow(dir, 'done', 'direction');
  assert.equal(last.status, 0, last.stderr);
  assert.match(last.stdout, /Route "direction" complete/);
  assert.equal(state(dir).complete, true);
  const status = flow(dir, 'status');
  assert.match(status.stdout, /Flow: direction · complete/);
});

test('a step without a file needs --evidence, which is stored', () => {
  const dir = project();
  flow(dir, 'start', 'polish');
  put(dir, 'ux/REPO-CONTEXT.md');
  put(dir, 'UI-MAP.md');
  flow(dir, 'done', 'intake');
  const before = raw(dir);
  const refused = flow(dir, 'done', 'polish');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /step "polish" needs --evidence/);
  assert.equal(raw(dir), before);
  const ok = flow(dir, 'done', 'polish', '--evidence', 'playwright loop green');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(state(dir).steps[1].evidence, 'playwright loop green');
});

test('next prints the current step with its guide and output', () => {
  const dir = project();
  flow(dir, 'start', 'iterate');
  const run = flow(dir, 'next');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Next step: intake/);
  const none = flow(project(), 'next');
  assert.equal(none.status, 1);
  assert.match(none.stderr, /no active flow/);
});

test('start refuses while a route is active, and reset clears it', () => {
  const dir = project();
  flow(dir, 'start', 'new');
  const before = raw(dir);
  const again = flow(dir, 'start', 'polish');
  assert.equal(again.status, 1);
  assert.match(again.stderr, /route "new" is active/);
  assert.equal(raw(dir), before);
  const reset = flow(dir, 'reset');
  assert.equal(reset.status, 0, reset.stderr);
  assert.equal(existsSync(out(dir, 'flow-state.json')), false);
  assert.equal(flow(dir, 'start', 'polish').status, 0);
});

test('unknown routes, steps and options exit 2 and write nothing', () => {
  const dir = project();
  const route = flow(dir, 'start', 'everything');
  assert.equal(route.status, 2);
  assert.match(route.stderr, /unknown route "everything"/);
  const option = flow(dir, 'status', '--bogus');
  assert.equal(option.status, 2);
  assert.match(option.stderr, /unknown option "--bogus"/);
  const command = flow(dir, 'fly');
  assert.equal(command.status, 2);
  assert.equal(existsSync(out(dir, 'flow-state.json')), false);
  flow(dir, 'start', 'new');
  const step = flow(dir, 'done', 'nope');
  assert.equal(step.status, 2);
  assert.match(step.stderr, /unknown step "nope"/);
});

test('list prints every route and step with its guide, skill and output, and guides/FLOWS.md is that same text', () => {
  const run = spawnSync(process.execPath, [TOOL, 'list'], { encoding: 'utf8', env: cleanEnv() });
  assert.equal(run.status, 0, run.stderr);
  for (const route of ['new', 'direction', 'ux', 'iterate', 'polish', 'redesign', 'visual-feedback', 'architecture']) {
    assert.match(run.stdout, new RegExp(`^### \`${route}\``, 'm'));
  }
  for (const text of ['guides/01-EXPERIENCE-DIRECTION.md', 'userflow + flow-*', 'frontend-polish', 'ai-frontend-output/ux/UX-SPEC.md']) {
    assert.ok(run.stdout.includes(text), `list misses ${text}`);
  }
  const flows = readFileSync(join(ROOT, 'ai-frontend-guide-kit', 'guides', 'FLOWS.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(flows, run.stdout, 'guides/FLOWS.md is out of date: regenerate it with node tools/flow.mjs list > guides/FLOWS.md');
});

test('AGENTS.md, the router, the skill and the installer routing block point to flow.mjs and guides/FLOWS.md', () => {
  for (const rel of ['ai-frontend-guide-kit/AGENTS.md', 'ai-frontend-guide-kit/guides/00-START-HERE.md', 'skills/ai-frontend-guide/SKILL.md', 'install.mjs']) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    assert.ok(text.includes('guides/FLOWS.md'), `${rel} does not link guides/FLOWS.md`);
    assert.ok(text.includes('flow.mjs status'), `${rel} does not tell the agent to run flow.mjs status`);
    assert.ok(text.includes('flow.mjs done'), `${rel} does not tell the agent to close steps with flow.mjs done`);
  }
});

// ---------------------------------------------------------------- pieces guard (S5)

const PIECES = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'pieces.mjs');
const MEMORY = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'memory.mjs');
const piecesEnv = (lib) => ({ ...cleanEnv(), AI_FRONTEND_PIECES: lib });
const iterateProject = () => {
  const dir = project();
  const lib = join(mkdtempSync(join(tmpdir(), 'flow-lib-')), 'lib');
  flow(dir, 'start', 'iterate');
  put(dir, 'ux/REPO-CONTEXT.md');
  put(dir, 'UI-MAP.md');
  assert.equal(flow(dir, 'done', 'intake').status, 0);
  return { dir, lib };
};
const flowIn = (ctx, ...args) => spawnSync(process.execPath, [TOOL, ...args, '--dir', ctx.dir], { encoding: 'utf8', env: piecesEnv(ctx.lib) });
const memoryIn = (ctx, ...args) => spawnSync(process.execPath, [MEMORY, ...args, '--dir', out(ctx.dir, '')], { encoding: 'utf8', env: piecesEnv(ctx.lib) });
const piecesIn = (ctx, ...args) => spawnSync(process.execPath, [PIECES, ...args, '--dir', ctx.dir], { encoding: 'utf8', env: piecesEnv(ctx.lib) });
const build = (ctx, block, name) => {
  const find = piecesIn(ctx, 'find', name);
  assert.equal(find.status, 0, find.stderr);
  const run = memoryIn(ctx, 'add', '--screen', 'landing', '--block', block, '--need', name, '--decision', 'build', '--name', name);
  assert.equal(run.status, 0, run.stderr);
};

test('compose and iterate list pieces find as their first tool (S5)', () => {
  const run = flow(project(), 'list');
  assert.equal(run.status, 0, run.stderr);
  for (const step of ['compose', 'iterate']) {
    const row = run.stdout.split('\n').find((line) => /^\| \d+ \|/.test(line) && line.includes(`\`${step}\``));
    assert.match(row, /\| node tools\/pieces\.mjs find; /, step);
  }
});

test('done iterate refuses while a build decision has no registered piece, and passes once it is registered (S5)', () => {
  const ctx = iterateProject();
  build(ctx, 'pricing', 'pricing table');
  const before = raw(ctx.dir);
  const refused = flowIn(ctx, 'done', 'iterate', '--evidence', 'built');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /no registered piece: pricing \("pricing table"\)/);
  assert.equal(raw(ctx.dir), before);
  const file = join(ctx.dir, 'PricingTable.tsx');
  writeFileSync(file, 'export const P = () => <table />;\n');
  const added = piecesIn(ctx, 'add', 'pricing-table', '--level', 'medium', '--file', file);
  assert.equal(added.status, 0, added.stderr);
  const ok = flowIn(ctx, 'done', 'iterate', '--evidence', 'built');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(state(ctx.dir).steps[1].status, 'done');
});

test('compose gets the same guard through the new route (S5)', () => {
  const dir = project();
  const lib = join(mkdtempSync(join(tmpdir(), 'flow-lib-')), 'lib');
  const ctx = { dir, lib };
  flowIn(ctx, 'start', 'new');
  for (const step of ['intake', 'direction', 'ux', 'tokens']) {
    for (const file of ['ux/REPO-CONTEXT.md', 'UI-MAP.md', 'ux/EXPERIENCE-BRIEF.md', 'ux/UX-SPEC.md', 'ux/ux-map.excalidraw', 'DESIGN.md']) put(dir, file);
    const done = flowIn(ctx, 'done', step);
    assert.equal(done.status, 0, `${step}: ${done.stderr}`);
  }
  build(ctx, 'hero', 'hero banner');
  const refused = flowIn(ctx, 'done', 'compose');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /step "compose".*no registered piece: hero \("hero banner"\)/);
});

test('reuse and adapt decisions keep their current behavior without any piece (S5)', () => {
  const ctx = iterateProject();
  const reuse = memoryIn(ctx, 'add', '--screen', 'landing', '--block', 'faq', '--need', 'faq list', '--decision', 'reuse', '--id', 'magicui-micro-interactions-marquee');
  const adapt = memoryIn(ctx, 'add', '--screen', 'landing', '--block', 'ref', '--need', 'ref', '--decision', 'adapt', '--ref', 'reference:site');
  assert.equal(reuse.status, 0, reuse.stderr);
  assert.equal(adapt.status, 0, adapt.stderr);
  const ok = flowIn(ctx, 'done', 'iterate', '--evidence', 'reused');
  assert.equal(ok.status, 0, ok.stderr);
});

test('memory add --decision build refuses without a pieces find for the need, and records after it (S5)', () => {
  const ctx = iterateProject();
  const args = ['add', '--screen', 'landing', '--block', 'pricing', '--need', 'pricing table', '--decision', 'build', '--name', 'Pricing table'];
  const refused = memoryIn(ctx, ...args);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /pieces\.mjs find "pricing table"/);
  assert.equal(existsSync(out(ctx.dir, 'selections.jsonl')), false);
  assert.equal(piecesIn(ctx, 'find', 'testimonial carousel').status, 0);
  assert.equal(memoryIn(ctx, ...args).status, 1);
  assert.equal(piecesIn(ctx, 'find', 'pricing table').status, 0);
  const ok = memoryIn(ctx, ...args);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(readFileSync(out(ctx.dir, 'selections.jsonl'), 'utf8'), /"decision":"build"/);
});
