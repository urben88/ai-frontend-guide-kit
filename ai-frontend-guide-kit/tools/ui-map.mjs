#!/usr/bin/env node
/**
 * ui-map — always-on map of the project's frontend, so an agent knows what to change and what already exists.
 *
 * Scans the project (no dependencies), builds the component list, the import graph (relative paths,
 * tsconfig/jsconfig aliases, index barrels), routes and the visual role of each component, and writes
 * under ai-frontend-output/ only: ui-map.json, UI-MAP.md and an append-only ui-history.jsonl.
 * It never edits, moves or renames project source.
 *
 * Usage:
 *   node tools/ui-map.mjs build [--dir <project-root>] [--json]
 *   node tools/ui-map.mjs impact <role|component> [--dir <project-root>] [--json]
 *   node tools/ui-map.mjs have <name> [--dir <project-root>] [--json]
 *   node tools/ui-map.mjs types [--dir <project-root>] [--json]
 *   node tools/ui-map.mjs docs [--profile sprint|standard|long-term] [--dir <project-root>] [--json]
 *   node tools/ui-map.mjs check [--profile sprint|standard|long-term] [--dir <project-root>] [--json]
 *
 * Project root: --dir, then AI_FRONTEND_PROJECT, then the folder that holds the kit.
 * Output folder: AI_FRONTEND_OUTPUT, else <project-root>/ai-frontend-output.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEntries, search } from './find.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_DIR = resolve(__dirname, '..');

const IGNORED = /(^|\/)(node_modules|\.git|\.next|\.nuxt|\.svelte-kit|dist|build|coverage|\.cache|\.venv|__pycache__|\.output|out|ai-frontend-guide-kit|ai-frontend-output|__tests__|tests?|e2e|stories|\.storybook)(\/|$)/;
const SKIPPED_FILE = /(\.(test|spec|stories)\.[a-z]+$|\.d\.ts$)/;
const CODE_EXT = ['.tsx', '.ts', '.jsx', '.js', '.vue', '.svelte', '.astro'];
const FILE_COMPONENT_EXT = ['.vue', '.svelte', '.astro'];
const ROLES = ['layout', 'loading', 'empty', 'error', 'feedback', 'overlay', 'navigation', 'form'];
const MAX_ROUTES = 200;

// ---------------------------------------------------------------- context documents and profiles (S6, S7)

/** The documents each profile needs. `structure` names where the guide describes how to write it. */
const DOCUMENTS = [
  { path: 'README.md', profiles: ['sprint', 'standard', 'long-term'], purpose: 'what the project is, how to run it and where things live', structure: 'guides/13-CONTEXT-DOCS.md' },
  { path: 'DESIGN.md', profiles: ['sprint', 'standard', 'long-term'], purpose: 'tokens, type scale, spacing, component rules and the anti-generic list the UI follows', structure: 'guides/13-CONTEXT-DOCS.md' },
  { path: 'PRODUCT.md', profiles: ['standard', 'long-term'], purpose: 'users, problem, scope and success measures the UI answers to', structure: 'guides/13-CONTEXT-DOCS.md' },
  { path: 'UX-SPEC.md', profiles: ['standard', 'long-term'], purpose: 'screens, flows, states (empty/loading/error) and navigation', structure: 'guides/13-CONTEXT-DOCS.md' },
  { path: 'ARCHITECTURE.md', profiles: ['standard', 'long-term'], purpose: 'folder map, module boundaries, data flow and where a new component belongs', structure: 'guides/13-CONTEXT-DOCS.md' },
  { path: 'ai-frontend-output/UI-MAP.md', profiles: ['standard', 'long-term'], generated: true, purpose: 'the generated frontend map: components, users, routes, roles, strays', structure: 'guides/13-CONTEXT-DOCS.md' },
  { path: 'docs/DECISIONS.md', profiles: ['long-term'], purpose: 'one entry per durable decision, with the alternative it replaced', structure: 'guides/13-CONTEXT-DOCS.md' },
  { path: 'docs/CONTRIBUTING.md', profiles: ['long-term'], purpose: 'how to add a component, a screen or a dependency without breaking the structure', structure: 'guides/13-CONTEXT-DOCS.md' },
  { path: 'docs/ACCESSIBILITY.md', profiles: ['long-term'], purpose: 'the accessibility bar of the project and how it is checked', structure: 'guides/13-CONTEXT-DOCS.md' },
  { path: 'docs/PERFORMANCE.md', profiles: ['long-term'], purpose: 'the performance budget and how it is measured', structure: 'guides/13-CONTEXT-DOCS.md' },
];

const PROFILES = {
  sprint: {
    name: 'sprint',
    what: 'a short-lived or fast project: the smallest set of documents that still guides an agent, never asked at install time',
  },
  standard: {
    name: 'standard',
    what: 'the default: enough context to change a feature without re-reading the repository',
  },
  'long-term': {
    name: 'long-term',
    what: 'a large, long-lived or critical project: the standard set plus the history, the contribution rules and the quality bars',
  },
};
const PROFILE_NAMES = Object.keys(PROFILES);

function documentsFor(profile) {
  const name = profile ?? 'standard';
  return DOCUMENTS.filter((doc) => doc.profiles.includes(name));
}

// ---------------------------------------------------------------- arguments and paths

/** Strict parsing: unknown options and missing values are errors (flags.error), never silently ignored. */
function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length && !flags.error; i += 1) {
    const token = argv[i];
    const eq = token.startsWith('--') ? token.indexOf('=') : -1;
    const name = eq === -1 ? token : token.slice(0, eq);
    if (name === '--dir') {
      const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
      if (!value || (eq === -1 && value.startsWith('--'))) flags.error = 'option --dir needs a value (--dir <path> or --dir=<path>)';
      else {
        flags.dir = value;
        if (eq === -1) i += 1;
      }
    } else if (name === '--profile') {
      const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
      if (!value || (eq === -1 && value.startsWith('--'))) flags.error = 'option --profile needs a value (--profile sprint|standard|long-term)';
      else {
        flags.profile = value;
        if (eq === -1) i += 1;
      }
    } else if (eq === -1 && token === '--json') flags.json = true;
    else if (eq === -1 && (token === '--help' || token === '-h')) flags.help = true;
    else if (token.startsWith('-') && token.length > 1) flags.error = `unknown option "${token}"`;
    else flags._.push(token);
  }
  return flags;
}

function resolveProjectRoot(flags) {
  if (flags.dir) return resolve(flags.dir);
  if (process.env.AI_FRONTEND_PROJECT) return resolve(process.env.AI_FRONTEND_PROJECT);
  return dirname(KIT_DIR);
}

function resolveOutputDir(root) {
  return process.env.AI_FRONTEND_OUTPUT ? resolve(process.env.AI_FRONTEND_OUTPUT) : join(root, 'ai-frontend-output');
}

const USAGE = `ui-map — always-on map of the project's frontend

Usage:
  node tools/ui-map.mjs build                    scan the project and write ui-map.json, UI-MAP.md and ui-history.jsonl
  node tools/ui-map.mjs impact <role|component>  owner, users, routes, strays and unresolved imports
  node tools/ui-map.mjs have <name>              does it exist? type aliases, close matches, catalog candidates, decision
  node tools/ui-map.mjs types                    coverage of catalog/component-types.json, unclassified components, possible duplicates
  node tools/ui-map.mjs docs                     documents the profile needs, and which are missing
  node tools/ui-map.mjs check                    findings from the map plus the missing documents; exit 1 when one blocks

Options:
  --dir <project-root>   project to scan (default: AI_FRONTEND_PROJECT, then the folder that holds the kit)
  --profile <name>       docs and check: ${PROFILE_NAMES.join('|')} (default: standard)
  --json                 machine-readable output (build, impact, have, types, docs, check)
  --help                 this text

Roles: ${ROLES.join(', ')}.
Output goes to ai-frontend-output/ (or AI_FRONTEND_OUTPUT). Project source is never modified.
impact, have, types, docs and check rebuild the map first when it is missing or older than any scanned file.
check lists every finding at every profile; the profile only decides which kinds block (sprint: none,
standard: unresolved and missing documents, long-term: all of them).`;

// ---------------------------------------------------------------- scanning

function walk(root) {
  const files = [];
  const queue = [''];
  while (queue.length > 0) {
    const rel = queue.shift();
    let entries;
    try {
      entries = readdirSync(join(root, rel), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (IGNORED.test(entryRel)) continue;
      if (entry.isDirectory()) queue.push(entryRel);
      else files.push(entryRel);
    }
  }
  return files.sort();
}

const extOf = (file) => {
  const dot = file.lastIndexOf('.');
  return dot === -1 ? '' : file.slice(dot);
};

function sourceFiles(root) {
  return walk(root).filter((file) => CODE_EXT.includes(extOf(file)) && !SKIPPED_FILE.test(file));
}

/** Replaces comments with blanks of the same line count so line numbers stay valid. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

function liner(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') starts.push(i + 1);
  return (index) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (starts[mid] <= index) low = mid;
      else high = mid - 1;
    }
    return low + 1;
  };
}

function readJsonLoose(path) {
  try {
    const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
    const noComments = raw.replace(/("(?:\\.|[^"\\])*")|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (match, str) => str ?? '');
    return JSON.parse(noComments.replace(/,(\s*[}\]])/g, '$1'));
  } catch {
    return null;
  }
}

function loadAliases(root) {
  for (const name of ['tsconfig.json', 'jsconfig.json']) {
    const config = readJsonLoose(join(root, name));
    if (!config?.compilerOptions) continue;
    const { baseUrl, paths } = config.compilerOptions;
    const base = posix.normalize((baseUrl ?? '.').replace(/\\/g, '/')).replace(/^\.$/, '');
    const aliases = Object.entries(paths ?? {}).map(([pattern, targets]) => ({
      prefix: pattern.replace(/\*$/, ''),
      wildcard: pattern.endsWith('*'),
      targets: (Array.isArray(targets) ? targets : [targets]).map((target) => posix.normalize(posix.join(base, String(target).replace(/\*$/, '')))),
    }));
    return { baseUrl: baseUrl === undefined ? null : base, aliases };
  }
  return { baseUrl: null, aliases: [] };
}

function pascalFromFile(file) {
  const base = file.slice(file.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '');
  if (/^[+_]/.test(base) || base === 'index') return null;
  const name = /^[A-Z]/.test(base) ? base : base.split(/[-_.\s]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join('');
  return /^[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*$|^[A-Z][a-z0-9]+$/.test(name) ? name : null;
}

const isPascal = (name) => /^[A-Z][A-Za-z0-9]*[a-z0-9][A-Za-z0-9]*$/.test(name) && /[a-z]/.test(name);

function detectComponents(file, text, clean, lineOf) {
  const ext = extOf(file);
  const found = [];
  let defaultName = null;
  if (FILE_COMPONENT_EXT.includes(ext)) {
    const name = pascalFromFile(file);
    if (name) found.push({ name, line: 1, kind: 'file' });
    return { components: found, defaultName: name };
  }
  const jsxLike = ext === '.tsx' || ext === '.jsx' || (ext === '.js' && /<\/?[A-Za-z][^>]*>/.test(clean));
  if (!jsxLike) return { components: found, defaultName };
  const seen = new Set();
  const add = (name, index) => {
    if (!isPascal(name) || seen.has(name)) return;
    seen.add(name);
    found.push({ name, line: lineOf(index), kind: 'export' });
  };
  for (const m of clean.matchAll(/export\s+(default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) {
    add(m[2], m.index);
    if (m[1] && isPascal(m[2])) defaultName = m[2];
  }
  for (const m of clean.matchAll(/export\s*\{([^}]*)\}(?!\s*from)/g)) {
    for (const part of m[1].split(',')) {
      const [local, exported] = part.trim().split(/\s+as\s+/);
      if (!local || local.startsWith('type ')) continue;
      const name = exported ?? local;
      add(name, m.index);
      if (name === 'default' && isPascal(local)) {
        add(local, m.index);
        defaultName = local;
      }
    }
  }
  for (const m of clean.matchAll(/export\s+default\s+(?:memo\(|forwardRef\(|React\.memo\()?\s*([A-Z][\w$]*)\s*[),;\n]/g)) {
    add(m[1], m.index);
    defaultName = defaultName ?? m[1];
  }
  return { components: found, defaultName };
}

function parseClause(clause) {
  const names = [];
  let rest = clause.trim();
  const braces = rest.match(/\{([^}]*)\}/);
  if (braces) {
    for (const part of braces[1].split(',')) {
      const piece = part.trim();
      if (!piece || piece.startsWith('type ')) continue;
      names.push(piece.split(/\s+as\s+/)[0].trim());
    }
    rest = rest.replace(braces[0], '');
  }
  if (/\*\s*as\s+\w+/.test(rest)) names.push('*');
  else {
    const def = rest.replace(/,/g, '').trim();
    if (def) names.push('default');
  }
  return names;
}

function parseModule(text) {
  const clean = stripComments(text);
  const lineOf = liner(clean);
  const imports = [];
  const reexports = [];
  const dynamics = [];
  for (const m of clean.matchAll(/(?<![\w$.])import\s+(type\s+)?([^'";()]*?)\s*from\s*['"]([^'"]+)['"]/g)) {
    if (m[1]) continue;
    imports.push({ specifier: m[3], names: parseClause(m[2]), line: lineOf(m.index) });
  }
  for (const m of clean.matchAll(/export\s+\*\s*(?:as\s+(\w+)\s*)?from\s*['"]([^'"]+)['"]/g)) {
    reexports.push({ specifier: m[2], all: !m[1], line: lineOf(m.index), pairs: m[1] ? [{ imported: '*', exported: m[1] }] : [] });
  }
  for (const m of clean.matchAll(/export\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    if (m[1]) continue;
    const pairs = m[2].split(',').map((part) => part.trim()).filter((part) => part && !part.startsWith('type ')).map((part) => {
      const [imported, exported] = part.split(/\s+as\s+/);
      return { imported, exported: exported ?? imported };
    });
    reexports.push({ specifier: m[3], all: false, line: lineOf(m.index), pairs });
  }
  for (const m of clean.matchAll(/(?<![\w$.])import\(\s*(?:(['"`])([^'"`$]+)\1\s*\)|([^)]*)\))/g)) {
    dynamics.push({ specifier: m[2] ?? null, expression: (m[3] ?? '').trim(), line: lineOf(m.index) });
  }
  return { clean, lineOf, imports, reexports, dynamics };
}

function makeResolver(fileSet, aliasConfig) {
  const exact = (path) => {
    const candidates = [];
    const ext = extOf(path);
    if (CODE_EXT.includes(ext)) candidates.push(path);
    const stripped = /\.(m?js|jsx)$/.test(path) ? path.replace(/\.(m?js|jsx)$/, '') : null;
    for (const base of [path, stripped].filter(Boolean)) {
      for (const e of CODE_EXT) candidates.push(`${base}${e}`);
      for (const e of CODE_EXT) candidates.push(`${base}/index${e}`);
    }
    return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
  };
  return (from, specifier) => {
    if (specifier.startsWith('.')) {
      const hit = exact(posix.normalize(posix.join(posix.dirname(from), specifier)));
      return hit ? { target: hit } : { reason: 'not found' };
    }
    for (const alias of aliasConfig.aliases) {
      const matched = alias.wildcard ? specifier.startsWith(alias.prefix) : specifier === alias.prefix;
      if (!matched) continue;
      const rest = alias.wildcard ? specifier.slice(alias.prefix.length) : '';
      for (const target of alias.targets) {
        const hit = exact(posix.normalize(posix.join(target, rest)));
        if (hit) return { target: hit };
      }
      return { reason: 'alias target not found' };
    }
    if (aliasConfig.baseUrl !== null) {
      const hit = exact(posix.normalize(posix.join(aliasConfig.baseUrl, specifier)));
      if (hit) return { target: hit };
    }
    if (/^(@\/|~\/|#|\$lib\/)/.test(specifier)) return { reason: 'alias not configured' };
    return { external: true };
  };
}

// ---------------------------------------------------------------- routes (same detection as context.mjs)

function routeEntries(files) {
  const routes = [];
  for (const file of files) {
    const inApp = file.match(/(?:^|\/)(?:src\/)?app\/(.+)\/page\.(?:tsx|ts|jsx|js)$/) ?? file.match(/(?:^|\/)(?:src\/)?app\/page\.(?:tsx|ts|jsx|js)$/);
    if (inApp) {
      const segment = (inApp[1] ?? '').replace(/\(\w+\)\/?/g, '').replace(/\/?page$/, '');
      routes.push({ route: `/${segment}`.replace(/\/+$/, '') || '/', file, kind: 'app' });
      continue;
    }
    const inPages = file.match(/(?:^|\/)(?:src\/)?pages\/(.+)\.(?:tsx|ts|jsx|js)$/);
    if (inPages && !/^api\//.test(inPages[1]) && !/^_/.test(inPages[1])) {
      const path = inPages[1].replace(/\/index$/, '').replace(/^index$/, '');
      routes.push({ route: `/${path}`.replace(/\/+$/, '') || '/', file, kind: 'pages' });
      continue;
    }
    const inRoutes = file.match(/(?:^|\/)(?:src\/)?routes\/(.+)\.(?:tsx|ts|jsx|js|vue|svelte)$/);
    if (inRoutes) routes.push({ route: `/${inRoutes[1]}`.replace(/\/\+page$/, '').replace(/\/+$/, '') || '/', file, kind: 'routes' });
  }
  const unique = new Map();
  for (const entry of routes) if (!unique.has(entry.route)) unique.set(entry.route, entry);
  return [...unique.values()].sort((a, b) => a.route.localeCompare(b.route)).slice(0, MAX_ROUTES);
}

/** Files that wrap a route without being imported by it: Next layouts and Pages-router _app. */
function wrappers(entry, files) {
  const dir = posix.dirname(entry.file);
  if (entry.kind === 'app') {
    return files.filter((file) => /(^|\/)(layout|template)\.(tsx|ts|jsx|js)$/.test(file) && (dir === posix.dirname(file) || dir.startsWith(`${posix.dirname(file)}/`)) && /(^|\/)app\//.test(`${file}`));
  }
  if (entry.kind === 'pages') {
    const pagesRoot = entry.file.slice(0, entry.file.indexOf('pages/') + 'pages/'.length);
    return files.filter((file) => file.startsWith(pagesRoot) && /\/_(app|document)\.(tsx|ts|jsx|js)$/.test(file));
  }
  return [];
}

// ---------------------------------------------------------------- roles and strays

const ROLE_WORDS = {
  layout: ['layout', 'shell', 'frame', 'container', 'wrapper', 'template'],
  loading: ['skeleton', 'spinner', 'loader', 'loading', 'shimmer'],
  empty: ['empty', 'noresults', 'nodata', 'blank'],
  error: ['error', 'notfound', 'errorboundary'],
  feedback: ['toast', 'snackbar', 'alert', 'banner', 'notification', 'callout'],
  overlay: ['modal', 'dialog', 'drawer', 'sheet', 'popover', 'tooltip', 'lightbox', 'overlay'],
  navigation: ['nav', 'navbar', 'navigation', 'sidebar', 'menu', 'tabs', 'tab', 'breadcrumb', 'breadcrumbs', 'pagination', 'stepper'],
  form: ['form', 'input', 'field', 'select', 'checkbox', 'radio', 'textarea', 'switch', 'datepicker', 'combobox'],
};
const ROLE_DIRS = {
  layout: ['layout', 'layouts'],
  loading: ['skeleton', 'skeletons', 'loader', 'loaders', 'loading'],
  empty: ['empty', 'empty-states'],
  error: ['error', 'errors'],
  feedback: ['feedback', 'toasts', 'notifications', 'alerts'],
  overlay: ['modal', 'modals', 'dialogs', 'overlays', 'drawers'],
  navigation: ['nav', 'navigation', 'menus'],
  form: ['form', 'forms', 'inputs', 'fields'],
};

function splitWords(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

const singular = (word) => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word);

function rolesFor(name, file) {
  const words = splitWords(name);
  const joined = words.join('');
  const roles = new Set();
  for (const role of ROLES) {
    const hit = ROLE_WORDS[role].some((word) => words.includes(word) || words.map(singular).includes(word) || joined === word);
    if (hit) roles.add(role);
  }
  if (roles.size === 0) {
    const dirs = file.split('/').slice(0, -1).map((part) => part.toLowerCase());
    for (const role of ROLES) if (ROLE_DIRS[role].some((dir) => dirs.includes(dir))) roles.add(role);
  }
  return ROLES.filter((role) => roles.has(role));
}

const STRAY_SIGNALS = [
  { role: 'loading', signal: 'animate-pulse', pattern: /animate-pulse/ },
  { role: 'loading', signal: 'animate-spin', pattern: /animate-spin/ },
  { role: 'loading', signal: 'isLoading ?', pattern: /\bisLoading\s*\?(?![.?])/ },
  { role: 'loading', signal: 'isLoading &&', pattern: /\bisLoading\s*&&/ },
  { role: 'loading', signal: 'Loading...', pattern: /Loading\.\.\./ },
  { role: 'loading', signal: 'Cargando', pattern: /Cargando/ },
  { role: 'empty', signal: '.length === 0 ?', pattern: /\.length\s*===\s*0\s*\?(?![.?])/ },
  { role: 'empty', signal: 'No results', pattern: /No results/ },
  { role: 'error', signal: 'error &&', pattern: /\berror\s*&&/ },
  { role: 'error', signal: 'error ?', pattern: /\berror\s*\?(?![.?])/ },
];

function findStrays(file, text, ownedRoles) {
  const strays = [];
  const lines = text.split('\n');
  lines.forEach((content, index) => {
    for (const { role, signal, pattern } of STRAY_SIGNALS) {
      if (ownedRoles.has(role) || !pattern.test(content)) continue;
      strays.push({ role, file, line: index + 1, signal });
    }
  });
  return strays;
}

// ---------------------------------------------------------------- build

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function scanProject(root) {
  const files = sourceFiles(root);
  const fileSet = new Set(files);
  const resolver = makeResolver(fileSet, loadAliases(root));
  const modules = new Map();
  const components = [];
  const defaults = new Map();
  const unresolved = [];
  const edges = []; // { from, to, name } usage edges, resolved through barrels afterwards
  const graph = new Map(); // file -> Set of files it imports or re-exports

  for (const file of files) {
    let text;
    try {
      text = readFileSync(join(root, file), 'utf8');
    } catch {
      continue;
    }
    const mod = parseModule(text);
    const { components: found, defaultName } = detectComponents(file, text, mod.clean, mod.lineOf);
    mod.text = text;
    mod.components = found;
    modules.set(file, mod);
    defaults.set(file, defaultName);
    graph.set(file, new Set());
    for (const c of found) components.push({ name: c.name, file, line: c.line, kind: c.kind });
  }

  const link = (from, specifier, line) => {
    const result = resolver(from, specifier);
    if (result.target) {
      graph.get(from).add(result.target);
      return result.target;
    }
    if (!result.external && !/\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|json|md|mdx|woff2?|ttf|otf|mp4|webm|txt|html)$/i.test(specifier)) {
      unresolved.push({ file: from, line, specifier, reason: result.reason });
    }
    return null;
  };

  for (const [file, mod] of modules) {
    for (const imp of mod.imports) {
      const target = link(file, imp.specifier, imp.line);
      if (target) for (const name of imp.names) edges.push({ from: file, to: target, name });
    }
    mod.resolvedReexports = [];
    for (const re of mod.reexports) {
      const target = link(file, re.specifier, re.line);
      if (target) mod.resolvedReexports.push({ target, all: re.all, pairs: re.pairs });
    }
    for (const dyn of mod.dynamics) {
      if (dyn.specifier === null) {
        unresolved.push({ file, line: dyn.line, specifier: dyn.expression || 'import()', reason: 'dynamic import (expression)' });
        continue;
      }
      const result = resolver(file, dyn.specifier);
      if (result.target) {
        graph.get(file).add(result.target);
        edges.push({ from: file, to: result.target, name: 'default' });
        edges.push({ from: file, to: result.target, name: '*' });
      }
      unresolved.push({ file, line: dyn.line, specifier: dyn.specifier, reason: 'dynamic import' });
    }
  }

  const exportsComponent = (file, name) => {
    const mod = modules.get(file);
    if (!mod) return false;
    if (name === 'default') return defaults.get(file) !== null && defaults.get(file) !== undefined;
    return mod.components.some((c) => c.name === name);
  };
  const origin = (file, name, seen = new Set()) => {
    const key = `${file}#${name}`;
    if (seen.has(key)) return null;
    seen.add(key);
    const mod = modules.get(file);
    if (!mod) return null;
    if (exportsComponent(file, name)) return file;
    for (const re of mod.resolvedReexports) {
      graph.get(file).add(re.target);
      for (const pair of re.pairs) {
        if (pair.exported === name) {
          const hit = origin(re.target, pair.imported, seen);
          if (hit) return hit;
        }
      }
      if (re.all) {
        const hit = origin(re.target, name, seen);
        if (hit) return hit;
      }
    }
    return null;
  };

  // Usage: who imports each component, following barrels to the file that really defines it.
  const usage = new Map();
  const addUser = (key, user) => {
    if (!usage.has(key)) usage.set(key, new Set());
    usage.get(key).add(user);
  };
  for (const edge of edges) {
    if (edge.name === '*') continue;
    const originFile = origin(edge.to, edge.name);
    if (!originFile) continue;
    const compName = edge.name === 'default' ? defaults.get(originFile) : edge.name;
    if (compName) addUser(`${originFile}#${compName}`, edge.from);
  }
  // A namespace or dynamic import reaches every component its target defines or re-exports.
  for (const edge of edges) {
    if (edge.name !== '*') continue;
    for (const c of components) {
      if (c.file !== edge.to && origin(edge.to, c.name) === c.file) addUser(`${c.file}#${c.name}`, edge.from);
    }
  }

  // Routes reach components through the import graph (plus layouts and _app wrappers).
  const routes = routeEntries(files);
  const routeReach = new Map();
  for (const entry of routes) {
    const reached = new Set();
    const queue = [entry.file, ...wrappers(entry, files)];
    while (queue.length > 0) {
      const file = queue.shift();
      if (reached.has(file)) continue;
      reached.add(file);
      for (const next of graph.get(file) ?? []) queue.push(next);
    }
    routeReach.set(entry.route, reached);
  }

  const owned = new Map(); // file -> Set of roles the file owns
  const enriched = components.map((c) => {
    const roles = rolesFor(c.name, c.file);
    if (!owned.has(c.file)) owned.set(c.file, new Set());
    for (const role of roles) owned.get(c.file).add(role);
    const users = [...(usage.get(`${c.file}#${c.name}`) ?? [])].filter((user) => user !== c.file).sort(byText);
    const reachedBy = routes.filter((r) => routeReach.get(r.route).has(c.file)).map((r) => r.route);
    return { name: c.name, file: c.file, line: c.line, kind: c.kind, roles, usage: users.length, users, routes: reachedBy };
  }).sort((a, b) => byText(a.file, b.file) || byText(a.name, b.name));

  const strays = [];
  for (const [file, mod] of modules) strays.push(...findStrays(file, mod.text, owned.get(file) ?? new Set()));
  strays.sort((a, b) => byText(a.role, b.role) || byText(a.file, b.file) || a.line - b.line || byText(a.signal, b.signal));

  const roleMap = {};
  for (const role of ROLES) {
    roleMap[role] = {
      owners: enriched.filter((c) => c.roles.includes(role)).map((c) => ({ name: c.name, file: c.file, line: c.line })),
      strays: strays.filter((s) => s.role === role).length,
    };
  }

  const imports = {};
  for (const [file, set] of [...graph].sort((a, b) => byText(a[0], b[0]))) if (set.size > 0) imports[file] = [...set].sort(byText);
  unresolved.sort((a, b) => byText(a.file, b.file) || a.line - b.line || byText(a.specifier, b.specifier));

  return {
    version: 1,
    counts: { files: files.length, components: enriched.length, routes: routes.length, strays: strays.length, unresolved: unresolved.length },
    components: enriched,
    roles: roleMap,
    routes: routes.map(({ route, file }) => ({ route, file })),
    imports,
    strays,
    unresolved,
  };
}

function renderMarkdown(map) {
  const lines = [];
  lines.push('# UI map');
  lines.push('');
  lines.push('Generated by `ai-frontend-guide-kit/tools/ui-map.mjs build`; read this instead of exploring the repo. Before changing UI run `node ai-frontend-guide-kit/tools/ui-map.mjs impact <role|component>`, before creating run `... have <name>`.');
  lines.push('');
  const c = map.counts;
  lines.push(`- ${c.components} components in ${c.files} source files, ${c.routes} routes, ${c.strays} strays, ${c.unresolved} unresolved imports.`);
  lines.push('');
  lines.push('## Visual roles');
  lines.push('');
  for (const role of ROLES) {
    const { owners, strays } = map.roles[role];
    const who = owners.length > 0 ? owners.slice(0, 5).map((o) => `${o.name} (\`${o.file}\`)`).join(', ') + (owners.length > 5 ? `, +${owners.length - 5} more` : '') : 'no owner found';
    lines.push(`- **${role}:** ${who}${strays > 0 ? ` — ${strays} stray(s)` : ''}`);
  }
  const strayList = map.strays.slice(0, 15);
  if (strayList.length > 0) {
    lines.push('');
    lines.push('## Strays (ad hoc role implementations outside their owner)');
    lines.push('');
    for (const s of strayList) lines.push(`- ${s.role}: \`${s.file}:${s.line}\` ${s.signal}`);
    if (map.strays.length > strayList.length) lines.push(`- ... +${map.strays.length - strayList.length} more in ui-map.json`);
  }
  const MAX_LISTED = 300;
  lines.push('');
  lines.push(`## Components (${map.components.length})`);
  lines.push('');
  for (const x of map.components.slice(0, MAX_LISTED)) {
    lines.push(`- ${x.name} — \`${x.file}\` — used by ${x.usage} — ${x.roles.length > 0 ? x.roles.join('/') : 'no role'}`);
  }
  if (map.components.length > MAX_LISTED) lines.push(`- ... ${map.components.length - MAX_LISTED} more components omitted; see ui-map.json`);
  const top = [...map.components].filter((x) => x.usage > 0).sort((a, b) => b.usage - a.usage || byText(a.name, b.name)).slice(0, 10);
  if (top.length > 0) {
    lines.push('');
    lines.push('## Most used components');
    lines.push('');
    for (const x of top) lines.push(`- ${x.name} — used by ${x.usage} (\`${x.file}\`)`);
  }
  if (map.routes.length > 0) {
    lines.push('');
    lines.push(`## Routes (${map.routes.length})`);
    lines.push('');
    for (const r of map.routes.slice(0, 20)) lines.push(`- \`${r.route}\` — \`${r.file}\``);
    if (map.routes.length > 20) lines.push(`- ... +${map.routes.length - 20} more in ui-map.json`);
  }
  if (map.unresolved.length > 0) {
    lines.push('');
    lines.push('## Unresolved (never assume these are fine)');
    lines.push('');
    for (const u of map.unresolved.slice(0, 15)) lines.push(`- \`${u.file}:${u.line}\` \`${u.specifier}\` — ${u.reason}`);
    if (map.unresolved.length > 15) lines.push(`- ... +${map.unresolved.length - 15} more in ui-map.json`);
  }
  lines.push('');
  return lines.join('\n');
}

const keyOf = (c) => `${c.file}#${c.name}`;

function previousKeys(outDir) {
  const mapPath = join(outDir, 'ui-map.json');
  try {
    const previous = JSON.parse(readFileSync(mapPath, 'utf8'));
    if (Array.isArray(previous.components)) return new Set(previous.components.map(keyOf));
  } catch {
    // fall through to the history
  }
  const historyPath = join(outDir, 'ui-history.jsonl');
  if (!existsSync(historyPath)) return null;
  const keys = new Set();
  try {
    for (const line of readFileSync(historyPath, 'utf8').split('\n').filter(Boolean)) {
      const entry = JSON.parse(line);
      if (entry.initial) for (const name of entry.names ?? []) keys.add(name);
      for (const name of entry.added ?? []) keys.add(name);
      for (const name of entry.removed ?? []) keys.delete(name);
    }
  } catch {
    return keys;
  }
  return keys;
}

export function build(root) {
  const outDir = resolveOutputDir(root);
  const map = scanProject(root);
  const before = previousKeys(outDir);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'ui-map.json'), `${JSON.stringify(map, null, 2)}\n`, 'utf8');
  writeFileSync(join(outDir, 'UI-MAP.md'), renderMarkdown(map), 'utf8');
  const now = new Set(map.components.map(keyOf));
  let entry = null;
  if (before === null) {
    entry = { ts: new Date().toISOString(), initial: true, count: now.size, names: [...now].sort(byText) };
  } else {
    const added = [...now].filter((key) => !before.has(key)).sort(byText);
    const removed = [...before].filter((key) => !now.has(key)).sort(byText);
    if (added.length > 0 || removed.length > 0) entry = { ts: new Date().toISOString(), added, removed };
  }
  if (entry) appendFileSync(join(outDir, 'ui-history.jsonl'), `${JSON.stringify(entry)}\n`, 'utf8');
  return { map, outDir, historyEntry: entry };
}

function isStale(root, outDir) {
  const mapPath = join(outDir, 'ui-map.json');
  let mapTime;
  let existing;
  try {
    mapTime = statSync(mapPath).mtimeMs;
    existing = JSON.parse(readFileSync(mapPath, 'utf8'));
  } catch {
    return true;
  }
  const files = sourceFiles(root);
  if (existing?.counts?.files !== files.length) return true;
  return files.some((file) => {
    try {
      return statSync(join(root, file)).mtimeMs > mapTime;
    } catch {
      return true;
    }
  });
}

function loadMap(root) {
  const outDir = resolveOutputDir(root);
  if (isStale(root, outDir)) {
    build(root);
    console.error('ui-map: map was missing or stale, rebuilt');
  }
  return { map: JSON.parse(readFileSync(join(outDir, 'ui-map.json'), 'utf8')) };
}

// ---------------------------------------------------------------- name matching (types extend it with aliases)

const squash = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

/**
 * Single place that decides whether a query names a candidate.
 * Returns 'exact' (same words ignoring case, separators and order of writing), 'close' or null.
 */
export function matchName(query, candidate) {
  const q = squash(query);
  const c = squash(candidate);
  if (!q || !c) return null;
  if (q === c) return 'exact';
  const qWords = splitWords(query).map(singular);
  const cWords = splitWords(candidate).map(singular);
  if (qWords.length > 0 && qWords.every((word) => cWords.includes(word))) return 'close';
  if (cWords.length > 0 && cWords.every((word) => qWords.includes(word))) return 'close';
  if (q.length >= 4 && (c.includes(q) || q.includes(c))) return 'close';
  if (q.length >= 4 && editDistance(q, c) <= 2) return 'close';
  return null;
}

// ---------------------------------------------------------------- component types (S5)

const TYPES_LIMIT = 'classification reads the component name and file path only; an unusual name stays unclassified and two components under one type are reported for review, never merged';

/** Loads catalog/component-types.json; a missing or broken file degrades the command, it never throws. */
export function loadTypes(kitDir = KIT_DIR) {
  try {
    const data = JSON.parse(readFileSync(join(kitDir, 'catalog', 'component-types.json'), 'utf8'));
    return Array.isArray(data.types) && data.types.length > 0 ? data : null;
  } catch {
    return null;
  }
}

const surfacesOf = (type) => [type.name, ...(type.aliases ?? [])];

/**
 * Stricter than matchName: a type matches a name only when the name spells the surface or contains every word of it
 * (ProductCard → card, HeavyChart → chart), so "Thing" is never guessed into Tooltip through its edit distance.
 */
function matchTypeSurface(name, surface) {
  const q = squash(name);
  const c = squash(surface);
  if (!q || !c) return null;
  if (q === c) return 'exact';
  const nameWords = splitWords(name).map(singular);
  const surfaceWords = splitWords(surface).map(singular);
  if (surfaceWords.length === 0 || nameWords.length === 0) return null;
  return surfaceWords.every((word) => nameWords.includes(word)) ? 'close' : null;
}

/**
 * The most specific type for a component name: an exact match beats a close one, then the longest surface wins,
 * so ProductCard resolves to product-card and never collapses into card.
 */
export function classifyComponent(name, types) {
  let best = null;
  for (const type of types) {
    for (const surface of surfacesOf(type)) {
      const kind = matchTypeSurface(name, surface);
      if (!kind) continue;
      const score = [kind === 'exact' ? 2 : 1, squash(surface).length];
      if (!best || score[0] > best.score[0] || (score[0] === best.score[0] && score[1] > best.score[1])) best = { type, score, surface };
    }
  }
  return best === null ? null : { name: best.type.name, layer: best.type.layer, category: best.type.category, surface: best.surface };
}

/** Groups the mapped components by type: coverage, unclassified components and possible duplicates. */
function typeReport(map, data) {
  const groups = new Map();
  const unclassified = [];
  for (const component of map.components) {
    const hit = classifyComponent(component.name, data.types);
    if (!hit) {
      unclassified.push({ name: component.name, file: component.file, line: component.line });
      continue;
    }
    if (!groups.has(hit.name)) groups.set(hit.name, []);
    groups.get(hit.name).push({ name: component.name, file: component.file, line: component.line });
  }
  const present = [...groups].map(([name, components]) => {
    const type = data.types.find((entry) => entry.name === name);
    return { name, layer: type.layer, category: type.category, components };
  }).sort((a, b) => byText(a.name, b.name));
  const duplicates = present.filter((type) => type.components.length > 1)
    .map((type) => ({ type: type.name, components: type.components.map((c) => `${c.name} (${c.file})`) }));
  return { coverage: { present: present.length, total: data.types.length }, types: present, unclassified, duplicates, limit: TYPES_LIMIT };
}

// ---------------------------------------------------------------- commands

function summarizeComponent(c) {
  return { name: c.name, file: c.file, line: c.line, usage: c.usage };
}

function unresolvedFor(map, files) {
  const set = new Set(files);
  return map.unresolved.filter((u) => set.has(u.file));
}

function runImpact(root, flags) {
  const query = flags._.slice(1).join(' ').trim();
  if (!query) {
    console.error('ui-map: impact needs a role or component name.\n');
    console.error(USAGE);
    return 2;
  }
  const { map } = loadMap(root);
  const role = ROLES.find((r) => r === query.toLowerCase());
  let result;
  if (role) {
    const owners = map.roles[role].owners;
    const ownerComponents = map.components.filter((c) => c.roles.includes(role));
    const users = [...new Set(ownerComponents.flatMap((c) => c.users))].sort(byText);
    const routes = [...new Set(ownerComponents.flatMap((c) => c.routes))].sort(byText);
    const strays = map.strays.filter((s) => s.role === role);
    const scope = [...owners.map((o) => o.file), ...users, ...strays.map((s) => s.file)];
    result = { query, kind: 'role', owners, users, routes, strays, unresolved: unresolvedFor(map, scope) };
  } else {
    const hits = map.components.filter((c) => matchName(query, c.name) === 'exact');
    if (hits.length === 0) {
      const close = map.components.filter((c) => matchName(query, c.name) === 'close').slice(0, 5).map((c) => c.name);
      const roleHints = ROLES.filter((r) => matchName(query, r) !== null);
      const suggestions = [...new Set([...close, ...roleHints])];
      if (flags.json) console.log(JSON.stringify({ query, kind: 'unknown', suggestions }, null, 2));
      else {
        console.log(`ui-map: "${query}" not found: it is not a known role or component.`);
        console.log(suggestions.length > 0 ? `Close names: ${suggestions.join(', ')}` : `No close names. Roles: ${ROLES.join(', ')}.`);
      }
      return 1;
    }
    const users = [...new Set(hits.flatMap((c) => c.users))].sort(byText);
    const routes = [...new Set(hits.flatMap((c) => c.routes))].sort(byText);
    const roles = new Set(hits.flatMap((c) => c.roles));
    const strays = map.strays.filter((s) => roles.has(s.role));
    const scope = [...hits.map((c) => c.file), ...users, ...strays.map((s) => s.file)];
    result = { query, kind: 'component', roles: [...roles], owners: hits.map((c) => ({ name: c.name, file: c.file, line: c.line })), users, routes, strays, unresolved: unresolvedFor(map, scope) };
  }
  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }
  const head = result.kind === 'role' ? `impact: ${query} (role)` : `impact: ${result.owners[0].name} (component${result.roles.length > 0 ? `, role ${result.roles.join('/')}` : ''})`;
  console.log(head);
  const section = (title, items) => {
    console.log(`${title} (${items.length})${items.length === 0 ? ': none' : ':'}`);
    for (const item of items) console.log(`  - ${item}`);
  };
  section('Owners', result.owners.map((o) => `${o.name} — ${o.file}:${o.line}`));
  if (result.kind === 'role' && result.owners.length > 1) console.log('  note: several owners for one role; consolidate only if the user asks.');
  section('Users', result.users);
  section('Routes', result.routes);
  section('Strays', result.strays.map((s) => `${s.role}: ${s.file}:${s.line} ${s.signal}`));
  section('Unresolved', result.unresolved.map((u) => `${u.file}:${u.line} ${u.specifier} (${u.reason})`));
  if (result.kind === 'role' && result.owners.length === 0) console.log(`No owner found for "${query}": strays above are the only implementations.`);
  return 0;
}

export function catalogCandidates(query) {
  const catalogDir = process.env.KIT_CATALOG_DIR ?? join(KIT_DIR, 'catalog');
  if (!existsSync(join(catalogDir, 'sources'))) return [];
  const entries = loadEntries();
  const words = splitWords(query);
  const attempts = [words.join(' '), ...[...words].sort((a, b) => b.length - a.length).slice(0, 1)];
  for (const text of attempts) {
    if (!text) continue;
    const { results } = search(entries, { text });
    if (results.length > 0) {
      return results.slice(0, 3).map((e) => ({ id: e.id, name: e.name, source: e.source, category: e.category, quality: e.quality ?? null }));
    }
  }
  return [];
}

function printCandidates(catalog) {
  if (catalog.length === 0) {
    console.log('Candidates (catalog): none found');
    return;
  }
  console.log('Candidates (catalog):');
  for (const e of catalog) console.log(`  - ${e.id} | ${e.name} | ${e.category} | q${e.quality ?? '-'}`);
}

function runHave(root, flags) {
  const query = flags._.slice(1).join(' ').trim();
  if (!query) {
    console.error('ui-map: have needs a component name.\n');
    console.error(USAGE);
    return 2;
  }
  const { map } = loadMap(root);
  const data = loadTypes();
  const exact = map.components.filter((c) => matchName(query, c.name) === 'exact');
  const close = map.components.filter((c) => matchName(query, c.name) === 'close');
  // The query itself may name a type instead of a component: "modal" finds a Dialog through the aliases.
  const queryType = data ? classifyComponent(query, data.types) : null;
  const ofType = queryType ? map.components.filter((c) => classifyComponent(c.name, data.types)?.name === queryType.name) : [];
  let status = 'not-found';
  let decision = `search the catalog before creating (node ai-frontend-guide-kit/tools/find.mjs --text "${query}")`;
  let matches = [];
  if (exact.length > 0) {
    status = 'exists';
    matches = exact;
    decision = `reuse ${exact[0].file}`;
  } else if (close.length > 0) {
    status = 'close';
    decision = 'check the close match(es) before creating';
  } else if (ofType.length > 0) {
    status = 'exists';
    matches = ofType;
    decision = `reuse ${ofType[0].file}`;
  }
  const typeHint = queryType ? queryType.name : null;
  const catalog = status === 'exists' ? [] : catalogCandidates(query);
  if (flags.json) {
    console.log(JSON.stringify({
      query,
      status,
      type: typeHint,
      matches: matches.map(summarizeComponent),
      close: close.map(summarizeComponent),
      catalog,
      decision: `Decision: ${decision}`,
    }, null, 2));
    return 0;
  }
  if (status === 'exists') {
    console.log(`have "${query}": exists${exact.length > 0 ? '' : ` (component type ${typeHint})`}`);
    for (const c of matches) console.log(`  - ${c.name} — ${c.file}:${c.line} — used by ${c.usage} file(s)`);
  } else if (status === 'close') {
    console.log(`have "${query}": no exact match, close matches:`);
    for (const c of close.slice(0, 5)) console.log(`  - ${c.name} — ${c.file}:${c.line} — used by ${c.usage} file(s)`);
    printCandidates(catalog);
  } else {
    console.log(`have "${query}": not found in the project${typeHint ? ` (no component of type ${typeHint})` : ''}`);
    printCandidates(catalog);
  }
  console.log(`Decision: ${decision}.`);
  return 0;
}

function runTypes(root, flags) {
  const data = loadTypes();
  if (!data) {
    console.error('ui-map: catalog/component-types.json is missing or invalid; run node tools/build-kit.mjs');
    return 2;
  }
  const { map } = loadMap(root);
  const report = typeReport(map, data);
  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }
  console.log(`types: ${report.coverage.present} of ${report.coverage.total} present`);
  for (const type of report.types) {
    const who = type.components.map((c) => `${c.name} (${c.file})`).join(', ');
    console.log(`  ${type.name} [${type.layer}/${type.category}] — ${who}`);
  }
  if (report.unclassified.length === 0) console.log('unclassified (0): none');
  else console.log(`unclassified (${report.unclassified.length}): ${report.unclassified.map((c) => c.name).join(', ')}`);
  if (report.duplicates.length === 0) console.log('possible duplicates: none');
  else {
    console.log(`possible duplicates (by name or alias, review only) (${report.duplicates.length}):`);
    for (const duplicate of report.duplicates) console.log(`  ${duplicate.type}: ${duplicate.components.join(', ')}`);
  }
  console.log(`Limit: ${report.limit}.`);
  return 0;
}

/** Which document of a profile exists in this project; the generated map lives under the output folder. */
function documentStatus(root, profile) {
  const outDir = resolveOutputDir(root);
  return documentsFor(profile).map((doc) => ({
    path: doc.path,
    purpose: doc.purpose,
    structure: doc.structure,
    generated: doc.generated === true,
    missing: !existsSync(doc.generated ? join(outDir, 'UI-MAP.md') : join(root, doc.path)),
  }));
}

function runDocs(root, flags) {
  const profile = flags.profile ?? 'standard';
  if (!PROFILES[profile]) {
    console.error(`ui-map: unknown profile "${profile}" (valid: ${PROFILE_NAMES.join(', ')})\n`);
    console.error(USAGE);
    return 2;
  }
  const documents = documentStatus(root, profile);
  const missing = documents.filter((doc) => doc.missing).length;
  if (flags.json) {
    console.log(JSON.stringify({ profile, what: PROFILES[profile].what, documents, missing }, null, 2));
    return 0;
  }
  console.log(`docs (profile: ${profile}) — ${documents.length} documents, ${missing} missing`);
  for (const doc of documents) console.log(`  ${doc.missing ? 'missing' : 'ok     '} ${doc.path}${doc.generated ? ' (generated)' : ''} — ${doc.purpose}`);
  console.log(`Structure of each one: ${DOCUMENTS[0].structure}; folder map: guides/12-ARCHITECTURE.md.`);
  if (missing > 0) console.log(`Next: write the missing ones, or accept a smaller profile (${PROFILE_NAMES.join(', ')}).`);
  return 0;
}

/** Which finding kinds block at each profile. The profile sets the rigor; the finding list never changes. */
const BLOCKING_KINDS = {
  sprint: [],
  standard: ['unresolved', 'missing-doc'],
  'long-term': ['unresolved', 'duplicate-type', 'stray', 'ownerless-role', 'missing-doc'],
};

/** Every finding `check` reports: what the map knows plus the documents the profile is missing. */
function checkFindings(root, map, profile) {
  const findings = [];
  for (const u of map.unresolved) findings.push({ kind: 'unresolved', detail: `${u.file}:${u.line} ${u.specifier} ${u.reason}` });
  const data = loadTypes();
  // A broken catalog only drops the duplicate-type review; the rest of the gate still runs.
  if (data) {
    for (const duplicate of typeReport(map, data).duplicates) {
      findings.push({ kind: 'duplicate-type', detail: `${duplicate.type}: ${duplicate.components.join(', ')}` });
    }
  }
  for (const role of ROLES) {
    const strays = map.strays.filter((s) => s.role === role);
    if (strays.length === 0) continue;
    const sample = strays.slice(0, 5).map((s) => `${s.file}:${s.line}`).join(', ') + (strays.length > 5 ? `, +${strays.length - 5} more` : '');
    findings.push({ kind: 'stray', detail: `${role}: ${strays.length} stray(s) — ${sample}` });
    if (map.roles[role].owners.length === 0) findings.push({ kind: 'ownerless-role', detail: `${role}: no owner, ${strays.length} stray(s) — ${sample}` });
  }
  for (const doc of documentStatus(root, profile)) {
    if (doc.missing) findings.push({ kind: 'missing-doc', detail: `${doc.path}${doc.generated ? ' (generated)' : ''}` });
  }
  const blockingKinds = new Set(BLOCKING_KINDS[profile]);
  return findings.map((finding) => ({ ...finding, blocking: blockingKinds.has(finding.kind) }));
}

function runCheck(root, flags) {
  const profile = flags.profile ?? 'standard';
  if (!PROFILES[profile]) {
    console.error(`ui-map: unknown profile "${profile}" (valid: ${PROFILE_NAMES.join(', ')})\n`);
    console.error(USAGE);
    return 2;
  }
  const { map } = loadMap(root);
  const findings = checkFindings(root, map, profile);
  const blocking = findings.filter((finding) => finding.blocking).length;
  const exit = blocking > 0 ? 1 : 0;
  if (flags.json) {
    console.log(JSON.stringify({ profile, findings, counts: { findings: findings.length, blocking }, exit }, null, 2));
    return exit;
  }
  console.log(`check (profile: ${profile}) — ${findings.length} findings, ${blocking} blocking`);
  for (const finding of findings) console.log(`  ${finding.blocking ? 'blocking' : 'advisory'} ${finding.kind} — ${finding.detail}`);
  if (blocking > 0) console.log(`Next: fix the blocking findings above (they are what this profile treats as required), or move to a smaller profile (${PROFILE_NAMES.join(', ')}).`);
  else console.log(`Next: nothing blocks at this profile (${PROFILES[profile].what}); the advisory findings above stay visible, so keep them in mind.`);
  return exit;
}

function runBuild(root, flags) {
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`project directory not found: ${root}`);
  const { map, outDir, historyEntry } = build(root);
  if (flags.json) {
    console.log(JSON.stringify({ outDir, counts: map.counts, history: historyEntry ? (historyEntry.initial ? 'initial' : 'updated') : 'unchanged' }, null, 2));
    return 0;
  }
  const c = map.counts;
  console.log(`ui-map: ${c.components} components, ${c.routes} routes, ${c.strays} strays, ${c.unresolved} unresolved`);
  console.log(`written : ${join(outDir, 'ui-map.json')}`);
  console.log(`written : ${join(outDir, 'UI-MAP.md')}`);
  console.log(`history : ${historyEntry ? (historyEntry.initial ? 'initial set recorded' : `+${historyEntry.added.length} / -${historyEntry.removed.length}`) : 'unchanged'}`);
  return 0;
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.error) {
    console.error(`ui-map: ${flags.error}\n`);
    console.error(USAGE);
    return 2;
  }
  const command = flags._[0];
  if (flags.help || command === undefined) {
    console.log(USAGE);
    return 0;
  }
  if (!['build', 'impact', 'have', 'types', 'docs', 'check'].includes(command)) {
    console.error(`ui-map: unknown command "${command}"\n`);
    console.error(USAGE);
    return 2;
  }
  if (['build', 'types', 'docs', 'check'].includes(command) && flags._.length > 1) {
    console.error(`ui-map: ${command} takes no arguments (got "${flags._.slice(1).join(' ')}")\n`);
    console.error(USAGE);
    return 2;
  }
  const root = resolveProjectRoot(flags);
  try {
    if (command === 'build') return runBuild(root, flags);
    if (command === 'impact') return runImpact(root, flags);
    if (command === 'types') return runTypes(root, flags);
    if (command === 'docs') return runDocs(root, flags);
    if (command === 'check') return runCheck(root, flags);
    return runHave(root, flags);
  } catch (error) {
    console.error(`ui-map: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main();
