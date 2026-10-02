/**
 * Builds the portable kit: syncs the catalog from manifest/ into
 * ai-frontend-guide/catalog/ and verifies every kit asset is present.
 * Idempotent: running it twice produces the same tree.
 *
 * Usage: node tools/build-kit.mjs
 */
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, MANIFEST_DIR } from './extract/lib.mjs';

const KIT_DIR = join(ROOT, 'ai-frontend-guide');
const CATALOG_DIR = join(KIT_DIR, 'catalog');

const CATALOG_FILES = ['component-manifest.json', 'component-manifest.md', 'taxonomy.md', 'install-guides.md', 'schema.json'];
const REQUIRED_KIT_FILES = [
  'AGENTS.md',
  'README.md',
  'guides/00-START-HERE.md',
  'guides/01-ANCHOR.md',
  'guides/02-TOKENS.md',
  'guides/03-INVENTORY.md',
  'guides/04-FIND.md',
  'guides/05-REUSE.md',
  'guides/06-ADAPT.md',
  'guides/07-PHILOSOPHY.md',
  'guides/08-VERIFY.md',
  'tools/find.mjs',
  'tools/get.mjs',
  'tools/laya_select.py',
  'catalog/component-manifest.json',
  'catalog/taxonomy.md',
  'catalog/install-guides.md',
  'catalog/schema.json',
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
  console.log(`kit: catalog coherent with manifest: ${coherent ? 'yes' : 'NO'}`);
  console.log(`kit: total size ${(totalBytes / 1024 / 1024).toFixed(2)} MB at ${relative(ROOT, KIT_DIR)}`);
  if (!coherent) process.exit(1);
}

main();
