import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'flow.mjs');
const TOKENS_TOOL = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'tokens.mjs');

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};
/** A user's answer for every `done` that does not bring one: the decision parts need it, the other parts accept and keep it. `flowRaw` and `guidedRaw` add nothing. */
const withAnswer = (args) => (args[0] === 'done' && !args.includes('--answer') && !args.includes('--declined') ? [...args, '--answer', 'the user answered in the test'] : args);
const flowRaw = (dir, ...args) => spawnSync(process.execPath, [TOOL, ...args, '--dir', dir], { encoding: 'utf8', env: cleanEnv() });
const flow = (dir, ...args) => flowRaw(dir, ...withAnswer(args));
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
/** The design-tokens.json the tokens step needs, written by the tokens tool the way a reader would. */
const putTokens = (dir, ...args) => assert.equal(spawnSync(process.execPath, [TOKENS_TOOL, 'init', '--primary', '#8a4b08', '--force', ...args, '--dir', dir], { encoding: 'utf8' }).status, 0);
/** `flow report <step>`, then every line marked [x] with a result: what a finished report looks like. */
const fillReport = (dir, step) => {
  assert.equal(flow(dir, 'report', step).status, 0, `report ${step}`);
  const file = out(dir, `reports/${step}-report.md`);
  writeFileSync(file, readFileSync(file, 'utf8').replace(/- \[ \]/g, '- [x]').replace(/<[^<>\n]+>/g, 'ok'));
};
/** The reports/design-audit.json that audit-design --report writes (the polish gate reads its counts). */
const putAudit = (dir, counts = { high: 0, medium: 2, low: 5 }) => put(dir, 'reports/design-audit.json', JSON.stringify({ counts, findings: [] }));
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
  assert.deepEqual(s.steps.map((step) => step.id), ['intake', 'direction', 'ux', 'tokens', 'compose', 'board', 'polish']);
  assert.ok(s.steps.every((step) => step.status === 'pending'));
  assert.match(run.stdout, /Next step: intake/);
  assert.match(run.stdout, /guides\/00-START-HERE\.md/);
  const status = flow(dir, 'status');
  assert.match(status.stdout, /Flow: new · step 1\/7 · intake/);
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
  putAudit(dir);
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
const flowIn = (ctx, ...args) => spawnSync(process.execPath, [TOOL, ...withAnswer(args), '--dir', ctx.dir], { encoding: 'utf8', env: piecesEnv(ctx.lib) });
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
    assert.match(row, /\| node ai-frontend-guide-kit\/tools\/pieces\.mjs find; /, step);
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
    putTokens(dir);
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
  assert.match(refused.stderr, /node \S*tools\/pieces\.mjs version pricing-table/);
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
    putTokens(dir);
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
const guidedRaw = (dir, homeDir, ...args) => spawnSync(process.execPath, [TOOL, ...args, '--dir', dir], { encoding: 'utf8', env: { ...cleanEnv(), HOME: homeDir, USERPROFILE: homeDir } });
const guided = (dir, homeDir, ...args) => guidedRaw(dir, homeDir, ...withAnswer(args));
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
  } else if (id === 'tokens') {
    putTokens(dir);
    assert.equal(spawnSync(process.execPath, [TOKENS_TOOL, 'doc', '--dir', dir], { encoding: 'utf8' }).status, 0, 'tokens: doc');
    writeFileSync(join(dir, 'DESIGN.md'), fill(readFileSync(join(dir, 'DESIGN.md'), 'utf8')));
  } else if (id === 'board') {
    // Storybook installed (the user said yes) and one clean board story: what the step asks for.
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'app', devDependencies: { storybook: '10.6.7' } }));
    mkdirSync(join(dir, 'src', 'board'), { recursive: true });
    writeFileSync(join(dir, 'src', 'board', 'Home.board.stories.jsx'), "const meta = { title: 'Board/Pages/Home' };\nexport default meta;\n// version: v1-default\nexport const V1Default = { render: () => null };\n");
  } else provide(dir, info.artifacts);
  if (info.step === 'polish') putAudit(dir);
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
  for (const id of ['direction.questions', 'direction.classify', 'direction.journey', 'direction.references', 'direction.directions', 'direction.choose', 'ux.product', 'ux.spec', 'ux.map', 'compose.inventory', 'compose.find', 'compose.decide', 'compose.adapt', 'board', 'intake', 'tokens', 'polish', 'iterate', 'redesign', 'visual-feedback', 'architecture']) {
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
  putTokens(dir);
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
  putAudit(dir);
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

// ---------------------------------------------------------------- machine-readable tokens (weak-model-design S4)

test('the tokens gate needs design-tokens.json: present, valid and with no contrast failure (S4)', () => {
  const homeDir = home();
  const dir = project();
  stateAt(dir, 'tokens');
  put(dir, 'DESIGN.md');
  const before = raw(dir);
  const missing = refusal(guided(dir, homeDir, 'done', 'tokens'), dir, before);
  assert.match(missing, /design-tokens\.json: the file is missing; write it with: node [^\n]*tools\/tokens\.mjs init/);

  writeFileSync(join(dir, 'design-tokens.json'), '{not json');
  assert.match(refusal(guided(dir, homeDir, 'done', 'tokens'), dir, before), /design-tokens\.json: the file is not valid JSON/);

  putTokens(dir);
  const data = JSON.parse(readFileSync(join(dir, 'design-tokens.json'), 'utf8'));
  data.color.text.$value = '#9a9a9a';
  writeFileSync(join(dir, 'design-tokens.json'), JSON.stringify(data));
  assert.match(refusal(guided(dir, homeDir, 'done', 'tokens'), dir, before), /design-tokens\.json: color\.text on color\.surface: \d\.\d{1,2}:1, needs 4\.5:1/);

  data.color.primary.$value = 'blue';
  writeFileSync(join(dir, 'design-tokens.json'), JSON.stringify(data));
  assert.match(refusal(guided(dir, homeDir, 'done', 'tokens'), dir, before), /design-tokens\.json: color\.primary: "blue" is not a hex color/);

  putTokens(dir);
  const ok = guided(dir, homeDir, 'done', 'tokens');
  assert.equal(ok.status, 0, ok.stderr);
});

test('a state without gates and a DESIGN.md without design-tokens.json keeps closing the tokens step (previous behavior, S4)', () => {
  const homeDir = home();
  const dir = project();
  stateAt(dir, 'tokens', {}, 0);
  put(dir, 'DESIGN.md', 'x\n');
  assert.equal(existsSync(join(dir, 'design-tokens.json')), false);
  const ok = guided(dir, homeDir, 'done', 'tokens');
  assert.equal(ok.status, 0, ok.stderr);
});

test('the tokens instruction tells the reader to choose a few values and run init, check, css and doc, within 48 lines (S4)', () => {
  const homeDir = home();
  const dir = project();
  stateAt(dir, 'tokens');
  const text = guided(dir, homeDir, 'next').stdout;
  for (const command of ['tokens.mjs init --primary', 'tokens.mjs check', 'tokens.mjs css --out', 'tokens.mjs doc']) assert.ok(text.includes(command), command);
  assert.doesNotMatch(text, /--dark/, 'no dark tokens unless the brief asks for a console');
  assert.doesNotMatch(text, /node tools\//);
  assert.match(text, /No Figma here/);
  assert.ok(text.trimEnd().split('\n').length <= 48, `${text.trimEnd().split('\n').length} lines`);

  writeFileSync(join(dir, '.mcp.json'), JSON.stringify({ mcpServers: { figma: { command: 'x' } } }));
  put(dir, BRIEF, VALID_BRIEF.replace('navigation_model: catalog', 'navigation_model: console'));
  const withFigma = guided(dir, homeDir, 'next').stdout;
  assert.match(withFigma, /Figma MCP is configured/);
  assert.match(withFigma, /flags of the init command/);
  assert.match(withFigma, /tokens\.mjs init [^\n]*--dark/);
  assert.ok(withFigma.trimEnd().split('\n').length <= 48);
  assert.equal(JSON.parse(guided(dir, homeDir, 'next', '--json').stdout).template, null);
});

// ---------------------------------------------------------------- the design audit in the flow (T5)

const AUDIT_LINE = 'Design audit (audit-design --report)';
/** A gated polish route past intake. */
const polishProject = () => {
  const dir = project();
  const homeDir = home();
  guided(dir, homeDir, 'start', 'polish');
  put(dir, 'ux/REPO-CONTEXT.md');
  put(dir, 'UI-MAP.md');
  assert.equal(guided(dir, homeDir, 'done', 'intake').status, 0);
  return { dir, homeDir };
};
/** Every line of the polish report closed except the design audit one. */
const closeOtherLines = (dir) => {
  const file = out(dir, 'reports/polish-report.md');
  writeFileSync(file, readFileSync(file, 'utf8').split('\n').map((line) => (line.includes(AUDIT_LINE) ? line : line.replace('- [ ]', '- [x]').replace(/<…>/g, 'ok'))).join('\n'));
};

test('done polish with gates refuses while design-audit.json is missing, and names the command to run (T5)', () => {
  const { dir, homeDir } = polishProject();
  assert.equal(guided(dir, homeDir, 'report', 'polish').status, 0);
  closeOtherLines(dir);
  const file = out(dir, 'reports/polish-report.md');
  writeFileSync(file, readFileSync(file, 'utf8').replace(`- [ ] ${AUDIT_LINE} — result: <…>`, `- [x] ${AUDIT_LINE} — result: 0 high`));
  const before = raw(dir);
  const refused = refusal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'x'), dir, before);
  assert.match(refused, /step "polish" cannot be marked done: ai-frontend-output\/reports\/design-audit\.json is missing/);
  assert.match(refused, /run: node .*tools\/audit-design\.mjs --report$/m);
  assert.doesNotMatch(refused, /--url/, 'no Playwright dependency, no --url');
});

test('done polish refuses a design audit with a high finding and a file that is not an audit, and passes with medium and low only (T5)', () => {
  const { dir, homeDir } = polishProject();
  putAudit(dir, { high: 2, medium: 1, low: 0 });
  assert.equal(guided(dir, homeDir, 'report', 'polish').status, 0);
  closeOtherLines(dir);
  const file = out(dir, 'reports/polish-report.md');
  const line = readFileSync(file, 'utf8').split('\n').find((row) => row.includes(AUDIT_LINE));
  assert.equal(line, `- [ ] ${AUDIT_LINE} — result: 2 high, 1 medium, 0 low — fix the high findings, run the audit again, then this report command`, 'the counts are pre-filled, not marked done');
  const before = raw(dir);
  assert.match(refusal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'x'), dir, before), /polish-report\.md: check "Design audit \(audit-design --report\)" is not done/);

  writeFileSync(file, readFileSync(file, 'utf8').replace('- [ ] Design audit', '- [x] Design audit'));
  const high = refusal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'x'), dir, before);
  assert.match(high, /design-audit\.json lists 2 high findings; fix them from the top of ai-frontend-output\/reports\/design-audit\.md, then run: node .*audit-design\.mjs --report/);

  put(dir, 'reports/design-audit.json', '{ not json');
  assert.match(refusal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'x'), dir, before), /design-audit\.json is not a design audit report; run: node .*audit-design\.mjs --report/);
  put(dir, 'reports/design-audit.json', JSON.stringify({ counts: { high: 'none' } }));
  assert.match(refusal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'x'), dir, before), /not a design audit report/);

  putAudit(dir, { high: 0, medium: 9, low: 9 });
  const ok = guided(dir, homeDir, 'done', 'polish', '--evidence', 'x');
  assert.equal(ok.status, 0, ok.stderr);
});

test('flow report pre-fills the design audit line from design-audit.json and marks it [x] only without a high finding; a hand-filled line is kept (T5)', () => {
  for (const step of ['polish', 'iterate', 'redesign']) {
    const dir = project();
    assert.equal(flow(dir, 'report', step).status, 0, step);
    const file = out(dir, `reports/${step}-report.md`);
    assert.match(readFileSync(file, 'utf8'), /^- \[ \] Design audit \(audit-design --report\) — result: <…>$/m, `${step}: the line is in the checklist, empty without an audit`);
    putAudit(dir, { high: 0, medium: 3, low: 4 });
    const run = flow(dir, 'report', step);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /updated the design audit line of/);
    assert.match(readFileSync(file, 'utf8'), /^- \[x\] Design audit \(audit-design --report\) — result: 0 high, 3 medium, 4 low$/m, step);
    putAudit(dir, { high: 1, medium: 0, low: 0 });
    flow(dir, 'report', step);
    assert.match(readFileSync(file, 'utf8'), /^- \[ \] Design audit .* — result: 1 high, 0 medium, 0 low — fix the high findings/m, `${step}: a later audit with a high finding reopens the line it wrote`);
    writeFileSync(file, readFileSync(file, 'utf8').replace(/^- \[ \] Design audit.*$/m, `- [n/a] ${AUDIT_LINE} — reason: static site, nothing to render`));
    putAudit(dir, { high: 0, medium: 0, low: 0 });
    const again = flow(dir, 'report', step);
    assert.match(again.stdout, /already has every check/);
    assert.match(readFileSync(file, 'utf8'), /^- \[n\/a\] Design audit .* reason: static site, nothing to render$/m, `${step}: a hand-filled line is never rewritten`);
  }
});

test('the polish instruction tells the reader to run the audit with --report, and adds --url only when Playwright is a dependency (T5)', () => {
  const { dir, homeDir } = polishProject();
  const bare = guided(dir, homeDir, 'next').stdout;
  assert.match(bare, /Run: node .*audit-design\.mjs --report — it measures/);
  assert.doesNotMatch(bare, /audit-design\.mjs --report --url/);
  assert.ok(bare.trimEnd().split('\n').length <= 48);
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { playwright: '1.0.0' } }));
  assert.match(guided(dir, homeDir, 'next').stdout, /audit-design\.mjs --report --url <url>/);
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { '@playwright/test': '1.0.0' } }));
  assert.match(guided(dir, homeDir, 'next').stdout, /audit-design\.mjs --report --url <url>/);
  assert.equal(bare.split('\n').filter((row) => /Check by hand only what no tool measures/.test(row)).length, 1, 'the prose craft list became what only a person can judge');
});

test('iterate and redesign instructions also ask for the audit, and stay within 48 lines (T5)', () => {
  for (const route of ['iterate', 'redesign']) {
    const dir = project();
    const homeDir = home();
    guided(dir, homeDir, 'start', route);
    put(dir, 'ux/REPO-CONTEXT.md');
    put(dir, 'UI-MAP.md');
    guided(dir, homeDir, 'done', 'intake');
    const text = guided(dir, homeDir, 'next').stdout;
    assert.match(text, /audit-design\.mjs --report — fix its list from the top/, route);
    assert.ok(text.trimEnd().split('\n').length <= 48, route);
  }
});

test('a state without gates keeps the old polish rule: --evidence alone closes it, no report and no design audit asked for (T5, previous behavior)', () => {
  const homeDir = home();
  const dir = project();
  stateAt(dir, 'polish', {}, 0);
  const ok = guided(dir, homeDir, 'done', 'polish', '--evidence', 'playwright loop green');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(existsSync(out(dir, 'reports')), false);
  const high = project();
  stateAt(high, 'polish', {}, 0);
  putAudit(high, { high: 3, medium: 0, low: 0 });
  assert.equal(guided(high, homeDir, 'done', 'polish', '--evidence', 'x').status, 0, 'a high finding does not block a route started before the gate');
});

const RECIPE_TOOL = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'recipe.mjs');
const recipeIn = (dir, ...args) => spawnSync(process.execPath, [RECIPE_TOOL, ...args, '--dir', dir], { encoding: 'utf8', env: cleanEnv() });
const WIDE_HEADER = '| Screen | Block | Category | Priority | Notes | Candidates | Decision | Serves | Layout | Query |';

test('compose.inventory tells the reader to run recipe suggest, then recipe inventory --write, then review the rows; the template has the wide header (T6)', () => {
  const homeDir = home();
  const dir = project();
  stateAt(dir, 'compose');
  const text = guided(dir, homeDir, 'next').stdout;
  const suggest = text.indexOf('recipe.mjs suggest');
  const write = text.indexOf('recipe.mjs inventory --write');
  const review = text.search(/remove .*(does not need|not need)/i);
  assert.ok(suggest > 0 && write > suggest && review > write, 'suggest, then inventory --write, then review');
  assert.doesNotMatch(text, /node tools\//);
  assert.ok(text.includes(WIDE_HEADER), 'the template has the wide header');
  assert.match(text, /Serves/);
  assert.ok(text.trimEnd().split('\n').length <= 48, `${text.trimEnd().split('\n').length} lines`);
  const info = JSON.parse(guided(dir, homeDir, 'next', '--json').stdout);
  assert.ok(info.template.lines.includes(WIDE_HEADER));
  assert.equal(guided(dir, homeDir, 'scaffold').status, 0);
  assert.ok(readFileSync(out(dir, 'INVENTORY.md'), 'utf8').includes(WIDE_HEADER));
});

test('compose.find uses the Query column as the first search words, and direction.journey starts from recipe show (T6)', () => {
  const homeDir = home();
  const dir = project();
  stateAt(dir, 'compose', { parts_done: ['inventory'] });
  const find = guided(dir, homeDir, 'next').stdout;
  assert.match(find, /Query/);
  assert.match(find, /find\.mjs "<the Query of the row>"/);
  assert.ok(find.trimEnd().split('\n').length <= 48);

  const journey = project();
  stateAt(journey, 'direction', { parts_done: ['questions', 'classify'] });
  const text = guided(journey, homeDir, 'next').stdout;
  assert.match(text, /direction\.journey|part 3\/6: journey/);
  assert.match(text, /recipe\.mjs list/);
  assert.match(text, /recipe\.mjs show <id>/);
  assert.ok(text.trimEnd().split('\n').length <= 48, `${text.trimEnd().split('\n').length} lines`);
});

test('compose.adapt and the tokens step point to experience/LAYOUT-RULES.md instead of pasting it (T6)', () => {
  const homeDir = home();
  const adapt = project();
  stateAt(adapt, 'compose', { parts_done: ['inventory', 'find', 'decide'] });
  const adaptText = guided(adapt, homeDir, 'next').stdout;
  assert.match(adaptText, /ai-frontend-guide-kit\/experience\/LAYOUT-RULES\.md/);
  assert.ok(adaptText.trimEnd().split('\n').length <= 48);
  const tokens = project();
  stateAt(tokens, 'tokens');
  const tokensText = guided(tokens, homeDir, 'next').stdout;
  assert.match(tokensText, /ai-frontend-guide-kit\/experience\/LAYOUT-RULES\.md/);
  assert.ok(tokensText.trimEnd().split('\n').length <= 48);
  assert.doesNotMatch(tokensText + adaptText, /full-bleed|narrow-reading/, 'the layout table is not pasted');
});

test('the inventory gate accepts the wide table, and find and decide read their columns in it (T6)', () => {
  const homeDir = home();
  const wide = [
    '# Inventory',
    WIDE_HEADER, '|---|---|---|---|---|---|---|---|---|---|',
    '| Home | hero | hero | must | one image | | | G1 | split | hero |',
    '| Home | faq | faq | should | doubts | | | O1, O2 | narrow-reading | faq |',
    '',
  ].join('\n');
  const dir = project();
  stateAt(dir, 'compose');
  put(dir, 'INVENTORY.md', wide);
  assert.equal(guided(dir, homeDir, 'done', 'compose.inventory').status, 0);
  const before = raw(dir);
  assert.match(refusal(guided(dir, homeDir, 'done', 'compose.find'), dir, before), /row "Home \/ hero": no candidates/);
  put(dir, 'INVENTORY.md', wide.replace('| | | G1 |', '| magicui-hero | | G1 |').replace('| | | O1, O2 |', '| shadcnspace-faq-01 | | O1, O2 |'));
  assert.equal(guided(dir, homeDir, 'done', 'compose.find').status, 0);
  const late = raw(dir);
  assert.match(refusal(guided(dir, homeDir, 'done', 'compose.decide'), dir, late), /row "Home \/ hero": no decision/);
  put(dir, 'INVENTORY.md', wide.replace('| | | G1 |', '| magicui-hero | reuse | G1 |').replace('| | | O1, O2 |', '| shadcnspace-faq-01 | adapt | O1, O2 |'));
  assert.equal(guided(dir, homeDir, 'done', 'compose.decide').status, 0);
});

test('the file that recipe inventory --write makes closes compose.inventory with gates (T6)', () => {
  const homeDir = home();
  const dir = project();
  put(dir, BRIEF, VALID_BRIEF);
  put(dir, 'ux/UX-SPEC.md');
  writeFileSync(join(dir, 'PRODUCT.md'), VALID_PRODUCT);
  stateAt(dir, 'compose');
  const written = recipeIn(dir, 'inventory', '--write');
  assert.equal(written.status, 0, written.stderr);
  assert.match(readFileSync(out(dir, 'INVENTORY.md'), 'utf8'), /\| Home \| hero \| hero \| must \|/);
  const closed = guided(dir, homeDir, 'done', 'compose.inventory');
  assert.equal(closed.status, 0, closed.stderr);
});

test('flow scaffold then recipe inventory --write works without --force: the scaffold is only a template (T6)', () => {
  const dir = project();
  put(dir, BRIEF, VALID_BRIEF);
  put(dir, 'ux/UX-SPEC.md');
  stateAt(dir, 'compose');
  assert.equal(guided(dir, home(), 'scaffold').status, 0);
  const written = recipeIn(dir, 'inventory', '--write');
  assert.equal(written.status, 0, written.stderr);
  assert.doesNotMatch(readFileSync(out(dir, 'INVENTORY.md'), 'utf8'), /<screen of the spec>/);
});

test('a state without gates closes compose.inventory with any non-empty file, as before the wide table (T6, previous behavior)', () => {
  const homeDir = home();
  const legacy = project();
  stateAt(legacy, 'compose', {}, 0);
  put(legacy, 'INVENTORY.md', 'x\n');
  assert.equal(guided(legacy, homeDir, 'done', 'compose.inventory').status, 0);
  const old = project();
  stateAt(old, 'compose', {}, 0);
  put(old, 'INVENTORY.md', VALID_INVENTORY);
  assert.equal(guided(old, homeDir, 'done', 'compose.inventory').status, 0, 'the seven-column table of before still closes it');
  const gated = project();
  stateAt(gated, 'compose');
  put(gated, 'INVENTORY.md', VALID_INVENTORY);
  assert.equal(guided(gated, homeDir, 'done', 'compose.inventory').status, 0, 'and so does it with gates');
});

test('flow list names recipe.mjs in direction and compose, and guides/FLOWS.md is the same text (T6)', () => {
  const homeDir = home();
  const list = guided(project(), homeDir, 'list').stdout;
  assert.match(list, /node ai-frontend-guide-kit\/tools\/recipe\.mjs/);
  const flows = readFileSync(join(ROOT, 'ai-frontend-guide-kit', 'guides', 'FLOWS.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(flows, list);
});

// ---------------------------------------------------------------- the psychology questions of the polish report (T14)

const QUESTIONS = [
  'Psychology: is it clear in 3 seconds what this is and who it is for?',
  'Psychology: does one element dominate each viewport (one focal point)?',
  'Psychology: does the main button say what happens when pressed?',
  'Psychology: is related information grouped, with room between blocks?',
  'Psychology: does every action give immediate feedback?',
  'Psychology: is the social proof specific and credible?',
  'Psychology: can the user go back, cancel or undo?',
  'Psychology: is every reward real and proportional to the effort?',
  'Psychology: does the page end with one clear action?',
];
/** The 13 checks the polish report had before the questions. */
const OLD_POLISH = ['Honesty audit (audit-honesty --strict)', AUDIT_LINE, 'Accessibility audit (axe)', 'Performance audit (LCP, CLS, TBT)', 'Frontend map check (ui-map check)', 'Regression suite (@playwright/test)', 'Console without errors', 'States: empty, loading and error', 'Widths 360, 768 and 1280', 'Keyboard only', 'Reduced motion', 'Craft by hand (one focal point, copy that says what the page does, nothing default-looking)', 'Every finding was fixed and its check run again'];

test('flow report polish writes the nine psychology questions after the old checks, each as an open yes/no line (S12)', () => {
  const { dir, homeDir } = polishProject();
  assert.equal(guided(dir, homeDir, 'report', 'polish').status, 0);
  const text = readFileSync(out(dir, 'reports/polish-report.md'), 'utf8');
  const lines = text.split('\n').filter((line) => line.startsWith('- [ ]'));
  assert.equal(lines.length, OLD_POLISH.length + QUESTIONS.length);
  assert.deepEqual(lines.slice(0, OLD_POLISH.length).map((line) => line.slice(6).replace(/ — result: <…>$/, '')), OLD_POLISH);
  assert.deepEqual(lines.slice(OLD_POLISH.length).map((line) => line.slice(6).replace(/ — result: <…>$/, '')), QUESTIONS);
});

test('done polish refuses a report whose psychology question is open, names it, and passes once it is answered with its evidence (S12)', () => {
  const { dir, homeDir } = polishProject();
  assert.equal(guided(dir, homeDir, 'report', 'polish').status, 0);
  closeOtherLines(dir);
  const file = out(dir, 'reports/polish-report.md');
  const closed = readFileSync(file, 'utf8').replace(`- [ ] ${AUDIT_LINE} — result: <…>`, `- [x] ${AUDIT_LINE} — result: 0 high`);
  const open = QUESTIONS[6];
  writeFileSync(file, closed.replace(`- [x] ${open} — result: ok`, `- [ ] ${open} — result: <…>`));
  putAudit(dir);
  const before = raw(dir);
  assert.match(refusal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'x'), dir, before), /polish-report\.md: check "Psychology: can the user go back, cancel or undo\?" is not done/);
  writeFileSync(file, closed.replace(`- [x] ${open} — result: ok`, `- [x] ${open} — result: yes, the Back link and Cancel button on the checkout screen`));
  const ok = guided(dir, homeDir, 'done', 'polish', '--evidence', 'x');
  assert.equal(ok.status, 0, ok.stderr);
});

test('a question can be closed [n/a] with its reason, and still needs the reason (S12)', () => {
  const { dir, homeDir } = polishProject();
  assert.equal(guided(dir, homeDir, 'report', 'polish').status, 0);
  closeOtherLines(dir);
  const file = out(dir, 'reports/polish-report.md');
  const base = readFileSync(file, 'utf8').replace(`- [ ] ${AUDIT_LINE} — result: <…>`, `- [x] ${AUDIT_LINE} — result: 0 high`);
  putAudit(dir);
  const before = raw(dir);
  const question = QUESTIONS[5];
  writeFileSync(file, base.replace(`- [x] ${question} — result: ok`, `- [n/a] ${question}`));
  assert.match(refusal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'x'), dir, before), /check "Psychology: is the social proof specific and credible\?": write why it does not apply after "reason:"/);
  writeFileSync(file, base.replace(`- [x] ${question} — result: ok`, `- [n/a] ${question} — reason: the page shows no proof, it is an internal tool`));
  assert.equal(guided(dir, homeDir, 'done', 'polish', '--evidence', 'x').status, 0);
});

test('a report written before the questions gets only the nine new lines from flow report polish; what was written stays (S12, previous behavior)', () => {
  const { dir, homeDir } = polishProject();
  const file = out(dir, 'reports/polish-report.md');
  mkdirSync(dirname(file), { recursive: true });
  const old = ['# Polish report', 'Mark every line.', ...OLD_POLISH.map((check) => `- [x] ${check} — result: kept`), ''].join('\n');
  writeFileSync(file, old);
  assert.equal(guided(dir, homeDir, 'report', 'polish').status, 0);
  const text = readFileSync(file, 'utf8');
  assert.ok(text.startsWith(old.trimEnd()), 'the old lines are untouched');
  assert.equal(text.split('\n').filter((line) => line.startsWith('- [ ] Psychology:')).length, QUESTIONS.length);
});

test('the polish instruction names the psychology lines and keeps its one "Check by hand" row and its 48 lines (S12, previous behavior)', () => {
  const { dir, homeDir } = polishProject();
  const text = guided(dir, homeDir, 'next').stdout;
  assert.equal(text.split('\n').filter((row) => /Check by hand only what no tool measures/.test(row)).length, 1);
  assert.match(text, /Psychology:/);
  assert.match(text, /yes or no/);
  assert.ok(text.trimEnd().split('\n').length <= 48);
  assert.deepEqual(JSON.parse(guided(dir, homeDir, 'next', '--json').stdout).report.checks.slice(-QUESTIONS.length), QUESTIONS);
});

test('the other steps with a report (iterate, redesign, visual-feedback) have no psychology lines; their checks are unchanged (S12, previous behavior)', () => {
  for (const route of ['iterate', 'redesign']) {
    const dir = project();
    const homeDir = home();
    guided(dir, homeDir, 'start', route);
    put(dir, 'ux/REPO-CONTEXT.md');
    put(dir, 'UI-MAP.md');
    guided(dir, homeDir, 'done', 'intake');
    assert.equal(guided(dir, homeDir, 'report', route).status, 0);
    assert.doesNotMatch(readFileSync(out(dir, `reports/${route}-report.md`), 'utf8'), /Psychology:/, route);
  }
});

// ---------------------------------------------------------------- technique sets and area skills (T12, S10)

const EDITORIAL_BRIEF = VALID_BRIEF.replace('id: market', 'id: editorial');
const TECHNIQUE_IDS = new Map(JSON.parse(readFileSync(join(ROOT, 'ai-frontend-guide-kit', 'experience', 'techniques.json'), 'utf8')).cards.map((card) => [card.id, card]));
const techniqueLine = (text) => text.split('\n').find((row) => /Techniques that fit the direction/.test(row)) ?? '';
const withSkill = (homeDir, name) => mkdirSync(join(homeDir, '.claude', 'skills', name), { recursive: true });

for (const [step, extra] of [['tokens', {}], ['compose', { parts_done: ['inventory', 'find', 'decide'] }]]) {
  test(`${step}: flow next proposes at most 5 technique cards that fit the direction recorded in the brief (T12)`, () => {
    const dir = project();
    const homeDir = home();
    stateAt(dir, step, extra);
    put(dir, BRIEF, EDITORIAL_BRIEF);
    const text = guided(dir, homeDir, 'next').stdout;
    const line = techniqueLine(text);
    assert.match(line, /direction "editorial"/);
    const ids = [...line.matchAll(/`([a-z0-9-]+)`/g)].map((match) => match[1]);
    assert.ok(ids.length >= 3 && ids.length <= 5, `${ids.length} ids in: ${line}`);
    for (const id of ids) assert.ok(TECHNIQUE_IDS.get(id)?.directions.includes('editorial'), `${id} fits editorial`);
    assert.match(text, /technique\.mjs get <id>/);
    assert.ok(text.trimEnd().split('\n').length <= 48, `${text.trimEnd().split('\n').length} lines`);
    assert.deepEqual(JSON.parse(guided(dir, homeDir, 'next', '--json').stdout).do.filter((row) => /Techniques that fit/.test(row)).length, 1);
  });

  test(`${step}: with no direction recorded, flow next prints the find command instead (T12)`, () => {
    const dir = project();
    const homeDir = home();
    stateAt(dir, step, extra);
    const text = guided(dir, homeDir, 'next').stdout;
    assert.doesNotMatch(text, /Techniques that fit the direction/);
    assert.match(text, /No direction is recorded yet[^\n]*technique\.mjs find "<need>"/);
    put(dir, BRIEF, VALID_BRIEF);
    assert.match(guided(dir, homeDir, 'next').stdout, /No direction is recorded yet/, 'a brief whose direction is not a style of the kit proposes nothing');
    assert.ok(text.trimEnd().split('\n').length <= 48);
  });
}

test('the direction recorded by memory.mjs (direction:<id>) is read when the brief has none (T12)', () => {
  const dir = project();
  const homeDir = home();
  stateAt(dir, 'tokens');
  put(dir, 'selections.jsonl', `${JSON.stringify({ screen: 'experience', block: 'direction', decision: 'adapt', ref: 'direction:swiss' })}\n`);
  assert.match(techniqueLine(guided(dir, homeDir, 'next').stdout), /direction "swiss"/);
});

test('a part names an area skill only when it is installed, and the other parts stay as they were (T12, previous behavior)', () => {
  const dir = project();
  const homeDir = home();
  stateAt(dir, 'tokens');
  assert.doesNotMatch(guided(dir, homeDir, 'next').stdout, /technique-(type|color)/);
  withSkill(homeDir, 'technique-type');
  withSkill(homeDir, 'technique-color');
  assert.match(guided(dir, homeDir, 'next').stdout, /skill technique-type[^\n]*technique-color|skills technique-type and technique-color/);
  const adapt = project();
  stateAt(adapt, 'compose', { parts_done: ['inventory', 'find', 'decide'] });
  for (const name of ['technique-layout', 'technique-motion', 'technique-imagery', 'technique-3d']) withSkill(homeDir, name);
  const adaptText = guided(adapt, homeDir, 'next').stdout;
  for (const name of ['technique-layout', 'technique-motion', 'technique-imagery', 'technique-3d']) assert.ok(adaptText.includes(name), name);
  assert.ok(adaptText.trimEnd().split('\n').length <= 48, `${adaptText.trimEnd().split('\n').length} lines`);
  const polish = project();
  stateAt(polish, 'polish');
  assert.doesNotMatch(guided(polish, home(), 'next').stdout, /technique-psychology/);
  withSkill(homeDir, 'technique-psychology');
  assert.match(guided(polish, homeDir, 'next').stdout, /technique-psychology/);
  for (const [step, extra] of [['direction', {}], ['compose', { parts_done: ['inventory'] }]]) {
    const other = project();
    stateAt(other, step, extra);
    assert.doesNotMatch(guided(other, homeDir, 'next').stdout, /technique/i, `${step}: no technique line in a part that does not need one`);
  }
});

// ---------------------------------------------------------------- the board step (storybook-board S1, T3)

const BOARD_STEPS = ['intake', 'direction', 'ux', 'tokens', 'compose', 'board', 'polish'];
/** A flow-state.json of route `new` (with the board step) whose current step is `current`. */
const boardStateAt = (dir, current = 'board', extra = {}) => {
  const at = BOARD_STEPS.indexOf(current);
  const steps = BOARD_STEPS.map((id, index) => ({ id, status: index < at ? 'done' : 'pending', ...(index === at ? extra : {}) }));
  put(dir, 'flow-state.json', JSON.stringify({ route: 'new', gates: 1, started_at: '2026-11-17T00:00:00.000Z', complete: false, steps }));
};
const PINNED = /npx storybook@\d+\.\d+\.\d+ init/;
/** Storybook in the project, the way `npx storybook init` leaves it in package.json. */
const withStorybook = (dir) => writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'app', devDependencies: { storybook: '10.6.7', react: '19.0.0' } }));
const BOARD_STORY = [
  "const meta = { title: 'Board/Pages/Login', parameters: { layout: 'fullscreen' } };",
  'export default meta;',
  '// version: v1-sidebar',
  'export const V1Sidebar = { render: () => null };',
  '',
].join('\n');
const putStory = (dir, text = BOARD_STORY) => {
  mkdirSync(join(dir, 'src', 'board'), { recursive: true });
  writeFileSync(join(dir, 'src', 'board', 'Login.board.stories.jsx'), text);
};

test('the route new has the board step after compose and before polish; flow list and status show it (S1)', () => {
  const dir = project();
  assert.equal(flow(dir, 'start', 'new').status, 0);
  assert.deepEqual(state(dir).steps.map((step) => step.id), BOARD_STEPS);
  assert.match(flow(dir, 'status').stdout, /Flow: new · step 1\/7 · intake/);
  const listed = flow(dir, 'list').stdout;
  assert.match(listed, /\| `new` \|[^\n]*compose → board → polish \|/);
  assert.match(listed, /\| `board` \| guides\/14-DESIGN-BOARD\.md \| storybook-board \|/);
  for (const route of ['direction', 'ux', 'iterate', 'polish', 'redesign', 'visual-feedback', 'architecture']) {
    assert.doesNotMatch(flow(dir, 'list').stdout.match(new RegExp(`### \`${route}\`[\\s\\S]*?(?=\\n### |\\n## )`))[0], /`board`/, `${route} has no board step`);
  }
});

test('next with Storybook missing tells the reader to ask the user and stop, shows the pinned command and never installs (S1)', () => {
  const dir = project();
  boardStateAt(dir);
  const text = guided(dir, home(), 'next').stdout;
  assert.match(text, /^Next step: board — /);
  assert.ok(text.includes('board.mjs'), 'names the board tool');
  assert.match(text, /detect/);
  assert.match(text, PINNED, 'shows the exact install command');
  assert.match(text, /ask the user/i);
  assert.match(text, /STOP/);
  assert.match(text, /never install/i);
  assert.match(text, /done board --declined --reason/);
  assert.ok(text.trimEnd().split('\n').length <= 48, 'within 48 lines');
  assert.doesNotMatch(text, /if installed|\(optional\)|\(recommended\)/i);
  const info = JSON.parse(guided(dir, home(), 'next', '--json').stdout);
  assert.equal(info.step, 'board');
  assert.equal(info.needs_evidence, false);
  assert.match(info.done_command, /flow\.mjs" done board$|flow\.mjs done board$/);
});

test('next with Storybook present goes to plan, scaffold and check, and no longer asks to install (S1)', () => {
  const dir = project();
  boardStateAt(dir);
  withStorybook(dir);
  const text = guided(dir, home(), 'next').stdout;
  for (const word of ['board.mjs', 'plan', 'scaffold', 'check']) assert.ok(text.includes(word), `names ${word}`);
  assert.doesNotMatch(text, PINNED);
  assert.doesNotMatch(text, /STOP/);
  assert.ok(text.trimEnd().split('\n').length <= 48, 'within 48 lines');
});

test('done board refuses while Storybook is missing: it names the question to ask and the way to record a no, and changes nothing (S1)', () => {
  const dir = project();
  boardStateAt(dir);
  const before = raw(dir);
  const message = refusal(guided(dir, home(), 'done', 'board'), dir, before);
  assert.match(message, /step "board" cannot be marked done/);
  assert.match(message, /Storybook is not installed/);
  assert.match(message, PINNED);
  assert.match(message, /ask the user/i);
  assert.match(message, /done board --declined --reason/);
});

test('done board refuses Storybook without any board story, and a board with findings, listing each one (S1)', () => {
  const dir = project();
  boardStateAt(dir);
  withStorybook(dir);
  const before = raw(dir);
  assert.match(refusal(guided(dir, home(), 'done', 'board'), dir, before), /no board story/);
  putStory(dir, `import { useStore } from 'zustand';\n${BOARD_STORY}`);
  const message = refusal(guided(dir, home(), 'done', 'board'), dir, before);
  assert.match(message, /1 problem/);
  assert.match(message, /board-store/);
  assert.match(message, /Login\.board\.stories\.jsx:1/);
});

test('done board passes with Storybook, one clean board story, and records what it found; the route moves on to polish (S1)', () => {
  const dir = project();
  boardStateAt(dir);
  withStorybook(dir);
  putStory(dir);
  const run = guided(dir, home(), 'done', 'board');
  assert.equal(run.status, 0, run.stderr);
  const step = state(dir).steps.find((s) => s.id === 'board');
  assert.equal(step.status, 'done');
  assert.match(step.evidence, /board check clean/);
  assert.match(step.evidence, /1 board stor/);
  assert.equal(step.declined, undefined);
  assert.match(run.stdout, /Next step: polish/);
});

test('done board --declined --reason closes the step without Storybook and keeps the no on record (S1)', () => {
  const dir = project();
  boardStateAt(dir);
  const run = guided(dir, home(), 'done', 'board', '--declined', '--reason', 'the user does not want Storybook in this repo');
  assert.equal(run.status, 0, run.stderr);
  const step = state(dir).steps.find((s) => s.id === 'board');
  assert.equal(step.status, 'done');
  assert.equal(step.declined, true);
  assert.equal(step.reason, 'the user does not want Storybook in this repo');
  assert.match(step.evidence, /declined by the user: the user does not want Storybook in this repo/);
  assert.match(run.stdout, /Next step: polish/);
});

test('--declined needs --reason, --reason needs --declined, and only the board step can be declined; each exits 2 and changes nothing (S1)', () => {
  const dir = project();
  boardStateAt(dir);
  const before = raw(dir);
  for (const args of [['done', 'board', '--declined'], ['done', 'board', '--reason', 'no'], ['done', 'compose', '--declined', '--reason', 'no']]) {
    const run = guided(dir, home(), ...args);
    assert.equal(run.status, 2, args.join(' '));
    assert.equal(raw(dir), before, `${args.join(' ')} leaves flow-state.json untouched`);
  }
  assert.match(guided(dir, home(), 'done', 'board', '--declined').stderr, /--declined needs --reason/);
  assert.match(guided(dir, home(), 'done', 'board', '--reason', 'no').stderr, /--reason goes with --declined/);
  assert.match(guided(dir, home(), 'done', 'compose', '--declined', '--reason', 'no').stderr, /only the board step/);
});

test('a route started before the board step existed keeps its own steps: next, status and done work and never mention the board (S1, previous behavior)', () => {
  const dir = project();
  const homeDir = home();
  const steps = ['intake', 'direction', 'ux', 'tokens', 'compose', 'polish'].map((id) => ({ id, status: id === 'polish' ? 'pending' : 'done' }));
  put(dir, 'flow-state.json', JSON.stringify({ route: 'new', gates: 1, started_at: '2026-11-13T00:00:00.000Z', complete: false, steps }));
  const next = guided(dir, homeDir, 'next');
  assert.equal(next.status, 0, next.stderr);
  assert.match(next.stdout, /^Next step: polish — /);
  assert.match(next.stdout, /step 6\/6/);
  assert.doesNotMatch(next.stdout, /\bboard\b/i);
  const status = guided(dir, homeDir, 'status');
  assert.equal(status.status, 0, status.stderr);
  assert.match(status.stdout, /Flow: new · step 6\/6 · polish/);
  const unknown = guided(dir, homeDir, 'done', 'board');
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /unknown step "board" for route "new"/);
  fillReport(dir, 'polish');
  putAudit(dir);
  const ok = guided(dir, homeDir, 'done', 'polish', '--evidence', 'checked');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(state(dir).complete, true);
  assert.deepEqual(state(dir).steps.map((s) => s.id), ['intake', 'direction', 'ux', 'tokens', 'compose', 'polish']);
});

// ---------------------------------------------------------------- guided flow: decision points (guided-flow S2)

const STOP = /^STOP — this is the user's decision\. Show the options above to the user and wait for the answer\. Do not answer for them\.$/m;
/** Writes the state of route `new` at `step`, with the parts of that step already closed. */
const decisionAt = (dir, step, partsDone, gates = 1) => stateAt(dir, step, partsDone ? { parts_done: partsDone } : {}, gates);
const lastLines = (text, count) => text.trimEnd().split('\n').slice(-count);

test('next ends a decision part with a separated STOP block, in text and in --json, and leaves the other parts without it (guided-flow S2)', () => {
  const decisions = [
    ['direction', [], 'direction.questions'],
    ['direction', ['questions', 'classify', 'journey'], 'direction.references'],
    ['direction', ['questions', 'classify', 'journey', 'references', 'directions'], 'direction.choose'],
    ['ux', [], 'ux.product'],
    ['compose', ['inventory', 'find'], 'compose.decide'],
  ];
  for (const [step, partsDone, id] of decisions) {
    const dir = project();
    const homeDir = home();
    decisionAt(dir, step, partsDone);
    const text = guidedRaw(dir, homeDir, 'next').stdout;
    const tail = lastLines(text, 3);
    assert.equal(tail[0], '', `${id}: a blank line separates the block`);
    assert.match(tail[1], STOP, id);
    assert.match(tail[2], /^Decision: \S/, `${id} names what the user decides`);
    assert.match(text, new RegExp(`Then run: .*done ${id.replace('.', '\\.')} --answer "<the user's words>"`), `${id} prints the command with --answer`);
    const info = JSON.parse(guidedRaw(dir, homeDir, 'next', '--json').stdout);
    assert.ok(info.decision.what, `${id} json names the decision`);
    assert.match(info.decision.stop, STOP);
    assert.match(info.decision.answer_command, /--answer "<the user's words>"$/);
    assert.doesNotMatch(info.done_command, /--answer/, `${id}: done_command keeps its old shape`);
  }
  const quiet = [['direction', ['questions'], 'direction.classify'], ['direction', ['questions', 'classify'], 'direction.journey'], ['ux', ['product'], 'ux.spec'], ['compose', [], 'compose.inventory'], ['compose', ['inventory'], 'compose.find'], ['compose', ['inventory', 'find', 'decide'], 'compose.adapt'], ['tokens', null, 'tokens'], ['intake', null, 'intake']];
  for (const [step, partsDone, id] of quiet) {
    const dir = project();
    const homeDir = home();
    decisionAt(dir, step, partsDone);
    assert.doesNotMatch(guidedRaw(dir, homeDir, 'next').stdout, /STOP —/, `${id} is not a decision`);
    assert.equal(JSON.parse(guidedRaw(dir, homeDir, 'next', '--json').stdout).decision, null, id);
  }
});

test('ux.product is a decision only when PRODUCT.md must be asked: not when it exists, not with the product document of the repository (guided-flow S2)', () => {
  const have = project();
  decisionAt(have, 'ux', []);
  put(have, 'ux/REPO-CONTEXT.md', '- **UX present:** no\n');
  writeFileSync(join(have, 'PRODUCT.md'), VALID_PRODUCT);
  assert.doesNotMatch(guidedRaw(have, home(), 'next').stdout, /STOP —/);
  const bmad = project();
  decisionAt(bmad, 'ux', []);
  put(bmad, 'ux/REPO-CONTEXT.md', '- **UX present:** no\n- **Framework:** bmad — _bmad/ found\n');
  assert.doesNotMatch(guidedRaw(bmad, home(), 'next').stdout, /STOP —/);
  const ask = project();
  decisionAt(ask, 'ux', []);
  put(ask, 'ux/REPO-CONTEXT.md', '- **UX present:** no\n');
  assert.match(guidedRaw(ask, home(), 'next').stdout, /STOP —/);
});

test('the board install question is a decision only while Storybook is missing (guided-flow S2)', () => {
  const missing = project();
  boardStateAt(missing);
  const text = guidedRaw(missing, home(), 'next').stdout;
  assert.match(lastLines(text, 3)[1], STOP);
  assert.match(lastLines(text, 3)[2], /Storybook/);
  const present = project();
  boardStateAt(present);
  withStorybook(present);
  assert.doesNotMatch(guidedRaw(present, home(), 'next').stdout, /STOP —/, 'with Storybook installed the question is over');
});

test('done refuses a decision part without --answer, names the option and the command, and changes nothing (guided-flow S2)', () => {
  const dir = project();
  const homeDir = home();
  decisionAt(dir, 'direction', []);
  put(dir, BRIEF);
  const before = raw(dir);
  const message = refusal(guidedRaw(dir, homeDir, 'done', 'direction.questions'), dir, before);
  assert.match(message, /part "direction\.questions" is the user's decision/);
  assert.match(message, /--answer/);
  assert.match(message, /done direction\.questions --answer "<the user's words>"/);
  assert.match(message, /Do not answer for the user/);
  const whole = project();
  decisionAt(whole, 'direction', ['questions', 'classify', 'journey', 'references', 'directions']);
  put(whole, BRIEF);
  const wholeBefore = raw(whole);
  assert.match(refusal(guidedRaw(whole, homeDir, 'done', 'direction'), whole, wholeBefore), /step "direction" is the user's decision[\s\S]*--answer/, 'closing the whole step covers the decision part still open');
});

test('done --answer keeps the words of the user on the part, the part closes, and the next instruction follows (guided-flow S2)', () => {
  const dir = project();
  const homeDir = home();
  decisionAt(dir, 'direction', []);
  put(dir, BRIEF);
  const run = guidedRaw(dir, homeDir, 'done', 'direction.questions', '--answer', 'Una landing de placas solares; la acción es pedir presupuesto');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Next step: direction/);
  const step = state(dir).steps.find((s) => s.id === 'direction');
  assert.deepEqual(step.parts_done, ['questions']);
  assert.equal(step.answers.length, 1);
  assert.equal(step.answers[0].part, 'questions');
  assert.equal(step.answers[0].answer, 'Una landing de placas solares; la acción es pedir presupuesto');
  assert.match(step.answers[0].at, /^\d{4}-\d\d-\d\dT/);
});

test('--answer needs a value that is not empty and not the template placeholder; each exits 2 and changes nothing (guided-flow S2)', () => {
  const dir = project();
  decisionAt(dir, 'direction', []);
  put(dir, BRIEF);
  const before = raw(dir);
  for (const answer of ['', '   ', "<the user's words>", '<…>']) {
    const run = guidedRaw(dir, home(), 'done', 'direction.questions', '--answer', answer);
    assert.equal(run.status, 2, JSON.stringify(answer));
    assert.match(run.stderr, /--answer/);
    assert.equal(raw(dir), before);
  }
  assert.equal(guidedRaw(dir, home(), 'done', 'direction.questions', '--answer').status, 2);
});

test('a step that is not a decision closes with no answer and keeps no answers key; --answer on it is accepted and kept (guided-flow S2, previous behavior)', () => {
  for (const answer of [null, 'the user liked the warm palette']) {
    const dir = project();
    stateAt(dir, 'tokens');
    putTokens(dir);
    assert.equal(spawnSync(process.execPath, [TOKENS_TOOL, 'doc', '--dir', dir], { encoding: 'utf8' }).status, 0);
    writeFileSync(join(dir, 'DESIGN.md'), fill(readFileSync(join(dir, 'DESIGN.md'), 'utf8')));
    const run = guidedRaw(dir, home(), 'done', 'tokens', ...(answer ? ['--answer', answer] : []));
    assert.equal(run.status, 0, run.stderr);
    const step = state(dir).steps.find((s) => s.id === 'tokens');
    assert.equal(step.status, 'done');
    if (answer) assert.equal(step.answers[0].answer, answer);
    else assert.equal(step.answers, undefined);
  }
});

test('a route started before decision points existed does not crash: its closed parts stay, and a decision part asks for --answer with the way to give it (guided-flow S2, previous behavior)', () => {
  const dir = project();
  const homeDir = home();
  stateAt(dir, 'direction', { parts_done: ['questions'] }, 0);
  put(dir, BRIEF);
  const before = raw(dir);
  const next = guidedRaw(dir, homeDir, 'next');
  assert.equal(next.status, 0, next.stderr);
  assert.match(next.stdout, /part 2\/6: classify/);
  assert.doesNotMatch(next.stdout, /STOP —/, 'classify is not a decision');
  assert.equal(guidedRaw(dir, homeDir, 'status').status, 0);
  assert.equal(raw(dir), before, 'next and status never write');
  stateAt(dir, 'direction', { parts_done: ['questions', 'classify', 'journey', 'references', 'directions'] }, 0);
  const old = raw(dir);
  const refused = refusal(guidedRaw(dir, homeDir, 'done', 'direction.choose'), dir, old);
  assert.match(refused, /part "direction\.choose" is the user's decision/);
  assert.match(refused, /done direction\.choose --answer "<the user's words>"/);
  const ok = guidedRaw(dir, homeDir, 'done', 'direction.choose', '--answer', 'La diferenciada, con la escena 3D');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(state(dir).gates, undefined, 'an old state stays old');
  assert.equal(state(dir).steps[1].answers[0].answer, 'La diferenciada, con la escena 3D');
});

test('board: --declined --reason is the user\'s answer and is kept as one; the old fields and the evidence are unchanged (guided-flow S2, previous behavior)', () => {
  const dir = project();
  boardStateAt(dir);
  const run = guidedRaw(dir, home(), 'done', 'board', '--declined', '--reason', 'the user does not want Storybook in this repo');
  assert.equal(run.status, 0, run.stderr);
  const step = state(dir).steps.find((s) => s.id === 'board');
  assert.equal(step.declined, true);
  assert.equal(step.reason, 'the user does not want Storybook in this repo');
  assert.match(step.evidence, /declined by the user: the user does not want Storybook in this repo/);
  assert.equal(step.answers[0].answer, 'the user does not want Storybook in this repo');
  const missing = project();
  boardStateAt(missing);
  const before = raw(missing);
  assert.match(refusal(guidedRaw(missing, home(), 'done', 'board'), missing, before), /Storybook is not installed[\s\S]*done board --declined --reason/, 'without Storybook and without the no, the question is still asked');
  const ok = project();
  boardStateAt(ok);
  withStorybook(ok);
  putStory(ok);
  assert.equal(guidedRaw(ok, home(), 'done', 'board').status, 0, 'Storybook installed and a clean board close as before');
});
