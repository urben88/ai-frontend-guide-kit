#!/usr/bin/env node
/**
 * One-command installer for the AI Frontend Guide kit.
 *
 * Copies ai-frontend-guide-kit/ into the target project, installs the design
 * skills (optional) and checks (or installs) the local Laya decision engine.
 *
 * Usage:
 *   node install.mjs [--target <dir>] [--no-skills] [--with-laya] [--help]
 *
 * When published to GitHub this file is exposed as a bin, so
 *   npx github:<owner>/<repo>
 * runs it without installing dependencies.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const KIT_SOURCE = join(REPO_ROOT, 'ai-frontend-guide-kit');

const BLOCK_START = '<!-- ai-frontend-guide-kit:start -->';
const BLOCK_END = '<!-- ai-frontend-guide-kit:end -->';

const AGENTS_BLOCK = `${BLOCK_START}
## Frontend, UI and design: always this flow (ai-frontend-guide-kit)
**Mandatory.** Any request about frontend, UI, UX, design, a screen, page, component, style or polish, however small,
starts like this, before any file is read or edited:
1. Read \`ai-frontend-guide-kit/INDEX.md\`.
2. Run \`node ai-frontend-guide-kit/tools/flow.mjs status\`, declare the route with \`flow.mjs start <route>\` (a small change
   is route \`iterate\`), follow \`flow.mjs next\` and close each step with \`flow.mjs done <step>\`, which refuses a skipped step.
The flow is never skipped. Routes: \`ai-frontend-guide-kit/guides/FLOWS.md\`; full rules: \`ai-frontend-guide-kit/AGENTS.md\`.
Triggers: design, redesign, restyle, UI, UX, look and feel, theme, colors, typography, fonts, spacing, layout, screen, page,
landing, dashboard, component, form, animation, polish; diseño, rediseñar, estilo, aspecto, tema, colores, tipografía,
fuentes, espaciado, maquetación, pantalla, página, landing, componente, formulario, animación, pulir.
Reuse before building: \`node ai-frontend-guide-kit/tools/pieces.mjs find "<need>"\` before any component, and
\`node ai-frontend-guide-kit/tools/ui-map.mjs impact <role|component>\` / \`ui-map.mjs have <name>\` before changing UI
(read \`ai-frontend-output/UI-MAP.md\`, do not explore the repo). Record every decision with \`tools/memory.mjs add\`, and every
piece use, version and reaction with \`tools/pieces.mjs\`.
External design skills never start the work; each runs only at its step (\`guides/00-START-HERE.md\`): landing-page-design in phase 1
(landing pages), hallmark and design-taste-frontend only to build in phase 2, emilkowalski in phases 2-3, impeccable in phase 3
through \`frontend-polish\` (Playwright MCP). UX map: skill \`ux-map\`.
On "what is this", "qué puedo pedirle", "dame un resumen de esta herramienta": read \`ai-frontend-guide-kit/HELP.md\`
(Spanish: \`HELP.es.md\`) and answer from it; never explore the folders to explain the kit.
${BLOCK_END}
`;

// Pre-1.4 installs wrote an unmarked "## Frontend UI" section; it runs until the next "## " heading or EOF.
const LEGACY_BLOCK = /^## Frontend UI\n[\s\S]*?(?=^## |(?![\s\S]))/m;

/** Puts the block at the top of a file that does not have it yet: below a leading frontmatter and H1 title, if any. */
function insertAtTop(current) {
  let end = current.match(/^---\n[\s\S]*?\n---\n/)?.[0].length ?? 0;
  end += current.slice(end).match(/^(?:[ \t]*\n)*# [^\n]*(?:\n|$)/)?.[0].length ?? 0;
  let head = current.slice(0, end);
  const tail = current.slice(end);
  if (head && !head.endsWith('\n')) head += '\n';
  return `${head}${head ? '\n' : ''}${AGENTS_BLOCK}${tail && !tail.startsWith('\n') ? '\n' : ''}${tail}`;
}

/** Inserts or refreshes the kit block in an instruction file, never touching content outside it. */
function upsertKitBlock(path, header) {
  const original = existsSync(path) ? readFileSync(path, 'utf8') : null;
  // Work on LF text and write back with the file's own line ending (Windows files are often CRLF).
  const eol = original?.includes('\r\n') ? '\r\n' : '\n';
  const current = original?.replace(/\r\n/g, '\n') ?? null;
  const legacy = current?.match(LEGACY_BLOCK)?.[0];
  const end = current?.indexOf(BLOCK_END) ?? -1;
  // Nearest start before the end marker, so an orphan start earlier in the file never swallows user text.
  const start = end === -1 ? -1 : current.lastIndexOf(BLOCK_START, end);
  let next;
  if (current === null) {
    next = `${header}\n\n${AGENTS_BLOCK}`;
  } else if (start !== -1) {
    next = `${current.slice(0, start)}${AGENTS_BLOCK.trimEnd()}${current.slice(end + BLOCK_END.length)}`;
  } else if (legacy?.includes('ai-frontend-guide-kit/AGENTS.md')) {
    next = current.replace(legacy, `${AGENTS_BLOCK}\n`);
  } else {
    next = insertAtTop(current);
  }
  next = next.replace(/\n/g, eol);
  if (next === original) return 'unchanged';
  writeFileSync(path, next, 'utf8');
  return original === null ? 'created' : 'updated';
}

const OUTPUT_README = `# ai-frontend-output

Selection memory of the AI Frontend Guide kit. Created by the installer and preserved on kit refreshes.

- \`selections.jsonl\` — append-only history of component decisions.
- \`combinations.json\` — named, reusable combinations of decisions.
- \`libraries.json\` — UI libraries in use and to research (\`memory.mjs lib add|list|sync\`).
- \`flow-state.json\` — the declared design route and its current step (\`flow.mjs status|start|next|done\`); commit it so everyone shares the step.
- \`SUMMARY.md\` — generated summary of styles and components extracted.
- \`ui-map.json\` and \`UI-MAP.md\` — map of the frontend (components, users, routes, roles, strays); read \`UI-MAP.md\` instead of exploring.
- \`ui-history.jsonl\` — append-only history of components added and removed between builds.

Both are generated by \`node ai-frontend-guide-kit/tools/ui-map.mjs build\` (always run by the installer; \`impact\` and \`have\` rebuild when stale).

Managed via \`node ai-frontend-guide-kit/tools/memory.mjs\` (\`add\`, \`list\`, \`summary\`, \`combo save|list|show|apply\`).
Reuse combinations across projects by copying \`combinations.json\` or pointing \`AI_FRONTEND_OUTPUT\` to a shared folder.
Recommended: commit this folder with the project (it is project history, not build output).
`;

const KIT_SKILLS_DIR = join(REPO_ROOT, 'skills');

// External design skills, installed by default in both modes (--no-design-skills skips them in copy mode).
const DESIGN_SKILL_REPOS = [
  ['https://github.com/pbakaus/impeccable', '--skill', 'impeccable'],
  ['https://github.com/Leonxlnx/taste-skill', '--skill', 'design-taste-frontend'],
  ['https://github.com/emilkowalski/skills', null],
  ['https://github.com/nutlope/hallmark', '--skill', 'hallmark'],
  // Only this skill: the repo also ships figma-designer, which the kit flow does not use.
  ['https://github.com/elayadesign/ai-design-skills', '--skill', 'landing-page-design'],
];

// CLI mode (--skills-mode cli): the previous full flow, lockfile + multi-agent links.
const CLI_SKILL_REPOS = [
  ...DESIGN_SKILL_REPOS,
  ['https://github.com/urben88/ai-frontend-guide-kit', null],
];

function parseArgs(argv) {
  const args = { command: null, target: process.cwd(), skills: true, skillsMode: 'copy', designSkills: true, mcp: true, laya: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--no-skills') args.skills = false;
    else if (token === '--design-skills') args.designSkills = true;
    else if (token === '--no-design-skills') args.designSkills = false;
    else if (token === '--no-mcp') args.mcp = false;
    else if (token === '--skills-mode') args.skillsMode = argv[++i];
    else if (token === '--with-laya') args.laya = true;
    else if (token === '--target') args.target = argv[++i];
    else if (token === 'init' || token === 'update') args.command = token;
  }
  if (!['copy', 'cli'].includes(args.skillsMode)) {
    console.error(`Invalid --skills-mode "${args.skillsMode}". Use "copy" (default) or "cli".`);
    process.exit(1);
  }
  return args;
}

function printHelp() {
  console.log(`AI Frontend Guide installer

Usage:
  node install.mjs [init | update] [options]

Commands:
  init, update          the same run: refresh the kit, the guiding documents and the project scan
                        (with neither, the installer does the same; the command only names the intent)

Options:
  --target <dir>        install into <dir> (default: current directory)
  --no-skills           skip installing skills entirely
  --skills-mode <mode>  copy (default): copy the 20 kit skills to .agents/skills (clean, no lockfile)
                        cli: use "npx skills add" (lockfile + multi-agent links, includes design skills)
  --no-design-skills    skip the 5 external design skill repos (impeccable/taste-skill/emilkowalski/hallmark/
                        landing-page-design; need network)
  --no-mcp              skip the Playwright + Excalidraw MCP configuration
  --with-laya           install/update Laya with pip (heavy: pulls torch on first install)
  --help                show this help

What it does:
  1. Copies ai-frontend-guide-kit/ (catalog + guides + tools) into the target.
  2. Adds (or refreshes) the marked design-routing block, which tells every agent to read
     ai-frontend-guide-kit/INDEX.md and run the flow first. Always in AGENTS.md and CLAUDE.md (created when
     missing); only when already present in .claude/CLAUDE.md, GEMINI.md, .github/copilot-instructions.md,
     .cursorrules and .windsurfrules; and in .cursor/rules/ai-frontend-guide-kit.mdc (alwaysApply) when .cursor/
     exists. A new block goes at the top, below a leading title; an existing one is refreshed in place and
     nothing outside the markers changes. Removes the legacy ai-frontend-guide/ folder.
  3. Creates ai-frontend-output/ (selection memory) if missing; it is never removed on refresh.
     It also creates ai-frontend-output/ux/ux-map.excalidraw (Excalidraw scaffold) if missing.
  4. Installs skills into .agents/skills: copy mode copies the 20 kit skills (workflow + 16 UX flows +
     frontend-polish + ux-map + frontend-refactor); if the project has a .claude/ folder, they are also
     linked into .claude/skills (junction/symlink, fallback to copy). The 5 external design skill repos also
     install by default via the CLI (use --no-design-skills to skip them).
  5. Configures the Playwright + Excalidraw MCP servers for detected harnesses (.claude/ -> .mcp.json,
     opencode.json -> mcp.playwright + mcp.excalidraw); the Excalidraw server is the local,
     dependency-free one shipped in the kit (offline). Prints instructions otherwise (--no-mcp to skip).
     It also prints the optional Agentation install message (point-and-change on React apps; not auto-installed).
  6. Always scans the project with ui-map (node ai-frontend-guide-kit/tools/ui-map.mjs build) and writes
     ai-frontend-output/ui-map.json, UI-MAP.md and ui-history.jsonl. It never edits source; a failed scan
     only prints a warning. History is preserved on refresh.
  7. Checks Python/Laya; with --with-laya installs it and verifies.
`);
}

function runCliSkills(target, repos, label) {
  console.log(`- installing ${label} via skills CLI (needs network)`);
  const isWindows = process.platform === 'win32';
  for (const [repo, flag, skill] of repos) {
    const skillArgs = flag && skill ? [flag, skill] : [];
    const result = spawnSync('npx', ['--yes', 'skills', 'add', repo, ...skillArgs, '--yes'], {
      stdio: 'inherit',
      cwd: target,
      timeout: 300000,
      shell: isWindows, // npx is npx.cmd on Windows; needs the shell to resolve
    });
    if (result.status !== 0) {
      console.warn(`  ! skill install failed for ${repo}${result.error ? ` (${result.error.message})` : ''} (continuing; kit works without skills)`);
    }
  }
}

function installSkillsCopy(target) {
  if (!existsSync(KIT_SKILLS_DIR)) {
    console.warn('  ! skills/ not found in the package; skipping skill copy (use --skills-mode cli)');
    return { names: [], copied: 0 };
  }
  const names = readdirSync(KIT_SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const destRoot = join(target, '.agents', 'skills');
  mkdirSync(destRoot, { recursive: true });
  for (const name of names) {
    const dest = join(destRoot, name);
    if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
    cpSync(join(KIT_SKILLS_DIR, name), dest, { recursive: true });
  }
  return { names, copied: names.length };
}

function linkSkillsForClaude(target, names) {
  const claudeDir = join(target, '.claude');
  if (!existsSync(claudeDir) || names.length === 0) return { skipped: true, linked: 0, copied: 0 };
  const destRoot = join(claudeDir, 'skills');
  mkdirSync(destRoot, { recursive: true });
  let linked = 0;
  let copied = 0;
  for (const name of names) {
    const source = join(target, '.agents', 'skills', name);
    const dest = join(destRoot, name);
    if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
    try {
      symlinkSync(source, dest, process.platform === 'win32' ? 'junction' : 'dir');
      linked += 1;
    } catch {
      cpSync(source, dest, { recursive: true });
      copied += 1;
    }
  }
  return { skipped: false, linked, copied };
}

const PLAYWRIGHT_MCP_ARGS = ['@playwright/mcp@latest'];
const EXCALIDRAW_MCP_SCRIPT = 'ai-frontend-guide-kit/tools/excalidraw-mcp.mjs';
const DIAGRAM_REL_PATH = 'ai-frontend-output/ux/ux-map.excalidraw';

const DIAGRAM_SCAFFOLD = {
  type: 'excalidraw',
  version: 2,
  source: 'https://excalidraw.com',
  elements: [],
  appState: { gridSize: null, viewBackgroundColor: '#ffffff' },
  files: {},
};

function excalidrawMcpArgs() {
  return [EXCALIDRAW_MCP_SCRIPT, '--diagram', DIAGRAM_REL_PATH];
}

function readJsonConfig(path) {
  try {
    const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, ''); // tolerate a UTF-8 BOM (Windows editors)
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

function printMcpInstructions() {
  console.log('- MCP: no Claude Code/OpenCode project config found. To enable Playwright + Excalidraw:');
  console.log('    Claude Code:  claude mcp add playwright -- npx @playwright/mcp@latest');
  console.log(`                  claude mcp add excalidraw -- node ${excalidrawMcpArgs().join(' ')}`);
  console.log(`    OpenCode:     add to opencode.json "mcp": { "playwright": { "type": "local", "command": ["npx", "${PLAYWRIGHT_MCP_ARGS[0]}"], "enabled": true }, "excalidraw": { "type": "local", "command": ["node", ${excalidrawMcpArgs().map((arg) => `"${arg}"`).join(', ')}], "enabled": true } }`);
}

const MCP_SERVER_DEFS = {
  playwright: () => ({ command: 'npx', args: PLAYWRIGHT_MCP_ARGS }),
  excalidraw: () => ({ command: 'node', args: excalidrawMcpArgs() }),
};

const OPENCODE_MCP_DEFS = {
  playwright: () => ({ type: 'local', command: ['npx', ...PLAYWRIGHT_MCP_ARGS], enabled: true }),
  excalidraw: () => ({ type: 'local', command: ['node', ...excalidrawMcpArgs()], enabled: true }),
};

const MCP_SERVER_NAMES = ['playwright', 'excalidraw'];

function mergeMissingServers(container, defs) {
  const missing = MCP_SERVER_NAMES.filter((name) => !container[name]);
  for (const name of missing) container[name] = defs[name]();
  return missing;
}

function printAgentationHint() {
  console.log('- Optional (React projects) — Agentation: click an element in the browser and tell the agent exactly what to change. Not installed automatically:');
  console.log('    npm install agentation -D');
  console.log('    claude mcp add agentation -- npx -y agentation-mcp server     (Windows fallback: ... -- cmd /c npx -y agentation-mcp server)');
  console.log('    npx agentation-mcp doctor');
  console.log('    mount <Agentation endpoint="http://localhost:4747" /> in the app root, development only. See guides/11-VISUAL-FEEDBACK.md');
}

function setupMcp(target) {
  let detected = false;
  let configured = false;
  const claudeDir = join(target, '.claude');
  const opencodePath = join(target, 'opencode.json');
  const opencodeJsoncPath = join(target, 'opencode.jsonc');

  if (existsSync(claudeDir)) {
    detected = true;
    const mcpPath = join(target, '.mcp.json');
    if (!existsSync(mcpPath)) {
      const mcpServers = {};
      mergeMissingServers(mcpServers, MCP_SERVER_DEFS);
      writeFileSync(mcpPath, `${JSON.stringify({ mcpServers }, null, 2)}\n`, 'utf8');
      console.log('- MCP: created .mcp.json with playwright + excalidraw (Claude Code)');
      configured = true;
    } else {
      const parsed = readJsonConfig(mcpPath);
      if (!parsed.ok) {
        console.warn('  ! MCP: .mcp.json is not valid JSON; not modified. Add manually: "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] }, "excalidraw": { "command": "node", "args": ["ai-frontend-guide-kit/tools/excalidraw-mcp.mjs", "--diagram", "ai-frontend-output/ux/ux-map.excalidraw"] } }');
      } else {
        const mcpServers = parsed.data.mcpServers && typeof parsed.data.mcpServers === 'object' ? parsed.data.mcpServers : {};
        const missing = mergeMissingServers(mcpServers, MCP_SERVER_DEFS);
        if (missing.length === 0) {
          console.log('- MCP: playwright + excalidraw already configured in .mcp.json (Claude Code)');
          configured = true;
        } else {
          parsed.data.mcpServers = mcpServers;
          writeFileSync(mcpPath, `${JSON.stringify(parsed.data, null, 2)}\n`, 'utf8');
          console.log(`- MCP: added ${missing.join(' + ')} to .mcp.json (Claude Code)`);
          configured = true;
        }
      }
    }
  }

  if (existsSync(opencodePath)) {
    detected = true;
    const parsed = readJsonConfig(opencodePath);
    if (!parsed.ok) {
      console.warn('  ! MCP: opencode.json is not valid JSON; not modified. Add manually: "mcp": { "playwright": { "type": "local", "command": ["npx", "@playwright/mcp@latest"], "enabled": true }, "excalidraw": { "type": "local", "command": ["node", "ai-frontend-guide-kit/tools/excalidraw-mcp.mjs", "--diagram", "ai-frontend-output/ux/ux-map.excalidraw"], "enabled": true } }');
    } else {
      const mcp = parsed.data.mcp && typeof parsed.data.mcp === 'object' ? parsed.data.mcp : {};
      const missing = mergeMissingServers(mcp, OPENCODE_MCP_DEFS);
      if (missing.length === 0) {
        console.log('- MCP: playwright + excalidraw already configured in opencode.json');
        configured = true;
      } else {
        parsed.data.mcp = mcp;
        writeFileSync(opencodePath, `${JSON.stringify(parsed.data, null, 2)}\n`, 'utf8');
        console.log(`- MCP: added ${missing.join(' + ')} to opencode.json`);
        configured = true;
      }
    }
  }

  if (existsSync(opencodeJsoncPath)) {
    detected = true;
    console.log('- MCP: opencode.jsonc detected; it is not edited (comments would be lost). Add manually:');
    console.log('    "mcp": { "playwright": { "type": "local", "command": ["npx", "@playwright/mcp@latest"], "enabled": true }, "excalidraw": { "type": "local", "command": ["node", "ai-frontend-guide-kit/tools/excalidraw-mcp.mjs", "--diagram", "ai-frontend-output/ux/ux-map.excalidraw"], "enabled": true } }');
  }

  if (!detected) printMcpInstructions();
  if (!configured && detected) console.log('  Add the missing servers manually as shown above.');
  console.log('- Playwright MCP: install the browser once before the polish phase: npx playwright install chromium');
  printAgentationHint();
}

function findPython() {
  const candidates = [
    ['python', []],
    ['py', ['-3']],
    ['python3', []],
  ];
  for (const [bin, extra] of candidates) {
    try {
      const result = spawnSync(bin, [...extra, '--version'], { encoding: 'utf8', timeout: 60000 });
      if (result.status === 0) {
        const match = `${result.stdout}${result.stderr}`.match(/Python (\d+)\.(\d+)/);
        if (match) {
          const major = Number(match[1]);
          const minor = Number(match[2]);
          return { bin, extra, version: `${major}.${minor}`, ok: major === 3 && minor >= 10 };
        }
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

function runLaya(python, kitDir, extraArgs) {
  const script = join(kitDir, 'tools', 'laya_select.py');
  return spawnSync(python.bin, [...python.extra, script, ...extraArgs], { stdio: 'inherit' });
}

function ensureUxMap(target) {
  const uxDir = join(target, 'ai-frontend-output', 'ux');
  mkdirSync(uxDir, { recursive: true });
  const mapPath = join(uxDir, 'ux-map.excalidraw');
  if (existsSync(mapPath)) {
    console.log('- ai-frontend-output/ux/ux-map.excalidraw found: preserved');
    return;
  }
  writeFileSync(mapPath, `${JSON.stringify(DIAGRAM_SCAFFOLD, null, 2)}\n`, 'utf8');
  console.log('- created ai-frontend-output/ux/ux-map.excalidraw (Excalidraw scaffold; the Excalidraw MCP needs it to exist)');
}

/** Writes the frontend map under ai-frontend-output/ only. A failure warns and never stops the install. */
function buildUiMap(target, kitDest) {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT; // the installer writes only inside the target
  delete env.AI_FRONTEND_PROJECT;
  const result = spawnSync(process.execPath, [join(kitDest, 'tools', 'ui-map.mjs'), 'build', '--dir', target], { encoding: 'utf8', timeout: 120000, env });
  if (result.status === 0) {
    const summary = result.stdout.split('\n').find((line) => line.startsWith('ui-map:'));
    console.log(`- ${summary ?? 'ui-map: frontend map written'} -> ai-frontend-output/UI-MAP.md`);
    return;
  }
  const reason = (result.stderr || result.error?.message || `exit ${result.status}`).trim().split('\n')[0];
  console.warn(`  ! ui-map: scan failed (${reason}); continuing. Retry later: node ai-frontend-guide-kit/tools/ui-map.mjs build`);
}

const CURSOR_RULE = join('.cursor', 'rules', 'ai-frontend-guide-kit.mdc');
const CURSOR_HEADER = '---\ndescription: Always follow the ai-frontend-guide-kit flow for any frontend, UI, UX or design work\nalwaysApply: true\n---';

// Always written (created when missing): Claude Code reads CLAUDE.md, not AGENTS.md. The rest only when already there.
const ALWAYS_DOCS = [['AGENTS.md', '# Project agent instructions'], ['CLAUDE.md', '# Project instructions for Claude Code']];
const PRESENT_DOCS = [join('.claude', 'CLAUDE.md'), 'GEMINI.md', join('.github', 'copilot-instructions.md'), '.cursorrules', '.windsurfrules'];

/** Refreshes the kit block in every agent instruction document the project uses (init, update and a bare run alike). */
function updateAgentDocuments(target) {
  const files = [...ALWAYS_DOCS, ...PRESENT_DOCS.filter((file) => existsSync(join(target, file))).map((file) => [file, ''])];
  if (existsSync(join(target, '.cursor'))) {
    mkdirSync(join(target, '.cursor', 'rules'), { recursive: true });
    files.push([CURSOR_RULE, CURSOR_HEADER]);
  }
  for (const [file, header] of files) {
    console.log(`- ${file}: kit routing block ${upsertKitBlock(join(target, file), header)}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!existsSync(KIT_SOURCE)) {
    console.error(`Kit not found at ${KIT_SOURCE}. Run this from the repository root.`);
    process.exit(1);
  }

  const target = resolve(args.target);
  mkdirSync(target, { recursive: true });
  const kitDest = join(target, 'ai-frontend-guide-kit');

  console.log(`Installing AI Frontend Guide into: ${target}`);
  const legacyKit = join(target, 'ai-frontend-guide');
  if (existsSync(legacyKit)) {
    rmSync(legacyKit, { recursive: true, force: true });
    console.log('- removed legacy ai-frontend-guide/ folder (replaced by ai-frontend-guide-kit/)');
  }
  if (existsSync(kitDest)) {
    console.log('- existing ai-frontend-guide-kit/ found: refreshing it');
    rmSync(kitDest, { recursive: true, force: true });
  }
  cpSync(KIT_SOURCE, kitDest, { recursive: true });
  console.log('- kit copied (catalog + guides + tools)');

  const outputDir = join(target, 'ai-frontend-output');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, 'README.md'), OUTPUT_README, 'utf8');
    console.log('- created ai-frontend-output/ (selection memory; preserved on refresh)');
  } else {
    console.log('- ai-frontend-output/ found: preserved (history and combinations untouched)');
  }

  ensureUxMap(target);
  buildUiMap(target, kitDest);

  updateAgentDocuments(target);

  if (args.skills) {
    if (args.skillsMode === 'cli') {
      runCliSkills(target, CLI_SKILL_REPOS, 'all skills (workflow + UX + design)');
    } else {
      const { names, copied } = installSkillsCopy(target);
      console.log(`- ${copied} skills copied to .agents/skills/ (clean: no lockfile, no symlinks)`);
      if (args.designSkills) {
        runCliSkills(target, DESIGN_SKILL_REPOS, 'external design skills (impeccable + taste-skill + emilkowalski + hallmark + landing-page-design)');
      } else {
        console.log('- external design skills skipped (--no-design-skills)');
      }
      const claude = linkSkillsForClaude(target, names);
      if (claude.skipped) {
        console.log('- no .claude/ folder found: Claude Code linking skipped');
      } else {
        console.log(`- Claude Code: ${claude.linked} skill(s) linked, ${claude.copied} copied (fallback) in .claude/skills/`);
      }
    }
  } else {
    console.log('- skills skipped (--no-skills)');
  }

  if (args.mcp) {
    setupMcp(target);
  } else {
    console.log('- MCP setup skipped (--no-mcp)');
  }

  const python = findPython();
  if (!python) {
    console.log('- Laya: Python 3.10+ not found; ranking unavailable (find/get still work)');
  } else if (!python.ok) {
    console.log(`- Laya: Python ${python.version} found but 3.10+ is required; ranking unavailable`);
  } else if (args.laya) {
    console.log(`- Laya: installing with ${python.bin} ${python.extra.join(' ')}`.trim());
    const install = runLaya(python, kitDest, ['--install']);
    if (install.status === 0) runLaya(python, kitDest, ['--check']);
  } else {
    runLaya(python, kitDest, ['--check']);
    if (spawnSync(python.bin, [...python.extra, '-c', 'import laya'], { timeout: 60000 }).status !== 0) {
      console.log(`  To enable local ranking later: python ai-frontend-guide-kit/tools/laya_select.py --install`);
    }
  }

  console.log(`
Done. Next steps for the agent:
  1. Read ai-frontend-guide-kit/INDEX.md, then AGENTS.md, and ask the user what they want before routing:
     a new frontend (UX -> composition -> polish), a small change, a custom addition,
     or polish only. Phases are entry points, not a fixed pipeline.
  2. Phase 1 (UX/teoria): node ai-frontend-guide-kit/tools/context.mjs, then follow
     guides/01-EXPERIENCE-DIRECTION.md -> EXPERIENCE-BRIEF.md, and guides/02-UX-FLOWS.md
     (if the repo already has UX, ask the user: summarize as-is or radical redesign).
     Generate and maintain the visual map with the ux-map skill and the local Excalidraw MCP
     -> ai-frontend-output/ux/ux-map.excalidraw.
  3. Phase 2 (composition): check what the project already has with
     node ai-frontend-guide-kit/tools/ui-map.mjs have <name> (map: ai-frontend-output/UI-MAP.md), then saved combinations with
     node ai-frontend-guide-kit/tools/memory.mjs combo list, follow guides/00-START-HERE.md,
     and record every decision:
     node ai-frontend-guide-kit/tools/memory.mjs add --screen ... --block ... --need "..." --decision reuse|adapt|build --id <entry-id>
     Query candidates with node ai-frontend-guide-kit/tools/find.mjs ... and, only after asking
     the user for consent (once per session), rank them with
     python ai-frontend-guide-kit/tools/laya_select.py --need "..." --confirmed.
  4. Phase 3 (polish): use the frontend-polish skill with Playwright MCP; run
     npx playwright install chromium once before the first browser pass.
`);
}

main();
