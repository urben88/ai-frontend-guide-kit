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

// Content that passes every content gate of its file (the gates read the text, not only the file name).
const VALID_PRODUCT = [
  '# Product',
  '## Audience', 'Neighbours who order bread online.',
  '## Primary action', 'G1: place a first order.',
  '## Objections', 'O1: delivery may be late.', 'O2: the price is unknown.',
  '## Proof', 'P1: 2,000 orders delivered.',
  '## Tone', 'Warm, plain, never pushy.',
  '## User flows', 'Home → Menu → order.',
  '## Screen list', '- Home — sells', '- Menu — lists',
  '## Constraints', 'None.',
  '',
].join('\n');
const VALID_BRIEF = [
  '# Experience brief',
  '## Context', 'Bakery for neighbours who order bread online.',
  '## Goal', 'The visitor places a first order.',
  '## Archetype', 'site archetype: catalog · experience archetype: storefront', 'navigation_model: catalog', 'pages: Home — sells; Menu — lists', 'why: orders start at the menu',
  '## Philosophy', 'chosen: warm · why: trust', 'discarded: minimal · why: too cold',
  '## Journey', 'actor: neighbour · scenario: hungry',
  '| Phase | Does | Thinks | Feels | Friction | Opportunity |', '|---|---|---|---|---|---|',
  '| Arrive | looks | nice | curious | slow | photo |', '| Choose | picks | which | unsure | many | filters |', '| Order | pays | done | calm | form | one step |',
  '## Information architecture', 'priority content: menu', 'navigation: menu, cart', 'section order: Home — hero, menu', 'entry and exit points: search · search or filters: none',
  '## Reference discoveries', 'the user gave no reference',
  '## Three directions',
  '### safe: Classic', 'changes: none', '### differentiated: Market', 'changes: stalls', '### experimental: Night', 'changes: dark',
  '## Recommended direction', 'id: market · rationale: fits · risks: low',
  '## Interaction patterns', '- menu: grid — solves choice',
  '## Visual brief', 'style: warm · palette intent: bread · typography personality: friendly', 'composition: grid · motion: calm', 'anti-generic list: no stock photos',
  '## Accessibility', 'keyboard: tab order · contrast: 4.5 · motion: reduced · language: en',
  '## Open questions', '- none',
  '',
].join('\n');
const VALID_SPEC = [
  '# UX spec',
  '## Screens',
  '| Screen | Purpose | Primary action | Empty state | Loading state | Error state | Serves |', '|---|---|---|---|---|---|---|',
  '| Home | sells | Order | none yet | skeleton | retry | G1, P1 |', '| Menu | lists | Pick | no items | skeleton | retry | O1 |',
  '## Flows', '### Order', '1. Home → shows menu → primary action order → goes to Menu',
  '## Navigation', 'Top bar, collapses to a menu button',
  '## Audit', '| Anti-pattern | Result (PASS, WARN or FAIL) | Where |', '|---|---|---|',
  '',
].join('\n');
const VALID_DESIGN = [
  '# Design',
  '## Visual intent', 'Warm and plain.',
  '## Color', '| Token | Value | Use |', '|---|---|---|', '| --color-primary | #8a4b08 | buttons |',
  '## Type', 'display: Fraunces · body: Inter · scale: 14, 16, 24',
  '## Spacing', 'scale: 4, 8, 12, 16, 24, 32, 48, 64',
  '## Radius', 'medium',
  '## Motion', 'calm · 200ms ease-out',
  '## Contrast', 'body text on surface: 7.1:1',
  '',
].join('\n');
const VALID_INVENTORY = [
  '# Inventory',
  '| Screen | Block | Category | Priority | Notes | Candidates | Decision |', '|---|---|---|---|---|---|---|',
  '| Home | hero | hero | must | one image | magicui-hero | reuse |',
  '',
].join('\n');
const VALID_ARCHITECTURE = JSON.stringify({ version: 1, mode: 'map', framework: 'react', layers: { app: [], pages: [], widgets: [], features: [], entities: [], shared: [] }, unmapped: [], notes: 'Mapping only.' });
const VALID_MAP = JSON.stringify({ elements: [{ type: 'text', text: 'Home' }, { type: 'text', text: 'Menu' }] });
const VALID = {
  'ux/EXPERIENCE-BRIEF.md': VALID_BRIEF,
  'ux/UX-SPEC.md': VALID_SPEC,
  'ux/ux-map.excalidraw': VALID_MAP,
  'DESIGN.md': VALID_DESIGN,
  'INVENTORY.md': VALID_INVENTORY,
  'architecture.json': VALID_ARCHITECTURE,
};
const put = (dir, rel, text = VALID[rel] ?? 'x\n') => {
  mkdirSync(dirname(out(dir, rel)), { recursive: true });
  writeFileSync(out(dir, rel), text);
};
/** `flow report <step>`, then every line marked [x] with a result: what a finished report looks like. */
const fillReport = (dir, step) => {
  assert.equal(flow(dir, 'report', step).status, 0, `report ${step}`);
  const file = out(dir, `reports/${step}-report.md`);
  writeFileSync(file, readFileSync(file, 'utf8').replace(/- \[ \]/g, '- [x]').replace(/<[^<>\n]+>/g, 'ok'));
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
  fillReport(dir, 'polish');
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
  fillReport(dir, 'iterate');
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
    writeFileSync(join(dir, 'PRODUCT.md'), VALID_PRODUCT);
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
    writeFileSync(join(dir, 'PRODUCT.md'), VALID_PRODUCT);
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
  [`${O}/ux/EXPERIENCE-BRIEF.md`]: VALID_BRIEF,
  [`${O}/ux/UX-SPEC.md`]: VALID_SPEC,
  [`${O}/ux/ux-map.excalidraw`]: VALID_MAP,
  'DESIGN.md': VALID_DESIGN,
  'PRODUCT.md': VALID_PRODUCT,
  [`${O}/INVENTORY.md`]: VALID_INVENTORY,
  [`${O}/selections.jsonl`]: '{"decision":"reuse"}',
  [`${O}/architecture.json`]: VALID_ARCHITECTURE,
};
/** Writes the files an instruction names (paths from the project root, as `next --json` lists them). */
const provide = (dir, files) => {
  for (const rel of files) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), FILES[rel]);
  }
};

const fill = (text) => text.replace(/<[^<>\n]+>/g, 'ok');
/** What a weak model must do with a scaffolded file: replace every token, and add the rows a gate needs. */
const COMPLETE = {
  'direction.classify': (text) => fill(text.replace('<one of the six>', 'hub')),
  'direction.journey': (text) => fill(text).replace('|---|---|---|---|---|---|\n', `$&${'| a | b | c | d | e | f |\n'.repeat(3)}`),
  'direction.directions': (text) => fill(text).replace(/### ok: ok\n[\s\S]*$/, '### safe: A\nchanges: a\n### differentiated: B\nchanges: b\n### experimental: C\nchanges: c\n'),
  'ux.spec': (text) => fill(text).replace('|---|---|---|---|---|---|---|\n', '$&| Home | ok | ok | ok | ok | ok | G1, O1 |\n'),
  tokens: (text) => fill(text.replace('<ratio>', '7:1')),
  'compose.find': (text) => text.replace('| must | ok | | |', '| must | ok | magicui-x | |'),
  'compose.decide': (text) => text.replace('| must | ok | magicui-x | |', '| must | ok | magicui-x | reuse |'),
};
/** Closes the micro-step `info` describes with valid content: scaffold, fill, and the report of the steps that need one. */
const complete = (dir, homeDir, info) => {
  const id = info.part ? `${info.step}.${info.part}` : info.step;
  if (info.template) {
    assert.equal(guided(dir, homeDir, 'scaffold').status, 0, `${id}: scaffold`);
    const file = join(dir, info.template.file);
    writeFileSync(file, (COMPLETE[id] ?? fill)(readFileSync(file, 'utf8')));
  } else if (id === 'compose.find' || id === 'compose.decide') {
    const file = out(dir, 'INVENTORY.md');
    writeFileSync(file, COMPLETE[id](readFileSync(file, 'utf8')));
  } else provide(dir, info.artifacts);
  if (info.report) {
    assert.equal(guided(dir, homeDir, 'report', info.step).status, 0, `${id}: report`);
    const file = join(dir, info.report.file);
    writeFileSync(file, fill(readFileSync(file, 'utf8')).replace(/- \[ \]/g, '- [x]'));
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
      complete(dir, homeDir, info);
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
  put(dir, 'ux/EXPERIENCE-BRIEF.md', 'x\n');
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

test('done ux.product needs PRODUCT.md, except where the repository has its own product document (S2)', () => {
  const atProduct = (context) => {
    const dir = project();
    const homeDir = home();
    guided(dir, homeDir, 'start', 'ux');
    put(dir, 'ux/REPO-CONTEXT.md', context);
    put(dir, 'UI-MAP.md');
    assert.equal(guided(dir, homeDir, 'done', 'intake').status, 0);
    return { dir, homeDir };
  };
  const plain = atProduct('- **UX present:** no\n- **Framework:** none\n');
  const before = raw(plain.dir);
  const refused = guided(plain.dir, plain.homeDir, 'done', 'ux.product');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /part "ux\.product" cannot be marked done: missing PRODUCT\.md/);
  assert.equal(raw(plain.dir), before);
  writeFileSync(join(plain.dir, 'PRODUCT.md'), VALID_PRODUCT);
  const ok = guided(plain.dir, plain.homeDir, 'done', 'ux.product');
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepEqual(state(plain.dir).steps[1].parts_done, ['product']);

  const bmad = atProduct('- **UX present:** no\n- **Framework:** bmad — _bmad/ found\n');
  assert.match(guided(bmad.dir, bmad.homeDir, 'next').stdout, /Do not create PRODUCT\.md/);
  assert.equal(guided(bmad.dir, bmad.homeDir, 'done', 'ux.product').status, 0);
});

// ---------------------------------------------------------------- scaffolds and content gates (weak-model-design S2, S3)

const NEW_STEPS = ['intake', 'direction', 'ux', 'tokens', 'compose', 'polish'];
/** Writes a flow-state.json of route `new` whose current step is `current`; `gates: 0` writes the state of a route started before content gates. */
const stateAt = (dir, current, extra = {}, gates = 1) => {
  const at = NEW_STEPS.indexOf(current);
  const steps = NEW_STEPS.map((id, index) => ({ id, status: index < at ? 'done' : 'pending', ...(index === at ? extra : {}) }));
  put(dir, 'flow-state.json', JSON.stringify({ route: 'new', ...(gates ? { gates } : {}), started_at: '2026-11-13T00:00:00.000Z', complete: false, steps }));
};
const BRIEF = 'ux/EXPERIENCE-BRIEF.md';
const BRIEF_SHOWN = 'ai-frontend-output/ux/EXPERIENCE-BRIEF.md';
const refusal = (run, dir, before) => {
  assert.equal(run.status, 1, run.stdout);
  assert.equal(raw(dir), before, 'a refusal leaves flow-state.json untouched');
  return run.stderr;
};

test('start records gates: 1 in the state, so the content gates apply to this route (S2)', () => {
  const dir = project();
  assert.equal(flow(dir, 'start', 'new').status, 0);
  assert.equal(state(dir).gates, 1);
});

test('scaffold writes the template of the current micro-step, then adds only the sections a file lacks and never changes what is there (S2)', () => {
  const dir = project();
  const homeDir = home();
  stateAt(dir, 'direction');
  const before = raw(dir);
  const first = guided(dir, homeDir, 'scaffold');
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /ai-frontend-output\/ux\/EXPERIENCE-BRIEF\.md/);
  const written = readFileSync(out(dir, BRIEF), 'utf8');
  assert.match(written, /^# Experience brief$/m);
  assert.match(written, /^## Context$/m);
  assert.match(written, /^## Goal$/m);
  assert.match(written, /<the one action that counts as success>/);
  assert.doesNotMatch(written, /## Archetype/, 'only the sections of the current part');
  assert.equal(raw(dir), before, 'scaffold does not touch the state');

  const again = guided(dir, homeDir, 'scaffold');
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /nothing to write/i);
  assert.equal(readFileSync(out(dir, BRIEF), 'utf8'), written);

  const mine = '# Experience brief\n## Context\nA bakery for neighbours.\n';
  writeFileSync(out(dir, BRIEF), mine);
  assert.equal(guided(dir, homeDir, 'scaffold', 'direction.questions').status, 0);
  const merged = readFileSync(out(dir, BRIEF), 'utf8');
  assert.ok(merged.startsWith(mine), 'existing content is untouched');
  assert.equal(merged.match(/^## Context$/gm).length, 1);
  assert.match(merged, /^## Goal$/m);
  assert.equal(guided(dir, homeDir, 'scaffold', 'direction.classify').status, 0);
  const more = readFileSync(out(dir, BRIEF), 'utf8');
  assert.ok(more.startsWith(merged));
  assert.match(more, /^## Archetype$/m);
  assert.match(more, /^## Philosophy$/m);
});

test('scaffold says so when a part has no template, writes a JSON template only when the file is missing, and refuses unknown names (S2)', () => {
  const dir = project();
  const homeDir = home();
  const noFlow = guided(dir, homeDir, 'scaffold');
  assert.equal(noFlow.status, 1);
  assert.match(noFlow.stderr, /no active flow/);
  const none = guided(dir, homeDir, 'scaffold', 'compose.find');
  assert.equal(none.status, 0, none.stderr);
  assert.match(none.stdout, /no template/);
  const made = guided(dir, homeDir, 'scaffold', 'architecture');
  assert.equal(made.status, 0, made.stderr);
  assert.equal(JSON.parse(readFileSync(out(dir, 'architecture.json'), 'utf8')).mode, 'map');
  writeFileSync(out(dir, 'architecture.json'), '{"mine":1}');
  assert.equal(guided(dir, homeDir, 'scaffold', 'architecture').status, 0);
  assert.equal(readFileSync(out(dir, 'architecture.json'), 'utf8'), '{"mine":1}');
  assert.equal(guided(dir, homeDir, 'scaffold', 'nope').status, 2);
  const part = guided(dir, homeDir, 'scaffold', 'direction.nope');
  assert.equal(part.status, 2);
  assert.match(part.stderr, /unknown part "nope"/);
});

test('done refuses a file that exists but says nothing: a numbered list names file, section and what is missing, and the state stays unchanged (S2)', () => {
  const dir = project();
  const homeDir = home();
  stateAt(dir, 'direction');
  const before = raw(dir);
  put(dir, BRIEF, '# Experience brief\n## Context\n<product · audience>\n## Goal\n\n');
  const empty = refusal(guided(dir, homeDir, 'done', 'direction.questions'), dir, before);
  assert.match(empty, /part "direction\.questions" cannot be marked done/);
  assert.match(empty, /1\. ai-frontend-output\/ux\/EXPERIENCE-BRIEF\.md: section "Context" still has a template token/);
  assert.match(empty, /2\. ai-frontend-output\/ux\/EXPERIENCE-BRIEF\.md: section "Goal" is empty/);
  put(dir, BRIEF, '# Experience brief\n## Context\nreal\n');
  assert.match(refusal(guided(dir, homeDir, 'done', 'direction.questions'), dir, before), /section "Goal" is missing/);
  put(dir, BRIEF, '# Experience brief\n## Context\nreal\n## Goal\nthe first order\n');
  const ok = guided(dir, homeDir, 'done', 'direction.questions');
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepEqual(state(dir).steps[1].parts_done, ['questions']);
});

test('direction.classify needs one of the six navigation models, a page list and the discarded philosophy; direction.choose needs the id (S2)', () => {
  const dir = project();
  const homeDir = home();
  stateAt(dir, 'direction', { parts_done: ['questions'] });
  const before = raw(dir);
  const philosophy = '## Philosophy\nchosen: warm · why: trust\ndiscarded: minimal · why: cold\n';
  const brief = (nav, rest = philosophy) => `# Experience brief\n## Archetype\nsite archetype: catalog\n${nav}\npages: Home — sells\n${rest}`;
  put(dir, BRIEF, brief('why: one'));
  assert.match(refusal(guided(dir, homeDir, 'done', 'direction.classify'), dir, before), /section "Archetype": the line "navigation_model: …" is missing/);
  put(dir, BRIEF, brief('navigation_model: carousel'));
  assert.match(refusal(guided(dir, homeDir, 'done', 'direction.classify'), dir, before), /navigation_model "carousel" is not one of: single-page-anchors, linear-wizard, hub, catalog, console, tree/);
  put(dir, BRIEF, brief('navigation_model: hub', '## Philosophy\nchosen: warm\n'));
  assert.match(refusal(guided(dir, homeDir, 'done', 'direction.classify'), dir, before), /section "Philosophy": the "discarded:" line is missing/);
  put(dir, BRIEF, brief('navigation_model: hub'));
  assert.equal(guided(dir, homeDir, 'done', 'direction.classify').status, 0);

  const choose = project();
  stateAt(choose, 'direction', { parts_done: ['questions', 'classify', 'journey', 'references', 'directions'] });
  const base = raw(choose);
  put(choose, BRIEF, VALID_BRIEF.replace('id: market · rationale', 'rationale'));
  assert.match(refusal(guided(choose, homeDir, 'done', 'direction.choose'), choose, base), /section "Recommended direction": the line "id: …" is missing/);
  put(choose, BRIEF, VALID_BRIEF.replace('## Accessibility\nkeyboard: tab order · contrast: 4.5 · motion: reduced · language: en\n', ''));
  assert.match(refusal(guided(choose, homeDir, 'done', 'direction.choose'), choose, base), /section "Accessibility" is missing/);
  put(choose, BRIEF, VALID_BRIEF);
  assert.equal(guided(choose, homeDir, 'done', 'direction.choose').status, 0);
});

test('direction.journey needs a table of at least 3 phases, and direction.directions the three blocks (S2)', () => {
  const dir = project();
  const homeDir = home();
  stateAt(dir, 'direction', { parts_done: ['questions', 'classify'] });
  const before = raw(dir);
  put(dir, BRIEF, VALID_BRIEF.replace('| Choose | picks | which | unsure | many | filters |\n', '').replace('| Order | pays | done | calm | form | one step |\n', ''));
  assert.match(refusal(guided(dir, homeDir, 'done', 'direction.journey'), dir, before), /section "Journey": the table needs at least 3 rows of data \(it has 1\)/);
  put(dir, BRIEF, VALID_BRIEF);
  assert.equal(guided(dir, homeDir, 'done', 'direction.journey').status, 0);
  assert.equal(guided(dir, homeDir, 'done', 'direction.references').status, 0);
  const mid = raw(dir);
  put(dir, BRIEF, VALID_BRIEF.replace('### experimental: Night\nchanges: dark\n', ''));
  assert.match(refusal(guided(dir, homeDir, 'done', 'direction.directions'), dir, mid), /section "Three directions": no "experimental" block/);
  put(dir, BRIEF, VALID_BRIEF);
  assert.equal(guided(dir, homeDir, 'done', 'direction.directions').status, 0);
});

test('done direction closes the whole step only when every part gate passes (S2)', () => {
  const dir = project();
  const homeDir = home();
  stateAt(dir, 'direction');
  const before = raw(dir);
  put(dir, BRIEF, '# Experience brief\n## Context\nreal\n## Goal\nthe first order\n');
  const refused = refusal(guided(dir, homeDir, 'done', 'direction'), dir, before);
  assert.match(refused, /step "direction" cannot be marked done/);
  assert.match(refused, /section "Archetype" is missing/);
  assert.match(refused, /section "Three directions" is missing/);
  put(dir, BRIEF, VALID_BRIEF);
  assert.equal(guided(dir, homeDir, 'done', 'direction').status, 0);
});

test('done ux.product needs Audience, Primary action (G1), Objections (O1), Proof (P1) and Tone, except where the repository has its own product document (S3)', () => {
  const dir = project();
  const homeDir = home();
  stateAt(dir, 'ux');
  put(dir, 'ux/REPO-CONTEXT.md', '- **UX present:** no\n- **Framework:** none\n');
  const before = raw(dir);
  writeFileSync(join(dir, 'PRODUCT.md'), '# Product\n## Audience\nNeighbours.\n## Primary conversion\nOrders.\n');
  const old = refusal(guided(dir, homeDir, 'done', 'ux.product'), dir, before);
  assert.match(old, /PRODUCT\.md: section "Primary action" is missing/);
  assert.match(old, /PRODUCT\.md: section "Objections" is missing/);
  assert.match(old, /PRODUCT\.md: section "Proof" is missing/);
  assert.match(old, /PRODUCT\.md: section "Tone" is missing/);
  writeFileSync(join(dir, 'PRODUCT.md'), VALID_PRODUCT.replace('G1: place a first order.', 'place a first order.').replace('O1: delivery may be late.\nO2: the price is unknown.', 'delivery may be late.').replace('P1: ', ''));
  const ids = refusal(guided(dir, homeDir, 'done', 'ux.product'), dir, before);
  assert.match(ids, /section "Primary action": give the action an id, "G1: …"/);
  assert.match(ids, /section "Objections": give each objection an id, "O1: …"/);
  assert.match(ids, /section "Proof": give each proof an id, "P1: …"/);
  writeFileSync(join(dir, 'PRODUCT.md'), VALID_PRODUCT.replace('G1: place a first order.', 'G1: <the one measurable action>'));
  assert.match(refusal(guided(dir, homeDir, 'done', 'ux.product'), dir, before), /section "Primary action" still has a template token/);
  writeFileSync(join(dir, 'PRODUCT.md'), VALID_PRODUCT);
  assert.equal(guided(dir, homeDir, 'done', 'ux.product').status, 0);

  const own = project();
  stateAt(own, 'ux');
  put(own, 'ux/REPO-CONTEXT.md', '- **UX present:** no\n- **Framework:** bmad — _bmad/ found\n');
  writeFileSync(join(own, 'PRODUCT.md'), 'free text of an old file\n');
  assert.equal(guided(own, homeDir, 'done', 'ux.product').status, 0, 'a repository with its own product document has no PRODUCT.md gate');
});

test('done ux.spec needs three states and a Serves cell on every screen, and the ids must exist in PRODUCT.md (S3)', () => {
  const dir = project();
  const homeDir = home();
  stateAt(dir, 'ux', { parts_done: ['product'] });
  writeFileSync(join(dir, 'PRODUCT.md'), VALID_PRODUCT);
  const before = raw(dir);
  const spec = (rows, header = '| Screen | Purpose | Primary action | Empty state | Loading state | Error state | Serves |') => VALID_SPEC.replace(/\| Screen \|[^\n]*\n\|---\|---\|---\|---\|---\|---\|---\|\n\| Home[^\n]*\n\| Menu[^\n]*\n/, `${header}\n|---|---|---|---|---|---|---|\n${rows}\n`);
  put(dir, 'ux/UX-SPEC.md', spec('| Home | sells | Order | none yet | skeleton | retry | |\n| Menu | lists | Pick | no items | skeleton | | G9 |'));
  const refused = refusal(guided(dir, homeDir, 'done', 'ux.spec'), dir, before);
  assert.match(refused, /UX-SPEC\.md: section "Screens", screen "Home": "Serves" is empty; cite the id of what it serves in PRODUCT\.md \(G1, O1, P1\)/);
  assert.match(refused, /screen "Menu": the error state is empty/);
  assert.match(refused, /screen "Menu": "Serves" cites G9, which PRODUCT\.md does not define/);
  put(dir, 'ux/UX-SPEC.md', spec('| Home | sells | Order | none yet | skeleton | retry | tbd |'));
  assert.match(refusal(guided(dir, homeDir, 'done', 'ux.spec'), dir, before), /screen "Home": "Serves" holds no id/);
  put(dir, 'ux/UX-SPEC.md', spec('| Home | sells | Order | none yet | skeleton | retry |', '| Screen | Purpose | Primary action | Empty state | Loading state | Error state |'));
  assert.match(refusal(guided(dir, homeDir, 'done', 'ux.spec'), dir, before), /section "Screens": the table has no "Serves" column/);
  put(dir, 'ux/UX-SPEC.md', VALID_SPEC.replace('1. Home →', 'Home →'));
  assert.match(refusal(guided(dir, homeDir, 'done', 'ux.spec'), dir, before), /section "Flows": no numbered flow/);
  put(dir, 'ux/UX-SPEC.md', VALID_SPEC);
  assert.equal(guided(dir, homeDir, 'done', 'ux.spec').status, 0);

  const own = project();
  stateAt(own, 'ux', { parts_done: ['product'] });
  put(own, 'ux/UX-SPEC.md', VALID_SPEC.replace('G1, P1', 'story:2.1').replace('| O1 |', '| story:3.4 |'));
  assert.equal(guided(own, homeDir, 'done', 'ux.spec').status, 0, 'without PRODUCT.md any id is accepted');
});

test('done ux.map needs every screen of the spec as a node (S3)', () => {
  const dir = project();
  const homeDir = home();
  stateAt(dir, 'ux', { parts_done: ['product', 'spec'] });
  put(dir, 'ux/UX-SPEC.md');
  const before = raw(dir);
  put(dir, 'ux/ux-map.excalidraw', JSON.stringify({ elements: [{ type: 'text', text: 'Home' }] }));
  assert.match(refusal(guided(dir, homeDir, 'done', 'ux.map'), dir, before), /ux-map\.excalidraw: the screen "Menu" of UX-SPEC\.md is not a node of the map/);
  put(dir, 'ux/ux-map.excalidraw', '{not json');
  assert.match(refusal(guided(dir, homeDir, 'done', 'ux.map'), dir, before), /is not valid JSON/);
  put(dir, 'ux/ux-map.excalidraw');
  assert.equal(guided(dir, homeDir, 'done', 'ux.map').status, 0);
});

test('tokens, inventory and architecture check their content, and compose.find and compose.decide check the Candidates and Decision cells (S2)', () => {
  const homeDir = home();
  const dir = project();
  stateAt(dir, 'tokens');
  const before = raw(dir);
  put(dir, 'DESIGN.md', VALID_DESIGN.replace('7.1:1', '3.2:1'));
  assert.match(refusal(guided(dir, homeDir, 'done', 'tokens'), dir, before), /section "Contrast": 3\.2 is below 4\.5/);
  put(dir, 'DESIGN.md', VALID_DESIGN.replace('| --color-primary | #8a4b08 | buttons |\n', '| --color-primary | <…> | <…> |\n'));
  assert.match(refusal(guided(dir, homeDir, 'done', 'tokens'), dir, before), /section "Color" still has a template token/);
  put(dir, 'DESIGN.md');
  assert.equal(guided(dir, homeDir, 'done', 'tokens').status, 0);

  const compose = project();
  stateAt(compose, 'compose');
  const base = raw(compose);
  put(compose, 'INVENTORY.md', '# Inventory\n| Screen | Block | Category | Priority | Notes | Candidates | Decision |\n|---|---|---|---|---|---|---|\n');
  assert.match(refusal(guided(compose, homeDir, 'done', 'compose.inventory'), compose, base), /INVENTORY\.md: the table has no rows of data/);
  put(compose, 'INVENTORY.md', VALID_INVENTORY.replace('| must |', '| urgent |'));
  assert.match(refusal(guided(compose, homeDir, 'done', 'compose.inventory'), compose, base), /Priority "urgent" is not must, should or nice/);
  put(compose, 'INVENTORY.md', VALID_INVENTORY.replace('| magicui-hero | reuse |', '| | |'));
  assert.equal(guided(compose, homeDir, 'done', 'compose.inventory').status, 0, 'candidates and decision are still empty after the inventory');
  const mid = raw(compose);
  assert.match(refusal(guided(compose, homeDir, 'done', 'compose.find'), compose, mid), /row "Home \/ hero": no candidates/);
  put(compose, 'INVENTORY.md', VALID_INVENTORY.replace('| reuse |', '| |'));
  assert.equal(guided(compose, homeDir, 'done', 'compose.find').status, 0);
  const late = raw(compose);
  assert.match(refusal(guided(compose, homeDir, 'done', 'compose.decide'), compose, late), /row "Home \/ hero": no decision/);
  put(compose, 'INVENTORY.md');
  assert.equal(guided(compose, homeDir, 'done', 'compose.decide').status, 0);

  const arch = project();
  guided(arch, homeDir, 'start', 'architecture');
  put(arch, 'ux/REPO-CONTEXT.md');
  put(arch, 'UI-MAP.md');
  assert.equal(guided(arch, homeDir, 'done', 'intake').status, 0);
  const archBefore = raw(arch);
  put(arch, 'architecture.json', '{"version":1,"mode":"map","framework":"<from REPO-CONTEXT.md>","layers":{}}');
  assert.match(refusal(guided(arch, homeDir, 'done', 'architecture'), arch, archBefore), /architecture\.json: "framework" still has a template token/);
  put(arch, 'architecture.json', '{"version":1,"mode":"everything","layers":{}}');
  assert.match(refusal(guided(arch, homeDir, 'done', 'architecture'), arch, archBefore), /mode "everything" is not one of: map, fsd-new, fsd-refactor/);
  put(arch, 'architecture.json');
  assert.equal(guided(arch, homeDir, 'done', 'architecture').status, 0);
});

test('a route started before content gates keeps the old rule: the file exists and is not empty (previous behavior)', () => {
  const homeDir = home();
  const legacy = project();
  stateAt(legacy, 'direction', {}, 0);
  put(legacy, BRIEF, 'x\n');
  assert.equal(guided(legacy, homeDir, 'done', 'direction.questions').status, 0, 'a one-line brief closes a part');
  assert.equal(guided(legacy, homeDir, 'done', 'direction').status, 0, 'and the whole step');

  const product = project();
  stateAt(product, 'ux', {}, 0);
  writeFileSync(join(product, 'PRODUCT.md'), '# Product\n');
  assert.equal(guided(product, homeDir, 'done', 'ux.product').status, 0);
  put(product, 'ux/UX-SPEC.md', 'x\n');
  assert.equal(guided(product, homeDir, 'done', 'ux.spec').status, 0);

  const polish = project();
  stateAt(polish, 'polish', {}, 0);
  const before = raw(polish);
  assert.match(refusal(guided(polish, homeDir, 'done', 'polish'), polish, before), /step "polish" needs --evidence/);
  const ok = guided(polish, homeDir, 'done', 'polish', '--evidence', 'playwright loop green');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(state(polish).steps.at(-1).evidence, 'playwright loop green');
  assert.equal(existsSync(out(polish, 'reports')), false, 'no report was asked for');
});

test('flow report writes a checklist for the steps closed with free evidence, and done needs it filled: --evidence alone is not enough (S3)', () => {
  const dir = project();
  const homeDir = home();
  guided(dir, homeDir, 'start', 'polish');
  put(dir, 'ux/REPO-CONTEXT.md');
  put(dir, 'UI-MAP.md');
  assert.equal(guided(dir, homeDir, 'done', 'intake').status, 0);
  const before = raw(dir);
  const alone = refusal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'all green'), dir, before);
  assert.match(alone, /step "polish" cannot be marked done/);
  assert.match(alone, /ai-frontend-output\/reports\/polish-report\.md is missing/);
  assert.match(alone, /flow\.mjs report polish/);

  const made = guided(dir, homeDir, 'report', 'polish');
  assert.equal(made.status, 0, made.stderr);
  const file = out(dir, 'reports/polish-report.md');
  const text = readFileSync(file, 'utf8');
  assert.match(text, /^# Polish report$/m);
  assert.match(text, /^- \[ \] Honesty audit \(audit-honesty --strict\) — result: <…>$/m);
  assert.match(text, /^- \[ \] Console without errors — result: <…>$/m);
  assert.equal(raw(dir), before, 'report does not touch the state');
  const open = refusal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'all green'), dir, before);
  assert.match(open, /polish-report\.md: check "Console without errors" is not done/);

  const filled = text.replace(/- \[ \]/g, '- [x]').replace(/<…>/g, '0 findings');
  writeFileSync(file, filled);
  assert.equal(guided(dir, homeDir, 'report', 'polish').status, 0);
  assert.equal(readFileSync(file, 'utf8'), filled, 'running report again never changes what was written');

  writeFileSync(file, filled.replace('- [x] Console without errors — result: 0 findings', '- [x] Console without errors — result: <…>'));
  assert.match(refusal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'all green'), dir, before), /check "Console without errors": the result still has a template token/);
  writeFileSync(file, filled.replace('- [x] Console without errors — result: 0 findings', '- [x] Console without errors'));
  assert.match(refusal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'all green'), dir, before), /check "Console without errors": write its result after "result:"/);
  writeFileSync(file, filled.replace('- [x] Honesty audit (audit-honesty --strict) — result: 0 findings', '- [n/a] Honesty audit (audit-honesty --strict) — result: 0 findings'));
  assert.match(refusal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'all green'), dir, before), /check "Honesty audit \(audit-honesty --strict\)": write why it does not apply after "reason:"/);
  writeFileSync(file, filled.replace(/- \[x\] Reduced motion[^\n]*\n/, ''));
  assert.match(refusal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'all green'), dir, before), /check "Reduced motion" is missing from the report/);

  writeFileSync(file, filled.replace('- [x] Honesty audit (audit-honesty --strict) — result: 0 findings', '- [n/a] Honesty audit (audit-honesty --strict) — reason: there is no src folder'));
  const ok = guided(dir, homeDir, 'done', 'polish', '--evidence', 'all green');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(state(dir).steps.at(-1).evidence, 'all green');
});

test('flow report exists for polish, iterate, redesign and visual-feedback only (S3)', () => {
  const dir = project();
  for (const step of ['polish', 'iterate', 'redesign', 'visual-feedback']) {
    const run = flow(dir, 'report', step);
    assert.equal(run.status, 0, `${step}: ${run.stderr}`);
    assert.ok(existsSync(out(dir, `reports/${step}-report.md`)), step);
    assert.match(readFileSync(out(dir, `reports/${step}-report.md`), 'utf8'), /^- \[ \] .+ — result: <…>$/m);
  }
  const intake = flow(dir, 'report', 'intake');
  assert.equal(intake.status, 2);
  assert.match(intake.stderr, /reports exist for: iterate, redesign, polish, visual-feedback/);
  assert.equal(flow(dir, 'report').status, 2);
});

test('next tells the reader how to write the file and the report, and resolves the branches ux.product and ux.map left to the reader (S2)', () => {
  const dir = project();
  const homeDir = home();
  stateAt(dir, 'direction');
  const text = guided(dir, homeDir, 'next').stdout;
  assert.match(text, /write it with: node [^\n]*flow\.mjs scaffold direction\.questions/);
  const info = JSON.parse(guided(dir, homeDir, 'next', '--json').stdout);
  assert.equal(info.template.file, BRIEF_SHOWN);

  const ux = project();
  stateAt(ux, 'ux', { parts_done: ['product', 'spec'] });
  put(ux, 'ux/REPO-CONTEXT.md', '- **UX present:** no\n');
  const plain = guided(ux, homeDir, 'next').stdout;
  assert.doesNotMatch(plain, /if it exists|already exists/i);
  assert.doesNotMatch(plain, /ux-map-baseline/);
  assert.match(plain, /There is no .*EXPERIENCE-BRIEF\.md/);
  put(ux, 'ux/ux-map.excalidraw');
  put(ux, BRIEF);
  const redo = guided(ux, homeDir, 'next').stdout;
  assert.match(redo, /copy it first to ai-frontend-output\/ux\/ux-map-baseline\.excalidraw/);
  assert.match(redo, /Choose the template from navigation_model/);

  const product = project();
  stateAt(product, 'ux');
  put(product, 'ux/REPO-CONTEXT.md', '- **UX present:** no\n');
  assert.doesNotMatch(guided(product, homeDir, 'next').stdout, /if it exists/);
  put(product, BRIEF);
  assert.match(guided(product, homeDir, 'next').stdout, /Read ai-frontend-output\/ux\/EXPERIENCE-BRIEF\.md: the screens must respect its direction/);

  const polish = project();
  stateAt(polish, 'polish');
  const polishText = guided(polish, homeDir, 'next').stdout;
  assert.match(polishText, /flow\.mjs report polish/);
  assert.equal(JSON.parse(guided(polish, homeDir, 'next', '--json').stdout).report.file, 'ai-frontend-output/reports/polish-report.md');
});

test('the usage text and guides/FLOWS.md name scaffold, report and the content gates (S2, S3)', () => {
  const help = spawnSync(process.execPath, [TOOL, '--help'], { encoding: 'utf8', env: cleanEnv() }).stdout;
  assert.match(help, /flow\.mjs scaffold \[<step>\[\.<part>\]\]/);
  assert.match(help, /flow\.mjs report <step>/);
  const flows = readFileSync(join(ROOT, 'ai-frontend-guide-kit', 'guides', 'FLOWS.md'), 'utf8');
  assert.match(flows, /scaffold/);
  assert.match(flows, /flow\.mjs report/);
});
