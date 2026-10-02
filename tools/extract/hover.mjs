/**
 * Extraction: agent-research channel — Hover.dev.
 * The category pages are server-rendered: free components show a "Free" badge.
 * Only free components are indexed (paid ones need Hover Pro).
 *
 * Usage: node tools/extract/hover.mjs
 */
import { fetchText, buildEntry, writeSource, mapLimit, slugify, titleCase, categoryFromKeywords, USE_BY_CATEGORY } from './lib.mjs';

const CATALOG_URL = 'https://www.hover.dev/components';

const CATEGORY_RULES = [
  [/accordion/, 'micro-interactions'],
  [/button|toggle|link/, 'micro-interactions'],
  [/card/, 'data-display'],
  [/carousel/, 'media'],
  [/countdown|table|grid/, 'data-display'],
  [/dropdown|menu|nav/, 'navigation'],
  [/input|sign-in|form/, 'forms'],
  [/loader|notification|progress/, 'feedback'],
  [/modal|drawer/, 'overlay'],
  [/tab/, 'navigation'],
  [/text/, 'text'],
  [/faq/, 'faq'],
  [/pricing/, 'pricing'],
  [/testimonial/, 'testimonials'],
  [/stat/, 'data-display'],
  [/hero/, 'hero'],
  [/feature/, 'features'],
  [/3d|other/, 'backgrounds-effects'],
  [/kanban/, 'data-display'],
];

async function discoverCategories() {
  const { text, status } = await fetchText(CATALOG_URL, { timeout: 30000 });
  if (status !== 200) throw new Error(`Hover catalog status ${status}`);
  return [...new Set([...text.matchAll(/href="\/components\/([a-z0-9-]+)"/g)].map((match) => match[1]))];
}

function extractFreeComponents(html) {
  const chunks = html.split('<div id="').slice(1);
  const free = [];
  for (const chunk of chunks) {
    const idMatch = chunk.match(/^([a-z0-9-]+)"/);
    const nameMatch = chunk.match(/<h4[^>]*>([^<]+)<\/h4>/);
    if (!idMatch || !nameMatch) continue;
    const isFree = chunk.slice(0, 3000).includes('>Free<');
    if (isFree) free.push({ id: idMatch[1], name: nameMatch[1].trim() });
  }
  return free;
}

async function main() {
  const categories = await discoverCategories();
  console.log(`hover: ${categories.length} category pages discovered`);

  const pages = await mapLimit(categories, 4, async (category) => {
    const url = `https://www.hover.dev/components/${category}`;
    try {
      const { text, status } = await fetchText(url, { timeout: 30000, retries: 1 });
      if (status !== 200) return { category, url, free: [] };
      return { category, url, free: extractFreeComponents(text) };
    } catch {
      return { category, url, free: [] };
    }
  });

  const entries = [];
  for (const page of pages) {
    for (const component of page.free) {
      const category = categoryFromKeywords(page.category, CATEGORY_RULES, 'micro-interactions');
      entries.push(
        buildEntry({
          id: `hover-${category}-${component.id}`,
          name: `Hover ${component.name}`,
          source: 'Hover.dev',
          entryType: 'component',
          category,
          subcategory: page.category,
          description: `Free Hover.dev animation: ${component.name} (React + Tailwind + Motion), code revealed inline with VIEWCODE.`,
          useCase: USE_BY_CATEGORY[category],
          decisionHints: ['Copy-paste from the category page (VIEWCODE)', 'Limit high-impact animations to 1–2 per view'],
          searchTags: ['hoverdev', 'animation', page.category, component.id],
          docsUrl: `${page.url}#${component.id}`,
          stack: ['react', 'tailwind', 'motion'],
          dependencies: ['motion'],
          installMethod: 'copy-paste',
          manualSteps: [`Open ${page.url}, find "${component.name}" and click VIEWCODE to copy the source.`],
          licenseType: 'proprietary',
          commercialUse: true,
          free: true,
          limits: 'Free components: commercial use allowed, no attribution. The other 95 components require Hover Pro (one-time $49).',
          extractionNote: 'Free badge detected in the server-rendered category page; paid components are excluded.',
        }),
      );
    }
  }

  console.log(`hover: ${entries.length} free components indexed`);
  return writeSource(
    'hover',
    {
      sourceName: 'Hover.dev',
      sourceUrl: 'https://www.hover.dev',
      catalogUrl: CATALOG_URL,
      licenseSummary: 'Proprietary custom license (free tier commercially usable, no attribution)',
      granularity: 'complete free set only (58 free of 153; paid requires Pro)',
      extraction: {
        channel: 'agent-research',
        method: 'Node script parsing the server-rendered category pages and detecting the Free badge',
        evidence_url: CATALOG_URL,
      },
    },
    entries,
  );
}

await main();
