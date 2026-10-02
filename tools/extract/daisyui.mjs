/**
 * Extraction: docs-structured channel — daisyUI (MIT).
 * Parses llms.txt (component list) + a curated slug/category map (68 components).
 *
 * Usage: node tools/extract/daisyui.mjs
 */
import { fetchText, buildEntry, writeSource, slugify, USE_BY_CATEGORY } from './lib.mjs';

const COMPONENTS = [
  // Actions
  ['button', 'Button', 'micro-interactions'],
  ['dropdown', 'Dropdown', 'overlay'],
  ['fab', 'FAB / Speed Dial', 'micro-interactions'],
  ['modal', 'Modal', 'overlay'],
  ['swap', 'Swap', 'micro-interactions'],
  ['theme-controller', 'Theme Controller', 'micro-interactions'],
  // Data display
  ['accordion', 'Accordion', 'micro-interactions'],
  ['avatar', 'Avatar', 'data-display'],
  ['aura', 'Aura', 'backgrounds-effects'],
  ['badge', 'Badge', 'data-display'],
  ['card', 'Card', 'data-display'],
  ['carousel', 'Carousel', 'media'],
  ['chat', 'Chat bubble', 'ai-surfaces'],
  ['collapse', 'Collapse', 'micro-interactions'],
  ['countdown', 'Countdown', 'data-display'],
  ['diff', 'Diff', 'media'],
  ['hover-3d', 'Hover 3D', 'micro-interactions'],
  ['hover-gallery', 'Hover Gallery', 'media'],
  ['kbd', 'Kbd', 'data-display'],
  ['list', 'List', 'data-display'],
  ['stat', 'Stat', 'data-display'],
  ['status', 'Status', 'feedback'],
  ['table', 'Table', 'data-display'],
  ['text-rotate', 'Text Rotate', 'text'],
  ['timeline', 'Timeline', 'data-display'],
  // Navigation
  ['breadcrumbs', 'Breadcrumbs', 'navigation'],
  ['dock', 'Dock', 'navigation'],
  ['link', 'Link', 'navigation'],
  ['megamenu', 'Megamenu', 'navigation'],
  ['menu', 'Menu', 'navigation'],
  ['navbar', 'Navbar', 'navigation'],
  ['pagination', 'Pagination', 'navigation'],
  ['steps', 'Steps', 'navigation'],
  ['tab', 'Tab', 'navigation'],
  // Feedback
  ['alert', 'Alert', 'feedback'],
  ['loading', 'Loading', 'feedback'],
  ['progress', 'Progress', 'feedback'],
  ['radial-progress', 'Radial progress', 'feedback'],
  ['skeleton', 'Skeleton', 'feedback'],
  ['toast', 'Toast', 'feedback'],
  ['tooltip', 'Tooltip', 'feedback'],
  // Data input
  ['calendar', 'Calendar', 'forms'],
  ['checkbox', 'Checkbox', 'forms'],
  ['fieldset', 'Fieldset', 'forms'],
  ['file-input', 'File Input', 'forms'],
  ['filter', 'Filter', 'forms'],
  ['input', 'Input', 'forms'],
  ['label', 'Label', 'forms'],
  ['otp', 'OTP', 'forms'],
  ['radio', 'Radio', 'forms'],
  ['range', 'Range', 'forms'],
  ['rating', 'Rating', 'forms'],
  ['select', 'Select', 'forms'],
  ['textarea', 'Textarea', 'forms'],
  ['toggle', 'Toggle', 'forms'],
  ['validator', 'Validator', 'forms'],
  // Layout
  ['divider', 'Divider', 'layout'],
  ['drawer', 'Drawer', 'overlay'],
  ['footer', 'Footer', 'layout'],
  ['hero', 'Hero', 'hero'],
  ['indicator', 'Indicator', 'data-display'],
  ['join', 'Join', 'layout'],
  ['mask', 'Mask', 'layout'],
  ['stack', 'Stack', 'layout'],
  // Mockup
  ['browser', 'Browser mockup', 'media'],
  ['code', 'Code mockup', 'media'],
  ['phone', 'Phone mockup', 'media'],
  ['window', 'Window mockup', 'media'],
];

async function main() {
  const { text, status } = await fetchText('https://daisyui.com/llms.txt');
  if (status !== 200) throw new Error(`daisyui llms.txt status ${status}`);
  const linked = new Set(
    [...text.matchAll(/https:\/\/daisyui\.com\/components\/([a-z0-9-]+)\/?/g)].map((match) => match[1]),
  );
  console.log(`daisyui: llms.txt lists ${linked.size} component doc links; indexing full map of ${COMPONENTS.length}`);

  const entries = COMPONENTS.map(([slug, display, category]) =>
    buildEntry({
      id: `daisyui-${category}-${slugify(slug)}`,
      name: `DaisyUI ${display}`,
      source: 'DaisyUI',
      entryType: 'component',
      category,
      description: `daisyUI ${display} component: semantic CSS classes for Tailwind CSS 4, zero JavaScript dependency, themeable via data-theme.`,
      useCase: USE_BY_CATEGORY[category],
      decisionHints: ['Pure CSS: works in React, Vue, Svelte, Astro or plain HTML', 'Theme with daisyUI semantic color tokens'],
      searchTags: ['daisyui', 'css', ...slug.split('-')],
      docsUrl: `https://daisyui.com/components/${slug}/`,
      stack: ['html', 'css', 'tailwind'],
      dependencies: [],
      installMethod: 'copy-paste',
      installCommand: 'npm i -D daisyui@latest',
      manualSteps: [
        'Add `@import "tailwindcss";` and `@plugin "daisyui";` to your CSS file (Tailwind v4).',
        `Copy the markup for ${display} from the docs page (classes like .btn, .card, .modal…).`,
        'Optional CDN: https://cdn.jsdelivr.net/npm/daisyui@5',
      ],
      licenseType: 'MIT',
      commercialUse: true,
      free: true,
      extractionNote: linked.has(slug) ? undefined : 'Slug not linked in current llms.txt; docs URL follows the official components index.',
    }),
  );

  return writeSource(
    'daisyui',
    {
      sourceName: 'DaisyUI',
      sourceUrl: 'https://daisyui.com',
      catalogUrl: 'https://daisyui.com/components/',
      licenseSummary: 'MIT (library); templates/charts/Figma assets sold separately',
      granularity: 'complete (68 components)',
      extraction: {
        channel: 'docs-structured',
        method: 'Node script parsing daisyUI llms.txt plus the documented category map',
        evidence_url: 'https://daisyui.com/llms.txt',
      },
    },
    entries,
  );
}

await main();
