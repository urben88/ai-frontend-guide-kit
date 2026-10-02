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
  'guides/01-UX-FLOWS.md',
  'guides/ADAPTERS.md',
  'guides/02-TOKENS.md',
  'guides/03-INVENTORY.md',
  'guides/04-FIND.md',
  'guides/05-REUSE.md',
  'guides/06-ADAPT.md',
  'guides/07-PHILOSOPHY.md',
  'guides/08-VERIFY.md',
  'guides/09-ITERATE.md',
  'tools/find.mjs',
  'tools/get.mjs',
  'tools/laya_select.py',
  'tools/memory.mjs',
  'tools/context.mjs',
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
  console.log(`kit: ${REQUIRED_KIT_FILES.length} required assets present, ${sourceFiles.length} source files synced`);
  console.log(`kit: ${FLOW_SKILLS.length + 1} UX skills vendored (userflow + ${FLOW_SKILLS.length} flow-*) with license + origin pin`);
  console.log('kit: 19 repo skills verified (ai-frontend-guide + frontend-polish + ux-map + 16 UX)');
  console.log(`kit: catalog coherent with manifest: ${coherent ? 'yes' : 'NO'}`);
  console.log(`kit: total size ${(totalBytes / 1024 / 1024).toFixed(2)} MB at ${relative(ROOT, KIT_DIR)}`);
  if (!coherent) process.exit(1);
}

main();
