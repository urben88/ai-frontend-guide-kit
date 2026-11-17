#!/usr/bin/env node
/**
 * board — the design board of a project, made of Storybook stories that compose the project's own
 * presentational components with mock data. No dependencies, no network. It never installs Storybook
 * (the agent asks the user first) and never touches the project's logic, routes, stores or API calls.
 *
 *   detect                          is Storybook there, the framework, the story glob, the exact install command
 *   plan                            the boards worth creating, from ai-frontend-output/ui-map.json
 *   scaffold <page> --version <v>   a composition story for one layout version (v1-sidebar -> export V1Sidebar)
 *   list                            the boards found (pages and their versions)
 *   check                           numbered findings when a board imports stores, routers, API clients or data hooks
 *
 * Usage: node ai-frontend-guide-kit/tools/board.mjs <command> ... [--dir <project>] [--json]
 * Exit: 0 done, 1 a finding or a refused write, 2 wrong usage.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frameworkOf } from './context.mjs';
import { runTool, toolPath } from './kit-path.mjs';

const SELF = fileURLToPath(import.meta.url);
const KIT_DIR = resolve(dirname(SELF), '..');
/** Version of storybook that the install command names; read from the npm registry on 2026-11-17 with `npm view storybook version`. */
export const STORYBOOK_VERSION = '10.6.7';
const INSTALL_COMMAND = `npx storybook@${STORYBOOK_VERSION} init`;
const DEFAULT_GLOB = 'src/**/*.stories.@(js|jsx|ts|tsx|mdx)';
const BOARD_DIR = 'src/board';
const IGNORED = /(^|\/)(node_modules|\.git|\.next|\.nuxt|\.svelte-kit|dist|build|coverage|\.cache|\.output|out|storybook-static)(\/|$)/;
const MAX_PAGE_COMPONENTS = 12;
const MAX_COMPONENT_BOARDS = 15;

class UsageError extends Error {}

// ---------------------------------------------------------------- reading the project

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

function readManifest(root) {
  try {
    return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** Is Storybook in the project, which framework, the story glob and the exact install command. Also what flow.mjs and install.mjs read. */
export function detect(root) {
  const manifest = readManifest(root);
  const deps = { ...(manifest?.dependencies ?? {}), ...(manifest?.devDependencies ?? {}) };
  const framework = frameworkOf(deps);
  const typescript = Boolean(deps.typescript) || existsSync(join(root, 'tsconfig.json'));
  const packages = Object.keys(deps).filter((name) => name === 'storybook' || name.startsWith('@storybook/')).sort();
  const configFolder = existsSync(join(root, '.storybook'));
  const present = packages.length > 0 || configFolder;
  let glob = null;
  for (const name of ['main.ts', 'main.js', 'main.mjs', 'main.cjs', 'main.mts', 'main.cts']) {
    const file = join(root, '.storybook', name);
    if (!existsSync(file)) continue;
    const list = readFileSync(file, 'utf8').match(/stories\s*:\s*\[([^\]]*)\]/);
    if (list) glob = [...list[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]).join(', ') || null;
    break;
  }
  return {
    present,
    packages,
    configFolder,
    framework,
    typescript,
    glob: glob ?? DEFAULT_GLOB,
    globSource: glob ? '.storybook/main' : 'Storybook default after init',
    install: present ? null : INSTALL_COMMAND,
  };
}

const outputDir = (root) => (process.env.AI_FRONTEND_OUTPUT ? resolve(process.env.AI_FRONTEND_OUTPUT) : join(root, 'ai-frontend-output'));

function loadUiMap(root) {
  try {
    return JSON.parse(readFileSync(join(outputDir(root), 'ui-map.json'), 'utf8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- names

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const words = (text) => String(text).split(/[^A-Za-z0-9]+/).filter(Boolean);
const pascal = (text) => words(text).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
const toKebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const slugOfRoute = (route) => words(route).join('-').toLowerCase() || 'home';

// ---------------------------------------------------------------- boards

const isBoardFile = (file) => /\.board\.stories\.(tsx|jsx|ts|js|mjs)$/.test(file) || (/(^|\/)board\//.test(file) && /\.stories\.(tsx|jsx|ts|js|mjs)$/.test(file));

function parseBoard(text) {
  const title = text.match(/title:\s*['"`]([^'"`]+)['"`]/)?.[1] ?? null;
  const versions = [];
  const exports = [];
  let pending = null;
  for (const line of text.split('\n')) {
    const marker = line.match(/^\s*\/\/\s*version:\s*([a-z0-9-]+)/);
    if (marker) {
      pending = marker[1];
      continue;
    }
    const exported = line.match(/^\s*export\s+const\s+(\w+)/);
    if (exported && exported[1] !== 'meta') {
      versions.push(pending ?? toKebab(exported[1]));
      exports.push(exported[1]);
      pending = null;
    }
  }
  return { title, versions, exports };
}

/** The board stories of the project: file, title and the layout versions each one holds. */
export function findBoards(root) {
  return walk(root).filter(isBoardFile).map((file) => ({ file, ...parseBoard(readFileSync(join(root, file), 'utf8')) }));
}

// ---------------------------------------------------------------- scaffold

const RULES = (page) => `/*
 * Design board: ${page}. One story per layout version, so versions can be compared side by side.
 * Rules (run \`${'node ai-frontend-guide-kit/tools/board.mjs check'}\` before closing):
 *  - Only presentational components: everything they show comes in through props.
 *  - Mock data only (the section below). Never real data.
 *  - No stores, no router, no API or fetch clients, no data-fetching hooks.
 *  - Layout and style may change freely; the logic, routes, stores and API calls of the real page never change.
 *  - Which components a page uses comes from ui-map (ui-map.mjs impact <component>).
 */`;

function versionBlock(version, ts) {
  const exportName = pascal(version);
  return `// version: ${version}
export const ${exportName}${ts ? ': Story' : ''} = {
  render: () => (
    <div>
      {/* Compose the presentational components of this page with the mock data above. */}
    </div>
  ),
};
`;
}

// The components board: one story per variant or state of one component, from mock props.

const COMPONENT_RULES = (name) => `/*
 * Components board: ${name}. One story per variant or state (default, disabled, loading, empty...), from mock props.
 * Rules (run \`${'node ai-frontend-guide-kit/tools/board.mjs check'}\` before closing):
 *  - Only a presentational component: everything it shows comes in through props.
 *  - Mock props only (the section below). Never real data.
 *  - No stores, no router, no API or fetch clients, no data-fetching hooks. A component that needs them is split first.
 *  - Never edit the real component to make a story work.
 */`;

function componentBlock(version, ts) {
  return `// version: ${version}
export const ${pascal(version)}${ts ? ': Story' : ''} = {
  args: { ...mock /* , the props of this variant or state */ },
};
`;
}

function newComponentFile(name, version, ts) {
  const head = ts ? "import type { Meta, StoryObj } from '@storybook/react';\n" : '';
  const body = `  title: 'Board/Components/${name}',\n  // component: ${name}, // uncomment once it is imported above\n  parameters: { layout: 'centered' },\n`;
  const meta = ts
    ? `const meta = {\n${body}} satisfies Meta;\n\nexport default meta;\ntype Story = StoryObj<typeof meta>;\n`
    : `const meta = {\n${body}};\n\nexport default meta;\n`;
  return `${head}// Import the PRESENTATIONAL component, for example:
// import { ${name} } from '../../components/${name}';
// With another framework, import the story types from its Storybook package.

${COMPONENT_RULES(name)}

// ---- Mock props (made up; shape them like the props of the component)
const mock = {};

${meta}
// ---- Variants and states
${componentBlock(version, ts)}`;
}

function newBoardFile(page, version, ts) {
  const head = ts ? "import type { Meta, StoryObj } from '@storybook/react';\n" : '';
  const meta = ts
    ? `const meta = {\n  title: 'Board/Pages/${page}',\n  parameters: { layout: 'fullscreen' },\n} satisfies Meta;\n\nexport default meta;\ntype Story = StoryObj<typeof meta>;\n`
    : `const meta = {\n  title: 'Board/Pages/${page}',\n  parameters: { layout: 'fullscreen' },\n};\n\nexport default meta;\n`;
  return `${head}// Import the PRESENTATIONAL components of this page, for example:
// import { LoginForm } from '../components/LoginForm';
// With another framework, import the story types from its Storybook package.

${RULES(page)}

// ---- Mock data (made up; shape it like the props of the components above)
const mock = {};

${meta}
// ---- Layout versions
${versionBlock(version, ts)}`;
}

function cmdScaffold(flags, root) {
  const kind = flags.opts.kind ?? 'page';
  if (!['page', 'component'].includes(kind)) throw new UsageError(`--kind must be component or page (got "${kind}")`);
  const component = kind === 'component';
  const pageArg = flags._[1];
  if (!pageArg) throw new UsageError(component ? 'give the component: scaffold <component> --kind component --version <name>' : 'give the page: scaffold <page> --version <name>');
  const version = flags.opts.version;
  if (!version) throw new UsageError(component ? 'give the variant or state: --version <name>, for example default or disabled' : 'give the layout version: --version <name>, for example v1-sidebar');
  if (!KEBAB.test(version)) throw new UsageError(`version "${version}" must be kebab-case (lowercase letters, digits and dashes, starting with a letter), for example v1-sidebar`);
  const page = pascal(pageArg);
  if (!page) throw new UsageError(`"${pageArg}" is not a page name`);
  const info = detect(root);
  if (!['React', 'Next.js', 'Remix', 'unknown'].includes(info.framework)) {
    console.error(`board: warning: the skeleton is JSX (React); ${info.framework} stories need the same structure written by hand`);
  }
  const title = `Board/${component ? 'Components' : 'Pages'}/${page}`;
  const existing = findBoards(root).find((b) => b.title === title);
  const ts = info.typescript;
  const file = existing?.file ?? `${BOARD_DIR}/${component ? 'components/' : ''}${page}.board.stories.${ts ? 'tsx' : 'jsx'}`;
  const target = join(root, file);
  if (existing) {
    if (existing.versions.includes(version) || existing.exports.includes(pascal(version))) {
      console.error(`board: ${file} already has the version ${version}; it is never overwritten (pick another name, or edit the story)`);
      process.exitCode = 1;
      return;
    }
    appendFileSync(target, `\n${(component ? componentBlock : versionBlock)(version, /\.tsx?$/.test(file))}`);
    console.log(`board: added the version ${version} (export ${pascal(version)}) to ${file}`);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, (component ? newComponentFile : newBoardFile)(page, version, ts));
    console.log(`board: wrote ${file} (story ${title}, version ${version}, export ${pascal(version)})`);
  }
  console.log(`Next: ${component ? 'give the component its mock props' : 'compose the presentational components with mock data'}, then run: ${runTool('board.mjs', 'check', root)}`);
}

// ---------------------------------------------------------------- check

const PATTERNS = [
  { id: 'board-store', kind: 'store', spec: /^(redux|react-redux|@reduxjs\/|zustand|pinia|mobx|mobx-react|mobx-react-lite|jotai|recoil|vuex|@ngrx\/|valtio|nanostores|@nanostores\/)/, path: /(^|\/)(stores?|slices)(\/|$)/ },
  { id: 'board-router', kind: 'router', spec: /^(react-router|react-router-dom|next\/router|next\/navigation|@remix-run\/react|vue-router|@tanstack\/react-router|\$app\/(navigation|stores)|wouter)/ },
  { id: 'board-api', kind: 'API client', spec: /^(axios|ky|got|ofetch|@apollo\/client|urql|graphql-request|@trpc\/)/, path: /(^|\/)(api|services)(\/|$)/ },
  { id: 'board-data-hook', kind: 'data-fetching hook', spec: /^(@tanstack\/(react|vue|svelte|solid)-query|react-query|swr)(\/|$)/ },
];
const FIXES = {
  'board-store': 'pass the values as mock props to the presentational component',
  'board-router': 'pass links and handlers as mock props; render plain anchors',
  'board-api': 'replace the client with mock data defined in the story',
  'board-data-hook': 'replace the hook with mock data defined in the story',
  'board-fetch': 'replace the call with mock data defined in the story',
};

/** The text with comments blanked (line count kept), so the rules written as comments are never findings. */
function stripComments(text) {
  const blanked = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  return blanked.split('\n').map((line) => line.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n');
}

/** Project aliases every bundler and tsconfig convention knows: `@/x`, `~/x` and `#/x` point into the project, not at a package. */
const ALIAS_PREFIX = /^(@|~|#)\//;

/** The aliases of tsconfig.json / jsconfig.json `compilerOptions.paths` as { prefix, target } (comments in the file are tolerated). */
function readAliases(root) {
  for (const name of ['tsconfig.json', 'jsconfig.json']) {
    try {
      const text = readFileSync(join(root, name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1');
      const paths = JSON.parse(text)?.compilerOptions?.paths ?? {};
      return Object.entries(paths).flatMap(([key, targets]) => {
        const prefix = key.replace(/\*$/, '');
        const target = Array.isArray(targets) ? String(targets[0] ?? '').replace(/\*$/, '') : '';
        return prefix && target ? [{ prefix, target }] : [];
      });
    } catch {
      continue;
    }
  }
  return [];
}

/** The path form of an import that stays inside the project (relative, absolute, an alias), or null for a package. A declared alias is replaced by its target. */
function localPath(specifier, aliases) {
  const alias = aliases.find(({ prefix }) => specifier.startsWith(prefix));
  if (alias) return `${alias.target}${specifier.slice(alias.prefix.length)}`;
  if (/^(\.{1,2}\/|\/)/.test(specifier) || ALIAS_PREFIX.test(specifier)) return specifier;
  return null;
}

function scanBoard(file, text, aliases = []) {
  const findings = [];
  const lines = stripComments(text).split('\n');
  lines.forEach((line, index) => {
    for (const m of line.matchAll(/(?:from\s+|import\s*\(\s*|import\s+|require\s*\(\s*)['"]([^'"]+)['"]/g)) {
      const specifier = m[1];
      const local = localPath(specifier, aliases);
      for (const p of PATTERNS) {
        if ((local === null && p.spec.test(specifier)) || (local !== null && p.path && p.path.test(local))) {
          findings.push({ id: p.id, file, line: index + 1, what: `imports "${specifier}" (${p.kind})`, fix: FIXES[p.id] });
          break;
        }
      }
    }
    if (/(^|[^.\w])fetch\s*\(/.test(line)) findings.push({ id: 'board-fetch', file, line: index + 1, what: 'calls fetch( (network call)', fix: FIXES['board-fetch'] });
  });
  return findings;
}

/** The board files and the numbered findings of the check (what `check` prints and what `flow done board` reads). */
export function checkBoards(root) {
  const files = walk(root).filter(isBoardFile);
  const aliases = readAliases(root);
  const findings = files.flatMap((file) => scanBoard(file, readFileSync(join(root, file), 'utf8'), aliases)).map((f, i) => ({ n: i + 1, severity: 'high', ...f }));
  return { files, findings };
}

function cmdCheck(flags, root) {
  const { files, findings } = checkBoards(root);
  const summary = `board check: ${findings.length} finding${findings.length === 1 ? '' : 's'} in ${files.length} board file${files.length === 1 ? '' : 's'}`;
  if (flags.bool.has('json')) console.log(JSON.stringify({ files, findings, summary }, null, 2));
  else {
    for (const f of findings) console.log(`${f.n}. [${f.severity}] ${f.id} — ${f.file}:${f.line} — ${f.what} → ${f.fix}`);
    console.log(summary);
    if (files.length === 0) console.log(`No board stories yet. Create one: ${runTool('board.mjs', 'scaffold <page> --version v1-<name>', root)}`);
  }
  if (findings.length > 0) process.exitCode = 1;
}

// ---------------------------------------------------------------- detect, plan, list

function cmdDetect(flags, root) {
  const info = detect(root);
  if (flags.bool.has('json')) return console.log(JSON.stringify(info, null, 2));
  console.log(`board detect: ${root.replace(/\\/g, '/')}`);
  if (info.present) {
    console.log(`storybook: present (${info.packages.join(', ') || 'no package in package.json'}${info.configFolder ? '; .storybook/ found' : ''})`);
  } else {
    console.log('storybook: missing');
  }
  console.log(`framework: ${info.framework}${info.typescript ? ' (typescript)' : ''}`);
  console.log(`story glob: ${info.glob} (${info.globSource})`);
  if (info.present) console.log(`Next: ${runTool('board.mjs', 'plan', root)}`);
  else {
    console.log(`install: ${info.install}`);
    console.log('Ask the user before installing; this tool never installs. If the user says no, record the answer with its reason.');
  }
}

function cmdPlan(flags, root) {
  const map = loadUiMap(root);
  if (!map) {
    console.error(`board: no ai-frontend-output/ui-map.json: build it first with ${runTool('ui-map.mjs', 'build', root)}`);
    process.exitCode = 1;
    return;
  }
  const boards = findBoards(root);
  const pages = (map.routes ?? []).map(({ route, file }) => {
    const slug = slugOfRoute(route);
    const name = pascal(slug);
    const components = (map.components ?? []).filter((c) => (c.routes ?? []).includes(route)).map((c) => c.name).sort();
    return { route, file, name, slug, title: `Board/Pages/${name}`, components, exists: boards.some((b) => b.title === `Board/Pages/${name}`) };
  });
  const componentBoards = (map.components ?? [])
    .map((c) => {
      const name = pascal(c.name);
      return { name: c.name, file: c.file, title: `Board/Components/${name}`, routes: c.routes ?? [], shared: (c.routes ?? []).length > 1 || (c.usage ?? 0) > 1, usage: c.usage ?? 0, exists: boards.some((b) => b.title === `Board/Components/${name}`) };
    })
    .sort((a, b) => Number(b.shared) - Number(a.shared) || b.usage - a.usage || a.name.localeCompare(b.name));
  const result = { pages, components: (map.components ?? []).length, componentBoards };
  if (flags.bool.has('json')) return console.log(JSON.stringify(result, null, 2));
  console.log(`board plan: ${pages.length} page${pages.length === 1 ? '' : 's'}, ${result.components} components (from ui-map.json)`);
  console.log(`Components board: ${componentBoards.length} component${componentBoards.length === 1 ? '' : 's'} in the map, shared ones first (use only the presentational ones; a component with a store, router or API call is split first)`);
  for (const c of componentBoards.slice(0, MAX_COMPONENT_BOARDS)) {
    console.log(`- ${c.title} (${c.file}, ${c.routes.length} page${c.routes.length === 1 ? '' : 's'}${c.shared ? ', shared' : ''}) ${c.exists ? '[board exists]' : '[to create]'}`);
    if (!c.exists) console.log(`    ${runTool('board.mjs', `scaffold ${c.name} --kind component --version default`, root)}`);
  }
  if (componentBoards.length > MAX_COMPONENT_BOARDS) console.log(`  +${componentBoards.length - MAX_COMPONENT_BOARDS} more components (all of them with --json)`);
  console.log(`Pages board: ${pages.length} page${pages.length === 1 ? '' : 's'}`);
  for (const p of pages) {
    const shown = p.components.slice(0, MAX_PAGE_COMPONENTS).join(', ') || 'no components reached';
    const more = p.components.length > MAX_PAGE_COMPONENTS ? `, +${p.components.length - MAX_PAGE_COMPONENTS} more` : '';
    console.log(`- ${p.title} (route ${p.route}, ${p.file}) ${p.exists ? '[board exists]' : '[to create]'}: ${shown}${more}`);
    if (!p.exists) console.log(`    ${runTool('board.mjs', `scaffold ${p.slug} --version v1-default`, root)}`);
  }
  if (pages.length === 0) console.log('No routes in the map: boards can still be made for any screen by name.');
}

function cmdList(flags, root) {
  const boards = findBoards(root).map((b) => ({ title: b.title ?? '(no title)', kind: b.title?.startsWith('Board/Components/') ? 'component' : 'page', file: b.file, versions: b.versions }));
  if (flags.bool.has('json')) return console.log(JSON.stringify({ boards }, null, 2));
  if (boards.length === 0) return console.log(`board list: no boards yet. Plan them: ${runTool('board.mjs', 'plan', root)}`);
  console.log(`board list: ${boards.length} board${boards.length === 1 ? '' : 's'}`);
  for (const b of boards) console.log(`- ${b.title} (${b.file}): ${b.versions.join(', ') || 'no versions'}`);
}

// ---------------------------------------------------------------- command line

const USAGE = `board — the design board of a project: Storybook stories with its own presentational components and mock data (no dependencies, no network)

Usage:
  node ${toolPath('board.mjs')} detect [--json]
  node ${toolPath('board.mjs')} plan [--json]
  node ${toolPath('board.mjs')} scaffold <page> --version <name>
  node ${toolPath('board.mjs')} scaffold <component> --kind component --version <name>
  node ${toolPath('board.mjs')} list [--json]
  node ${toolPath('board.mjs')} check [--json]

  detect    is Storybook there, the framework, the story glob and the exact install command (never installs: ask the user first)
  plan      the page boards and the component boards (shared components first) from ai-frontend-output/ui-map.json, and what is still to create
  scaffold  a composition story for one layout version, e.g. src/board/Login.board.stories.tsx with export V1Sidebar for v1-sidebar;
            adds a new version to an existing file; never overwrites a version; names are kebab-case
            --kind component writes Board/Components/<Name> (src/board/components/<Name>.board.stories.tsx): one story per variant or
            state (default, disabled, loading) from mock props; --kind page (the default) is the page board above
  list      the boards found, pages and components, and their versions
  check     numbered findings when a board imports stores, routers, API clients, data-fetching hooks or calls fetch(; exit 1 on a finding
  --dir     the project (default: AI_FRONTEND_PROJECT, then the folder that holds the kit)
  --json    print the data instead of the text (detect, plan, list, check)
`;

const VALUE_OPTS = new Set(['dir', 'version', 'kind']);
const BOOL_OPTS = new Set(['json', 'help']);

function parseArgs(argv) {
  const flags = { _: [], opts: {}, bool: new Set() };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const eq = token.startsWith('--') ? token.indexOf('=') : -1;
    const name = (eq === -1 ? token : token.slice(0, eq)).replace(/^--/, '');
    if (token === '-h') flags.bool.add('help');
    else if (token.startsWith('--') && VALUE_OPTS.has(name)) {
      const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
      if (value === undefined || (eq === -1 && value.startsWith('--'))) throw new UsageError(`option --${name} needs a value`);
      flags.opts[name] = value;
      if (eq === -1) i += 1;
    } else if (token.startsWith('--') && eq === -1 && BOOL_OPTS.has(name)) flags.bool.add(name);
    else if (token.startsWith('-') && token.length > 1) throw new UsageError(`unknown option "${token}"`);
    else flags._.push(token);
  }
  return flags;
}

function main() {
  try {
    const flags = parseArgs(process.argv.slice(2));
    if (flags.bool.has('help')) return console.log(USAGE);
    const command = flags._[0];
    if (!command) throw new UsageError('give a command: detect, plan, scaffold, list or check');
    const root = flags.opts.dir ? resolve(flags.opts.dir) : process.env.AI_FRONTEND_PROJECT ? resolve(process.env.AI_FRONTEND_PROJECT) : dirname(KIT_DIR);
    const commands = { detect: cmdDetect, plan: cmdPlan, scaffold: cmdScaffold, list: cmdList, check: cmdCheck };
    if (!commands[command]) throw new UsageError(`unknown command "${command}"`);
    commands[command](flags, root);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`board: ${error.message}\n\n${USAGE}`);
      process.exitCode = 2;
    } else throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) main();
