#!/usr/bin/env node
/**
 * flow — the step-by-step design flow of the AI Frontend Guide kit, kept per project.
 *
 * State: `ai-frontend-output/flow-state.json` (commit it with the project so everyone
 * who works on the design shares the same route and step).
 *
 * A step is marked done only when it is the current step and its artifact exists and says what it
 * must (the checks live in flow-gates.mjs); a step without a file needs `--evidence "<what proves
 * it>"` and its report. Refusals change nothing. A route started before content gates existed has
 * no `gates` in its state and keeps the old rule: the file exists and is not empty.
 *
 * `next` prints the whole instruction of one micro-step (goal, exact commands, template, done
 * criteria; the texts live in flow-steps.mjs). The large steps have parts, closed in order with
 * `done <step>.<part>`; the last part closes the step. `done <step>` still closes a whole step.
 * `scaffold` writes the template of a micro-step into its file; `report` writes the checklist of a
 * step that closes with free evidence.
 *
 * Some parts are the user's decision (`decision` in flow-steps.mjs): `next` ends them with a STOP block and `done` closes
 * them only with `--answer "<the user's words>"`, kept in `answers` of the step. The board's `--declined --reason` is the same
 * notion: the reason is the answer. A state written before this change keeps working; it asks for the answer on those parts too.
 *
 * Usage:
 *   node ai-frontend-guide-kit/tools/flow.mjs list                   every route and step (the text of guides/FLOWS.md)
 *   node ai-frontend-guide-kit/tools/flow.mjs status                 kit installed?, active route and step, what is recorded
 *   node ai-frontend-guide-kit/tools/flow.mjs start <route>          new | direction | ux | iterate | polish | redesign | visual-feedback | architecture
 *   node ai-frontend-guide-kit/tools/flow.mjs next                   the whole instruction of the current micro-step
 *   node ai-frontend-guide-kit/tools/flow.mjs scaffold [<step>[.<part>]]   write the template of a micro-step (default: the current one)
 *   node ai-frontend-guide-kit/tools/flow.mjs report <step>          write the checklist of a step closed with evidence
 *   node ai-frontend-guide-kit/tools/flow.mjs report                 the whole route in one page, written to ai-frontend-output/FLOW-REPORT.md
 *   node ai-frontend-guide-kit/tools/flow.mjs done <step>[.<part>] [--evidence "..."] [--answer "<the user's words>"] [--tools <ids|none>]
 *   node ai-frontend-guide-kit/tools/flow.mjs reset                  drop the active route
 * Options: --dir <project> (default: the folder that holds the kit), --json
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kitFile, kitPath, quotePath, runTool } from './kit-path.mjs';
import { changedPieces, registeredPiece } from './pieces.mjs';
import { DESIGN_AUDIT_CHECK, PARTS, TOOL_IDS, designAuditCommand, hasOwnProductDoc, toolMenu } from './flow-steps.mjs';
import { checkBoards, detect as detectStorybook, findBoards } from './board.mjs';
import { directionCards, loadCards, resolveDirections, styleDirections } from './technique.mjs';
import { GATES, mergeReport, mergeTemplate, parseDesignAudit, prefillAudit, reportProblems, reuseProblems } from './flow-gates.mjs';
import { scanProject } from './ui-map.mjs';

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
    tool: 'node {kit}/tools/context.mjs; node {kit}/tools/ui-map.mjs build',
    output: 'ai-frontend-output/ux/REPO-CONTEXT.md + ai-frontend-output/UI-MAP.md',
    artifacts: [['out:ux/REPO-CONTEXT.md'], ['out:UI-MAP.md']],
  },
  direction: {
    title: 'Experience direction: questions, archetype, philosophy, journey, IA, three directions',
    guide: 'guides/01-EXPERIENCE-DIRECTION.md',
    skill: 'ai-frontend-guide (+ landing-page-design for landing pages)',
    tool: 'experience/DISCOVERY-LOOP.md, node {kit}/tools/recipe.mjs (list, show)',
    output: 'ai-frontend-output/ux/EXPERIENCE-BRIEF.md',
    artifacts: [['out:ux/EXPERIENCE-BRIEF.md']],
  },
  ux: {
    title: 'UX flows: product anchor, screens with empty/loading/error states, screen map',
    guide: 'guides/02-UX-FLOWS.md',
    skill: 'userflow + flow-*, ux-map',
    tool: 'node {kit}/tools/excalidraw-mcp.mjs',
    output: 'ai-frontend-output/ux/UX-SPEC.md + ai-frontend-output/ux/ux-map.excalidraw',
    artifacts: [['out:ux/UX-SPEC.md'], ['out:ux/ux-map.excalidraw']],
  },
  tokens: {
    title: 'Tokens: palette, type, spacing, radius and motion from the visual brief',
    guide: 'guides/03-TOKENS.md',
    skill: 'impeccable',
    tool: 'node {kit}/tools/tokens.mjs (init, check, css, doc)',
    output: 'design-tokens.json + DESIGN.md + Tailwind v4 theme',
    artifacts: [['root:DESIGN.md', 'out:DESIGN.md']],
  },
  compose: {
    title: 'Composition: inventory, find, reuse/adapt/build, record every decision',
    guide: 'guides/04-INVENTORY.md … guides/07-ADAPT.md (+ guides/08-PHILOSOPHY.md)',
    skill: 'ai-frontend-guide (hallmark / design-taste-frontend only for decision build)',
    tool: 'node {kit}/tools/pieces.mjs find; node {kit}/tools/recipe.mjs (suggest, inventory); node {kit}/tools/ui-map.mjs have; node {kit}/tools/find.mjs; node {kit}/tools/get.mjs; node {kit}/tools/memory.mjs add',
    output: 'ai-frontend-output/selections.jsonl',
    artifacts: [['out:selections.jsonl']],
  },
  board: {
    title: 'Design board: Storybook asked first, then one story per layout version of the real components',
    guide: 'guides/14-DESIGN-BOARD.md',
    skill: 'storybook-board',
    tool: 'node {kit}/tools/board.mjs (detect, plan, scaffold, list, check)',
    output: 'src/board/*.board.stories.* (Storybook installed with the yes of the user, or the no on record)',
    closes: 'board check clean with a board story, or --declined --reason',
    artifacts: null,
  },
  iterate: {
    title: 'Iterate: a small change or custom addition without repeating the UX phase',
    guide: 'guides/10-ITERATE.md',
    skill: 'ai-frontend-guide',
    tool: 'node {kit}/tools/pieces.mjs find; node {kit}/tools/ui-map.mjs impact; node {kit}/tools/memory.mjs add',
    output: 'the change, with its decision recorded',
    artifacts: null,
  },
  redesign: {
    title: 'Visual redesign of an existing screen, keeping flows, content and wiring',
    guide: 'guides/00-START-HERE.md (external design skills by step)',
    skill: 'design-taste-frontend (redesign mode)',
    tool: 'node {kit}/tools/ui-map.mjs impact',
    output: 'the redesigned screen',
    artifacts: null,
  },
  polish: {
    title: 'Total polish: external audits, Playwright MCP loop, regression checks green',
    guide: 'guides/08-PHILOSOPHY.md + guides/09-VERIFY.md',
    skill: 'frontend-polish',
    tool: 'node {kit}/tools/audit-design.mjs, Playwright MCP, @playwright/test, node {kit}/tools/ui-map.mjs check',
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
    tool: 'node {kit}/tools/ui-map.mjs build; node {kit}/tools/ui-map.mjs check',
    output: 'ai-frontend-output/architecture.json',
    artifacts: [['out:architecture.json']],
  },
};

const ROUTES = {
  new: { title: 'New frontend or major build (phases 1 → 2 → 3)', steps: ['intake', 'direction', 'ux', 'tokens', 'compose', 'board', 'polish'] },
  direction: { title: 'Direction only, no UI', steps: ['intake', 'direction'] },
  ux: { title: 'UX only or UX redesign, no UI work', steps: ['intake', 'ux'] },
  iterate: { title: 'Small change or custom component', steps: ['intake', 'iterate', 'polish'] },
  polish: { title: 'Polish only or visual QA', steps: ['intake', 'polish'] },
  redesign: { title: 'Visual redesign of an existing screen', steps: ['intake', 'redesign', 'polish'] },
  'visual-feedback': { title: 'Point-and-change in the browser (React)', steps: ['intake', 'visual-feedback'] },
  architecture: { title: 'Folder map, or FSD structure when asked', steps: ['intake', 'architecture'] },
};

/** The steps that close with free evidence: each has a fixed checklist (`report` in flow-steps.mjs). */
const REPORT_STEPS = Object.keys(PARTS).filter((id) => PARTS[id].at(-1).report);
const REPORT_STEPS_TEXT = REPORT_STEPS.join(', ');
const OUT_DIR = 'ai-frontend-output';
const DESIGN_AUDIT_FILE = 'out:reports/design-audit.json';

class UsageError extends Error {}
class Refusal extends Error {}

function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const eq = token.startsWith('--') ? token.indexOf('=') : -1;
    const name = eq === -1 ? token : token.slice(0, eq);
    if (name === '--dir' || name === '--evidence' || name === '--reason' || name === '--answer' || name === '--tools') {
      const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
      if (!value || (eq === -1 && value.startsWith('--'))) throw new UsageError(`option ${name} needs a value`);
      flags[name.slice(2)] = value;
      if (eq === -1) i += 1;
    } else if (eq === -1 && token === '--json') flags.json = true;
    else if (eq === -1 && token === '--declined') flags.declined = true;
    else if (eq === -1 && (token === '--help' || token === '-h')) flags.help = true;
    else if (token.startsWith('-') && token.length > 1) throw new UsageError(`unknown option "${token}"`);
    else flags._.push(token);
  }
  return flags;
}

const usage = () => `flow — the step-by-step design flow, kept per project

Usage:
  ${cmd('flow.mjs', 'list')}
  ${cmd('flow.mjs', 'status')}
  ${cmd('flow.mjs', 'start <route>')}        ${Object.keys(ROUTES).join(' | ')}
  ${cmd('flow.mjs', 'next')}                 the whole instruction of the current micro-step: goal, commands, template, done criteria
  ${cmd('flow.mjs', 'scaffold [<step>[.<part>]]')}   write the template of a micro-step into its file (default: the current one)
  ${cmd('flow.mjs', 'report <step>')}        write the checklist of ${REPORT_STEPS_TEXT}
  ${cmd('flow.mjs', 'report')}               the whole route in one page (what each step did, what the user answered, tools, files): ai-frontend-output/FLOW-REPORT.md
  ${cmd('flow.mjs', 'done <step>[.<part>] [--evidence "..."] [--answer "<the user\'s words>"] [--tools <ids|none>]')}
  ${cmd('flow.mjs', 'done board --declined --reason "..."')}   the user said no to Storybook: the no and its reason stay on record
  ${cmd('flow.mjs', 'reset')}
  direction, ux and compose have parts, closed in order (done direction.questions, ...); the last part closes the step.
  A part that is the user's decision (direction.questions, .references, .choose, ux.product when PRODUCT.md must be asked, compose.decide, the Storybook question of board)
  ends next with a STOP block: show the options to the user, wait, and close it with --answer "<the user's words>"; the answer stays in flow-state.json.
  next also lists the kit tools that fit the step (command, what it gives, cost): show them to the user and record the pick with --tools <ids> (or none).
  done prints a summary for the user (what was done, tools, files, next step); report with no step gathers them for the whole route.
  done also reads the file: required sections filled, no <…> left, tables with rows, ids that exist; it lists what is missing.
  board closes when Storybook is installed (always asked first, never installed alone), a board story exists and board.mjs check is clean, or with --declined --reason.
  ${REPORT_STEPS_TEXT} close with --evidence and a report with every line checked or marked n/a.
  compose and iterate also refuse while a build decision has no piece registered in this project (${cmd('pieces.mjs', 'add')})
  or a registered piece changed since its last version (${cmd('pieces.mjs', 'version <name>')}).
  compose also lists every catalog component decided reuse or adapt that no page or component imports: import it, or re-decide it as build with a reason.
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

function missingArtifacts(p, artifacts) {
  if (!artifacts) return [];
  const missing = [];
  for (const alternatives of artifacts) {
    const found = alternatives.some((ref) => {
      const { abs } = artifactPath(p, ref);
      return existsSync(abs) && readFileSync(abs, 'utf8').trim().length > 0;
    });
    if (!found) missing.push(alternatives.map((ref) => artifactPath(p, ref).shown).join(' or '));
  }
  return missing;
}

/** The project the printed commands are written for: the folder the tool runs from, or --dir. */
let projectRoot = process.cwd();
const cmd = (tool, args) => runTool(tool, args, projectRoot);
/** Fills the `{kit}/tools/<tool>` placeholders of the step table with the path form of this project. */
const fillKit = (text) => text.replace(/\{kit\}\/tools\/([\w.-]+)/g, (_, tool) => quotePath(`${kitPath(projectRoot)}/tools/${tool}`));

function describeStep(id) {
  const def = STEPS[id];
  return [
    `Next step: ${id} — ${def.title}`,
    `  guide:  ${def.guide}`,
    `  skill:  ${def.skill}`,
    `  tools:  ${fillKit(def.tool)}`,
    `  output: ${def.output}${def.artifacts ? '' : def.closes ? ` (closes with: ${def.closes})` : ' (mark done with --evidence)'}`,
  ].join('\n');
}

/** The first part of the step that is not closed yet (a step with one part always returns it). */
function currentPart(step) {
  const closed = step.parts_done ?? [];
  return PARTS[step.id].find((part) => !closed.includes(part.id)) ?? PARTS[step.id].at(-1);
}

/** The files a part must leave; a part may decide them from the project facts (a function of env). */
const partArtifacts = (p, part) => (typeof part.artifacts === 'function' ? part.artifacts(environment(p)) : part.artifacts ?? []);

/** Facts about this project that the tool resolves, so the instruction leaves no branch to the reader. */
function environment(p) {
  const readText = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '');
  const readJson = (file) => {
    try {
      return JSON.parse(readText(file));
    } catch {
      return {};
    }
  };
  const context = readText(join(p.out, 'ux', 'REPO-CONTEXT.md'));
  const ux = context.match(/\*\*UX present:\*\*\s*(yes|no)/i) ?? context.match(/ux_present\W{0,4}(true|false)/i);
  const framework = (context.match(/\*\*Framework:\*\*\s*([^—\n]+)/)?.[1] ?? '').trim();
  const manifest = readJson(join(p.root, 'package.json'));
  const deps = { ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}) };
  const servers = Object.keys({ ...(readJson(join(p.root, '.mcp.json')).mcpServers ?? {}), ...(readJson(join(p.root, 'opencode.json')).mcp ?? {}) }).map((name) => name.toLowerCase());
  const skillRoots = [p.root, homedir()].flatMap((base) => [join(base, '.agents', 'skills'), join(base, '.claude', 'skills')]);
  return {
    run: (tool, args) => runTool(tool, args, p.root),
    storybook: detectStorybook(p.root),
    python: (tool, args) => runTool(tool, args, p.root, 'python'),
    kit: (path) => kitFile(path, p.root),
    skill: (name) => skillRoots.some((root) => existsSync(join(root, name))),
    mcp: (name) => servers.some((server) => server.includes(name)),
    dep: (name) => name in deps,
    laya: /laya[_ ]consent[^a-z]*granted/i.test(readText(join(p.out, 'ux', 'EXPERIENCE-BRIEF.md'))),
    uxPresent: ux ? /yes|true/i.test(ux[1]) : null,
    framework: /^(none|unknown)?$/i.test(framework) ? '' : framework,
    hasProduct: existsSync(join(p.root, 'PRODUCT.md')),
    hasBrief: existsSync(join(p.out, 'ux', 'EXPERIENCE-BRIEF.md')),
    hasMap: existsSync(join(p.out, 'ux', 'ux-map.excalidraw')),
    techniques: (areas) => {
      try {
        const found = resolveDirections(readText(join(p.out, 'ux', 'EXPERIENCE-BRIEF.md')), readText(join(p.out, 'selections.jsonl')), styleDirections());
        const data = loadCards();
        const cards = found.flatMap((direction) => directionCards(data, direction, found.length > 1 ? 3 : 5, areas));
        return { directions: found, ids: [...new Set(cards.map((card) => card.id))].slice(0, 5) };
      } catch {
        return { directions: [], ids: [] };
      }
    },
    // 3D was chosen: the brief, the UX spec or the inventory name it, or a scene spec already exists.
    wants3d: existsSync(join(p.out, 'SCENE-SPEC.md')) || /\b(3d|three\.?js|webgl)\b/i.test([join(p.out, 'ux', 'EXPERIENCE-BRIEF.md'), join(p.out, 'ux', 'UX-SPEC.md'), join(p.out, 'INVENTORY.md')].map(readText).join('\n')),
    dark: /navigation_model\s*:\s*`?console/i.test(readText(join(p.out, 'ux', 'EXPERIENCE-BRIEF.md'))),
  };
}

/** What the user decides in a part, or null when the part is not a decision (or has nothing to ask in this project). */
const decisionOf = (part, env) => (typeof part.decision === 'function' ? part.decision(env) : part.decision) || null;
const STOP_TEXT = "STOP — this is the user's decision. Show the options above to the user and wait for the answer. Do not answer for them.";

/** The current micro-step of an active route, as data: what `next` prints and `next --json` returns. */
function instruction(p, state) {
  const step = current(state);
  const parts = PARTS[step.id];
  const part = currentPart(step);
  const env = environment(p);
  const built = part.build(env);
  const last = part === parts.at(-1);
  const id = part.id ? `${step.id}.${part.id}` : step.id;
  const needsEvidence = last && !STEPS[step.id].artifacts && !STEPS[step.id].closes;
  const what = decisionOf(part, env);
  return {
    route: state.route,
    complete: false,
    step: step.id,
    part: part.id,
    title: part.title,
    position: state.steps.indexOf(step) + 1,
    total: state.steps.length,
    part_position: parts.indexOf(part) + 1,
    part_total: parts.length,
    goal: built.goal,
    do: built.steps.filter(Boolean),
    template: built.template ?? null,
    done_when: built.done,
    artifacts: [...partArtifacts(p, part), ...((last && STEPS[step.id].artifacts) || [])].map((alternatives) => artifactPath(p, alternatives[0]).shown),
    scaffold_command: built.template ? env.run('flow.mjs', `scaffold ${id}`) : null,
    report: last && part.report ? { file: artifactPath(p, `out:reports/${step.id}-report.md`).shown, command: env.run('flow.mjs', `report ${step.id}`), checks: part.report } : null,
    needs_evidence: needsEvidence,
    done_command: env.run('flow.mjs', `done ${id}${needsEvidence ? ' --evidence "<each check you ran and its result>"' : ''}`),
    tools: toolMenu(env, id),
    decision: what ? { what, stop: STOP_TEXT, answer_command: env.run('flow.mjs', `done ${id} --answer "<the user's words>"`) } : null,
    reference: built.reference,
  };
}

function renderInstruction(info) {
  let number = 0;
  const lines = [
    `Next step: ${info.step} — ${STEPS[info.step].title}`,
    `Route ${info.route} · step ${info.position}/${info.total}${info.part ? ` · part ${info.part_position}/${info.part_total}: ${info.part} — ${info.title}` : ` · ${info.title}`}`,
    '',
    `Goal: ${info.goal}`,
    '',
    'Do, in this order:',
    ...info.do.map((line) => (line.startsWith('  ') ? `   ${line}` : `${(number += 1)}. ${line}`)),
  ];
  if (info.template) lines.push('', `Template for ${info.template.file} — write it with: ${info.scaffold_command} (what is already in the file is never changed), then replace every <…>:`, ...info.template.lines.map((line) => `    ${line}`));
  if (info.tools.length) lines.push('', 'Tools you can offer the user here (show them to the user, ask which to use, record the pick on the done command with --tools <ids>, or --tools none):', ...info.tools.map((tool) => `- ${tool.id}: ${tool.command} — ${tool.gives} (cost: ${tool.cost})`));
  lines.push('', 'Done when:', ...info.done_when.map((line) => `- ${line}`), '', `Then run: ${info.decision ? info.decision.answer_command : info.done_command}`, `Only if you are stuck, read: ${info.reference}`);
  if (info.decision) lines.push('', info.decision.stop, `Decision: ${info.decision.what}`);
  return lines.join('\n');
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
  if (!state) lines.push(`Flow: none (declare the route with: ${cmd('flow.mjs', 'start <route>')})`);
  else if (!step) lines.push(`Flow: ${state.route} · complete`);
  else lines.push(`Flow: ${state.route} · step ${report.flow.position}/${report.flow.total} · ${step.id}`);
  lines.push(`Decisions recorded: ${report.recorded.decisions} · combinations: ${report.recorded.combinations}`);
  lines.push(`Libraries: ${report.recorded.libraries.using} in use · ${report.recorded.libraries.research} to research`);
  for (const name of ['REPO-CONTEXT.md', 'UI-MAP.md', 'EXPERIENCE-BRIEF.md', 'UX-SPEC.md']) lines.push(`${name}: ${report.recorded[name] ? 'yes' : 'no'}`);
  if (step) lines.push('', describeStep(step.id), `  full instruction: ${cmd('flow.mjs', 'next')}`);
  console.log(lines.join('\n'));
}

function start(p, route) {
  if (!route) throw new UsageError(`start needs a route: ${Object.keys(ROUTES).join(', ')}`);
  if (!ROUTES[route]) throw new UsageError(`unknown route "${route}" (routes: ${Object.keys(ROUTES).join(', ')})`);
  const existing = readState(p);
  if (existing && current(existing)) throw new Refusal(`route "${existing.route}" is active at step "${current(existing).id}"; finish it or run: ${cmd('flow.mjs', 'reset')}`);
  const now = new Date().toISOString();
  const state = { route, gates: 1, started_at: now, complete: false, steps: ROUTES[route].steps.map((id) => ({ id, status: 'pending' })) };
  writeState(p, state);
  console.log(`Route: ${route} — ${ROUTES[route].title}\nSteps: ${ROUTES[route].steps.join(' → ')}\n\n${renderInstruction(instruction(p, state))}`);
}

function list() {
  // FLOWS.md ships in the kit: its commands are written for a kit that sits in the project root, wherever this runs.
  projectRoot = dirname(KIT_DIR);
  const listCmd = (args) => cmd('flow.mjs', args);
  const lines = [
    '# Flows of the AI Frontend Guide kit',
    '',
    `Generated by \`${listCmd('list')}\`; do not edit by hand. Every design conversation declares one route with \`${listCmd('start <route>')}\` and follows its steps in order: \`${listCmd('next')}\` prints the whole instruction of the current micro-step (goal, exact commands, template, done criteria), already resolved for what this project has installed, \`${listCmd('scaffold')}\` writes the skeleton of the file the step asks for, and \`${listCmd('done <step>')}\` refuses a skipped step, a missing artifact or a file whose required sections are empty or still hold a template token. The steps closed with evidence (\`polish\`, \`iterate\`, \`redesign\`, \`visual-feedback\`) also need their report: \`${listCmd('report <step>')}\` writes the checklist. \`next\` names only the skills this project has installed; the rules of \`guides/08-PHILOSOPHY.md\` cover the rest.`,
    '',
    `The user decides, the agent does not. The parts that are the user's choice (\`direction.questions\`, \`direction.references\`, \`direction.choose\`, \`ux.product\` when PRODUCT.md must be asked, \`compose.decide\`, and the Storybook question of \`board\`) end \`next\` with a STOP block: the agent shows the options, waits, and closes the part with \`${listCmd('done <step>.<part> --answer "<the answer of the user>"')}\`; the answer stays in \`flow-state.json\`. \`next\` also lists the kit tools that fit the micro-step, each with its command, what it gives and its cost, so the user picks which to use (\`--tools <ids>\` on \`done\` records the pick). \`done\` prints a summary for the user (what was done, tools, files, next step) and \`${listCmd('report')}\` writes the whole route to \`ai-frontend-output/FLOW-REPORT.md\`. \`compose\` also refuses while a catalog component decided reuse or adapt is not imported by any page or component.`,
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
      const output = def.artifacts ? def.output : `${def.output} (${def.closes ?? '`--evidence`'})`;
      lines.push(`| ${index + 1} | \`${stepId}\` | ${def.guide} | ${def.skill} | ${fillKit(def.tool)} | ${output} |`);
    });
  }
  lines.push('', '## Parts of the large steps', '', `Closed in order with \`${listCmd('done <step>.<part>')}\`; a skipped part is refused and the last part closes the step. \`done <step>\` still closes a whole step at once.`, '', '| Step | # | Part | What it does |', '|---|---|---|---|');
  for (const [stepId, parts] of Object.entries(PARTS)) {
    if (parts.length > 1) parts.forEach((part, index) => lines.push(`| \`${stepId}\` | ${index + 1} | \`${stepId}.${part.id}\` | ${part.title} |`));
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

function next(p, flags) {
  const state = readState(p);
  if (!state) throw new Refusal(`no active flow; declare the route with: ${cmd('flow.mjs', 'start <route>')}`);
  const step = current(state);
  if (!step) return console.log(flags.json ? JSON.stringify({ route: state.route, complete: true }, null, 2) : `Route "${state.route}" complete. Start a new one with: ${cmd('flow.mjs', 'reset')}, then start <route>`);
  const info = instruction(p, state);
  console.log(flags.json ? JSON.stringify(info, null, 2) : renderInstruction(info));
}

/** The decisions of selections.jsonl (what `memory.mjs add` wrote), one object per line; a line that is not JSON is skipped. */
function readSelections(p) {
  const file = join(p.out, 'selections.jsonl');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').flatMap((line) => {
    try {
      const record = JSON.parse(line);
      return record && typeof record === 'object' ? [record] : [];
    } catch {
      return [];
    }
  });
}

/** Every `build` decision in selections.jsonl must resolve to a piece registered in this project. */
function unregisteredBuilds(p) {
  const missing = [];
  for (const record of readSelections(p)) {
    if (record.decision !== 'build') continue;
    if (!registeredPiece(record.name, record.block, p.out)) missing.push(`${record.block} ("${record.name ?? record.block}")`);
  }
  return [...new Set(missing)];
}

/**
 * Compose also asks that what was decided reuse or adapt is really used (flow-gates.mjs reuseProblems): the decisions come from
 * selections.jsonl, the landed files from the pieces registry, and the imports from the file graph of the ui-map scan (the shape
 * of ui-map.json, read fresh so the check never trusts a stale map). A scan that cannot run lets the step close, as the gates do.
 */
function unusedCatalogComponents(p) {
  const records = readSelections(p);
  if (!records.some((record) => record.entry_id && ['reuse', 'adapt'].includes(record.decision))) return [];
  let registry = {};
  try {
    registry = JSON.parse(readFileSync(join(p.out, 'pieces', 'pieces.json'), 'utf8'));
  } catch {
    registry = {};
  }
  try {
    const map = scanProject(p.root);
    return reuseProblems({ records, pieces: Object.values(registry.pieces ?? {}), imports: map.imports, files: map.components.map((component) => component.file), run: environment(p).run });
  } catch {
    return [];
  }
}

/** What the gates may read: another file of the project, and whether the repository has its own product document. */
function gateContext(p) {
  return {
    ownProduct: hasOwnProductDoc(environment(p)),
    run: environment(p).run,
    read: (ref) => {
      const { abs } = artifactPath(p, ref);
      return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
    },
  };
}

/** The content problems of one part, each as "<file>: <problem>". A file that is missing is the artifact check's job. */
function gateProblems(p, stepId, part, ctx) {
  const gate = GATES[part.id ? `${stepId}.${part.id}` : stepId];
  if (!gate || (gate.when && !gate.when(ctx))) return [];
  const ref = gate.files.find((candidate) => ctx.read(candidate) !== null);
  if (!ref) return [];
  return [...gate.check(ctx.read(ref), ctx).map((problem) => `${artifactPath(p, ref).shown}: ${problem}`), ...(gate.also ? gate.also(ctx) : [])];
}

/** Refuses with the numbered list of problems; a missing section points at the scaffold command. */
function refuseWith(p, subject, problems, scaffoldTarget) {
  const list = problems.map((problem, index) => `  ${index + 1}. ${problem}`).join('\n');
  const hint = scaffoldTarget && problems.some((problem) => /is missing/.test(problem)) ? ` A missing section can be added with: ${environment(p).run('flow.mjs', `scaffold ${scaffoldTarget}`)}` : '';
  throw new Refusal(`${subject} cannot be marked done: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n${list}\nFix ${problems.length === 1 ? 'it' : 'them'} and run the same command again.${hint}`);
}

/**
 * The board step closes in one of two ways: Storybook is installed, at least one board story exists and
 * `board.mjs check` is clean; or the user said no and --declined --reason keeps that on record. Storybook is never
 * installed here. Returns what the state keeps on the step; every refusal throws before anything is written.
 */
function closeBoard(p, flags) {
  if (flags.declined) return { declined: true, reason: flags.reason, evidence: flags.evidence ?? `declined by the user: ${flags.reason}` };
  const storybook = detectStorybook(p.root);
  if (!storybook.present) {
    throw new Refusal(`step "board" cannot be marked done: Storybook is not installed in this project. Ask the user whether to install it, with this command (never install it on your own): ${storybook.install}. If the user says no, record the no with: ${cmd('flow.mjs', 'done board --declined --reason "<the answer of the user>"')}`);
  }
  const boards = findBoards(p.root);
  const stories = boards.reduce((total, board) => total + board.versions.length, 0);
  if (!stories) throw new Refusal(`step "board" cannot be marked done: no board story yet. See the pages with: ${cmd('board.mjs', 'plan')} and write one with: ${cmd('board.mjs', 'scaffold <page> --version v1-<name>')}`);
  const { findings } = checkBoards(p.root);
  if (findings.length) refuseWith(p, 'step "board"', findings.map((finding) => `${finding.file}:${finding.line} — ${finding.id}: ${finding.what} → ${finding.fix}`), null);
  return { evidence: flags.evidence ?? `board check clean; ${stories} board ${stories === 1 ? 'story' : 'stories'} in ${boards.length} file${boards.length === 1 ? '' : 's'}` };
}

/** The decisions of the user that this close covers and that are still open (closing a whole step covers every open part). */
function openDecisions(p, step, partId) {
  const env = environment(p);
  const closed = step.parts_done ?? [];
  const covered = partId === undefined ? PARTS[step.id].filter((part) => !closed.includes(part.id)) : [currentPart(step)];
  return covered.map((part) => decisionOf(part, env)).filter(Boolean);
}

/** A decision part closes only with the words of the user (--answer), or with the board's --declined --reason, which is the same thing. */
function requireAnswer(p, subject, target, step, partId, flags) {
  if (flags.answer !== undefined || flags.declined) return;
  const open = openDecisions(p, step, partId);
  if (!open.length) return;
  throw new Refusal(`${subject} is the user's decision: ${open.join('; ')}. Do not answer for the user: show them the options, wait for their answer, then close it with: ${cmd('flow.mjs', `done ${target} --answer "<the user's words>"`)}`);
}

/** The ids of --tools as a list ([] for "none"), or undefined when the option is absent; an unknown id is a usage error. */
function parseTools(value) {
  if (value === undefined) return undefined;
  const ids = [...new Set(value.split(',').map((id) => id.trim().toLowerCase()).filter(Boolean))];
  if (!ids.length) throw new UsageError('--tools needs at least one tool id, or none');
  if (ids.includes('none') && ids.length > 1) throw new UsageError('--tools none cannot be combined with other tools');
  const unknown = ids.find((id) => id !== 'none' && !TOOL_IDS.includes(id));
  if (unknown) throw new UsageError(`unknown tool "${unknown}" in --tools (tools: ${TOOL_IDS.join(', ')}; or none)`);
  return ids[0] === 'none' ? [] : ids;
}

/** Keeps on the step the words of the user and the tools they picked, with the part they belong to (null: the whole step). */
function recordAnswer(step, partId, flags) {
  const answer = flags.answer ?? (flags.declined ? flags.reason : undefined);
  const tools = parseTools(flags.tools);
  if (answer === undefined && tools === undefined) return;
  step.answers = [...(step.answers ?? []), { part: partId ?? null, at: new Date().toISOString(), ...(answer === undefined ? {} : { answer: answer.trim() }), ...(tools === undefined ? {} : { tools }) }];
}

// ---------------------------------------------------------------- the summary for the user (done prints it, `report` gathers it)

/** The tools a step names in the step table (`{kit}/tools/<tool>`), as file names. */
const commandsOf = (id) => [...new Set([...STEPS[id].tool.matchAll(/\{kit\}\/tools\/([\w.-]+)/g)].map((match) => match[1]))];

/** The files of `artifacts` that exist and are not empty, as the project shows them (the first alternative that is there). */
function foundArtifacts(p, artifacts) {
  const shown = [];
  for (const alternatives of artifacts ?? []) {
    const hit = alternatives.map((ref) => artifactPath(p, ref)).find(({ abs }) => existsSync(abs) && readFileSync(abs, 'utf8').trim().length > 0);
    if (hit) shown.push(hit.shown);
  }
  return shown;
}

/**
 * What a step has done so far, as data for the human: the parts closed (all of them when the step is done, or just `scope.partId`),
 * the answers and tool picks recorded on them, and the files of the step that exist.
 */
function stepFacts(p, step, scope) {
  const closed = step.status === 'done' ? PARTS[step.id] : PARTS[step.id].filter((part) => (step.parts_done ?? []).includes(part.id));
  const parts = scope ? PARTS[step.id].filter((part) => part.id === scope.partId) : closed;
  const records = (step.answers ?? []).filter((entry) => !scope || entry.part === scope.partId);
  const answers = records.filter((entry) => entry.answer !== undefined);
  const picked = records.filter((entry) => entry.tools !== undefined).flatMap((entry) => entry.tools);
  const chosen = records.some((entry) => entry.tools !== undefined) ? (picked.length ? [...new Set(picked)].join(', ') : 'none (the user wanted no extra tool)') : 'none recorded';
  const report = artifactPath(p, `out:reports/${step.id}-report.md`);
  const files = [
    ...parts.flatMap((part) => foundArtifacts(p, partArtifacts(p, part))),
    ...(scope ? [] : foundArtifacts(p, STEPS[step.id].artifacts)),
    ...(!scope && existsSync(report.abs) ? [report.shown] : []),
    ...(!scope && step.id === 'board' ? findBoards(p.root).map((board) => board.file) : []),
  ];
  const said = answers.length ? `The user answered: ${answers.map((entry) => `"${entry.answer}"`).join('; ')}` : '';
  const what = parts.length ? [`${parts.map((part) => part.title).join('; ')}.`, !scope && step.evidence ? step.evidence : '', said].filter(Boolean).join(' ') : null;
  const commands = commandsOf(step.id);
  return { what, answers, files: [...new Set(files)], tools: `Tools: chosen by the user: ${chosen} · commands of this step: ${commands.length ? commands.join(', ') : 'none'}` };
}

/** The block `done` prints for the human after it closes `target`; `info` is the instruction of what comes next (null: the route is complete). */
function closeSummary(p, step, target, partId, info) {
  const facts = stepFacts(p, step, partId !== undefined && step.status !== 'done' ? { partId } : undefined);
  const next = info ? `${info.step}${info.part ? `.${info.part}` : ''} — ${info.title}` : 'none, the route is complete';
  return [`Summary for the user — ${target}`, `- What was done: ${facts.what}`, `- ${facts.tools}`, `- Files written: ${facts.files.join(', ') || 'none'}`, `- Next: ${next}`].join('\n');
}

/** `report` without a step: the whole route in one page, in order, written to FLOW-REPORT.md. */
function routeReport(p) {
  const state = readState(p);
  if (!state) throw new UsageError(`report needs a step (reports exist for: ${REPORT_STEPS_TEXT}), or an active route for the summary of the whole route`);
  const open = current(state);
  const finished = state.steps.filter((step) => step.status === 'done').length;
  const lines = [
    '# Flow report',
    '',
    `Route \`${state.route}\` — ${ROUTES[state.route]?.title ?? 'a route of an earlier kit'} · started ${String(state.started_at ?? '').slice(0, 10)} · ${finished} of ${state.steps.length} steps done.`,
    `Written by \`${cmd('flow.mjs', 'report')}\`: what each step did, what the user answered, the tools they picked and the files that came out. Read it instead of the chat.`,
  ];
  state.steps.forEach((step, index) => {
    const label = step.status === 'done' ? 'done' : step === open ? `in progress${PARTS[step.id].length > 1 ? ` (part ${Math.min((step.parts_done ?? []).length + 1, PARTS[step.id].length)} of ${PARTS[step.id].length})` : ''}` : 'pending';
    lines.push('', `## ${index + 1}. ${step.id} — ${label}`, STEPS[step.id].title);
    const facts = stepFacts(p, step);
    if (!facts.what) return lines.push('- Not started.');
    lines.push(`- What was done: ${facts.what.replace(/ The user answered: .*$/, '')}`);
    if (facts.answers.length) {
      lines.push('- What the user answered:');
      for (const entry of facts.answers) lines.push(`  - ${entry.part ?? step.id}: "${entry.answer}"${entry.tools?.length ? ` (tools: ${entry.tools.join(', ')})` : ''}`);
    }
    lines.push(`- ${facts.tools}`, `- Files written: ${facts.files.join(', ') || 'none'}`);
  });
  const { abs, shown } = artifactPath(p, 'out:FLOW-REPORT.md');
  mkdirSync(dirname(abs), { recursive: true });
  const text = `${lines.join('\n')}\n`;
  writeFileSync(abs, text);
  console.log(`${text}\nWritten: ${shown}`);
}

function done(p, target, flags) {
  const named = String(target ?? '').split('.')[0];
  parseTools(flags.tools);
  if (flags.answer !== undefined && (!flags.answer.trim() || /^<[^<>]*>$/.test(flags.answer.trim()))) throw new UsageError('--answer needs the words of the user, not empty and not the placeholder');
  if (flags.declined && named !== 'board') throw new UsageError(`only the board step can be declined (--declined); "${named}" closes with its own checks`);
  if (flags.declined && !flags.reason) throw new UsageError('--declined needs --reason "<why the user said no>"');
  if (flags.reason !== undefined && !flags.declined) throw new UsageError('--reason goes with --declined');
  const state = readState(p);
  if (!state) throw new Refusal(`no active flow; declare the route with: ${cmd('flow.mjs', 'start <route>')}`);
  if (!target) throw new UsageError('done needs a step');
  const [id, partId] = target.split(/\.(.*)/s);
  if (!state.steps.some((step) => step.id === id)) throw new UsageError(`unknown step "${id}" for route "${state.route}" (steps: ${state.steps.map((step) => step.id).join(', ')})`);
  const step = current(state);
  if (!step) throw new Refusal(`route "${state.route}" is already complete`);
  if (partId !== undefined && !PARTS[id].some((part) => part.id === partId)) throw new UsageError(`unknown part "${partId}" of step "${id}" (parts: ${PARTS[id].map((part) => part.id).filter(Boolean).join(', ') || 'none'})`);
  if (step.id !== id) throw new Refusal(`step "${id}" is not the current step (current: ${step.id}); steps are never skipped`);
  if (partId !== undefined) {
    const part = currentPart(step);
    if (part.id !== partId) throw new Refusal(`part "${partId}" is not the current part (current: ${part.id}); parts are never skipped`);
    const missing = missingArtifacts(p, partArtifacts(p, part));
    if (missing.length) throw new Refusal(`part "${target}" cannot be marked done: missing ${missing.join(', ')}`);
    if (state.gates) {
      const problems = gateProblems(p, id, part, gateContext(p));
      if (problems.length) refuseWith(p, `part "${target}"`, problems, target);
    }
    if (part !== PARTS[id].at(-1)) {
      requireAnswer(p, `part "${target}"`, target, step, partId, flags);
      recordAnswer(step, partId, flags);
      step.parts_done = [...(step.parts_done ?? []), partId];
      writeState(p, state);
      const info = instruction(p, state);
      return console.log(`Done: ${target}\n\n${closeSummary(p, step, target, partId, info)}\n\n${renderInstruction(info)}`);
    }
  }
  if (id === 'compose' || id === 'iterate') {
    const unregistered = unregisteredBuilds(p);
    if (unregistered.length) {
      throw new Refusal(`step "${id}" cannot be marked done: build decision(s) with no registered piece: ${unregistered.join(', ')}. Register each with: ${cmd('pieces.mjs', 'add <name> --level micro|small|medium|large --file <src>')} (after ${cmd('pieces.mjs', 'find "<need>"')})`);
    }
    const changed = changedPieces(p.root, p.out);
    if (changed.length) {
      throw new Refusal(`step "${id}" cannot be marked done: piece(s) changed since their last recorded version: ${changed.map((piece) => `${piece.name} (v${piece.version})`).join(', ')}. Record each with: ${changed.map((piece) => cmd('pieces.mjs', `version ${piece.name}`)).join('; ')}`);
    }
  }
  if (id === 'compose' && state.gates) {
    const unused = unusedCatalogComponents(p);
    if (unused.length) refuseWith(p, 'step "compose"', unused, null);
  }
  let record = {};
  if (STEPS[id].artifacts) {
    const missing = missingArtifacts(p, STEPS[id].artifacts);
    if (missing.length) throw new Refusal(`step "${id}" cannot be marked done: missing ${missing.join(', ')}`);
  } else if (id === 'board') {
    record = closeBoard(p, flags);
  } else if (!flags.evidence) {
    throw new Refusal(`step "${id}" needs --evidence "<what proves it is done>"`);
  }
  if (state.gates) {
    if (partId === undefined) {
      const ctx = gateContext(p);
      const missing = PARTS[id].flatMap((part) => missingArtifacts(p, partArtifacts(p, part)));
      if (missing.length) throw new Refusal(`step "${id}" cannot be marked done: missing ${missing.join(', ')}`);
      const problems = PARTS[id].flatMap((part) => gateProblems(p, id, part, ctx));
      if (problems.length) refuseWith(p, `step "${id}"`, problems, PARTS[id].length === 1 ? id : `${id}.<part>`);
    }
    const checks = PARTS[id].at(-1).report;
    if (checks) {
      const { abs, shown } = artifactPath(p, `out:reports/${id}-report.md`);
      if (!existsSync(abs)) throw new Refusal(`step "${id}" cannot be marked done: ${shown} is missing; write it with: ${environment(p).run('flow.mjs', `report ${id}`)}`);
      const problems = reportProblems(readFileSync(abs, 'utf8'), checks).map((problem) => `${shown}: ${problem}`);
      if (problems.length) refuseWith(p, `step "${id}"`, problems, null);
    }
    if (id === 'polish') {
      const { abs, shown } = artifactPath(p, DESIGN_AUDIT_FILE);
      const command = designAuditCommand(environment(p));
      const audit = existsSync(abs) ? parseDesignAudit(readFileSync(abs, 'utf8')) : null;
      if (!audit) throw new Refusal(`step "polish" cannot be marked done: ${shown} is ${existsSync(abs) ? 'not a design audit report' : 'missing'}; run: ${command}`);
      if (audit.counts.high) throw new Refusal(`step "polish" cannot be marked done: ${shown} lists ${audit.counts.high} high finding${audit.counts.high === 1 ? '' : 's'}; fix them from the top of ai-frontend-output/reports/design-audit.md, then run: ${command}`);
    }
  }
  requireAnswer(p, partId === undefined ? `step "${id}"` : `part "${target}"`, target, step, partId, flags);
  recordAnswer(step, partId, flags);
  step.status = 'done';
  step.done_at = new Date().toISOString();
  if (partId !== undefined) step.parts_done = [...(step.parts_done ?? []), partId];
  Object.assign(step, record);
  if (flags.evidence) step.evidence = flags.evidence;
  const following = current(state);
  state.complete = !following;
  writeState(p, state);
  if (!following) return console.log(`Done: ${target}\n\n${closeSummary(p, step, target, partId, null)}\n\nRoute "${state.route}" complete.\nWhole route in one page: ${cmd('flow.mjs', 'report')}`);
  const info = instruction(p, state);
  console.log(`Done: ${target}\n\n${closeSummary(p, step, target, partId, info)}\n\n${renderInstruction(info)}`);
}

/** `scaffold [<step>[.<part>]]`: the micro-step it names, or the current one of the active route. */
function scaffold(p, target) {
  let stepId;
  let part;
  if (target === undefined) {
    const state = readState(p);
    if (!state) throw new Refusal(`no active flow; declare the route with: ${cmd('flow.mjs', 'start <route>')}`);
    const step = current(state);
    if (!step) throw new Refusal(`route "${state.route}" is already complete`);
    stepId = step.id;
    part = currentPart(step);
  } else {
    const [id, partId] = target.split(/\.(.*)/s);
    if (!Object.hasOwn(PARTS, id)) throw new UsageError(`unknown step "${id}" (steps: ${Object.keys(PARTS).join(', ')})`);
    stepId = id;
    if (partId !== undefined) {
      part = PARTS[id].find((candidate) => candidate.id === partId);
      if (!part) throw new UsageError(`unknown part "${partId}" of step "${id}" (parts: ${PARTS[id].map((candidate) => candidate.id).filter(Boolean).join(', ') || 'none'})`);
    } else {
      const open = readState(p)?.steps.find((step) => step.id === id && step.status !== 'done');
      part = open ? currentPart(open) : PARTS[id][0];
    }
  }
  const id = part.id ? `${stepId}.${part.id}` : stepId;
  const { template } = part.build(environment(p));
  if (!template) return console.log(`Scaffold: ${id} has no template, so there is nothing to write.`);
  const abs = template.file.startsWith(`${OUT_DIR}/`) ? join(p.out, template.file.slice(OUT_DIR.length + 1)) : join(p.root, template.file);
  const existing = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  const { text, added } = mergeTemplate(existing, template.lines);
  if (!added.length) return console.log(`Scaffold: ${template.file} already has everything the template of ${id} holds; nothing to write.`);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
  const fresh = existing === null || !existing.trim();
  console.log(`Scaffold: ${fresh ? 'wrote' : `added ${added.length} section${added.length === 1 ? '' : 's'} to`} ${template.file} from the template of ${id}${fresh ? '' : ` (${added.join(', ')}); what was there is unchanged`}.\nNow replace every <…> with the real content.`);
}

/** `report <step>`: the fixed checklist of a step closed with free evidence, written once and never overwritten. */
function report(p, step) {
  if (!step) return routeReport(p);
  if (!REPORT_STEPS.includes(step)) throw new UsageError(`step "${step}" has no report (reports exist for: ${REPORT_STEPS_TEXT})`);
  const { abs, shown } = artifactPath(p, `out:reports/${step}-report.md`);
  const existing = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  const merged = mergeReport(existing, step, PARTS[step].at(-1).report);
  const { abs: auditAbs } = artifactPath(p, DESIGN_AUDIT_FILE);
  const audit = existsSync(auditAbs) ? parseDesignAudit(readFileSync(auditAbs, 'utf8')) : null;
  const text = audit ? prefillAudit(merged.text, DESIGN_AUDIT_CHECK, audit) : merged.text;
  const added = merged.added;
  if (!added.length && text === (existing ?? '')) return console.log(`Report: ${shown} already has every check; nothing to write.`);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
  console.log(`Report: ${existing === null || !existing.trim() ? 'wrote' : added.length ? `added ${added.length} check${added.length === 1 ? '' : 's'} to` : 'updated the design audit line of'} ${shown}.\nFill every line: [x] and the result after "result:", or [n/a] and the reason after "reason:".`);
}

function reset(p) {
  if (existsSync(p.state)) rmSync(p.state);
  console.log('Flow reset: no active route.');
}

function main() {
  let flags;
  try {
    flags = parseArgs(process.argv.slice(2));
    projectRoot = paths(flags).root;
    if (flags.help) return console.log(usage());
    const [command = 'status', arg, ...extra] = flags._;
    if (extra.length) throw new UsageError(`unexpected argument "${extra[0]}"`);
    const p = paths(flags);
    if (command === 'status') return status(p, flags);
    if (command === 'start') return start(p, arg);
    if (command === 'list') return list();
    if (command === 'next') return next(p, flags);
    if (command === 'scaffold') return scaffold(p, arg);
    if (command === 'report') return report(p, arg);
    if (command === 'done') return done(p, arg, flags);
    if (command === 'reset') return reset(p);
    throw new UsageError(`unknown command "${command}"`);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`flow: ${error.message}\n\n${usage()}`);
      process.exitCode = 2;
    } else if (error instanceof Refusal) {
      console.error(`flow: ${error.message}`);
      process.exitCode = 1;
    } else throw error;
  }
}

main();
