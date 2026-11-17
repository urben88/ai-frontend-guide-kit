#!/usr/bin/env node
/**
 * kit-mcp — local, dependency-free MCP server that exposes the kit tools as typed tools.
 *
 * The CLI stays the base: every MCP tool runs the same `node <kit>/tools/<tool>.mjs ...` command
 * (argument array, never a shell string) and returns its text. A non-zero exit becomes an MCP
 * error (`isError: true`) with stdout and stderr. Inputs are checked against each tool's JSON
 * Schema before anything runs.
 *
 * Usage: node ai-frontend-guide-kit/tools/kit-mcp.mjs [--dir <project>]
 *   --dir <project>  the project the tools work on (default: AI_FRONTEND_PROJECT, then each tool's own default)
 *
 * Register it: see HELP.md ("Use the tools as MCP tools").
 */
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIT_DIR } from './kit-path.mjs';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'kit-mcp', version: '1.0.0' };
const TIMEOUT_MS = 120000;

const argv = process.argv.slice(2);
const dirIndex = argv.indexOf('--dir');
const PROJECT = dirIndex >= 0 && argv[dirIndex + 1]
  ? resolve(argv[dirIndex + 1])
  : process.env.AI_FRONTEND_PROJECT ? resolve(process.env.AI_FRONTEND_PROJECT) : null;

const str = (description, extra = {}) => ({ type: 'string', description, ...extra });
const bool = (description) => ({ type: 'boolean', description });
const int = (description, extra = {}) => ({ type: 'integer', description, ...extra });

/** Push `flag value` when the argument is given. */
const opt = (out, a, name, flag = `--${name}`) => {
  if (a[name] !== undefined) out.push(flag, String(a[name]));
};
/** Push `flag` when the argument is true. */
const on = (out, a, name, flag = `--${name}`) => {
  if (a[name] === true) out.push(flag);
};

const SVG_KINDS = ['blob', 'wave', 'grid', 'dots', 'pattern', 'rings', 'noise-lines', 'gradient-mesh', 'arrow', 'squiggle', 'badge', 'frame', 'underline', 'icon-base'];
const ROUTES = ['new', 'direction', 'ux', 'iterate', 'polish', 'redesign', 'visual-feedback', 'architecture'];
const AREAS = ['layout', 'type', 'color', 'motion', 'imagery', '3d', 'svg', 'interaction', 'content', 'direction', 'psychology'];
const STEP = { type: 'string', pattern: '^[a-z][a-z0-9-]*(\\.[a-z][a-z0-9-]*)?$' };

/** name, description, the CLI it runs, whether it works on a project (gets --dir), and how input becomes arguments. */
const DEFS = [
  {
    name: 'flow_status',
    description: 'Where the project is in the design flow: route, active step, what is installed and registered. Call first.',
    tool: 'flow.mjs', project: true,
    properties: {},
    args: () => ['status'],
  },
  {
    name: 'flow_start',
    description: 'Start a design route (new, direction, ux, iterate, polish, redesign, visual-feedback, architecture).',
    tool: 'flow.mjs', project: true,
    properties: { route: { type: 'string', enum: ROUTES, description: 'The route to start.' } },
    required: ['route'],
    args: (a) => ['start', a.route],
  },
  {
    name: 'flow_next',
    description: 'The whole instruction of the current micro-step as JSON: goal, exact commands, template, done criteria.',
    tool: 'flow.mjs', project: true,
    properties: {},
    args: () => ['next', '--json'],
  },
  {
    name: 'flow_done',
    description: 'Close a step or a part (for example "direction.questions"). The tool refuses a step with missing or empty content. The board step can close with declined and reason.',
    tool: 'flow.mjs', project: true,
    properties: {
      step: { ...STEP, description: 'Step or step.part, as printed by flow_next.' },
      evidence: str('What proves the step, only for steps that close with evidence.', { minLength: 1 }),
      declined: bool('Only for the board step: the user said no to Storybook. Needs reason.'),
      reason: str('The answer of the user when declined, in their words.', { minLength: 1 }),
    },
    required: ['step'],
    args: (a) => {
      const out = ['done', a.step];
      opt(out, a, 'evidence');
      on(out, a, 'declined');
      opt(out, a, 'reason');
      return out;
    },
  },
  {
    name: 'flow_scaffold',
    description: 'Write the template of a micro-step into its file. Without step: the current one.',
    tool: 'flow.mjs', project: true,
    properties: { step: { ...STEP, description: 'Step or step.part. Default: the current one.' } },
    args: (a) => (a.step === undefined ? ['scaffold'] : ['scaffold', a.step]),
  },
  {
    name: 'flow_report',
    description: 'Write the checklist report of iterate, redesign, polish or visual-feedback.',
    tool: 'flow.mjs', project: true,
    properties: { step: { ...STEP, description: 'iterate, redesign, polish or visual-feedback.' } },
    required: ['step'],
    args: (a) => ['report', a.step],
  },
  {
    name: 'find',
    description: 'Search the component catalog. Best match first, one line per entry; then call get with an id.',
    tool: 'find.mjs', project: false,
    properties: {
      query: str('What you need, for example "pricing card with toggle".', { minLength: 1 }),
      category: str('Catalog category, for example hero.'),
      stack: str('Framework, for example react.'),
      source: str('Source id or part of its name.'),
      type: { type: 'string', enum: ['component', 'block', 'design-system', 'icon'] },
      commercial: bool('Only entries usable in commercial work.'),
      free: bool('Only free entries.'),
      licensed: bool('Drop entries whose license is unknown.'),
      min_quality: { type: 'number', minimum: 0, maximum: 100, description: 'Minimum quality score.' },
      sort: { type: 'string', enum: ['relevance', 'quality', 'name'] },
      limit: int('Most entries to list.', { minimum: 1, maximum: 100 }),
      json: bool('Return data instead of text.'),
    },
    args: (a) => {
      const out = [];
      if (a.query !== undefined) out.push(a.query);
      for (const name of ['category', 'stack', 'source', 'type', 'sort', 'limit']) opt(out, a, name);
      opt(out, a, 'min_quality', '--min-quality');
      for (const name of ['commercial', 'free', 'licensed', 'json']) on(out, a, name);
      return out;
    },
  },
  {
    name: 'get',
    description: 'One catalog entry: license, dependencies, install command, limits.',
    tool: 'get.mjs', project: false,
    properties: { id: str('Entry id from find.', { minLength: 1 }), json: bool('Return data instead of text.') },
    required: ['id'],
    args: (a) => {
      const out = [a.id];
      on(out, a, 'json');
      return out;
    },
  },
  {
    name: 'technique_find',
    description: 'Technique cards that answer a need, best first (under 1 KB). Then call technique_get.',
    tool: 'technique.mjs', project: false,
    properties: {
      query: str('What you need, for example "sticky header".'),
      area: { type: 'string', enum: AREAS },
      direction: str('A style direction id; keeps the cards that fit it.'),
      limit: int('Most lines to print.', { minimum: 1, maximum: 50 }),
      json: bool('Return data instead of text.'),
    },
    args: (a) => {
      const out = ['find'];
      if (a.query !== undefined) out.push(a.query);
      for (const name of ['area', 'direction', 'limit']) opt(out, a, name);
      on(out, a, 'json');
      return out;
    },
  },
  {
    name: 'technique_get',
    description: 'One technique card: when to use, when not, steps, check, fallback.',
    tool: 'technique.mjs', project: false,
    properties: { id: str('Card id from technique_find.', { minLength: 1 }), json: bool('Return data instead of text.') },
    required: ['id'],
    args: (a) => {
      const out = ['get', a.id];
      on(out, a, 'json');
      return out;
    },
  },
  {
    name: 'recipe_suggest',
    description: 'The page recipe of each screen of UX-SPEC.md, with the reason.',
    tool: 'recipe.mjs', project: true,
    properties: { json: bool('Return data instead of text.') },
    args: (a) => {
      const out = ['suggest'];
      on(out, a, 'json');
      return out;
    },
  },
  {
    name: 'recipe_show',
    description: 'One page recipe: its sections in order with job, layout and catalog query; or one section in full.',
    tool: 'recipe.mjs', project: true,
    properties: {
      id: str('Recipe id.', { minLength: 1 }),
      section: str('One section id of the recipe.', { minLength: 1 }),
      json: bool('Return data instead of text.'),
    },
    required: ['id'],
    args: (a) => {
      const out = ['show', a.id];
      if (a.section !== undefined) out.push(a.section);
      on(out, a, 'json');
      return out;
    },
  },
  {
    name: 'tokens_check',
    description: 'Validate design-tokens.json and measure the contrast of every declared pair.',
    tool: 'tokens.mjs', project: true,
    properties: { json: bool('Return data instead of text.') },
    args: (a) => {
      const out = ['check'];
      on(out, a, 'json');
      return out;
    },
  },
  {
    name: 'audit_design',
    description: 'Design audit: a numbered list of fixes, most severe first. With url it also opens the page at 360, 768 and 1280 px.',
    tool: 'audit-design.mjs', project: true,
    properties: {
      paths: { type: 'array', items: str('File or folder, relative to the project.', { minLength: 1 }), description: 'Files or folders to scan. Default: the usual source folders.' },
      url: { type: 'array', items: str('Page URL (needs Playwright).', { minLength: 1 }), description: 'Pages to open and measure.' },
      report: bool('Write ai-frontend-output/reports/design-audit.md and .json (the polish gate reads it).'),
      strict: bool('Exit with an error when a high finding exists.'),
      json: bool('Return data instead of text.'),
    },
    args: (a) => {
      const out = [...(a.paths ?? [])];
      for (const url of a.url ?? []) out.push('--url', url);
      for (const name of ['report', 'strict', 'json']) on(out, a, name);
      return out;
    },
  },
  {
    name: 'svg_gen',
    description: 'Generate a deterministic SVG shape from the tokens and a seed. The same input gives the same bytes.',
    tool: 'svg.mjs', project: true,
    properties: {
      kind: { type: 'string', enum: SVG_KINDS, description: 'Shape kind.' },
      seed: int('Seed number.', { minimum: 0 }),
      size: str('Width x height, for example 640x360.', { pattern: '^\\d+x\\d+$' }),
      color: str('Token name for the main color.', { minLength: 1 }),
      color2: str('Token name for the second color.', { minLength: 1 }),
      title: str('Accessible title.', { minLength: 1 }),
      fixed: bool('Fixed size instead of fluid.'),
      out: str('Write to this file (relative to the project) instead of returning the SVG.', { minLength: 1 }),
    },
    required: ['kind'],
    args: (a) => {
      const out = ['gen', a.kind];
      for (const name of ['seed', 'size', 'color', 'color2', 'title', 'out']) opt(out, a, name);
      on(out, a, 'fixed');
      return out;
    },
  },
  {
    name: 'svg_check',
    description: 'Check SVG files: viewBox, palette inside the tokens, stroke consistency, size, accessibility, no scripts. Numbered fixes.',
    tool: 'svg.mjs', project: true,
    properties: {
      files: { type: 'array', minItems: 1, items: str('SVG file or folder, relative to the project.', { minLength: 1 }) },
      strict: bool('Also fail on medium findings.'),
      json: bool('Return data instead of text.'),
    },
    required: ['files'],
    args: (a) => {
      const out = ['check', ...a.files];
      for (const name of ['strict', 'json']) on(out, a, name);
      return out;
    },
  },
  {
    name: 'board_detect',
    description: 'Is Storybook installed here? Framework, story glob and the exact install command. Never installs: ask the user first.',
    tool: 'board.mjs', project: true,
    properties: { json: bool('Return data instead of text.') },
    args: (a) => {
      const out = ['detect'];
      on(out, a, 'json');
      return out;
    },
  },
  {
    name: 'board_plan',
    description: 'The pages and components of ui-map.json that the design board should show, and the boards still to create.',
    tool: 'board.mjs', project: true,
    properties: { json: bool('Return data instead of text.') },
    args: (a) => {
      const out = ['plan'];
      on(out, a, 'json');
      return out;
    },
  },
  {
    name: 'board_scaffold',
    description: 'Write a composition story for one layout version of a page (v1-sidebar). Adds to an existing board; never overwrites a version.',
    tool: 'board.mjs', project: true,
    properties: {
      page: str('Page name, for example login or Expedientes.', { minLength: 1, pattern: '^[A-Za-z0-9][A-Za-z0-9 _.-]*$' }),
      version: str('Layout version, kebab-case, for example v1-sidebar.', { pattern: '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' }),
    },
    required: ['page', 'version'],
    args: (a) => ['scaffold', a.page, '--version', a.version],
  },
  {
    name: 'board_list',
    description: 'The design boards of the project and their layout versions.',
    tool: 'board.mjs', project: true,
    properties: { json: bool('Return data instead of text.') },
    args: (a) => {
      const out = ['list'];
      on(out, a, 'json');
      return out;
    },
  },
  {
    name: 'board_check',
    description: 'Numbered findings when a board imports a store, router, API client or data hook, or calls fetch. An error while one exists.',
    tool: 'board.mjs', project: true,
    properties: { json: bool('Return data instead of text.') },
    args: (a) => {
      const out = ['check'];
      on(out, a, 'json');
      return out;
    },
  },
  {
    name: 'scene_check',
    description: 'Check the 3D scene spec (SCENE-SPEC.md): sections, values, material tokens, budget, fallback. Numbered fixes.',
    tool: 'scene.mjs', project: true,
    properties: {
      file: str('Spec file, relative to the project. Default: ai-frontend-output/SCENE-SPEC.md.', { minLength: 1 }),
      strict: bool('Also fail on medium findings.'),
      json: bool('Return data instead of text.'),
    },
    args: (a) => {
      const out = ['check'];
      if (a.file !== undefined) out.push(a.file);
      for (const name of ['strict', 'json']) on(out, a, name);
      return out;
    },
  },
];

const schemaOf = (def) => ({
  type: 'object',
  properties: def.properties,
  ...(def.required ? { required: def.required } : {}),
  additionalProperties: false,
});

export const TOOLS = DEFS.map((def) => ({ name: def.name, description: def.description, inputSchema: schemaOf(def) }));

const typeName = (value) => (Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value);

/** A small JSON Schema check (type, enum, required, pattern, bounds, items, additionalProperties). Returns a message or null. */
export function validate(schema, value, path = 'arguments') {
  const kind = typeName(value);
  if (schema.type === 'integer') {
    if (kind !== 'number' || !Number.isInteger(value)) return `${path} must be an integer`;
  } else if (schema.type === 'number') {
    if (kind !== 'number' || !Number.isFinite(value)) return `${path} must be a number`;
  } else if (schema.type && kind !== schema.type) return `${path} must be ${schema.type === 'array' ? 'an array' : `a ${schema.type}`}`;
  if (schema.enum && !schema.enum.includes(value)) return `${path} must be one of: ${schema.enum.join(', ')}`;
  if (kind === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) return `${path} must not be empty`;
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return `${path} has the wrong format (${schema.pattern})`;
  }
  if (kind === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) return `${path} must be at least ${schema.minimum}`;
    if (schema.maximum !== undefined && value > schema.maximum) return `${path} must be at most ${schema.maximum}`;
  }
  if (kind === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) return `${path} needs at least ${schema.minItems} item(s)`;
    for (let i = 0; i < value.length; i += 1) {
      const problem = schema.items ? validate(schema.items, value[i], `${path}[${i}]`) : null;
      if (problem) return problem;
    }
  }
  if (schema.type === 'object') {
    for (const name of schema.required ?? []) {
      if (value[name] === undefined) return `${path}.${name} is required`;
    }
    for (const [name, item] of Object.entries(value)) {
      const sub = schema.properties?.[name];
      if (!sub) {
        if (schema.additionalProperties === false) return `${path}.${name} is not an accepted argument (accepted: ${Object.keys(schema.properties).join(', ') || 'none'})`;
        continue;
      }
      const problem = validate(sub, item, `${path}.${name}`);
      if (problem) return problem;
    }
  }
  return null;
}

/** Strings that would be read as an option by the CLI never go in as values. */
function optionLike(a) {
  const strings = Object.values(a).flatMap((value) => (Array.isArray(value) ? value : [value])).filter((value) => typeof value === 'string');
  return strings.find((value) => value.startsWith('-') && !/^-?\d/.test(value));
}

export function runDef(def, a) {
  const script = join(KIT_DIR, 'tools', def.tool);
  const args = def.args(a);
  if (def.project && PROJECT) args.push('--dir', PROJECT);
  const run = spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    env: process.env,
  });
  if (run.error) return { isError: true, text: `Could not run ${def.tool}: ${run.error.message}` };
  const stdout = run.stdout ?? '';
  const stderr = run.stderr ?? '';
  if (run.status !== 0) {
    const text = [stdout.trimEnd(), stderr.trimEnd()].filter(Boolean).join('\n');
    return { isError: true, text: text || `${def.tool} exited with code ${run.status}` };
  }
  return { isError: false, text: stderr.trim() ? `${stdout}\n[stderr]\n${stderr}` : stdout };
}

function callTool(name, params) {
  const def = DEFS.find((candidate) => candidate.name === name);
  if (!def) return null;
  const a = params ?? {};
  const problem = validate(schemaOf(def), a) ?? (optionLike(a) ? `arguments: "${optionLike(a)}" starts with "-" and would be read as an option` : null);
  if (problem) return { isError: true, text: `Invalid arguments for ${name}: ${problem}` };
  return runDef(def, a);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
const replyError = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

export function handle(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message) || typeof message.method !== 'string') {
    replyError(message && typeof message === 'object' && 'id' in message ? message.id : null, -32600, 'Invalid Request');
    return;
  }
  const { id, method, params } = message;
  if (method.startsWith('notifications/')) return;
  if (method === 'initialize') {
    reply(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO });
    return;
  }
  if (method === 'ping') {
    reply(id, {});
    return;
  }
  if (method === 'tools/list') {
    reply(id, { tools: TOOLS });
    return;
  }
  if (method === 'tools/call') {
    let outcome;
    try {
      outcome = callTool(params?.name, params?.arguments);
    } catch (error) {
      outcome = { isError: true, text: String(error?.message ?? error) };
    }
    if (outcome === null) replyError(id, -32602, `Unknown tool: ${params?.name}`);
    else reply(id, { content: [{ type: 'text', text: outcome.text }], isError: outcome.isError });
    return;
  }
  if (id !== undefined) replyError(id, -32601, `Method not found: ${method}`);
}

function serve() {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: `Parse error: ${error?.message}` } });
        continue;
      }
      try {
        handle(message);
      } catch (error) {
        replyError(message?.id ?? null, -32603, `Internal error: ${error?.message ?? error}`);
      }
    }
  });
  process.stdin.resume();
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) serve();
