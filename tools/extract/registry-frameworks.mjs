/**
 * Extraction: shadcn ports for other frameworks (both MIT).
 * Sources: shadcn-vue (Vue + Reka UI), shadcn-svelte (Svelte + Bits UI).
 *
 * Usage: node tools/extract/registry-frameworks.mjs [vue|svelte|all]
 */
import { fetchJSON, buildEntry, writeSource, slugify, titleCase, categoryFromKeywords, USE_BY_CATEGORY } from './lib.mjs';

const RULES = [
  [/^(accordion|collapsible)/, 'micro-interactions'],
  [/alert-dialog|dialog|drawer|sheet|popover|hover-card|dropdown|context-menu|command/, 'overlay'],
  [/^(alert|progress|skeleton|sonner|spinner|toast|tooltip)/, 'feedback'],
  [/avatar|badge|card|chart|kbd|table|item|data-table/, 'data-display'],
  [/breadcrumb|menubar|navigation|pagination|sidebar|stepper|tabs/, 'navigation'],
  [/button|toggle/, 'micro-interactions'],
  [/calendar|checkbox|combobox|field|form|input|label|number|pin|radio|range|select|slider|switch|tags|textarea|date/, 'forms'],
  [/carousel|aspect/, 'media'],
  [/empty|resizable|scroll-area|separator/, 'layout'],
  [/message|bubble|attachment|marker|questionnaire/, 'ai-surfaces'],
];

function categoryFor(name, type) {
  if (type === 'registry:block') {
    if (/^(login|signup|otp|auth)/.test(name)) return 'forms';
    if (/^(sidebar)/.test(name)) return 'navigation';
    if (/^(dashboard)/.test(name)) return 'template';
    if (/^(calendar)/.test(name)) return 'forms';
    return categoryFromKeywords(name, RULES, 'blocks-sections');
  }
  return categoryFromKeywords(name, RULES, 'data-display');
}

async function run(cfg) {
  const { data } = await fetchJSON(cfg.registry);
  const items = (Array.isArray(data) ? data : data.items ?? []).filter((i) => i.type === 'registry:ui' || i.type === 'registry:block');
  const entries = items.map((item) => {
    const name = item.name;
    const block = item.type === 'registry:block';
    const category = categoryFor(name, item.type);
    const display = titleCase(name);
    return buildEntry({
      id: `${cfg.prefix}-${category}-${slugify(name)}`,
      name: `${cfg.label} ${display}`,
      source: cfg.label,
      entryType: block ? 'block' : 'component',
      category,
      description: block ? `${display} block from ${cfg.label}: a ready composition of ${cfg.label} components.` : `${display} component from ${cfg.label}, the ${cfg.framework} port of shadcn/ui.`,
      useCase: USE_BY_CATEGORY[category],
      decisionHints: [`Use when the project is ${cfg.framework}; for React prefer shadcn/ui or the React-only sources`],
      searchTags: [cfg.prefix, cfg.framework.toLowerCase(), ...slugify(display).split('-')],
      docsUrl: block ? cfg.blocksUrl : `${cfg.docs}/${name}`,
      registryUrl: cfg.registryUrl?.(name, item),
      stack: [cfg.framework.toLowerCase(), 'tailwind', cfg.headless],
      dependencies: [...new Set(item.dependencies ?? [])],
      installMethod: 'shadcn-cli',
      installCommand: `${cfg.cli} add ${name}`,
      manualSteps: [`Or copy the source from ${block ? cfg.blocksUrl : `${cfg.docs}/${name}`}`],
      licenseType: 'MIT',
      commercialUse: true,
      free: true,
    });
  });
  return writeSource(
    cfg.prefix,
    {
      sourceName: cfg.label,
      sourceUrl: cfg.url,
      catalogUrl: cfg.docs,
      licenseSummary: 'MIT',
      granularity: 'complete (registry:ui' + (cfg.hasBlocks ? ' + registry:block)' : ')'),
      extraction: { channel: 'registry-json', method: 'Node script downloading the public registry index', evidence_url: cfg.registry },
    },
    entries,
  );
}

const VUE = {
  prefix: 'shadcnvue',
  label: 'shadcn-vue',
  framework: 'Vue',
  headless: 'reka-ui',
  url: 'https://www.shadcn-vue.com',
  docs: 'https://www.shadcn-vue.com/docs/components',
  blocksUrl: 'https://www.shadcn-vue.com/blocks',
  registry: 'https://www.shadcn-vue.com/r/index.json',
  cli: 'npx shadcn-vue@latest',
};
const SVELTE = {
  prefix: 'shadcnsvelte',
  label: 'shadcn-svelte',
  framework: 'Svelte',
  headless: 'bits-ui',
  url: 'https://shadcn-svelte.com',
  docs: 'https://shadcn-svelte.com/docs/components',
  blocksUrl: 'https://shadcn-svelte.com/blocks',
  registry: 'https://shadcn-svelte.com/registry/index.json',
  cli: 'npx shadcn-svelte@latest',
  hasBlocks: true,
};

const target = process.argv[2] ?? 'all';
if (target === 'all' || target === 'vue') await run(VUE);
if (target === 'all' || target === 'svelte') await run(SVELTE);
