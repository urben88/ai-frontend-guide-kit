#!/usr/bin/env node
/**
 * One-command installer for the AI Frontend Guide kit.
 *
 * Copies ai-frontend-guide/ into the target project, installs the design
 * skills (optional) and checks (or installs) the local Laya decision engine.
 *
 * Usage:
 *   node install.mjs [--target <dir>] [--no-skills] [--with-laya] [--help]
 *
 * When published to GitHub this file is exposed as a bin, so
 *   npx github:<owner>/<repo>
 * runs it without installing dependencies.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const KIT_SOURCE = join(REPO_ROOT, 'ai-frontend-guide');

const AGENTS_BLOCK = `## Frontend UI
Before creating UI components, follow \`ai-frontend-guide/AGENTS.md\` (reuse-first workflow).
Optional accelerator: \`python ai-frontend-guide/tools/laya_select.py --check\` (local Laya decision engine).
`;

const SKILLS = [
  ['https://github.com/pbakaus/impeccable', '--skill', 'impeccable'],
  ['https://github.com/Leonxlnx/taste-skill', '--skill', 'design-taste-frontend'],
  ['https://github.com/emilkowalski/skills', null],
];

function parseArgs(argv) {
  const args = { target: process.cwd(), skills: true, laya: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--no-skills') args.skills = false;
    else if (token === '--with-laya') args.laya = true;
    else if (token === '--target') args.target = argv[++i];
  }
  return args;
}

function printHelp() {
  console.log(`AI Frontend Guide installer

Usage:
  node install.mjs [options]

Options:
  --target <dir>   install into <dir> (default: current directory)
  --no-skills      skip installing the design skills
  --with-laya      install/update Laya with pip (heavy: pulls torch on first install)
  --help           show this help

What it does:
  1. Copies ai-frontend-guide/ (catalog + guides + tools) into the target.
  2. Adds a pointer block to the target's AGENTS.md.
  3. Installs design skills via "npx skills add" unless --no-skills.
  4. Checks Python/Laya; with --with-laya installs it and verifies.
`);
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
  const kitDest = join(target, 'ai-frontend-guide');

  console.log(`Installing AI Frontend Guide into: ${target}`);
  if (existsSync(kitDest)) {
    console.log('- existing ai-frontend-guide/ found: refreshing it');
    rmSync(kitDest, { recursive: true, force: true });
  }
  cpSync(KIT_SOURCE, kitDest, { recursive: true });
  console.log('- kit copied (catalog + guides + tools)');

  const agentsPath = join(target, 'AGENTS.md');
  if (existsSync(agentsPath)) {
    const current = readFileSync(agentsPath, 'utf8');
    if (current.includes('ai-frontend-guide/AGENTS.md')) {
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
    console.log('- installing design skills (impeccable, taste-skill, emilkowalski)');
    const isWindows = process.platform === 'win32';
    for (const [repo, flag, skill] of SKILLS) {
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
  } else {
    console.log('- skills skipped (--no-skills)');
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
      console.log(`  To enable local ranking later: python ai-frontend-guide/tools/laya_select.py --install`);
    }
  }

  console.log(`
Done. Next steps for the agent:
  1. Read ai-frontend-guide/AGENTS.md.
  2. Follow guides/00-START-HERE.md.
  3. Query candidates with node ai-frontend-guide/tools/find.mjs ... and, only after asking
     the user for consent, rank them with python ai-frontend-guide/tools/laya_select.py --need "..." --confirmed.
`);
}

main();
