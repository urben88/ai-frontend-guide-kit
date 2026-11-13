import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
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

// ---------------------------------------------------------------- changed pieces guard (flow-always S4b)

const registerPiece = (ctx, name = 'pricing-table', file = 'PricingTable.tsx') => {
  const path = join(ctx.dir, file);
  writeFileSync(path, 'export const P = () => <table />;\n');
  const added = piecesIn(ctx, 'add', name, '--level', 'medium', '--file', file, '--new', '--reason', 'test seed');
  assert.equal(added.status, 0, added.stderr);
  return path;
};

test('done iterate refuses while a registered piece changed since its last version, and passes after pieces version (flow-always S4b)', () => {
  const ctx = iterateProject();
  const path = registerPiece(ctx);
  assert.equal(flowIn(ctx, 'done', 'iterate', '--evidence', 'built').status, 0, 'an unchanged piece does not block');
  const again = iterateProject();
  const file = registerPiece(again);
  writeFileSync(file, 'export const P = () => <table className="roomy" />;\n');
  const before = raw(again.dir);
  const refused = flowIn(again, 'done', 'iterate', '--evidence', 'built');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /step "iterate" cannot be marked done/);
  assert.match(refused.stderr, /pricing-table/);
  assert.match(refused.stderr, /node tools\/pieces\.mjs version pricing-table/);
  assert.equal(raw(again.dir), before, 'a refusal changes nothing');
  assert.equal(piecesIn(again, 'version', 'pricing-table', '--note', 'roomier').status, 0);
  const ok = flowIn(again, 'done', 'iterate', '--evidence', 'built');
  assert.equal(ok.status, 0, ok.stderr);
  assert.ok(path);
});

test('done compose refuses a changed piece too (flow-always S4b)', () => {
  const dir = project();
  const lib = join(mkdtempSync(join(tmpdir(), 'flow-lib-')), 'lib');
  const ctx = { dir, lib };
  flowIn(ctx, 'start', 'new');
  for (const step of ['intake', 'direction', 'ux', 'tokens']) {
    for (const file of ['ux/REPO-CONTEXT.md', 'UI-MAP.md', 'ux/EXPERIENCE-BRIEF.md', 'ux/UX-SPEC.md', 'ux/ux-map.excalidraw', 'DESIGN.md']) put(dir, file);
    assert.equal(flowIn(ctx, 'done', step).status, 0);
  }
  put(dir, 'selections.jsonl', '{"decision":"reuse"}\n');
  const file = registerPiece(ctx);
  writeFileSync(file, 'export const P = () => <table className="x" />;\n');
  const refused = flowIn(ctx, 'done', 'compose');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /step "compose".*pricing-table.*pieces\.mjs version pricing-table/s);
});

// ---------------------------------------------------------------- global index (flow-always S1)

const INDEX = join(ROOT, 'ai-frontend-guide-kit', 'INDEX.md');

test('INDEX.md is short and names every route of flow list and every tool of tools/ (flow-always S1)', () => {
  assert.ok(existsSync(INDEX), 'ai-frontend-guide-kit/INDEX.md exists');
  const text = readFileSync(INDEX, 'utf8').replace(/\r\n/g, '\n');
  const lines = text.trimEnd().split('\n').length;
  assert.ok(lines < 80, `INDEX.md has ${lines} lines; the limit is 79`);
  const listed = spawnSync(process.execPath, [TOOL, 'list'], { encoding: 'utf8', env: cleanEnv() }).stdout;
  const routes = [...listed.matchAll(/^### `([^`]+)`/gm)].map((match) => match[1]);
  assert.ok(routes.length >= 8, `found ${routes.length} routes`);
  for (const route of routes) assert.ok(text.includes(`\`${route}\``), `INDEX.md misses the route ${route}`);
  const tools = readdirSync(join(ROOT, 'ai-frontend-guide-kit', 'tools'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(mjs|py)$/.test(entry.name))
    .map((entry) => entry.name);
  assert.ok(tools.length >= 10, `found ${tools.length} tools`);
  for (const tool of tools) assert.ok(text.includes(tool), `INDEX.md misses the tool ${tool}`);
  assert.ok(text.includes('flow.mjs status') && text.includes('pieces.mjs find'), 'names the mandatory first command and pieces find');
  assert.ok(text.includes('guides/FLOWS.md') && text.includes('HELP.md'), 'says where the guides are');
});

test('flow status names INDEX.md, with and without an active route (flow-always S1)', () => {
  const dir = project();
  assert.match(flow(dir, 'status').stdout, /Index: ai-frontend-guide-kit\/INDEX\.md/);
  flow(dir, 'start', 'iterate');
  assert.match(flow(dir, 'status').stdout, /Index: ai-frontend-guide-kit\/INDEX\.md/);
  const json = JSON.parse(flow(dir, 'status', '--json').stdout);
  assert.equal(json.index, 'ai-frontend-guide-kit/INDEX.md');
});

// ---------------------------------------------------------------- conductor: flow next gives the whole instruction (weak-model-design S2, S5)

const home = () => mkdtempSync(join(tmpdir(), 'flow-home-'));
const guided = (dir, homeDir, ...args) => spawnSync(process.execPath, [TOOL, ...args, '--dir', dir], { encoding: 'utf8', env: { ...cleanEnv(), HOME: homeDir, USERPROFILE: homeDir } });
const O = 'ai-frontend-output';
const FILES = {
  [`${O}/ux/REPO-CONTEXT.md`]: '- **UX present:** no',
  [`${O}/UI-MAP.md`]: 'x',
  [`${O}/ux/EXPERIENCE-BRIEF.md`]: 'x',
  [`${O}/ux/UX-SPEC.md`]: 'x',
  [`${O}/ux/ux-map.excalidraw`]: '{}',
  'DESIGN.md': 'x',
  [`${O}/INVENTORY.md`]: 'x',
  [`${O}/selections.jsonl`]: '{"decision":"reuse"}',
  [`${O}/architecture.json`]: '{}',
};
/** Writes the files an instruction names (paths from the project root, as `next --json` lists them). */
const provide = (dir, files) => {
  for (const rel of files) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), FILES[rel]);
  }
};

test('next prints the whole instruction of every micro-step of every route, and the printed done command closes it (S2)', () => {
  const routes = ['new', 'direction', 'ux', 'iterate', 'polish', 'redesign', 'visual-feedback', 'architecture'];
  const seen = new Set();
  for (const route of routes) {
    const dir = project();
    const homeDir = home();
    assert.equal(guided(dir, homeDir, 'start', route).status, 0);
    for (let guard = 0; guard < 40; guard += 1) {
      const json = guided(dir, homeDir, 'next', '--json');
      assert.equal(json.status, 0, json.stderr);
      const info = JSON.parse(json.stdout);
      if (info.complete) break;
      const text = guided(dir, homeDir, 'next').stdout;
      const id = info.part ? `${info.step}.${info.part}` : info.step;
      seen.add(id);
      assert.match(text, new RegExp(`^Next step: ${info.step} — `), id);
      for (const heading of ['Goal: ', 'Do, in this order:', '1. ', 'Done when:', 'Then run: ']) assert.ok(text.includes(heading), `${id} misses "${heading}"`);
      assert.ok(text.trimEnd().split('\n').length <= 48, `${id} has ${text.trimEnd().split('\n').length} lines`);
      assert.doesNotMatch(text, /if installed|\(optional\)|\(recommended\)/i, `${id} leaves a branch to the reader`);
      assert.doesNotMatch(text, /node tools\//, `${id} uses a second path form`);
      assert.ok(text.includes(`done ${id}`), `${id} does not print its done command`);
      provide(dir, info.artifacts);
      const close = guided(dir, homeDir, 'done', id, ...(info.needs_evidence ? ['--evidence', 'checked'] : []));
      assert.equal(close.status, 0, `${id}: ${close.stderr}`);
    }
    assert.equal(state(dir).complete, true, `route ${route} did not complete`);
  }
  for (const id of ['direction.questions', 'direction.classify', 'direction.journey', 'direction.references', 'direction.directions', 'direction.choose', 'ux.product', 'ux.spec', 'ux.map', 'compose.inventory', 'compose.find', 'compose.decide', 'compose.adapt', 'intake', 'tokens', 'polish', 'iterate', 'redesign', 'visual-feedback', 'architecture']) {
    assert.ok(seen.has(id), `no instruction for ${id}`);
  }
});

test('a part is refused out of order or without its file, and the state stays unchanged (S2)', () => {
  const dir = project();
  const homeDir = home();
  guided(dir, homeDir, 'start', 'direction');
  provide(dir, [`${O}/ux/REPO-CONTEXT.md`, `${O}/UI-MAP.md`]);
  assert.equal(guided(dir, homeDir, 'done', 'intake').status, 0);
  const before = raw(dir);
  const skipped = guided(dir, homeDir, 'done', 'direction.classify');
  assert.equal(skipped.status, 1);
  assert.match(skipped.stderr, /not the current part \(current: questions\); parts are never skipped/);
  const missing = guided(dir, homeDir, 'done', 'direction.questions');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /missing ai-frontend-output\/ux\/EXPERIENCE-BRIEF\.md/);
  const unknown = guided(dir, homeDir, 'done', 'direction.nope');
  assert.equal(unknown.status, 2);
  assert.equal(raw(dir), before);
  provide(dir, [`${O}/ux/EXPERIENCE-BRIEF.md`]);
  const ok = guided(dir, homeDir, 'done', 'direction.questions');
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /Done: direction\.questions/);
  assert.match(ok.stdout, /part 2\/6: classify/);
  assert.deepEqual(state(dir).steps[1].parts_done, ['questions']);
  assert.equal(state(dir).steps[1].status, 'pending');
});

test('done <step> still closes a whole step, also on a state file written before parts existed (previous behavior)', () => {
  const dir = project();
  const homeDir = home();
  put(dir, 'flow-state.json', JSON.stringify({ route: 'direction', started_at: '2026-11-01T00:00:00.000Z', complete: false, steps: [{ id: 'intake', status: 'done' }, { id: 'direction', status: 'pending' }] }));
  const refused = guided(dir, homeDir, 'done', 'direction');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /missing ai-frontend-output\/ux\/EXPERIENCE-BRIEF\.md/);
  assert.match(guided(dir, homeDir, 'next').stdout, /part 1\/6: questions/);
  provide(dir, [`${O}/ux/EXPERIENCE-BRIEF.md`]);
  const ok = guided(dir, homeDir, 'done', 'direction');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(state(dir).complete, true);
});

test('next resolves what is installed instead of asking the reader (S2)', () => {
  const dir = project();
  const homeDir = home();
  guided(dir, homeDir, 'start', 'polish');
  provide(dir, [`${O}/ux/REPO-CONTEXT.md`, `${O}/UI-MAP.md`]);
  guided(dir, homeDir, 'done', 'intake');
  const bare = guided(dir, homeDir, 'next').stdout;
  assert.doesNotMatch(bare, /impeccable/);
  assert.match(bare, /Playwright MCP is not configured/);
  assert.match(bare, /no @playwright\/test in this project/);
  mkdirSync(join(dir, '.agents', 'skills', 'impeccable'), { recursive: true });
  mkdirSync(join(homeDir, '.claude', 'skills', 'frontend-polish'), { recursive: true });
  writeFileSync(join(dir, '.mcp.json'), JSON.stringify({ mcpServers: { playwright: { command: 'npx' } } }));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { '@playwright/test': '1.0.0' } }));
  const full = guided(dir, homeDir, 'next').stdout;
  assert.match(full, /\/impeccable audit/);
  assert.match(full, /Load the skill frontend-polish/);
  assert.match(full, /With the Playwright MCP/);
  assert.match(full, /Run: npx playwright test/);
});

test('with the kit inside the project every command uses the path from the project root (S5)', () => {
  const dir = project();
  const homeDir = home();
  cpSync(join(ROOT, 'ai-frontend-guide-kit', 'tools'), join(dir, 'ai-frontend-guide-kit', 'tools'), { recursive: true });
  const inner = join(dir, 'ai-frontend-guide-kit', 'tools', 'flow.mjs');
  const run = (...args) => spawnSync(process.execPath, [inner, ...args], { encoding: 'utf8', env: { ...cleanEnv(), HOME: homeDir, USERPROFILE: homeDir } });
  const started = run('start', 'iterate');
  assert.equal(started.status, 0, started.stderr);
  assert.match(started.stdout, /Run: node ai-frontend-guide-kit\/tools\/context\.mjs$/m);
  assert.match(started.stdout, /Then run: node ai-frontend-guide-kit\/tools\/flow\.mjs done intake$/m);
  assert.match(started.stdout, /ai-frontend-guide-kit\/guides\/00-START-HERE\.md/);
});
