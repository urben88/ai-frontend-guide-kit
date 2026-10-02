/**
 * Extraction: docs-structured channel — Preline UI (MIT + Fair Use).
 * Parses the official sitemap, fetches each component docs page for its title
 * and example/variant headings.
 *
 * Usage: node tools/extract/preline.mjs [--limit N]
 */
import { fetchText, buildEntry, writeSource, mapLimit, slugify, titleCase, truncate, USE_BY_CATEGORY } from './lib.mjs';

const RULES = [
  [/navbar|nav\b|breadcrumb|pagination|tab-|tabs|steps|menu|megamenu|scroll-nav|stepper|command|chat-bubbles?/, 'navigation'],
  [/input|checkbox|radio|switch|select|textarea|datepicker|range|file|form|combobox|color-picker|number|pin-|otp|password|strength|toggle|calendar|timepicker|validation/, 'forms'],
  [/modal|dropdown|popover|context-menu|drawer|sheet|overlay/, 'overlay'],
  [/alert|progress|spinner|skeleton|toast|notification|badge|status|tooltip/, 'feedback'],
  [/table|chart|stat|timeline|list|avatar|card|blockquote|kbd|rating|datamap|details/, 'data-display'],
  [/carousel|image|video|device|gallery|slider|lightbox|media/, 'media'],
  [/divider|container|column|grid|layout|footer|header|space/, 'layout'],
  [/accordion|collapse|scrollbar|copy|clipboard|confetti|drag|password/, 'micro-interactions'],
  [/hero/, 'hero'],
];

const HEADING_STOP = /^(installation|usage|examples?|basic examples?|api|methods?|options?|attributes|events|accessibility|changelog|overview|structure|default|faq|license|props|parameters|responsive|dark mode|rtl|javascript|plugins?|third-party|dependencies|preline ui|contents?)$/i;

function categorize(slug) {
  for (const [pattern, category] of RULES) {
    if (pattern.test(slug)) return category;
  }
  return 'micro-interactions';
}

function parseTitle(html, slug) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!match) return titleCase(slug);
  return match[1].replace(/\s*[|·—-]\s*Preline\s*UI.*$/i, '').trim() || titleCase(slug);
}

function parseVariants(html) {
  const headings = [...html.matchAll(/<h[23][^>]*>([^<]{2,70})<\/h[23]>/g)]
    .map((match) => match[1].replace(/\s+/g, ' ').trim())
    .filter((heading) => !HEADING_STOP.test(heading));
  return [...new Set(headings)].slice(0, 20);
}

async function main() {
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg > -1 ? Number.parseInt(process.argv[limitArg + 1], 10) : Infinity;

  const { text: sitemap, status } = await fetchText('https://preline.co/sitemap.xml');
  if (status !== 200) throw new Error(`Preline sitemap status ${status}`);
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const componentUrls = urls
    .filter((url) => /\/docs\/components\/[a-z0-9-]+\.html$/.test(url))
    .slice(0, Number.isFinite(limit) ? limit : undefined);
  console.log(`preline: ${urls.length} sitemap urls, ${componentUrls.length} component pages`);

  const pages = await mapLimit(componentUrls, 5, async (url) => {
    try {
      const { text: html, status: pageStatus } = await fetchText(url, { timeout: 25000, retries: 1 });
      if (pageStatus !== 200) return { url, failed: true };
      return { url, html };
    } catch {
      return { url, failed: true };
    }
  });

  let failed = 0;
  const entries = [];
  for (const page of pages) {
    if (page.failed) {
      failed += 1;
      continue;
    }
    const slug = page.url.match(/\/docs\/components\/([a-z0-9-]+)\.html$/)[1];
    const display = parseTitle(page.html, slug);
    const category = categorize(slug);
    const variants = parseVariants(page.html);
    entries.push(
      buildEntry({
        id: `preline-${category}-${slugify(slug)}`,
        name: `Preline ${display}`,
        source: 'Preline UI',
        entryType: 'component',
        category,
        description: truncate(`Preline UI ${display}: Tailwind markup example set with optional Headless JS plugin behavior.`),
        useCase: USE_BY_CATEGORY[category],
        decisionHints: ['Framework agnostic (HTML + Tailwind + vanilla JS)', 'Copy code with Tailwind/dark/JSX tabs'],
        searchTags: ['preline', 'tailwind', ...slug.split('-')],
        docsUrl: page.url,
        stack: ['html', 'tailwind', 'vanilla-js'],
        dependencies: ['preline', '@tailwindcss/forms'],
        installMethod: 'copy-paste',
        installCommand: 'npm i preline @tailwindcss/forms',
        manualSteps: [
          'CSS: add `@source "./node_modules/preline/dist/*.js";`, import `preline/variants.css` and `@plugin "@tailwindcss/forms";`.',
          'JS: load `node_modules/preline/dist/preline.js` at the end of the body.',
          'Copy the markup/code from the docs page (Tailwind, dark and JSX tabs available).',
        ],
        variants,
        licenseType: 'MIT',
        commercialUse: 'conditional',
        free: true,
        limits: 'MIT + Preline Fair Use: free for commercial products, but do not build a competing UI library; Pro adds premium blocks/templates with no redistribution.',
        extractionNote: failed > 0 && page.failed ? 'Page fetch failed during extraction.' : undefined,
      }),
    );
  }
  console.log(`preline: ${entries.length} entries (${failed} page failures)`);

  return writeSource(
    'preline',
    {
      sourceName: 'Preline UI',
      sourceUrl: 'https://preline.co',
      catalogUrl: 'https://preline.co/docs/components.html',
      licenseSummary: 'MIT + Preline UI Fair Use License (dual)',
      granularity: 'complete at page level (component docs pages with variant headings)',
      extraction: {
        channel: 'docs-structured',
        method: 'Node script parsing the official sitemap and fetching each component page for title and variant headings',
        evidence_url: 'https://preline.co/sitemap.xml',
        note: 'Official claim: 640+ free component examples across these pages.',
      },
    },
    entries,
  );
}

await main();
