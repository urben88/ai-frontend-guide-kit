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

const AGENTS_BLOCK = `## Frontend UI
Before creating UI components, follow \`ai-frontend-guide-kit/AGENTS.md\` (reuse-first workflow).
Ask the user first what they want (new frontend UX -> composition -> polish, a small change, a custom
addition, or polish only) and enter the three-phase workflow at the right point before touching code.
Optional accelerator: \`python ai-frontend-guide-kit/tools/laya_select.py --check\` (local Laya decision engine).
Selection memory: record every decision with \`node ai-frontend-guide-kit/tools/memory.mjs add ...\` and reuse saved
combinations from \`ai-frontend-output/\` before searching the catalog.
Polish phase: use the \`frontend-polish\` skill with Playwright MCP (\`npx @playwright/mcp@latest\`).
UX map: generate and maintain \`ai-frontend-output/ux/ux-map.excalidraw\` with the \`ux-map\` skill and the Excalidraw MCP
(\`npx -y @cmd8/excalidraw-mcp --diagram ai-frontend-output/ux/ux-map.excalidraw\`).
`;

const OUTPUT_README = `# ai-frontend-output

Selection memory of the AI Frontend Guide kit. Created by the installer and preserved on kit refreshes.

- \`selections.jsonl\` — append-only history of component decisions.
- \`combinations.json\` — named, reusable combinations of decisions.
- \`SUMMARY.md\` — generated summary of styles and components extracted.

Managed via \`node ai-frontend-guide-kit/tools/memory.mjs\` (\`add\`, \`list\`, \`summary\`, \`combo save|list|show|apply\`).
Reuse combinations across projects by copying \`combinations.json\` or pointing \`AI_FRONTEND_OUTPUT\` to a shared folder.
Recommended: commit this folder with the project (it is project history, not build output).
`;

const KIT_SKILLS_DIR = join(REPO_ROOT, 'skills');

// CLI mode (--skills-mode cli): the previous full flow, lockfile + multi-agent links.
const CLI_SKILL_REPOS = [
  ['https://github.com/pbakaus/impeccable', '--skill', 'impeccable'],
  ['https://github.com/Leonxlnx/taste-skill', '--skill', 'design-taste-frontend'],
  ['https://github.com/emilkowalski/skills', null],
  ['https://github.com/urben88/ai-frontend-guide-kit', null],
];

// Optional external design skills in copy mode (--design-skills).
const DESIGN_SKILL_REPOS = [
  ['https://github.com/pbakaus/impeccable', '--skill', 'impeccable'],
  ['https://github.com/Leonxlnx/taste-skill', '--skill', 'design-taste-frontend'],
  ['https://github.com/emilkowalski/skills', null],
];

function parseArgs(argv) {
  const args = { target: process.cwd(), skills: true, skillsMode: 'copy', designSkills: true, mcp: true, laya: false, help: false };
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
  node install.mjs [options]

Options:
  --target <dir>        install into <dir> (default: current directory)
  --no-skills           skip installing skills entirely
  --skills-mode <mode>  copy (default): copy the 19 kit skills to .agents/skills (clean, no lockfile)
                        cli: use "npx skills add" (lockfile + multi-agent links, includes design skills)
  --no-design-skills    skip the 3 external design skills (impeccable/taste-skill/emilkowalski; need network)
  --no-mcp              skip the Playwright + Excalidraw MCP configuration
  --with-laya           install/update Laya with pip (heavy: pulls torch on first install)
  --help                show this help

What it does:
  1. Copies ai-frontend-guide-kit/ (catalog + guides + tools) into the target.
  2. Adds a pointer block to the target's AGENTS.md and removes the legacy ai-frontend-guide/ folder.
  3. Creates ai-frontend-output/ (selection memory) if missing; it is never removed on refresh.
     It also creates ai-frontend-output/ux/ux-map.excalidraw (Excalidraw scaffold) if missing.
  4. Installs skills into .agents/skills: copy mode copies the 19 kit skills (workflow + 16 UX flows +
     frontend-polish + ux-map); if the project has a .claude/ folder, they are also linked into .claude/skills
     (junction/symlink, fallback to copy). The 3 external design skills also install by default via
     the CLI (use --no-design-skills to skip them).
  5. Configures the Playwright + Excalidraw MCP servers for detected harnesses (.claude/ -> .mcp.json,
     opencode.json -> mcp.playwright + mcp.excalidraw); prints instructions otherwise (--no-mcp to skip).
  6. Checks Python/Laya; with --with-laya installs it and verifies.
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
const EXCALIDRAW_MCP_ARGS = ['-y', '@cmd8/excalidraw-mcp'];
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
  return [...EXCALIDRAW_MCP_ARGS, '--diagram', DIAGRAM_REL_PATH];
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
  console.log(`                  claude mcp add excalidraw -- npx ${excalidrawMcpArgs().join(' ')}`);
  console.log(`    OpenCode:     add to opencode.json "mcp": { "playwright": { "type": "local", "command": ["npx", "${PLAYWRIGHT_MCP_ARGS[0]}"], "enabled": true }, "excalidraw": { "type": "local", "command": ["npx", ${excalidrawMcpArgs().map((arg) => `"${arg}"`).join(', ')}], "enabled": true } }`);
}

const MCP_SERVER_DEFS = {
  playwright: () => ({ command: 'npx', args: PLAYWRIGHT_MCP_ARGS }),
  excalidraw: () => ({ command: 'npx', args: excalidrawMcpArgs() }),
};

const OPENCODE_MCP_DEFS = {
  playwright: () => ({ type: 'local', command: ['npx', ...PLAYWRIGHT_MCP_ARGS], enabled: true }),
  excalidraw: () => ({ type: 'local', command: ['npx', ...excalidrawMcpArgs()], enabled: true }),
};

const MCP_SERVER_NAMES = ['playwright', 'excalidraw'];

function mergeMissingServers(container, defs) {
  const missing = MCP_SERVER_NAMES.filter((name) => !container[name]);
  for (const name of missing) container[name] = defs[name]();
  return missing;
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
        console.warn('  ! MCP: .mcp.json is not valid JSON; not modified. Add manually: "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] }, "excalidraw": { "command": "npx", "args": ["-y", "@cmd8/excalidraw-mcp", "--diagram", "ai-frontend-output/ux/ux-map.excalidraw"] } }');
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
      console.warn('  ! MCP: opencode.json is not valid JSON; not modified. Add manually: "mcp": { "playwright": { "type": "local", "command": ["npx", "@playwright/mcp@latest"], "enabled": true }, "excalidraw": { "type": "local", "command": ["npx", "-y", "@cmd8/excalidraw-mcp", "--diagram", "ai-frontend-output/ux/ux-map.excalidraw"], "enabled": true } }');
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
    console.log('    "mcp": { "playwright": { "type": "local", "command": ["npx", "@playwright/mcp@latest"], "enabled": true }, "excalidraw": { "type": "local", "command": ["npx", "-y", "@cmd8/excalidraw-mcp", "--diagram", "ai-frontend-output/ux/ux-map.excalidraw"], "enabled": true } }');
  }

  if (!detected) printMcpInstructions();
  if (!configured && detected) console.log('  Add the missing servers manually as shown above.');
  console.log('- Playwright MCP: install the browser once before the polish phase: npx playwright install chromium');
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

  const agentsPath = join(target, 'AGENTS.md');
  if (existsSync(agentsPath)) {
    const current = readFileSync(agentsPath, 'utf8');
    if (current.includes('ai-frontend-guide-kit/AGENTS.md')) {
      console.log('- AGENTS.md already points to the kit');
    } else {
      writeFileSync(agentsPath, `${current.trimEnd()}\n\n${AGENTS_BLOCK}`, 'utf8');
      console.log('- pointer added to existing AGENTS.md');
    }
  } else {
    writeFileSync(agentsPath, `# Project agent instructions\n\n${AGENTS_BLOCK}`, 'utf8');
    console.log('- AGENTS.md created with the kit pointer');
  }

  if (args.skills) {
    if (args.skillsMode === 'cli') {
      runCliSkills(target, CLI_SKILL_REPOS, 'all skills (workflow + UX + design)');
    } else {
      const { names, copied } = installSkillsCopy(target);
      console.log(`- ${copied} skills copied to .agents/skills/ (clean: no lockfile, no symlinks)`);
      if (args.designSkills) {
        runCliSkills(target, DESIGN_SKILL_REPOS, 'external design skills (impeccable + taste-skill + emilkowalski)');
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
  1. Read ai-frontend-guide-kit/AGENTS.md and ask the user what they want before routing:
     a new frontend (UX -> composition -> polish), a small change, a custom addition,
     or polish only. Phases are entry points, not a fixed pipeline.
  2. Phase 1 (UX/teoria): node ai-frontend-guide-kit/tools/context.mjs, then follow
     guides/01-UX-FLOWS.md (if the repo already has UX, ask the user: summarize as-is
     or radical redesign). Generate and maintain the visual screen map with the ux-map
     skill and the Excalidraw MCP -> ai-frontend-output/ux/ux-map.excalidraw.
  3. Phase 2 (composition): check saved combinations first with
     node ai-frontend-guide-kit/tools/memory.mjs combo list, follow guides/00-START-HERE.md,
     and record every decision:
     node ai-frontend-guide-kit/tools/memory.mjs add --screen ... --block ... --need "..." --decision reuse|adapt|build --id <entry-id>
     Query candidates with node ai-frontend-guide-kit/tools/find.mjs ... and, only after asking
     the user for consent, rank them with python ai-frontend-guide-kit/tools/laya_select.py --need "..." --confirmed.
  4. Phase 3 (polish): use the frontend-polish skill with Playwright MCP; run
     npx playwright install chromium once before the first browser pass.
`);
}

main();
