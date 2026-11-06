/**
 * Extraction: registry-json channel, large free shadcn-compatible registries with a paid tier.
 * Sources: Shadcn Space (MIT free items; Pro items flagged meta.isPro), blocks.so (MIT),
 *          Uiable (MIT Community registry; Pro blocks are not in the public registry).
 * Only the free part of each registry is indexed.
 *
 * Usage: node tools/extract/registry-free.mjs [shadcnspace|blocksso|uiable|all]
 */
import { fetchJSON, fetchText, buildEntry, writeSource, slugify, titleCase, categoryFromKeywords, truncate, USE_BY_CATEGORY } from './lib.mjs';

// Page sections and app screens first, then component names.
const RULES = [
  [/small-hero|^hero|-hero/, 'hero'],
  [/pricing|compare|coupon/, 'pricing'],
  [/testimonial|clientele|logo-cloud/, 'testimonials'],
  [/faq/, 'faq'],
  [/cta|newsletter|waitlist|download|announcement/, 'cta'],
  [/feature|bento|integration|process|services/, 'features'],
  [/chat|message|bubble|ai-|attachment|questionnaire|marker/, 'ai-surfaces'],
  [/form-layout/, 'forms'],
  [/code-block/, 'data-display'],
  [/dashboard|shell|layout|footer|empty|error|coming-soon|under-construction|separator|aspect-ratio|resizable|scroll-area|typography/, 'layout'],
  [/login|sign-up|register|password|verify|verification|two-factor|check-mail|contact|form|input|select|checkbox|radio|switch|calendar|date|otp|field|combobox|autocomplete|textarea|slider|rating|upload|label|toggle/, 'forms'],
  [/navbar|topbar|sidebar|menu|breadcrumb|pagination|tabs|dock|stepper|tree/, 'navigation'],
  [/dialog|modal|popover|dropdown|sheet|drawer|command|context-menu|hover-card|cookie/, 'overlay'],
  [/alert|toast|sonner|notification|progress|skeleton|tooltip|spinner|loader|announcement/, 'feedback'],
  [/table|chart|statistic|stats|widget|timeline|list|avatar|badge|card|kbd|item|kanban|receipt|product|checkout|profile|application|map/, 'data-display'],
  [/gallery|carousel|marquee|image|video|portfolio/, 'media'],
  [/text|ticker|number/, 'text'],
  [/beam|dots|orbit|shine|glow|background/, 'backgrounds-effects'],
  [/about|team|blog|content|biolink|bio-link|other|showcase/, 'blocks-sections'],
  [/button|cursor|animation|animated|collapsible|accordion/, 'micro-interactions'],
];

const categoryOf = (slug, fallback = 'blocks-sections') => categoryFromKeywords(slug, RULES, fallback);
const words = (text) => slugify(text).split('-').filter((w) => w.length > 2 && !/^\d+$/.test(w));
const deps = (item) => [...new Set((item.dependencies ?? []).filter((d) => d !== 'cn'))];
const uses = (item) => (item.registryDependencies ?? []).map((d) => String(d).replace(/^@[a-z-]+\//, '').replace(/^https?:\/\/.*\/([^/]+)\.json$/, '$1'));

// Real pages linked from an index page; used to point each entry at a page that exists.
async function pagesFrom(url, pattern) {
  const { text } = await fetchText(url);
  return [...new Set([...text.matchAll(pattern)].map((m) => m[1]))];
}

// Picks the page whose last segment best matches the item's family (hero -> hero-section, sidebar -> sidebars).
function pageFor(family, pages) {
  const last = (p) => p.split('/').pop();
  return pages.find((p) => last(p) === family)
    ?? pages.find((p) => last(p).startsWith(`${family}-`) || last(p) === `${family}s` || last(p).startsWith(`${family}s-`))
    ?? pages.find((p) => family.startsWith(last(p)));
}

function entryFor(cfg, item, { family, category, docsUrl, entryType }) {
  const label = item.title || titleCase(item.name);
  const pulled = uses(item);
  return buildEntry({
    id: `${cfg.prefix}-${category}-${slugify(item.name)}`,
    name: `${cfg.label} ${label}`,
    source: cfg.label,
    entryType,
    category,
    description: truncate(item.description && item.description.length > 25 ? item.description : `${label}: ${titleCase(family)} ${entryType} from ${cfg.label}.`),
    useCase: USE_BY_CATEGORY[category],
    decisionHints: [cfg.hint, ...(pulled.length > 0 ? [`Pulls ${pulled.join(', ')}`] : [])],
    searchTags: [...new Set([cfg.prefix, 'shadcn', ...family.split('-'), ...words(label), ...(item.categories ?? []), ...pulled])],
    docsUrl,
    registryUrl: `${cfg.registry}/${item.name}.json`,
    stack: ['react', 'tailwind', ...(deps(item).some((d) => /^(motion|framer-motion)/.test(d)) ? ['motion'] : [])],
    dependencies: deps(item),
    installMethod: 'shadcn-cli',
    installCommand: `npx shadcn@latest add ${cfg.namespace}/${item.name}`,
    licenseType: 'MIT',
    commercialUse: true,
    free: true,
    limits: cfg.limits,
  });
}

async function shadcnspace() {
  const cfg = {
    prefix: 'shadcnspace', label: 'Shadcn Space', namespace: '@shadcn-space', registry: 'https://shadcnspace.com/r',
    hint: 'Ready shadcn/ui block or component: install it and adapt copy, data and tokens',
    limits: 'Free items are MIT. Pro blocks, pages and templates (flagged isPro in the registry) need a paid license and are not indexed.',
  };
  const { data } = await fetchJSON(`${cfg.registry}/registry.json`);
  const items = data.items ?? [];
  const free = items.filter((item) => item.meta?.isPro !== true && item.type !== 'registry:page');
  const blockPages = await pagesFrom('https://shadcnspace.com/blocks', /href="(\/blocks\/[a-z0-9-]+\/[a-z0-9-]+)"/g);
  const componentPages = await pagesFrom('https://shadcnspace.com/components', /href="(\/components\/[a-z0-9-]+)"/g);
  const entries = free.map((item) => {
    const family = item.name.replace(/-\d+$/, '');
    const block = item.type === 'registry:block';
    const page = pageFor(family, block ? blockPages : componentPages);
    return entryFor(cfg, item, {
      family,
      category: categoryOf(family, block ? 'blocks-sections' : 'micro-interactions'),
      docsUrl: `https://shadcnspace.com${page ?? (block ? '/blocks' : '/components')}`,
      entryType: block ? 'block' : 'component',
    });
  });
  console.log(`shadcnspace: ${free.length} free kept, ${items.length - free.length} Pro or page items skipped`);
  return writeSource('shadcnspace', {
    sourceName: 'Shadcn Space', sourceUrl: 'https://shadcnspace.com', catalogUrl: 'https://shadcnspace.com/components',
    licenseSummary: 'MIT (free blocks and components); Pro blocks, pages and templates are paid and not indexed',
    granularity: 'every free registry:block and registry:component item (isPro false)',
    extraction: { channel: 'registry-json', method: 'Node script downloading the public shadcn registry and dropping items with meta.isPro', evidence_url: `${cfg.registry}/registry.json` },
  }, entries);
}

async function blocksso() {
  const cfg = {
    prefix: 'blocksso', label: 'blocks.so', namespace: '@blocks-so', registry: 'https://blocks.so/r',
    hint: 'Ready application block built on shadcn/ui: install it and adapt the data and copy',
  };
  const { data } = await fetchJSON(`${cfg.registry}/registry.json`);
  const items = (data.items ?? []).filter((item) => item.type === 'registry:block');
  const entries = items.map((item) => {
    const group = item.categories?.[0] ?? item.name.replace(/-\d+$/, '');
    return entryFor(cfg, item, {
      family: group,
      category: categoryOf(group),
      docsUrl: `https://blocks.so/${group}/${item.name}`,
      entryType: 'block',
    });
  });
  return writeSource('blocksso', {
    sourceName: 'blocks.so', sourceUrl: 'https://blocks.so', catalogUrl: 'https://blocks.so',
    licenseSummary: 'MIT', granularity: 'complete (every registry:block item)',
    extraction: { channel: 'registry-json', method: 'Node script downloading the public shadcn registry', evidence_url: `${cfg.registry}/registry.json` },
  }, entries);
}

async function uiable() {
  const cfg = {
    prefix: 'uiable', label: 'Uiable', namespace: '@uiable', registry: 'https://uiable.com/r',
    hint: 'Community (MIT) item built on Base UI and shadcn/ui: install it and adapt',
    limits: 'Community tier is MIT. Pro blocks, templates and dashboards are paid and are not in the public registry.',
  };
  const { data } = await fetchJSON(`${cfg.registry}/registry.json`);
  const items = (data.items ?? []).filter((item) => item.type === 'registry:ui' || item.type === 'registry:block');
  const blockPages = await pagesFrom('https://uiable.com/blocks', /href="(\/blocks\/[a-z0-9-]+)"/g);
  const componentPages = await pagesFrom('https://uiable.com/components', /href="(\/components\/[a-z0-9-]+)"/g);
  const entries = items.map((item) => {
    const block = item.type === 'registry:block';
    const family = item.categories?.[0] ?? item.name.replace(/^block-/, '').replace(/-\d+$/, '');
    const page = pageFor(family, block ? blockPages : componentPages);
    return entryFor(cfg, item, {
      family,
      category: categoryOf(family, block ? 'blocks-sections' : 'micro-interactions'),
      docsUrl: `https://uiable.com${page ?? (block ? '/blocks' : '/components')}`,
      entryType: block ? 'block' : 'component',
    });
  });
  const { status } = await fetchText(`${cfg.registry}/block-hero-1.json`, { timeout: 15000, retries: 1 }).catch(() => ({ status: 'error' }));
  console.log(`uiable: ${entries.length} community items kept (Pro control probe block-hero-1 -> HTTP ${status})`);
  return writeSource('uiable', {
    sourceName: 'Uiable', sourceUrl: 'https://uiable.com', catalogUrl: 'https://uiable.com/components',
    licenseSummary: 'MIT (Community tier); Pro blocks, templates and dashboards are paid and not indexed',
    granularity: 'every registry:ui and registry:block item of the public Community registry (themes excluded)',
    extraction: { channel: 'registry-json', method: 'Node script downloading the public Community shadcn registry', evidence_url: `${cfg.registry}/registry.json` },
  }, entries);
}

const target = process.argv[2] ?? 'all';
if (target === 'all' || target === 'shadcnspace') await shadcnspace();
if (target === 'all' || target === 'blocksso') await blocksso();
if (target === 'all' || target === 'uiable') await uiable();
