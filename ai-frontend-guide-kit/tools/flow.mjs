#!/usr/bin/env node
/**
 * flow — the step-by-step design flow of the AI Frontend Guide kit, kept per project.
 *
 * State: `ai-frontend-output/flow-state.json` (commit it with the project so everyone
 * who works on the design shares the same route and step).
 *
 * A step is marked done only when it is the current step and its artifact exists;
 * a step without a file needs `--evidence "<what proves it>"`. Refusals change nothing.
 *
 * Usage:
 *   node tools/flow.mjs list                   every route and step (the text of guides/FLOWS.md)
 *   node tools/flow.mjs status                 kit installed?, active route and step, what is recorded
 *   node tools/flow.mjs start <route>          new | direction | ux | iterate | polish | redesign | visual-feedback | architecture
 *   node tools/flow.mjs next                   the current step: guide, skill, output
 *   node tools/flow.mjs done <step> [--evidence "..."]
 *   node tools/flow.mjs reset                  drop the active route
 * Options: --dir <project> (default: the folder that holds the kit), --json
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { changedPieces, registeredPiece } from './pieces.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_DIR = resolve(__dirname, '..');
const KIT_NAME = 'ai-frontend-guide-kit';
const INDEX_FILE = `${KIT_NAME}/INDEX.md`;

// Each artifact is a list of alternatives; `out:` is relative to ai-frontend-output/, `root:` to the project.
const STEPS = {
  intake: {
    title: 'Intake: ask what we are doing, read the project context, declare the route',
    guide: 'guides/00-START-HERE.md',
    skill: 'ai-frontend-guide',
    tool: 'node tools/context.mjs; node tools/ui-map.mjs build',
    output: 'ai-frontend-output/ux/REPO-CONTEXT.md + ai-frontend-output/UI-MAP.md',
    artifacts: [['out:ux/REPO-CONTEXT.md'], ['out:UI-MAP.md']],
  },
  direction: {
    title: 'Experience direction: questions, archetype, philosophy, journey, IA, three directions',
    guide: 'guides/01-EXPERIENCE-DIRECTION.md',
    skill: 'ai-frontend-guide (+ landing-page-design for landing pages)',
    tool: 'experience/DISCOVERY-LOOP.md, Laya (optional)',
    output: 'ai-frontend-output/ux/EXPERIENCE-BRIEF.md',
    artifacts: [['out:ux/EXPERIENCE-BRIEF.md']],
  },
  ux: {
    title: 'UX flows: product anchor, screens with empty/loading/error states, screen map',
    guide: 'guides/02-UX-FLOWS.md',
    skill: 'userflow + flow-*, ux-map',
    tool: 'node tools/excalidraw-mcp.mjs',
    output: 'ai-frontend-output/ux/UX-SPEC.md + ai-frontend-output/ux/ux-map.excalidraw',
    artifacts: [['out:ux/UX-SPEC.md'], ['out:ux/ux-map.excalidraw']],
  },
  tokens: {
    title: 'Tokens: palette, type, spacing, radius and motion from the visual brief',
    guide: 'guides/03-TOKENS.md',
    skill: 'impeccable (if installed)',
    tool: 'Figma MCP (optional)',
    output: 'DESIGN.md + Tailwind v4 theme',
    artifacts: [['root:DESIGN.md', 'out:DESIGN.md']],
  },
  compose: {
    title: 'Composition: inventory, find, reuse/adapt/build, record every decision',
    guide: 'guides/04-INVENTORY.md … guides/07-ADAPT.md (+ guides/08-PHILOSOPHY.md)',
    skill: 'ai-frontend-guide (hallmark / design-taste-frontend only for decision build)',
    tool: 'node tools/pieces.mjs find; node tools/ui-map.mjs have; node tools/find.mjs; node tools/get.mjs; node tools/memory.mjs add',
    output: 'ai-frontend-output/selections.jsonl',
    artifacts: [['out:selections.jsonl']],
  },
  iterate: {
    title: 'Iterate: a small change or custom addition without repeating the UX phase',
    guide: 'guides/10-ITERATE.md',
    skill: 'ai-frontend-guide',
    tool: 'node tools/pieces.mjs find; node tools/ui-map.mjs impact; node tools/memory.mjs add',
    output: 'the change, with its decision recorded',
    artifacts: null,
  },
  redesign: {
    title: 'Visual redesign of an existing screen, keeping flows, content and wiring',
    guide: 'guides/00-START-HERE.md (external design skills by step)',
    skill: 'design-taste-frontend (redesign mode)',
    tool: 'node tools/ui-map.mjs impact',
    output: 'the redesigned screen',
    artifacts: null,
  },
  polish: {
    title: 'Total polish: external audits, Playwright MCP loop, regression checks green',
    guide: 'guides/08-PHILOSOPHY.md + guides/09-VERIFY.md',
    skill: 'frontend-polish',
    tool: 'Playwright MCP, @playwright/test, node tools/ui-map.mjs check',
    output: 'checks green (optional ai-frontend-output/polish-report.md)',
    artifacts: null,
  },
  'visual-feedback': {
    title: 'Visual feedback: the user points at elements in the browser and the agent changes exactly those',
    guide: 'guides/11-VISUAL-FEEDBACK.md',
    skill: 'ai-frontend-guide',
    tool: 'Agentation MCP',
    output: 'the annotated changes, resolved',
    artifacts: null,
  },
  architecture: {
    title: 'Architecture: folder roles (map), or FSD only on explicit request',
    guide: 'guides/12-ARCHITECTURE.md',
    skill: 'frontend-refactor (only for fsd-new / fsd-refactor)',
    tool: 'node tools/ui-map.mjs build; node tools/ui-map.mjs check',
    output: 'ai-frontend-output/architecture.json',
    artifacts: [['out:architecture.json']],
  },
};

const ROUTES = {
  new: { title: 'New frontend or major build (phases 1 → 2 → 3)', steps: ['intake', 'direction', 'ux', 'tokens', 'compose', 'polish'] },
  direction: { title: 'Direction only, no UI', steps: ['intake', 'direction'] },
  ux: { title: 'UX only or UX redesign, no UI work', steps: ['intake', 'ux'] },
  iterate: { title: 'Small change or custom component', steps: ['intake', 'iterate', 'polish'] },
  polish: { title: 'Polish only or visual QA', steps: ['intake', 'polish'] },
  redesign: { title: 'Visual redesign of an existing screen', steps: ['intake', 'redesign', 'polish'] },
  'visual-feedback': { title: 'Point-and-change in the browser (React)', steps: ['intake', 'visual-feedback'] },
  architecture: { title: 'Folder map, or FSD structure when asked', steps: ['intake', 'architecture'] },
};

class UsageError extends Error {}
class Refusal extends Error {}

function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const eq = token.startsWith('--') ? token.indexOf('=') : -1;
    const name = eq === -1 ? token : token.slice(0, eq);
    if (name === '--dir' || name === '--evidence') {
      const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
      if (!value || (eq === -1 && value.startsWith('--'))) throw new UsageError(`option ${name} needs a value`);
      flags[name.slice(2)] = value;
      if (eq === -1) i += 1;
    } else if (eq === -1 && token === '--json') flags.json = true;
    else if (eq === -1 && (token === '--help' || token === '-h')) flags.help = true;
    else if (token.startsWith('-') && token.length > 1) throw new UsageError(`unknown option "${token}"`);
    else flags._.push(token);
  }
  return flags;
}

const USAGE = `flow — the step-by-step design flow, kept per project

Usage:
  node tools/flow.mjs list
  node tools/flow.mjs status
  node tools/flow.mjs start <route>        ${Object.keys(ROUTES).join(' | ')}
  node tools/flow.mjs next
  node tools/flow.mjs done <step> [--evidence "..."]
  node tools/flow.mjs reset
  compose and iterate also refuse while a build decision has no piece registered in this project (node tools/pieces.mjs add)
  or a registered piece changed since its last version (node tools/pieces.mjs version <name>).
Options: --dir <project>, --json
`;

function paths(flags) {
  const root = flags.dir ? resolve(flags.dir) : process.env.AI_FRONTEND_PROJECT ? resolve(process.env.AI_FRONTEND_PROJECT) : dirname(KIT_DIR);
  const out = process.env.AI_FRONTEND_OUTPUT ? resolve(process.env.AI_FRONTEND_OUTPUT) : join(root, 'ai-frontend-output');
  return { root, out, state: join(out, 'flow-state.json') };
}

function readState(p) {
  if (!existsSync(p.state)) return null;
  return JSON.parse(readFileSync(p.state, 'utf8'));
}

function writeState(p, state) {
  mkdirSync(p.out, { recursive: true });
  state.updated_at = new Date().toISOString();
  writeFileSync(p.state, `${JSON.stringify(state, null, 2)}\n`);
}

const current = (state) => state.steps.find((step) => step.status !== 'done') || null;

function artifactPath(p, ref) {
  const [scope, rel] = ref.split(/:(.*)/s);
  return { abs: join(scope === 'root' ? p.root : p.out, rel), shown: scope === 'root' ? rel : `ai-frontend-output/${rel}` };
}

function missingArtifacts(p, step) {
  const def = STEPS[step];
  if (!def.artifacts) return [];
  const missing = [];
  for (const alternatives of def.artifacts) {
    const found = alternatives.some((ref) => {
      const { abs } = artifactPath(p, ref);
      return existsSync(abs) && readFileSync(abs, 'utf8').trim().length > 0;
    });
    if (!found) missing.push(alternatives.map((ref) => artifactPath(p, ref).shown).join(' or '));
  }
  return missing;
}

function describeStep(id) {
  const def = STEPS[id];
  return [
    `Next step: ${id} — ${def.title}`,
    `  guide:  ${def.guide}`,
    `  skill:  ${def.skill}`,
    `  tools:  ${def.tool}`,
    `  output: ${def.output}${def.artifacts ? '' : ' (mark done with --evidence)'}`,
  ].join('\n');
}

function countLines(file) {
  if (!existsSync(file)) return 0;
  return readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).length;
}

function countCombos(file) {
  if (!existsSync(file)) return 0;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(data) ? data.length : Object.keys(data.combinations || data).length;
  } catch {
    return 0;
  }
}

function countLibraries(file) {
  const counts = { using: 0, research: 0 };
  if (!existsSync(file)) return counts;
  try {
    for (const lib of JSON.parse(readFileSync(file, 'utf8')).libraries ?? []) if (lib.status in counts) counts[lib.status] += 1;
  } catch {
    return counts;
  }
  return counts;
}

function status(p, flags) {
  const kitInstalled = existsSync(join(p.root, KIT_NAME, 'AGENTS.md'));
  const state = readState(p);
  const step = state && current(state);
  const report = {
    project: p.root,
    kit: kitInstalled ? 'installed' : 'not installed',
    index: INDEX_FILE,
    flow: state ? { route: state.route, complete: !step, step: step ? step.id : null, position: step ? state.steps.indexOf(step) + 1 : state.steps.length, total: state.steps.length } : null,
    recorded: {
      decisions: countLines(join(p.out, 'selections.jsonl')),
      combinations: countCombos(join(p.out, 'combinations.json')),
      libraries: countLibraries(join(p.out, 'libraries.json')),
      'REPO-CONTEXT.md': existsSync(join(p.out, 'ux', 'REPO-CONTEXT.md')),
      'UI-MAP.md': existsSync(join(p.out, 'UI-MAP.md')),
      'EXPERIENCE-BRIEF.md': existsSync(join(p.out, 'ux', 'EXPERIENCE-BRIEF.md')),
      'UX-SPEC.md': existsSync(join(p.out, 'ux', 'UX-SPEC.md')),
    },
  };
  if (flags.json) return console.log(JSON.stringify(report, null, 2));
  const lines = [`Project: ${p.root}`, `Kit: ${report.kit}${kitInstalled ? '' : ` (no ${KIT_NAME}/AGENTS.md here; run the installer to use the flow)`}`, `Index: ${INDEX_FILE} (read it first)`];
  if (!state) lines.push('Flow: none (declare the route with: node tools/flow.mjs start <route>)');
  else if (!step) lines.push(`Flow: ${state.route} · complete`);
  else lines.push(`Flow: ${state.route} · step ${report.flow.position}/${report.flow.total} · ${step.id}`);
  lines.push(`Decisions recorded: ${report.recorded.decisions} · combinations: ${report.recorded.combinations}`);
  lines.push(`Libraries: ${report.recorded.libraries.using} in use · ${report.recorded.libraries.research} to research`);
  for (const name of ['REPO-CONTEXT.md', 'UI-MAP.md', 'EXPERIENCE-BRIEF.md', 'UX-SPEC.md']) lines.push(`${name}: ${report.recorded[name] ? 'yes' : 'no'}`);
  if (step) lines.push('', describeStep(step.id));
  console.log(lines.join('\n'));
}

function start(p, route) {
  if (!route) throw new UsageError(`start needs a route: ${Object.keys(ROUTES).join(', ')}`);
  if (!ROUTES[route]) throw new UsageError(`unknown route "${route}" (routes: ${Object.keys(ROUTES).join(', ')})`);
  const existing = readState(p);
  if (existing && current(existing)) throw new Refusal(`route "${existing.route}" is active at step "${current(existing).id}"; finish it or run: node tools/flow.mjs reset`);
  const now = new Date().toISOString();
  const state = { route, started_at: now, complete: false, steps: ROUTES[route].steps.map((id) => ({ id, status: 'pending' })) };
  writeState(p, state);
  console.log(`Route: ${route} — ${ROUTES[route].title}\nSteps: ${ROUTES[route].steps.join(' → ')}\n\n${describeStep(state.steps[0].id)}`);
}

function list() {
  const lines = [
    '# Flows of the AI Frontend Guide kit',
    '',
    'Generated by `node tools/flow.mjs list`; do not edit by hand. Every design conversation declares one route with `node tools/flow.mjs start <route>` and follows its steps in order: `node tools/flow.mjs done <step>` refuses a skipped step or a missing artifact. Skills marked "if installed" are optional; without them, use `guides/08-PHILOSOPHY.md`.',
    '',
    '## Routes',
    '',
    '| Route | When | Steps |',
    '|---|---|---|',
    ...Object.entries(ROUTES).map(([id, route]) => `| \`${id}\` | ${route.title} | ${route.steps.join(' → ')} |`),
    '',
    '## Steps by route',
  ];
  for (const [id, route] of Object.entries(ROUTES)) {
    lines.push('', `### \`${id}\``, '', route.title, '', '| # | Step | Guide | Skill | Tools | Output |', '|---|---|---|---|---|---|');
    route.steps.forEach((stepId, index) => {
      const def = STEPS[stepId];
      const output = def.artifacts ? def.output : `${def.output} (\`--evidence\`)`;
      lines.push(`| ${index + 1} | \`${stepId}\` | ${def.guide} | ${def.skill} | ${def.tool} | ${output} |`);
    });
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

function next(p) {
  const state = readState(p);
  if (!state) throw new Refusal('no active flow; declare the route with: node tools/flow.mjs start <route>');
  const step = current(state);
  if (!step) return console.log(`Route "${state.route}" complete. Start a new one with: node tools/flow.mjs reset, then start <route>`);
  console.log(describeStep(step.id));
}

/** Every `build` decision in selections.jsonl must resolve to a piece registered in this project. */
function unregisteredBuilds(p) {
  const file = join(p.out, 'selections.jsonl');
  if (!existsSync(file)) return [];
  const missing = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (record?.decision !== 'build') continue;
    if (!registeredPiece(record.name, record.block, p.out)) missing.push(`${record.block} ("${record.name ?? record.block}")`);
  }
  return [...new Set(missing)];
}

function done(p, id, flags) {
  const state = readState(p);
  if (!state) throw new Refusal('no active flow; declare the route with: node tools/flow.mjs start <route>');
  if (!id) throw new UsageError('done needs a step');
  if (!state.steps.some((step) => step.id === id)) throw new UsageError(`unknown step "${id}" for route "${state.route}" (steps: ${state.steps.map((step) => step.id).join(', ')})`);
  const step = current(state);
  if (!step) throw new Refusal(`route "${state.route}" is already complete`);
  if (step.id !== id) throw new Refusal(`step "${id}" is not the current step (current: ${step.id}); steps are never skipped`);
  if (id === 'compose' || id === 'iterate') {
    const unregistered = unregisteredBuilds(p);
    if (unregistered.length) {
      throw new Refusal(`step "${id}" cannot be marked done: build decision(s) with no registered piece: ${unregistered.join(', ')}. Register each with: node tools/pieces.mjs add <name> --level micro|small|medium|large --file <src> (after node tools/pieces.mjs find "<need>")`);
    }
    const changed = changedPieces(p.root, p.out);
    if (changed.length) {
      throw new Refusal(`step "${id}" cannot be marked done: piece(s) changed since their last recorded version: ${changed.map((piece) => `${piece.name} (v${piece.version})`).join(', ')}. Record each with: ${changed.map((piece) => `node tools/pieces.mjs version ${piece.name}`).join('; ')}`);
    }
  }
  if (STEPS[id].artifacts) {
    const missing = missingArtifacts(p, id);
    if (missing.length) throw new Refusal(`step "${id}" cannot be marked done: missing ${missing.join(', ')}`);
  } else if (!flags.evidence) {
    throw new Refusal(`step "${id}" needs --evidence "<what proves it is done>"`);
  }
  step.status = 'done';
  step.done_at = new Date().toISOString();
  if (flags.evidence) step.evidence = flags.evidence;
  const following = current(state);
  state.complete = !following;
  writeState(p, state);
  console.log(following ? `Done: ${id}\n\n${describeStep(following.id)}` : `Done: ${id}\nRoute "${state.route}" complete.`);
}

function reset(p) {
  if (existsSync(p.state)) rmSync(p.state);
  console.log('Flow reset: no active route.');
}

function main() {
  let flags;
  try {
    flags = parseArgs(process.argv.slice(2));
    if (flags.help) return console.log(USAGE);
    const [command = 'status', arg, ...extra] = flags._;
    if (extra.length) throw new UsageError(`unexpected argument "${extra[0]}"`);
    const p = paths(flags);
    if (command === 'status') return status(p, flags);
    if (command === 'start') return start(p, arg);
    if (command === 'list') return list();
    if (command === 'next') return next(p);
    if (command === 'done') return done(p, arg, flags);
    if (command === 'reset') return reset(p);
    throw new UsageError(`unknown command "${command}"`);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`flow: ${error.message}\n\n${USAGE}`);
      process.exitCode = 2;
    } else if (error instanceof Refusal) {
      console.error(`flow: ${error.message}`);
      process.exitCode = 1;
    } else throw error;
  }
}

main();
