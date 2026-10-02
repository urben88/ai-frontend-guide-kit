#!/usr/bin/env node
/**
 * sync-ux-skills — vendors jpoindexter/ux-flow-skills (MIT) into this repository.
 *
 * Downloads the skill tree at the latest commit of the source repo, validates
 * the MIT license and each SKILL.md frontmatter, writes the files flat under
 * skills/<name>/ (next to skills/ai-frontend-guide/) and records the pinned
 * commit in skills/UX-SKILLS-ORIGIN.md.
 *
 * Usage:
 *   node tools/sync-ux-skills.mjs          # fetch and vendor the latest commit
 *   node tools/sync-ux-skills.mjs --check  # report if the origin has a newer commit (no writes)
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = join(ROOT, 'skills');
const ORIGIN_FILE = join(SKILLS_DIR, 'UX-SKILLS-ORIGIN.md');
const LICENSE_FILE = join(SKILLS_DIR, 'UX-SKILLS-LICENSE');

const SOURCE_REPO = 'jpoindexter/ux-flow-skills';
const API = `https://api.github.com/repos/${SOURCE_REPO}`;
const RAW = `https://raw.githubusercontent.com/${SOURCE_REPO}`;
const EXPECTED_SKILLS = 16;

const HEADERS = { 'user-agent': 'ai-frontend-guide-kit-sync', accept: 'application/vnd.github+json, text/plain' };

async function fetchText(url) {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`GET ${url} -> HTTP ${response.status}`);
  return response.text();
}

async function fetchJSON(url) {
  return JSON.parse(await fetchText(url));
}

function pinnedCommit() {
  if (!existsSync(ORIGIN_FILE)) return null;
  const match = readFileSync(ORIGIN_FILE, 'utf8').match(/^- \*\*Commit:\*\* ([0-9a-f]{7,40})/m);
  return match ? match[1] : null;
}

function validateFrontmatter(name, content) {
  if (!content.startsWith('---')) return `missing frontmatter`;
  const front = content.slice(3, content.indexOf('\n---', 3));
  if (!/name:\s*\S+/.test(front)) return `missing "name"`;
  if (!/description:\s*\S+/.test(front)) return `missing "description"`;
  const declared = front.match(/name:\s*(\S+)/)[1].replace(/["']/g, '');
  if (declared !== name) return `frontmatter name "${declared}" != directory "${name}"`;
  return null;
}

async function main() {
  const check = process.argv.includes('--check');
  const latest = (await fetchJSON(`${API}/commits/main`)).sha;
  const pinned = pinnedCommit();

  if (check) {
    if (!pinned) {
      console.log(`No vendored UX skills found (pinned: none). Latest origin commit: ${latest.slice(0, 10)}`);
      process.exit(0);
    }
    if (pinned === latest) {
      console.log(`UX skills up to date (${latest.slice(0, 10)}).`);
    } else {
      console.log(`UX skills update available: pinned ${pinned.slice(0, 10)} -> latest ${latest.slice(0, 10)}.`);
      console.log('Run: node tools/sync-ux-skills.mjs');
    }
    process.exit(0);
  }

  console.log(`Syncing UX skills from ${SOURCE_REPO} at ${latest.slice(0, 10)}…`);
  const tree = await fetchJSON(`${API}/git/trees/${latest}?recursive=1`);
  const blobs = tree.tree.filter((node) => node.type === 'blob' && (node.path === 'LICENSE' || node.path.startsWith('skills/')));

  const license = await fetchText(`${RAW}/${latest}/LICENSE`);
  if (!/MIT License/i.test(license) || !/Permission is hereby granted/i.test(license)) {
    throw new Error('Origin LICENSE is not MIT; aborting for license safety.');
  }

  mkdirSync(SKILLS_DIR, { recursive: true });
  writeFileSync(LICENSE_FILE, license, 'utf8');

  // Remove previously vendored UX skills so upstream deletions do not linger.
  for (const entry of blobs.filter((node) => node.path.endsWith('/SKILL.md'))) {
    const name = entry.path.split('/')[1];
    const dir = join(SKILLS_DIR, name);
    if (existsSync(dir) && name !== 'ai-frontend-guide') rmSync(dir, { recursive: true, force: true });
  }

  const skills = new Set();
  let written = 0;
  for (const blob of blobs) {
    const relativePath = blob.path === 'LICENSE' ? null : blob.path.replace(/^skills\//, '');
    if (!relativePath) continue;
    const [name, ...rest] = relativePath.split('/');
    if (name === 'ai-frontend-guide') throw new Error('Origin tries to overwrite our own skill directory');
    const target = join(SKILLS_DIR, name, ...rest);
    const content = await fetchText(`${RAW}/${latest}/${blob.path}`);
    if (rest.join('/') === 'SKILL.md') {
      const problem = validateFrontmatter(name, content);
      if (problem) throw new Error(`Invalid skill ${name}: ${problem}`);
      skills.add(name);
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content, 'utf8');
    written += 1;
  }

  if (skills.size !== EXPECTED_SKILLS) {
    throw new Error(`Expected ${EXPECTED_SKILLS} skills, got ${skills.size} (${[...skills].join(', ')})`);
  }
  if (!existsSync(join(SKILLS_DIR, 'userflow', 'report-template.html'))) {
    throw new Error('Missing skills/userflow/report-template.html');
  }

  const origin = [
    '# UX Skills Origin',
    '',
    `- **Repo:** https://github.com/${SOURCE_REPO}`,
    `- **Commit:** ${latest}`,
    `- **Fetched:** ${new Date().toISOString().slice(0, 10)}`,
    `- **Skills:** ${skills.size} (${[...skills].sort().join(', ')})`,
    '- **License:** MIT — full text in `UX-SKILLS-LICENSE` (copied verbatim from the origin).',
    '',
    'Do not edit the vendored SKILL.md files by hand: update them with `node tools/sync-ux-skills.mjs`',
    'and check for upstream changes with `node tools/sync-ux-skills.mjs --check`.',
    '',
  ].join('\n');
  writeFileSync(ORIGIN_FILE, origin, 'utf8');

  console.log(`Vendored ${written} files for ${skills.size} skills into skills/ (commit ${latest.slice(0, 10)}).`);
  console.log('Updated skills/UX-SKILLS-ORIGIN.md and skills/UX-SKILLS-LICENSE.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
