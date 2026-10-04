/**
 * Extraction: registry-json channel, second batch of shadcn-compatible registries.
 * Sources: Kibo UI (free, license not stated), Animate UI (MIT + Commons Clause),
 *          cult/ui (MIT), React Bits (MIT + Commons Clause).
 *
 * Usage: node tools/extract/registry-extra.mjs [kibo|animateui|cultui|reactbits|all]
 */
import { fetchJSON, buildEntry, writeSource, slugify, titleCase, categoryFromKeywords, truncate, USE_BY_CATEGORY } from './lib.mjs';

const RULES = [
  [/text|typing|word|hyper|ticker|shimmer|shiny|scramble|counting|counter|number|gradient-text|split|blur-text|decrypted|glitch|scrambled|fuzzy|rotating|variable-proximity|curved-loop|scroll-float|scroll-reveal|shuffle|true-focus|ascii/, 'text'],
  [/chat|message|conversation|prompt|reasoning|agent|tool-call|thinking|ai-/, 'ai-surfaces'],
  [/background|aurora|beams|particles|galaxy|waves|grid|dots|noise|silk|orb|lightning|plasma|iridescence|ripple-grid|threads|prism|liquid|squares|hyperspeed|ballpit|lanyard|dither|gradient-blinds|pixel/, 'backgrounds-effects'],
  [/carousel|slider|gallery|image|video|globe|device|mock|stack|folder|circular-gallery|masonry|flowing-menu|infinite-menu|model|lens/, 'media'],
  [/navbar|menu|breadcrumb|pagination|stepper|tabs|dock|sidebar|nav|stepper|bubble-menu|card-nav|staggered|pill-nav/, 'navigation'],
  [/modal|dialog|popover|dropdown|sheet|drawer|command|context-menu|hover-card|alert-dialog/, 'overlay'],
  [/input|select|checkbox|radio|switch|calendar|form|otp|field|combobox|picker|textarea|dropzone|slider-input|color|tags|rating|code-block-input|editor/, 'forms'],
  [/alert|toast|notification|progress|skeleton|tooltip|loader|spinner|banner|status|announcement/, 'feedback'],
  [/table|chart|kanban|list|avatar|badge|stat|timeline|tree|calendar|gantt|counter|card|ticker|marquee/, 'data-display'],
  [/button|cursor|magnet|tilt|hover|reveal|animate|click|spark|swap|toggle|glow|shine|spotlight|follow|elastic|bounce|pixel-transition|splash|target|gooey|ribbon/, 'micro-interactions'],
];

const HINT = 'Prefer a catalog entry from a tool-free source first; see 08-PHILOSOPHY for the animation budget.';

function mapItems(items, cfg) {
  const entries = [];
  for (const item of items) {
    if (!cfg.types.has(item.type)) continue;
    if (cfg.skip?.test(item.name)) continue;
    const display = item.title && item.title !== item.name ? titleCase(item.title) : titleCase(item.name.replace(/-(JS|TS)-(CSS|TW)$/i, ''));
    const category = cfg.categoryOf?.(item) ?? categoryFromKeywords(item.name, RULES, cfg.fallback);
    entries.push(
      buildEntry({
        id: `${cfg.prefix}-${category}-${slugify(item.name)}`,
        name: `${cfg.label} ${display}`,
        source: cfg.label,
        entryType: item.type === 'registry:block' ? 'block' : 'component',
        category,
        description: truncate(item.description ?? `${display} from ${cfg.label}.`),
        useCase: USE_BY_CATEGORY[category],
        decisionHints: [...cfg.hints, HINT],
        searchTags: [cfg.prefix, ...slugify(display).split('-')],
        docsUrl: cfg.docsUrl(item.name),
        registryUrl: cfg.registryUrl?.(item.name),
        stack: cfg.stack(item),
        dependencies: [...new Set(item.dependencies ?? [])],
        installMethod: 'shadcn-cli',
        installCommand: cfg.install(item.name),
        manualSteps: [`Or copy the source from ${cfg.docsUrl(item.name)}`],
        licenseType: cfg.licenseType,
        commercialUse: true,
        free: true,
        limits: cfg.limits,
      }),
    );
  }
  return entries;
}

async function run(id, url, cfg, meta) {
  const { data } = await fetchJSON(url);
  const entries = mapItems(data.items ?? data, cfg);
  return writeSource(id, { ...meta, extraction: { channel: 'registry-json', method: 'Node script downloading the public shadcn-compatible registry', evidence_url: url } }, entries);
}

const reactStack = (item) => ['react', 'tailwind', ...((item.dependencies ?? []).some((d) => /^(motion|framer-motion)/.test(d)) ? ['motion'] : [])];

async function kibo() {
  return run(
    'kiboui',
    'https://www.kibo-ui.com/r/registry.json',
    {
      prefix: 'kiboui',
      label: 'Kibo UI',
      types: new Set(['registry:ui']),
      fallback: 'data-display',
      hints: ['Compound components built on shadcn/ui — good for data-heavy product UI (kanban, gantt, table, editor, AI blocks)'],
      docsUrl: (n) => `https://www.kibo-ui.com/components/${n}`,
      registryUrl: (n) => `https://www.kibo-ui.com/r/${n}.json`,
      stack: reactStack,
      install: (n) => `npx shadcn@latest add https://www.kibo-ui.com/r/${n}.json`,
      licenseType: 'unknown',
      limits: 'Site states "free and open source" but no SPDX license was found in the repo; confirm the license before shipping to clients.',
    },
    {
      sourceName: 'Kibo UI',
      sourceUrl: 'https://www.kibo-ui.com',
      catalogUrl: 'https://www.kibo-ui.com/components',
      licenseSummary: 'Free and open source per site; SPDX license not published — verify before commercial use',
      granularity: 'complete (all registry:ui items)',
    },
  );
}

async function animateui() {
  return run(
    'animateui',
    'https://animate-ui.com/r/registry.json',
    {
      prefix: 'animateui',
      label: 'Animate UI',
      types: new Set(['registry:ui']),
      skip: /^(index|utils)$/,
      categoryOf: (item) => (/^icons-/.test(item.name) ? 'micro-interactions' : undefined),
      fallback: 'micro-interactions',
      hints: ['Animated shadcn-style primitives (Radix/Base UI variants) built on Motion'],
      docsUrl: (n) => `https://animate-ui.com/docs/components/${n}`,
      registryUrl: (n) => `https://animate-ui.com/r/${n}.json`,
      stack: () => ['react', 'tailwind', 'motion'],
      install: (n) => `npx shadcn@latest add https://animate-ui.com/r/${n}.json`,
      licenseType: 'custom',
      limits: 'MIT + Commons Clause: free to use inside an application, website or product; you may not sell the components themselves as a library/template.',
    },
    {
      sourceName: 'Animate UI',
      sourceUrl: 'https://animate-ui.com',
      catalogUrl: 'https://animate-ui.com/docs/components',
      licenseSummary: 'MIT + Commons Clause (use in products; no resale of the components)',
      granularity: 'complete (all registry:ui items)',
    },
  );
}

async function cultui() {
  return run(
    'cultui',
    'https://www.cult-ui.com/r/registry.json',
    {
      prefix: 'cultui',
      label: 'cult/ui',
      types: new Set(['registry:ui', 'registry:component']),
      fallback: 'micro-interactions',
      hints: ['Opinionated animated and AI-oriented components for shadcn projects'],
      docsUrl: (n) => `https://www.cult-ui.com/docs/components/${n}`,
      registryUrl: (n) => `https://www.cult-ui.com/r/${n}.json`,
      stack: reactStack,
      install: (n) => `npx shadcn@latest add https://www.cult-ui.com/r/${n}.json`,
      licenseType: 'MIT',
    },
    {
      sourceName: 'cult/ui',
      sourceUrl: 'https://www.cult-ui.com',
      catalogUrl: 'https://www.cult-ui.com/docs/components',
      licenseSummary: 'MIT (open-source components); Pro blocks have a separate license',
      granularity: 'complete (registry:ui + registry:component)',
    },
  );
}

async function reactbits() {
  return run(
    'reactbits',
    'https://reactbits.dev/r/registry.json',
    {
      prefix: 'reactbits',
      label: 'React Bits',
      types: new Set(['registry:component']),
      // Each component ships 4 variants (JS/TS x CSS/Tailwind); keep one entry per component (TS + Tailwind).
      skip: /^(?!.*-TS-TW$)/,
      fallback: 'micro-interactions',
      hints: ['Highly animated, often WebGL/GSAP/three.js — performance and reduced-motion cost; use 1 per view'],
      docsUrl: (n) => `https://reactbits.dev/get-started/index#${n.replace(/-(JS|TS)-(CSS|TW)$/i, '')}`,
      registryUrl: (n) => `https://reactbits.dev/r/${n}.json`,
      stack: (item) => ['react', 'tailwind', ...((item.dependencies ?? []).some((d) => /^(gsap|three|ogl|motion|framer-motion|@react-three)/.test(d)) ? ['animation-lib'] : [])],
      install: (n) => `npx shadcn@latest add @react-bits/${n}`,
      licenseType: 'custom',
      limits: 'MIT + Commons Clause: free in apps, sites and products; do not resell the components themselves.',
    },
    {
      sourceName: 'React Bits',
      sourceUrl: 'https://reactbits.dev',
      catalogUrl: 'https://reactbits.dev',
      licenseSummary: 'MIT + Commons Clause (use in products; no resale of the components)',
      granularity: 'complete (one entry per component, TS + Tailwind variant)',
    },
  );
}

const target = process.argv[2] ?? 'all';
if (target === 'all' || target === 'kibo') await kibo();
if (target === 'all' || target === 'animateui') await animateui();
if (target === 'all' || target === 'cultui') await cultui();
if (target === 'all' || target === 'reactbits') await reactbits();
