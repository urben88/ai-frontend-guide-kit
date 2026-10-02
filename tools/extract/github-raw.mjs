/**
 * Extraction: github-raw channel.
 * Sources: Tailblocks (MIT), HyperUI (MIT), Float UI (custom license).
 *
 * Usage: node tools/extract/github-raw.mjs [tailblocks|hyperui|floatui|all]
 */
import {
  fetchText,
  fetchJSON,
  buildEntry,
  writeSource,
  slugify,
  titleCase,
  TODAY,
  USE_BY_CATEGORY,
} from './lib.mjs';

const TAILBLOCKS_MAP = {
  blog: 'blocks-sections',
  contact: 'forms',
  content: 'blocks-sections',
  cta: 'cta',
  ecommerce: 'blocks-sections',
  feature: 'features',
  footer: 'layout',
  gallery: 'media',
  header: 'navigation',
  hero: 'hero',
  pricing: 'pricing',
  statistic: 'data-display',
  step: 'features',
  team: 'blocks-sections',
  testimonial: 'testimonials',
};

const HYPERUI_MAP = {
  application: {
    accordions: 'faq',
    badges: 'data-display',
    breadcrumbs: 'navigation',
    'button-groups': 'micro-interactions',
    charts: 'data-display',
    checkboxes: 'forms',
    'details-lists': 'data-display',
    dividers: 'layout',
    dropdowns: 'overlay',
    'empty-states': 'layout',
    'file-uploaders': 'forms',
    filters: 'forms',
    grids: 'layout',
    inputs: 'forms',
    loaders: 'feedback',
    media: 'media',
    modals: 'overlay',
    pagination: 'navigation',
    'progress-bars': 'feedback',
    'quantity-inputs': 'forms',
    'radio-groups': 'forms',
    'range-inputs': 'forms',
    selects: 'forms',
    'side-menu': 'navigation',
    'skip-links': 'navigation',
    stats: 'data-display',
    steps: 'navigation',
    tables: 'data-display',
    tabs: 'navigation',
    textareas: 'forms',
    timelines: 'data-display',
    toasts: 'feedback',
    toggles: 'forms',
    'vertical-menu': 'navigation',
  },
  marketing: {
    announcements: 'cta',
    banners: 'cta',
    'blog-cards': 'blocks-sections',
    buttons: 'micro-interactions',
    cards: 'data-display',
    carts: 'blocks-sections',
    'contact-forms': 'forms',
    ctas: 'cta',
    'empty-content': 'layout',
    faqs: 'faq',
    'feature-grids': 'features',
    footers: 'layout',
    header: 'navigation',
    'logo-clouds': 'testimonials',
    'newsletter-signup': 'forms',
    polls: 'feedback',
    pricing: 'pricing',
    'product-cards': 'blocks-sections',
    'product-collections': 'blocks-sections',
    sections: 'blocks-sections',
    'team-sections': 'blocks-sections',
    testimonials: 'testimonials',
  },
  neobrutalism: {
    accordions: 'faq',
    alerts: 'feedback',
    badges: 'data-display',
    buttons: 'micro-interactions',
    cards: 'data-display',
    checkboxes: 'forms',
    inputs: 'forms',
    'progress-bars': 'feedback',
    selects: 'forms',
    tabs: 'navigation',
    textareas: 'forms',
  },
};

const FLOATUI_RULES = [
  [/testimonial|logo/i, 'testimonials'],
  [/cta|banner|announcement|calltoaction/i, 'cta'],
  [/hero/i, 'hero'],
  [/pricing|plan/i, 'pricing'],
  [/faq|accordion/i, 'faq'],
  [/footer/i, 'layout'],
  [/login|signup|auth|password|gridprovider/i, 'forms'],
  [/navbar|nav\b|steps|tabs|pagination|sidebar|breadcrumb|previousandnext/i, 'navigation'],
  [/table|avatar|stats|badge|list/i, 'data-display'],
  [/alert|toast|notification/i, 'feedback'],
  [/modal|dialog|selectmenu|dropdown|contextmenu|popover/i, 'overlay'],
  [/404|empty|sectionheader|divider/i, 'layout'],
  [/form|input|checkbox|radio|select|switch|textarea|newsletter|contact|range/i, 'forms'],
  [/button|toggle|ripple/i, 'micro-interactions'],
  [/image|gallery|carousel|video/i, 'media'],
  [/text|heading|quote/i, 'text'],
  [/background|pattern|gradient|blur/i, 'backgrounds-effects'],
  [/feature/i, 'features'],
  [/team|blog|ecommerce|product|store|cart/i, 'blocks-sections'],
];

function humanizeFloatName(identifier) {
  return identifier
    .replace(/^FUI/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}

function floatCategory(identifier) {
  for (const [pattern, category] of FLOATUI_RULES) {
    if (pattern.test(identifier)) return category;
  }
  return 'blocks-sections';
}

async function extractTailblocks() {
  const source = 'https://github.com/mertJF/tailblocks';
  const { text, status } = await fetchText(`${source.replace('github.com', 'raw.githubusercontent.com')}/master/src/blocks/index.js`);
  if (status !== 200) throw new Error(`Tailblocks index.js status ${status}`);
  const matches = [...text.matchAll(/from '\.\/([a-z]+)\/light\/([a-z])'/g)];
  const seen = new Set();
  const entries = [];
  for (const [, blockCategory, letter] of matches) {
    const key = `${blockCategory}/${letter}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const category = TAILBLOCKS_MAP[blockCategory] ?? 'blocks-sections';
    const file = `src/blocks/${blockCategory}/light/${letter}.js`;
    entries.push(
      buildEntry({
        id: `tailblocks-${category}-${blockCategory}-${letter}`,
        name: `Tailblocks ${titleCase(blockCategory)} ${letter.toUpperCase()}`,
        source: 'Tailblocks',
        entryType: 'block',
        category,
        subcategory: blockCategory,
        description: `Free Tailwind landing block: ${titleCase(blockCategory)} section variant ${letter.toUpperCase()} (light and dark available).`,
        useCase: USE_BY_CATEGORY[category],
        searchTags: ['tailblocks', blockCategory, 'landing', 'block'],
        docsUrl: `https://github.com/mertJF/tailblocks/blob/master/${file}`,
        stack: ['html', 'tailwind'],
        installMethod: 'copy-paste',
        manualSteps: [
          `Open https://tailblocks.cc, pick "${titleCase(blockCategory)}" block ${letter.toUpperCase()}, choose colors/theme and click View Code.`,
          `Or copy the raw JSX source from https://raw.githubusercontent.com/mertJF/tailblocks/master/${file}`,
        ],
        licenseType: 'MIT',
        commercialUse: true,
        free: true,
      }),
    );
  }
  return writeSource(
    'tailblocks',
    {
      sourceName: 'Tailblocks',
      sourceUrl: source,
      catalogUrl: 'https://tailblocks.cc',
      licenseSummary: 'MIT',
      granularity: 'complete (all 63 free blocks)',
      extraction: {
        channel: 'github-raw',
        method: 'Node script parsing src/blocks/index.js from the official repository',
        evidence_url: 'https://raw.githubusercontent.com/mertJF/tailblocks/master/src/blocks/index.js',
      },
    },
    entries,
  );
}

async function extractHyperUI() {
  const repo = 'markmead/hyperui';
  const { data } = await fetchJSON(`https://api.github.com/repos/${repo}/git/trees/main?recursive=1`);
  const paths = (data.tree ?? []).map((node) => node.path).filter(Boolean);
  const pattern = /^public\/examples\/(application|marketing|neobrutalism)\/([^/]+)\/(\d+)\.html$/;
  const byCategory = new Map();
  for (const path of paths) {
    const match = path.match(pattern);
    if (!match) continue;
    const [, collection, categorySlug, number] = match;
    const key = `${collection}/${categorySlug}`;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(Number(number));
  }
  const TOP_PER_CATEGORY = 5;
  const entries = [];
  for (const [key, numbers] of byCategory) {
    const [collection, categorySlug] = key.split('/');
    const canonical = HYPERUI_MAP[collection]?.[categorySlug] ?? 'blocks-sections';
    const top = [...new Set(numbers)].sort((a, b) => a - b).slice(0, TOP_PER_CATEGORY);
    for (const number of top) {
      const rawUrl = `https://raw.githubusercontent.com/${repo}/main/public/examples/${collection}/${categorySlug}/${number}.html`;
      entries.push(
        buildEntry({
          id: `hyperui-${canonical}-${collection}-${categorySlug}-${number}`,
          name: `HyperUI ${titleCase(categorySlug)} ${number} (${collection})`,
          source: 'HyperUI',
          entryType: 'block',
          category: canonical,
          subcategory: `${collection}/${categorySlug}`,
          description: `Free Tailwind CSS v4 example: ${titleCase(categorySlug)} #${number} from the ${collection} collection (light and dark variants).`,
          useCase: USE_BY_CATEGORY[canonical],
          searchTags: ['hyperui', collection, categorySlug, 'tailwind'],
          docsUrl: `https://www.hyperui.dev/components/${collection}/${categorySlug}`,
          stack: ['html', 'tailwind'],
          installMethod: 'copy-paste',
          manualSteps: [
            `Open https://www.hyperui.dev/components/${collection}/${categorySlug} and copy example #${number}.`,
            `Or fetch the raw HTML: ${rawUrl}`,
          ],
          variants: ['light', 'dark'],
          licenseType: 'MIT',
          commercialUse: true,
          free: true,
          extractionNote: `Curated: top ${TOP_PER_CATEGORY} examples per category (source has ${numbers.length}).`,
        }),
      );
    }
  }
  return writeSource(
    'hyperui',
    {
      sourceName: 'HyperUI',
      sourceUrl: 'https://www.hyperui.dev',
      catalogUrl: 'https://www.hyperui.dev',
      licenseSummary: 'MIT',
      granularity: `curated: top ${TOP_PER_CATEGORY} per category (540 total in source)`,
      extraction: {
        channel: 'github-raw',
        method: 'Node script using the GitHub tree API and raw example files (site disallows /examples/ for crawlers)',
        evidence_url: `https://api.github.com/repos/${repo}/git/trees/main?recursive=1`,
      },
    },
    entries,
  );
}

async function extractFloatUI() {
  const repo = 'MarsX-dev/floatui';
  const { text, status } = await fetchText(`https://raw.githubusercontent.com/${repo}/main/componentsNames.ts`);
  if (status !== 200) throw new Error(`Float UI componentsNames.ts status ${status}`);
  const matches = [...text.matchAll(/import\s+(\w+)\s+from\s+"\.\/previewsComponents\/([\w]+)\.jsx"/g)];
  const entries = [];
  for (const [, identifier, file] of matches) {
    const display = humanizeFloatName(identifier);
    if (!display) continue;
    const category = floatCategory(display);
    entries.push(
      buildEntry({
        id: `floatui-${category}-${slugify(display)}`,
        name: `Float UI ${display}`,
        source: 'Float UI',
        entryType: 'component',
        category,
        description: `Free Tailwind/React component from Float UI: ${display}.`,
        useCase: USE_BY_CATEGORY[category],
        searchTags: ['floatui', ...slugify(display).split('-')],
        docsUrl: 'https://floatui.com/components',
        stack: ['react', 'tailwind'],
        dependencies: ['radix-ui', 'framer-motion'],
        installMethod: 'copy-paste',
        manualSteps: [
          `Open https://floatui.com/components and copy the "${display}" example.`,
          `Source file: https://github.com/${repo}/blob/main/previewsComponents/${file}.jsx`,
        ],
        licenseType: 'custom',
        commercialUse: 'conditional',
        free: true,
        limits: 'Float UI license is not OSI: end products (incl. commercial/SaaS) allowed, but redistributing components/templates standalone is not.',
        extractionNote: 'Category inferred from component name (repo has no machine-readable category field).',
      }),
    );
  }
  return writeSource(
    'floatui',
    {
      sourceName: 'Float UI',
      sourceUrl: 'https://floatui.com',
      catalogUrl: 'https://floatui.com/components',
      licenseSummary: 'Custom Float UI license (not MIT/OSI; commercial end products allowed)',
      granularity: 'complete (192 components)',
      extraction: {
        channel: 'github-raw',
        method: 'Node script parsing componentsNames.ts from the official repository',
        evidence_url: `https://raw.githubusercontent.com/${repo}/main/componentsNames.ts`,
      },
    },
    entries,
  );
}

const target = process.argv[2] ?? 'all';
if (target === 'all' || target === 'tailblocks') await extractTailblocks();
if (target === 'all' || target === 'hyperui') await extractHyperUI();
if (target === 'all' || target === 'floatui') await extractFloatUI();
