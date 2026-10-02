/**
 * Builds the portable kit: syncs the catalog from manifest/ into
 * ai-frontend-guide-kit/catalog/ and verifies every kit asset is present.
 * Idempotent: running it twice produces the same tree.
 *
 * Usage: node tools/build-kit.mjs
 */
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, MANIFEST_DIR } from './extract/lib.mjs';

const KIT_DIR = join(ROOT, 'ai-frontend-guide-kit');
const CATALOG_DIR = join(KIT_DIR, 'catalog');

const CATALOG_FILES = ['component-manifest.json', 'component-manifest.md', 'taxonomy.md', 'install-guides.md', 'schema.json'];
const REQUIRED_KIT_FILES = [
  'AGENTS.md',
  'README.md',
  'guides/00-START-HERE.md',
  'guides/01-EXPERIENCE-DIRECTION.md',
  'guides/02-UX-FLOWS.md',
  'guides/ADAPTERS.md',
  'guides/03-TOKENS.md',
  'guides/04-INVENTORY.md',
  'guides/05-FIND.md',
  'guides/06-REUSE.md',
  'guides/07-ADAPT.md',
  'guides/08-PHILOSOPHY.md',
  'guides/09-VERIFY.md',
  'guides/10-ITERATE.md',
  'experience/EXPERIENCE-DIRECTION.md',
  'experience/QUESTION-BANK.md',
  'experience/SITE-ARCHETYPES.md',
  'experience/UX-PHILOSOPHIES.md',
  'experience/STYLE-DIRECTIONS.md',
  'experience/REFERENCE-PROTOCOL.md',
  'experience/DISCOVERY-LOOP.md',
  'experience/experience-manifest.json',
  'experience/references/INDEX.md',
  'tools/find.mjs',
  'tools/get.mjs',
  'tools/laya_select.py',
  'tools/memory.mjs',
  'tools/context.mjs',
  'tools/excalidraw-mcp.mjs',
  'catalog/component-manifest.json',
  'catalog/taxonomy.md',
  'catalog/install-guides.md',
  'catalog/schema.json',
];

const FLOW_SKILLS = [
  'flow-ai-chat',
  'flow-app-shell',
  'flow-auth',
  'flow-checkout',
  'flow-empty-states',
  'flow-errors',
  'flow-forms',
  'flow-navigation',
  'flow-onboarding',
  'flow-paywall',
  'flow-permissions',
  'flow-search',
  'flow-settings',
  'flow-sharing',
  'flow-tables',
];

const REQUIRED_REPO_FILES = [
  'skills/UX-SKILLS-ORIGIN.md',
  'skills/UX-SKILLS-LICENSE',
  'skills/ai-frontend-guide/SKILL.md',
  'skills/frontend-polish/SKILL.md',
  'skills/ux-map/SKILL.md',
  'skills/userflow/SKILL.md',
  'skills/userflow/report-template.html',
  ...FLOW_SKILLS.map((name) => `skills/${name}/SKILL.md`),
];

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12);
}

function checkExperienceManifest() {
  const manifestPath = join(KIT_DIR, 'experience', 'experience-manifest.json');
  let data;
  try {
    data = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    console.error(`Kit build FAILED. experience-manifest.json is not valid JSON: ${error.message}`);
    process.exit(1);
  }
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const seen = new Set();
  const problems = [];
  for (const entry of entries) {
    if (!entry.id || seen.has(entry.id)) problems.push(`duplicate or missing id: ${entry.id}`);
    seen.add(entry.id);
    for (const field of ['kind', 'name', 'description', 'use_case', 'search_tags']) {
      if (!entry[field]) problems.push(`${entry.id} missing ${field}`);
    }
  }
  if (problems.length > 0) {
    console.error(`Kit build FAILED. experience-manifest.json problems:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  return entries.length;
}

function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(full);
    else total += statSync(full).size;
  }
  return total;
}

function main() {
  if (!existsSync(MANIFEST_DIR)) throw new Error('manifest/ does not exist. Run the extraction scripts first.');

  rmSync(CATALOG_DIR, { recursive: true, force: true });
  mkdirSync(join(CATALOG_DIR, 'sources'), { recursive: true });
  for (const file of CATALOG_FILES) {
    cpSync(join(MANIFEST_DIR, file), join(CATALOG_DIR, file));
  }
  cpSync(join(MANIFEST_DIR, 'sources'), join(CATALOG_DIR, 'sources'), { recursive: true });

  const missing = REQUIRED_KIT_FILES.filter((file) => !existsSync(join(KIT_DIR, file)));
  if (missing.length > 0) {
    console.error(`Kit build FAILED. Missing assets:\n- ${missing.join('\n- ')}`);
    process.exit(1);
  }

  const missingRepo = REQUIRED_REPO_FILES.filter((file) => !existsSync(join(ROOT, file)));
  if (missingRepo.length > 0) {
    console.error(`Kit build FAILED. Missing repo skills/assets:\n- ${missingRepo.join('\n- ')}`);
    console.error('Run: node tools/sync-ux-skills.mjs (UX skills) and check the kit skills.');
    process.exit(1);
  }

  const sourceFiles = readdirSync(join(MANIFEST_DIR, 'sources')).filter((name) => name.endsWith('.json'));
  let coherent = true;
  for (const file of sourceFiles) {
    const manifestHash = hashFile(join(MANIFEST_DIR, 'sources', file));
    const catalogHash = hashFile(join(CATALOG_DIR, 'sources', file));
    if (manifestHash !== catalogHash) {
      coherent = false;
      console.error(`INCOHERENT: sources/${file} differs between manifest/ and catalog/`);
    }
  }

  const totalBytes = dirSize(KIT_DIR);
  const experienceEntries = checkExperienceManifest();
  console.log(`kit: ${REQUIRED_KIT_FILES.length} required assets present, ${sourceFiles.length} source files synced`);
  console.log(`kit: experience manifest OK (${experienceEntries} entries, unique ids, required fields)`);
  console.log(`kit: ${FLOW_SKILLS.length + 1} UX skills vendored (userflow + ${FLOW_SKILLS.length} flow-*) with license + origin pin`);
  console.log('kit: 19 repo skills verified (ai-frontend-guide + frontend-polish + ux-map + 16 UX)');
  console.log(`kit: catalog coherent with manifest: ${coherent ? 'yes' : 'NO'}`);
  console.log(`kit: total size ${(totalBytes / 1024 / 1024).toFixed(2)} MB at ${relative(ROOT, KIT_DIR)}`);
  if (!coherent) process.exit(1);
}

main();
