#!/usr/bin/env node
/**
 * Heuristic audit of catalog categories: flags entries whose name strongly suggests another category.
 * Informational by default; `--strict` exits 1 when the suspicious ratio exceeds 3% (CI guard against
 * keyword-classifier regressions).
 *
 * Usage: node tools/audit-categories.mjs [--strict] [--show N]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SOURCES_DIR } from './extract/lib.mjs';

// [name pattern, categories that are acceptable]
const RULES = [
  [/\b(chat|conversation|prompt-input|ai-chat|agent-|reasoning|thinking)\b/, ['ai-surfaces', 'blocks-sections', 'template', 'text', 'feedback', 'micro-interactions', 'layout']],
  [/(^|-)(navbar|breadcrumb|pagination|sidebar|tabs)($|-)/, ['navigation', 'blocks-sections', 'template', 'layout', 'micro-interactions']],
  [/(^|-)(modal|dialog|drawer|popover)($|-)/, ['overlay', 'blocks-sections', 'micro-interactions', 'forms', 'media', 'feedback', 'navigation']],
  [/(^|-)(pricing)($|-)/, ['pricing', 'blocks-sections', 'template']],
  [/(^|-)(testimonial)s?($|-)/, ['testimonials', 'blocks-sections', 'template', 'media', 'data-display']],
  [/(^|-)(faq)($|-)/, ['faq', 'blocks-sections', 'template', 'micro-interactions']],
  [/(^|-)(hero)($|-)/, ['hero', 'blocks-sections', 'template', 'backgrounds-effects', 'media', 'text', 'micro-interactions']],
  [/(^|-)(skeleton|spinner|loader|toast|snackbar)($|-)/, ['feedback', 'micro-interactions', 'backgrounds-effects', 'layout']],
];

const show = Number(process.argv[process.argv.indexOf('--show') + 1]) || 10;
const strict = process.argv.includes('--strict');
let total = 0;
const bySource = {};
const samples = [];

for (const file of readdirSync(SOURCES_DIR).filter((f) => f.endsWith('.json'))) {
  const doc = JSON.parse(readFileSync(join(SOURCES_DIR, file), 'utf8'));
  for (const entry of doc.entries) {
    total += 1;
    const slug = entry.id.split('-').slice(2).join('-');
    for (const [pattern, ok] of RULES) {
      if (pattern.test(slug) && !ok.includes(entry.category)) {
        bySource[doc.source_id] = (bySource[doc.source_id] ?? 0) + 1;
        if (samples.length < show) samples.push(`${entry.id} -> ${entry.category} (expected one of ${ok.slice(0, 3).join('/')})`);
        break;
      }
    }
  }
}
const flagged = Object.values(bySource).reduce((a, b) => a + b, 0);
console.log(`audit-categories: ${flagged}/${total} suspicious (${((flagged / total) * 100).toFixed(2)}%)`);
console.log('by source:', JSON.stringify(bySource));
for (const line of samples) console.log(`  ${line}`);
if (strict && flagged / total > 0.03) process.exit(1);
