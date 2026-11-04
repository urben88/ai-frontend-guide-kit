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
  const run = flow(dir, 'status');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Decisions recorded: 2/);
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
