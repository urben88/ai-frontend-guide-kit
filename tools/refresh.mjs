/**
 * Refresh one source (or all) by running its extraction script and rebuilding
 * the index. Only the target source file and the index are touched.
 *
 * Usage: node tools/refresh.mjs <source_id|all>
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from './extract/lib.mjs';

const SOURCE_SCRIPTS = {
  daisyui: ['extract/daisyui.mjs'],
  preline: ['extract/preline.mjs'],
  aceternity: ['extract/registry.mjs', 'aceternity'],
  magicui: ['extract/registry.mjs', 'magicui'],
  shadcn: ['extract/registry.mjs', 'shadcn'],
  coss: ['extract/registry.mjs', 'coss'],
  motionprimitives: ['extract/registry.mjs', 'motion'],
  tailblocks: ['extract/github-raw.mjs', 'tailblocks'],
  hyperui: ['extract/github-raw.mjs', 'hyperui'],
  floatui: ['extract/github-raw.mjs', 'floatui'],
  agentskit: ['extract/agentskit.mjs'],
  aicss: ['extract/aicss.mjs'],
  dsr: ['extract/dsr.mjs'],
  uiverse: ['extract/uiverse.mjs'],
  '21stdev': ['extract/twentyfirst.mjs'],
  hover: ['extract/hover.mjs'],
};

function run(scriptRelativePath, extraArgs = []) {
  const script = join(ROOT, 'tools', scriptRelativePath);
  const result = spawnSync(process.execPath, [script, ...extraArgs], { stdio: 'inherit', cwd: ROOT });
  if (result.status !== 0) {
    throw new Error(`Extraction failed for ${scriptRelativePath} (exit ${result.status})`);
  }
}

const target = process.argv[2];
if (!target) {
  console.error(`Usage: node tools/refresh.mjs <source_id|all>\nAvailable: ${Object.keys(SOURCE_SCRIPTS).join(', ')}`);
  process.exit(1);
}

const targets = target === 'all' ? Object.keys(SOURCE_SCRIPTS) : [target];
for (const source of targets) {
  const entry = SOURCE_SCRIPTS[source];
  if (!entry) {
    console.error(`Unknown source "${source}". Available: ${Object.keys(SOURCE_SCRIPTS).join(', ')}`);
    process.exit(1);
  }
  console.log(`\n== Refreshing ${source} ==`);
  run(entry[0], entry.slice(1));
}

console.log('\n== Rebuilding index ==');
run('build-index.mjs');
console.log(`\nRefresh complete (${targets.join(', ')}). Only the refreshed source file(s) and the index changed.`);
