/**
 * Builds the two-layer catalog index from manifest/sources/*.json:
 *   - manifest/component-manifest.json  (light index for agents)
 *   - manifest/component-manifest.md    (human-readable guide)
 *
 * Usage: node tools/build-index.mjs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SOURCES_DIR, MANIFEST_DIR, TODAY } from './extract/lib.mjs';

function loadSources() {
  if (!existsSync(SOURCES_DIR)) throw new Error('manifest/sources/ does not exist');
  return readdirSync(SOURCES_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(SOURCES_DIR, name), 'utf8')));
}

function main() {
  const schema = JSON.parse(readFileSync(join(MANIFEST_DIR, 'schema.json'), 'utf8'));
  const taxonomy = schema.$defs.category.enum;
  const sources = loadSources();

  const categoryTotals = {};
  const sourceSummaries = [];
  let totalEntries = 0;

  for (const source of sources) {
    for (const entry of source.entries) {
      categoryTotals[entry.category] = (categoryTotals[entry.category] ?? 0) + 1;
    }
    totalEntries += source.entries.length;
    sourceSummaries.push({
      source_id: source.source_id,
      source_name: source.source_name,
      source_url: source.source_url,
      catalog_url: source.catalog_url,
      entry_count: source.entries.length,
      license_summary: source.license_summary,
      granularity: source.granularity,
      file: `sources/${source.source_id}.json`,
    });
  }

  const sortedCategories = Object.fromEntries(Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]));
  const index = {
    schema_version: '1.0',
    generated_at: TODAY,
    totals: {
      sources: sources.length,
      entries: totalEntries,
      categories: sortedCategories,
    },
    taxonomy,
    usage: {
      find: 'node tools/find.mjs --category <category> [--stack react] [--license MIT] [--commercial] [--free] [--source <id>] [--text <query>]',
      get: 'node tools/get.mjs <entry-id>',
      detail: 'sources/<source_id>.json',
      guides: 'guides/00-START-HERE.md',
      installGuides: 'install-guides.md',
      reuseRule: 'Consult this catalog before writing any component from scratch (see guides/05-REUSE.md).',
    },
    sources: sourceSummaries,
  };

  writeFileSync(join(MANIFEST_DIR, 'component-manifest.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  const indexSize = readFileSync(join(MANIFEST_DIR, 'component-manifest.json'), 'utf8').length;
  console.log(`index: ${sources.length} sources, ${totalEntries} entries, ${(indexSize / 1024).toFixed(1)} KB`);

  const lines = [];
  lines.push('# Component Manifest');
  lines.push('');
  lines.push(`Light index of ${totalEntries} reusable UI entries across ${sources.length} sources. Generated ${TODAY}.`);
  lines.push('');
  lines.push('**Rule:** consult this catalog before writing any component from scratch. Filter with `find`, inspect with `get`, then follow `guides/05-REUSE.md`.');
  lines.push('');
  lines.push('## Sources');
  lines.push('');
  lines.push('| Source | Entries | License | Granularity | Detail |');
  lines.push('|---|---|---|---|---|');
  for (const source of sourceSummaries) {
    lines.push(
      `| ${source.source_name} | ${source.entry_count} | ${source.license_summary} | ${source.granularity} | \`${source.file}\` |`,
    );
  }
  lines.push('');
  lines.push('## Categories');
  lines.push('');
  lines.push('| Category | Entries |');
  lines.push('|---|---|');
  for (const [category, count] of Object.entries(sortedCategories)) {
    lines.push(`| ${category} | ${count} |`);
  }
  lines.push('');
  lines.push('## How to query');
  lines.push('');
  lines.push('```bash');
  lines.push('node tools/find.mjs --category hero --stack react --commercial   # short candidate list');
  lines.push('node tools/get.mjs <entry-id>                                    # full decision card + install command');
  lines.push('```');
  lines.push('');
  lines.push('Read `taxonomy.md` for category definitions, `install-guides.md` for setup per source, and `sources/<id>.json` only when you need the raw entries of one source.');
  lines.push('');
  writeFileSync(join(MANIFEST_DIR, 'component-manifest.md'), lines.join('\n'), 'utf8');
  console.log('index markdown: manifest/component-manifest.md');
}

main();
