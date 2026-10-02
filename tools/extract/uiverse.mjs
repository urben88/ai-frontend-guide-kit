/**
 * Extraction: agent-research channel — Uiverse.io.
 * uiverse.io rejects plain HTTP clients with 403, so the inventory was captured
 * with a real browser session (Playwright) on 2026-10-02 and stored in
 * tools/.cache/uiverse-raw.json: top 30 elements per category from the first
 * results page. This script transforms that snapshot into the manifest format.
 *
 * Usage: node tools/extract/uiverse.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildEntry, writeSource, slugify, titleCase, USE_BY_CATEGORY, ROOT } from './lib.mjs';

const RAW_FILE = join(ROOT, 'tools', '.cache', 'uiverse-raw.json');

const CATEGORY_MAP = {
  buttons: 'micro-interactions',
  checkboxes: 'forms',
  switches: 'micro-interactions',
  cards: 'data-display',
  loaders: 'feedback',
  inputs: 'forms',
  'radio-buttons': 'forms',
  forms: 'forms',
  patterns: 'backgrounds-effects',
  tooltips: 'feedback',
};

const CATEGORY_LABEL = {
  buttons: 'buttons',
  checkboxes: 'checkboxes',
  switches: 'toggle switches',
  cards: 'cards',
  loaders: 'loaders',
  inputs: 'inputs',
  'radio-buttons': 'radio buttons',
  forms: 'forms',
  patterns: 'patterns',
  tooltips: 'tooltips',
};

function main() {
  if (!existsSync(RAW_FILE)) {
    throw new Error(`Missing snapshot ${RAW_FILE}. Re-capture with a browser session before running this script.`);
  }
  const raw = JSON.parse(readFileSync(RAW_FILE, 'utf8'));
  const entries = [];

  for (const [categorySlug, items] of Object.entries(raw.categories ?? {})) {
    const category = CATEGORY_MAP[categorySlug] ?? 'data-display';
    for (const item of items) {
      const slug = String(item.href).split('/').filter(Boolean).pop();
      const display = titleCase(slug.replace(/-\d+$/, ''));
      entries.push(
        buildEntry({
          id: `uiverse-${category}-${slugify(item.author)}-${slugify(slug)}`,
          name: `Uiverse ${display} by ${item.author}`,
          source: 'Uiverse',
          entryType: 'component',
          category,
          subcategory: categorySlug,
          description: `Community ${CATEGORY_LABEL[categorySlug] ?? categorySlug} element from Uiverse, made with CSS or Tailwind.`,
          useCase: USE_BY_CATEGORY[category],
          decisionHints: ['Micro-interaction detail: use it for a single accent, not for whole layouts', 'Keep the MIT notice and author credit'],
          searchTags: ['uiverse', 'community', categorySlug, ...slug.split('-')],
          docsUrl: `https://uiverse.io${item.href}`,
          stack: ['html', 'css'],
          dependencies: [],
          installMethod: 'copy-paste',
          manualSteps: [
            `Open ${`https://uiverse.io${item.href}`}`,
            'Copy the HTML/CSS tab (or the Tailwind tab when available) into your project.',
          ],
          licenseType: 'MIT',
          commercialUse: true,
          free: true,
          limits: 'Community element under the site-wide MIT license; keep the author copyright notice.',
          extractionNote: raw.method,
        }),
      );
    }
  }

  return writeSource(
    'uiverse',
    {
      sourceName: 'Uiverse',
      sourceUrl: 'https://uiverse.io',
      catalogUrl: 'https://uiverse.io/elements',
      licenseSummary: 'MIT (all community elements; author copyright notices apply)',
      granularity: `curated: top 30 per category across ${Object.keys(raw.categories ?? {}).length} categories (~4.268 elements upstream)`,
      extraction: {
        channel: 'agent-research',
        method: raw.method,
        evidence_url: 'https://uiverse.io/elements',
        note: 'Inventory captured from the first results page of each category; default sorting is randomized, so this is a representative snapshot, not a popularity ranking.',
      },
    },
    entries,
  );
}

main();
