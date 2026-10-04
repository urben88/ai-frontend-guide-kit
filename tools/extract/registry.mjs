/**
 * Extraction: registry-json channel (shadcn-compatible registries).
 * Sources: Magic UI (MIT), Aceternity UI (free tier, proprietary),
 *          shadcn/ui (MIT), coss ui + legacy Origin UI (MIT components),
 *          Motion Primitives (MIT core).
 *
 * Usage: node tools/extract/registry.mjs [magicui|aceternity|shadcn|coss|motion|all]
 */
import {
  fetchJSON,
  fetchText,
  buildEntry,
  writeSource,
  mapLimit,
  slugify,
  titleCase,
  categoryFromKeywords,
  truncate,
  USE_BY_CATEGORY,
} from './lib.mjs';

const CATEGORY_RULES_ANIMATED = [
  [/text|typing|word-rotate|hyper-text|number-ticker|velocity|spinning|shimmer|shiny|rainbow-text|aurora-text|gradual-spacing|morphing-text|scroll-based-velocity|animated-number|sliding-number/, 'text'],
  [/scroll-progress|loader|spinner/, 'feedback'],
  [/marquee|ticker|animated-list|animated-group|cursor|pointer|trail|tilt|dock|magnetic|magic-card|button|glow|shine|spotlight|ripple|confetti|party|swap|hover|blur-fade|box-reveal|progressive-blur|focus|backlight|card/, 'micro-interactions'],
  [/android|iphone|safari|terminal|globe|image-comparison|tweet|icon-cloud|file-tree|video|device|mock|carousel|slider|gallery|lens/, 'media'],
  [/background|grid-pattern|dot-pattern|striped|retro-grid|meteors|particles|light-rays|warp|flickering|stars|line-shadow|interactive-grid|noise|aurora|beam|border-trail|orbiting|sparkles|gradient-pattern/, 'backgrounds-effects'],
  [/avatar|badge|chart|table|timeline|stat/i, 'data-display'],
  [/bento/, 'features'],
  [/hero/, 'hero'],
  [/pricing/, 'pricing'],
  [/testimonial/, 'testimonials'],
  [/faq/, 'faq'],
  [/navbar|menu|breadcrumb|pagination|stepper|tabs/, 'navigation'],
  [/accordion|collapsible|disclosure/, 'micro-interactions'],
  [/modal|dialog|popover|dropdown|sheet|drawer|command/, 'overlay'],
  [/input|select|checkbox|radio|switch|slider|calendar|form|otp|field|combobox/, 'forms'],
  [/alert|toast|notification|progress|skeleton|tooltip|sonner/, 'feedback'],
];

const SHADCN_CATEGORY = {
  accordion: 'micro-interactions',
  alert: 'feedback',
  'alert-dialog': 'overlay',
  'aspect-ratio': 'layout',
  avatar: 'data-display',
  badge: 'data-display',
  breadcrumb: 'navigation',
  button: 'micro-interactions',
  'button-group': 'micro-interactions',
  calendar: 'forms',
  card: 'data-display',
  carousel: 'media',
  chart: 'data-display',
  checkbox: 'forms',
  collapsible: 'micro-interactions',
  combobox: 'forms',
  command: 'overlay',
  'context-menu': 'overlay',
  'data-table': 'data-display',
  'date-picker': 'forms',
  dialog: 'overlay',
  drawer: 'overlay',
  'dropdown-menu': 'overlay',
  empty: 'layout',
  field: 'forms',
  'hover-card': 'overlay',
  input: 'forms',
  'input-group': 'forms',
  'input-otp': 'forms',
  item: 'data-display',
  kbd: 'data-display',
  label: 'forms',
  menubar: 'navigation',
  'native-select': 'forms',
  'navigation-menu': 'navigation',
  pagination: 'navigation',
  popover: 'overlay',
  progress: 'feedback',
  'radio-group': 'forms',
  resizable: 'layout',
  'scroll-area': 'layout',
  select: 'forms',
  separator: 'layout',
  sheet: 'overlay',
  sidebar: 'navigation',
  skeleton: 'feedback',
  slider: 'forms',
  sonner: 'feedback',
  spinner: 'feedback',
  switch: 'forms',
  table: 'data-display',
  tabs: 'navigation',
  textarea: 'forms',
  toast: 'feedback',
  toggle: 'forms',
  'toggle-group': 'forms',
  tooltip: 'feedback',
  typography: 'text',
  message: 'ai-surfaces',
  attachment: 'ai-surfaces',
  bubble: 'ai-surfaces',
  marker: 'ai-surfaces',
  'message-scroller': 'ai-surfaces',
  questionnaire: 'ai-surfaces',
  'input-group-native': 'forms',
  combobox: 'forms',
  'select-native': 'forms',
};

function shadcnCategory(name) {
  return SHADCN_CATEGORY[name] ?? categoryFromKeywords(name, CATEGORY_RULES_ANIMATED, 'micro-interactions');
}

async function extractMagicUI() {
  const { data } = await fetchJSON('https://magicui.design/r/registry.json');
  const items = (data.items ?? []).filter((item) => item.type === 'registry:ui' && item.name !== 'index');
  const entries = items.map((item) => {
    const name = item.name;
    const display = item.title ?? titleCase(name);
    const category = categoryFromKeywords(name, CATEGORY_RULES_ANIMATED, 'micro-interactions');
    const blocks = /bento|hero|cta|pricing|testimonial|faq|footer|navbar|section/.test(name);
    const deps = [...new Set([...(item.dependencies ?? [])])];
    return buildEntry({
      id: `magicui-${category}-${slugify(name)}`,
      name: `Magic UI ${display}`,
      source: 'Magic UI',
      entryType: blocks ? 'block' : 'component',
      category,
      description: truncate(item.description ?? `${display} animated component from Magic UI.`),
      useCase: USE_BY_CATEGORY[category],
        decisionHints: ['Requires Motion; see 08-PHILOSOPHY for animation limits'],
      searchTags: ['magicui', ...slugify(display).split('-')],
      docsUrl: `https://magicui.design/docs/components/${name}`,
      registryUrl: `https://magicui.design/r/${name}.json`,
      stack: ['react', 'tailwind', 'motion'],
      dependencies: deps,
      installMethod: 'shadcn-cli',
      installCommand: `npx shadcn@latest add @magicui/${name}`,
      manualSteps: [`Or copy the source from https://magicui.design/docs/components/${name}`],
      licenseType: 'MIT',
      commercialUse: true,
      free: true,
    });
  });
  return writeSource(
    'magicui',
    {
      sourceName: 'Magic UI',
      sourceUrl: 'https://magicui.design',
      catalogUrl: 'https://magicui.design/docs/components',
      licenseSummary: 'MIT (components); Pro templates have a separate license',
      granularity: 'complete (all registry:ui items)',
      extraction: {
        channel: 'registry-json',
        method: 'Node script downloading the official shadcn registry',
        evidence_url: 'https://magicui.design/r/registry.json',
      },
    },
    entries,
  );
}

async function extractAceternity() {
  const { data } = await fetchJSON('https://ui.aceternity.com/registry.json');
  const items = (data.items ?? []).filter((item) => item.type === 'registry:ui');
  let kept = 0;
  let premium = 0;
  let failed = 0;
  const probes = await mapLimit(items, 8, async (item) => {
    const url = `https://ui.aceternity.com/registry/${item.name}.json`;
    try {
      const { status } = await fetchText(url, { timeout: 20000, retries: 1 });
      if (status === 200) return { item, free: true };
      if (status === 401 || status === 403) return { item, free: false };
      return { item, free: false, failed: true, status };
    } catch {
      return { item, free: false, failed: true };
    }
  });

  const entries = [];
  for (const probe of probes) {
    if (probe.failed) {
      failed += 1;
      continue;
    }
    if (!probe.free) {
      premium += 1;
      continue;
    }
    kept += 1;
    const name = probe.item.name;
    const display = titleCase(name);
    const category = categoryFromKeywords(name, CATEGORY_RULES_ANIMATED, 'backgrounds-effects');
    const blocks = /hero|bento|cta|pricing|testimonial|faq|footer|navbar|section|grid/.test(name);
    entries.push(
      buildEntry({
        id: `aceternity-${category}-${slugify(name)}`,
        name: `Aceternity ${display}`,
        source: 'Aceternity UI',
        entryType: blocks ? 'block' : 'component',
        category,
        description: `Free Aceternity UI ${category} component (${display}) with high-impact animation.`,
        useCase: USE_BY_CATEGORY[category],
        decisionHints: ['Limit to 1–2 high-impact effects per view', 'Requires Motion'],
        searchTags: ['aceternity', ...slugify(display).split('-')],
        docsUrl: `https://ui.aceternity.com/components/${name}`,
        registryUrl: `https://ui.aceternity.com/registry/${name}.json`,
        stack: ['react', 'tailwind', 'motion'],
        dependencies: [...new Set([...(probe.item.dependencies ?? [])])],
        installMethod: 'shadcn-cli',
        installCommand: `npx shadcn@latest add https://ui.aceternity.com/registry/${name}.json`,
        licenseType: 'proprietary',
        commercialUse: true,
        free: true,
        limits: 'Free tier usable in commercial client projects; reselling/redistributing components as a competing library is not allowed. Premium blocks/templates need the All-Access plan.',
      }),
    );
  }
  console.log(`aceternity: ${kept} free kept, ${premium} premium skipped (401), ${failed} probe failures`);
  try {
    const { status: premiumStatus } = await fetchText(
      'https://ui.aceternity.com/registry/hero-section-with-beams-and-grid.json',
      { timeout: 15000, retries: 1 },
    );
    console.log(`aceternity: premium control probe -> HTTP ${premiumStatus} (401/403 confirms premium detection; premium blocks are not indexed)`);
  } catch (error) {
    console.log(`aceternity: premium control probe failed -> ${error.message}`);
  }
  return writeSource(
    'aceternity',
    {
      sourceName: 'Aceternity UI',
      sourceUrl: 'https://ui.aceternity.com',
      catalogUrl: 'https://ui.aceternity.com/components',
      licenseSummary: 'Proprietary (free tier; commercial use allowed, no redistribution)',
      granularity: 'complete free registry:ui set (premium detected via HTTP 401)',
      extraction: {
        channel: 'registry-json',
        method: 'Node script downloading the registry and probing each item (premium items return 401)',
        evidence_url: 'https://ui.aceternity.com/registry.json',
        note: 'Only free components are indexed; premium blocks are excluded by design.',
      },
    },
    entries,
  );
}

async function extractShadcn() {
  const { data } = await fetchJSON('https://ui.shadcn.com/r/index.json');
  const entries = (Array.isArray(data) ? data : data.items ?? [])
    .filter((item) => item.type === 'registry:ui')
    .map((item) => {
      const name = item.name;
      const category = shadcnCategory(name);
      const docs = item.meta?.links?.base?.docs ?? `https://ui.shadcn.com/docs/components/base/${name}`;
      return buildEntry({
        id: `shadcn-${category}-${slugify(name)}`,
        name: `shadcn/ui ${titleCase(name)}`,
        source: 'shadcn/ui',
        entryType: 'component',
        category,
        description: `Accessible ${titleCase(name)} primitive from shadcn/ui (copy-source, built on Base UI/Radix).`,
        useCase: USE_BY_CATEGORY[category],
        searchTags: ['shadcn', 'radix', 'base-ui', ...slugify(name).split('-')],
        docsUrl: docs,
        registryUrl: `https://ui.shadcn.com/r/styles/base-nova/${name}.json`,
        stack: ['react', 'tailwind'],
        dependencies: ['class-variance-authority', 'lucide-react'],
        installMethod: 'shadcn-cli',
        installCommand: `npx shadcn@latest add ${name}`,
        licenseType: 'MIT',
        commercialUse: true,
        free: true,
      });
    });

  // Free official blocks (dashboards, sidebars, login/signup, charts) live in the style registry, not in index.json.
  try {
    const { data: styleRegistry } = await fetchJSON('https://ui.shadcn.com/r/styles/new-york-v4/registry.json');
    for (const item of (styleRegistry.items ?? []).filter((i) => i.type === 'registry:block')) {
      const name = item.name;
      const category = /^chart-/.test(name) ? 'data-display' : /^sidebar-/.test(name) ? 'navigation' : /^(login|signup|otp)-/.test(name) ? 'forms' : /^dashboard-/.test(name) ? 'template' : /^calendar-/.test(name) ? 'forms' : 'blocks-sections';
      entries.push(
        buildEntry({
          id: `shadcn-${category}-${slugify(name)}`,
          name: `shadcn/ui Block ${titleCase(name)}`,
          source: 'shadcn/ui',
          entryType: 'block',
          category,
          description: truncate(item.description ?? `${titleCase(name)} block: a ready composition of shadcn/ui components.`),
          useCase: USE_BY_CATEGORY[category],
          decisionHints: ['Official block: copy and adapt to your tokens; it pulls the shadcn/ui components it needs'],
          searchTags: ['shadcn', 'block', ...slugify(name).split('-')],
          docsUrl: 'https://ui.shadcn.com/blocks',
          registryUrl: `https://ui.shadcn.com/r/styles/new-york-v4/${name}.json`,
          stack: ['react', 'tailwind'],
          dependencies: [...new Set(item.dependencies ?? [])],
          installMethod: 'shadcn-cli',
          installCommand: `npx shadcn@latest add ${name}`,
          licenseType: 'MIT',
          commercialUse: true,
          free: true,
        }),
      );
    }
  } catch (error) {
    console.log(`shadcn: blocks skipped (${error.message})`);
  }
  return writeSource(
    'shadcn',
    {
      sourceName: 'shadcn/ui',
      sourceUrl: 'https://ui.shadcn.com',
      catalogUrl: 'https://ui.shadcn.com/docs/components',
      licenseSummary: 'MIT',
      granularity: 'complete (registry:ui items + official registry:block items)',
      extraction: {
        channel: 'registry-json',
        method: 'Node script downloading the official registry index and the new-york-v4 style registry (blocks)',
        evidence_url: 'https://ui.shadcn.com/r/index.json',
      },
    },
    entries,
  );
}

async function extractCoss() {
  const { data } = await fetchJSON('https://coss.com/ui/r/registry.json');
  const uiItems = (data.items ?? []).filter((item) => item.type === 'registry:ui' && item.name !== 'ui');
  const entries = uiItems.map((item) => {
    const name = item.name;
    const display = item.title ?? titleCase(name);
    const category = shadcnCategory(name);
    return buildEntry({
      id: `coss-${category}-${slugify(name)}`,
      name: `coss ui ${display}`,
      source: 'coss ui',
      entryType: 'component',
      category,
      description: truncate(item.description ?? `${display} primitive from coss ui (formerly Origin UI), built on Base UI.`),
      useCase: USE_BY_CATEGORY[category],
      searchTags: ['coss', 'origin-ui', 'base-ui', ...slugify(name).split('-')],
      docsUrl: `https://coss.com/ui/docs/components/${name}`,
      registryUrl: `https://coss.com/ui/r/${name}.json`,
      stack: ['react', 'tailwind'],
      dependencies: [...new Set([...(item.dependencies ?? []), '@base-ui/react'])],
      installMethod: 'shadcn-cli',
      installCommand: `npx shadcn@latest add @coss/${name}`,
      licenseType: 'MIT',
      commercialUse: true,
      free: true,
      extractionNote: 'MIT applies to the component directories (apps/ui, apps/origin); the rest of the coss repo is AGPL.',
    });
  });

  // Legacy Origin UI: probe known category-level registry items.
  const legacySlugs = [
    'accordion', 'alert', 'avatar', 'badge', 'banner', 'breadcrumb', 'button', 'calendar',
    'checkbox', 'image-cropper', 'dialog', 'dropdown', 'file-upload', 'event-calendar', 'input',
    'navbar', 'notification', 'pagination', 'popover', 'radio', 'select', 'slider', 'stepper',
    'switch', 'table', 'tabs', 'textarea', 'timeline', 'tooltip', 'tree',
  ];
  const legacyProbes = await mapLimit(legacySlugs, 5, async (slug) => {
    const url = `https://coss.com/origin/r/${slug}.json`;
    try {
      const { status } = await fetchText(url, { timeout: 15000, retries: 1 });
      return status === 200 ? { slug, url } : null;
    } catch {
      return null;
    }
  });
  for (const probe of legacyProbes) {
    if (!probe) continue;
    const category = shadcnCategory(probe.slug);
    entries.push(
      buildEntry({
        id: `origin-${category}-${slugify(probe.slug)}`,
        name: `Origin UI (legacy) ${titleCase(probe.slug)}`,
        source: 'Origin UI (legacy)',
        entryType: 'component',
        category,
        description: `Legacy Origin UI base component for ${titleCase(probe.slug)} (Radix-based, shadcn-style). The legacy catalog holds ~604 variants across 30 categories.`,
        useCase: USE_BY_CATEGORY[category],
        searchTags: ['origin-ui', 'legacy', probe.slug],
        docsUrl: `https://coss.com/origin/${probe.slug}`,
        registryUrl: probe.url,
        stack: ['react', 'tailwind'],
        dependencies: ['radix-ui'],
        installMethod: 'shadcn-cli',
        installCommand: `npx shadcn@latest add ${probe.url}`,
        licenseType: 'MIT',
        commercialUse: true,
        free: true,
        extractionNote: 'Legacy Origin UI is a frozen snapshot superseded by coss ui; browse all variants at https://coss.com/origin',
      }),
    );
  }
  console.log(`coss: ${entries.length - legacyProbes.filter(Boolean).length} coss ui + ${legacyProbes.filter(Boolean).length} legacy Origin base components`);
  return writeSource(
    'coss',
    {
      sourceName: 'coss ui / Origin UI',
      sourceUrl: 'https://coss.com/ui',
      catalogUrl: 'https://coss.com/ui',
      licenseSummary: 'MIT for component directories (apps/ui and apps/origin); AGPL elsewhere in the repo',
      granularity: 'coss ui complete; legacy Origin indexed at base-component level (30 categories, ~604 variants upstream)',
      extraction: {
        channel: 'registry-json',
        method: 'Node script downloading the coss registry and probing legacy Origin registry items',
        evidence_url: 'https://coss.com/ui/r/registry.json',
      },
    },
    entries,
  );
}

const MOTION_CATEGORY = {
  accordion: 'micro-interactions',
  'animated-background': 'backgrounds-effects',
  'animated-group': 'micro-interactions',
  'border-trail': 'backgrounds-effects',
  carousel: 'media',
  cursor: 'micro-interactions',
  dialog: 'overlay',
  disclosure: 'micro-interactions',
  'in-view': 'micro-interactions',
  'infinite-slider': 'media',
  'transition-panel': 'micro-interactions',
  'text-effect': 'text',
  'text-loop': 'text',
  'text-morph': 'text',
  'text-roll': 'text',
  'text-scramble': 'text',
  'text-shimmer': 'text',
  'text-shimmer-wave': 'text',
  'animated-number': 'text',
  'sliding-number': 'text',
  dock: 'navigation',
  'glow-effect': 'backgrounds-effects',
  'image-comparison': 'media',
  'scroll-progress': 'feedback',
  spotlight: 'backgrounds-effects',
  'spinning-text': 'text',
  tilt: 'micro-interactions',
  'toolbar-dynamic': 'navigation',
  'toolbar-expandable': 'navigation',
  magnetic: 'micro-interactions',
  'morphing-dialog': 'overlay',
  'morphing-popover': 'overlay',
  'progressive-blur': 'backgrounds-effects',
};

async function extractMotionPrimitives() {
  const { data } = await fetchJSON('https://motion-primitives.com/c/registry.json');
  const entries = (data.items ?? [])
    .filter((item) => item.type === 'registry:ui')
    .map((item) => {
      const name = item.name;
      const display = item.title ?? titleCase(name);
      const category = MOTION_CATEGORY[name] ?? categoryFromKeywords(name, CATEGORY_RULES_ANIMATED, 'micro-interactions');
      return buildEntry({
        id: `motionprimitives-${category}-${slugify(name)}`,
        name: `Motion Primitives ${display}`,
        source: 'Motion Primitives',
        entryType: 'component',
        category,
        description: truncate(item.description ?? `${display} animated primitive built with Motion.`),
        useCase: USE_BY_CATEGORY[category],
        decisionHints: ['Built on Motion — matches the spring physics rules in 08-PHILOSOPHY'],
        searchTags: ['motion-primitives', 'springs', ...slugify(display).split('-')],
        docsUrl: `https://motion-primitives.com/docs/${name}`,
        stack: ['react', 'tailwind', 'motion'],
        dependencies: [...new Set([...(item.dependencies ?? []), 'motion', 'clsx', 'tailwind-merge'])],
        installMethod: 'npm',
        installCommand: `npx motion-primitives@latest add ${name}`,
        manualSteps: [`Or copy the source from https://motion-primitives.com/docs/${name}`],
        licenseType: 'MIT',
        commercialUse: true,
        free: true,
      });
    });
  return writeSource(
    'motionprimitives',
    {
      sourceName: 'Motion Primitives',
      sourceUrl: 'https://motion-primitives.com',
      catalogUrl: 'https://motion-primitives.com/docs',
      licenseSummary: 'MIT (core); Pro sections have a separate paid license',
      granularity: 'complete (33 components)',
      extraction: {
        channel: 'registry-json',
        method: 'Node script downloading the official registry JSON',
        evidence_url: 'https://motion-primitives.com/c/registry.json',
      },
    },
    entries,
  );
}

const target = process.argv[2] ?? 'all';
if (target === 'all' || target === 'magicui') await extractMagicUI();
if (target === 'all' || target === 'aceternity') await extractAceternity();
if (target === 'all' || target === 'shadcn') await extractShadcn();
if (target === 'all' || target === 'coss') await extractCoss();
if (target === 'all' || target === 'motion') await extractMotionPrimitives();
