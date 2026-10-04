#!/usr/bin/env node
/**
 * Adds a deterministic `quality` score (0-100) to every catalog entry so `find` can rank results.
 * Heuristic, not a verdict: license clarity, install effort, dependency weight, docs and source maintenance tier.
 *
 * Usage: node tools/quality.mjs        (rewrites manifest/sources/*.json; also run by build-index)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES_DIR } from './extract/lib.mjs';

// Maintenance / reliability tier of the source (0-20).
const SOURCE_TIER = {
  shadcn: 20, shadcnvue: 18, shadcnsvelte: 18, magicui: 18, coss: 18, motionprimitives: 17,
  daisyui: 16, aceternity: 16, hyperui: 15, preline: 15, kiboui: 15, cultui: 14, animateui: 14,
  reactbits: 14, arcui: 14, mantine: 18, baseui: 17, reactaria: 18, aicss: 12, tailblocks: 10, floatui: 12, hover: 12, agentskit: 12, uiverse: 8, '21stdev': 8, dsr: 10,
};

const LICENSE_POINTS = { MIT: 30, 'Apache-2.0': 30, custom: 18, proprietary: 12, unknown: 4, 'non-commercial': 0 };
const INSTALL_POINTS = { 'shadcn-cli': 20, npm: 20, 'copy-paste': 12, cdn: 10, reference: 4 };

export function scoreEntry(entry, sourceId) {
  let score = LICENSE_POINTS[entry.license_type] ?? 4;
  if (entry.commercial_use === 'conditional') score -= 6;
  if (entry.commercial_use === false) score -= 12;
  if (entry.free) score += 5;
  score += INSTALL_POINTS[entry.install_method] ?? 0;
  if (entry.docs_url) score += 5;
  if ((entry.description ?? '').length >= 60) score += 5;
  const deps = (entry.dependencies ?? []).length;
  score += deps === 0 ? 10 : deps <= 2 ? 7 : deps <= 4 ? 4 : 0;
  score += SOURCE_TIER[sourceId] ?? 10;
  if (entry.entry_type === 'icon') score -= 20;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function applyQuality() {
  let count = 0;
  for (const file of readdirSync(SOURCES_DIR).filter((f) => f.endsWith('.json'))) {
    const path = join(SOURCES_DIR, file);
    const doc = JSON.parse(readFileSync(path, 'utf8'));
    for (const entry of doc.entries) {
      entry.quality = scoreEntry(entry, doc.source_id);
      count += 1;
    }
    writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  }
  return count;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`quality: scored ${applyQuality()} entries`);
}
