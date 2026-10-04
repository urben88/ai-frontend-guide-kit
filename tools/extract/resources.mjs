/**
 * Curated, hand-verified resources that have no machine-readable registry:
 * icon sets, illustrations, design-tool libraries and paid UI kits.
 * License facts were checked on 2026-10-04 against the project LICENSE files / official terms pages (see `evidence`).
 * Icon counts come from the repository file trees (outline/regular SVGs) on the same date.
 *
 * Usage: node tools/extract/resources.mjs
 */
import { buildEntry, writeSource, USE_BY_CATEGORY } from './lib.mjs';

const R = [
  // ---- Icon sets (npm, tree-shakeable) ----
  {
    id: 'lucide', name: 'Lucide Icons', type: 'asset', category: 'assets', docs: 'https://lucide.dev/icons/',
    desc: 'Open-source SVG icon set (1,866 icons in the repo tree) with official packages for React, Vue, Svelte, Solid and more; the default icon set of shadcn/ui.',
    tags: ['icons', 'svg', 'lucide', 'feather', 'shadcn'], stack: ['react', 'vue', 'svelte', 'svg'],
    install: 'npm i lucide-react', method: 'npm', license: 'custom', commercial: true, free: true,
    limits: 'ISC license (Lucide) with portions MIT from Feather; both permissive, keep the copyright notice.',
    hints: ['Pick one icon set per project; Lucide is the shadcn default (stroke 2px, 24px grid)'], evidence: 'https://github.com/lucide-icons/lucide/blob/main/LICENSE',
  },
  {
    id: 'heroicons', name: 'Heroicons', type: 'asset', category: 'assets', docs: 'https://heroicons.com/',
    desc: 'Hand-crafted SVG icons from the makers of Tailwind CSS (324 outline icons in the repo tree; outline, solid, mini and micro styles).',
    tags: ['icons', 'svg', 'heroicons', 'tailwind'], stack: ['react', 'vue', 'svg', 'tailwind'],
    install: 'npm i @heroicons/react', method: 'npm', license: 'MIT', commercial: true, free: true,
    hints: ['Small, consistent set; best with Tailwind projects that need a few dozen icons'], evidence: 'https://github.com/tailwindlabs/heroicons/blob/master/LICENSE',
  },
  {
    id: 'tabler-icons', name: 'Tabler Icons', type: 'asset', category: 'assets', docs: 'https://tabler.io/icons',
    desc: 'Large free SVG icon set (5,166 outline icons in the repo tree, plus filled variants) with packages for React, Vue, Svelte and webfonts.',
    tags: ['icons', 'svg', 'tabler', 'webfont'], stack: ['react', 'vue', 'svelte', 'svg'],
    install: 'npm i @tabler/icons-react', method: 'npm', license: 'MIT', commercial: true, free: true,
    hints: ['Widest coverage of niche icons; consistent 24px / 2px stroke'], evidence: 'https://github.com/tabler/tabler-icons/blob/main/LICENSE',
  },
  {
    id: 'phosphor-icons', name: 'Phosphor Icons', type: 'asset', category: 'assets', docs: 'https://phosphoricons.com/',
    desc: 'Flexible icon family (1,512 icons, each in six weights: thin, light, regular, bold, fill, duotone) with official React, Vue and Svelte packages.',
    tags: ['icons', 'svg', 'phosphor', 'weights', 'duotone'], stack: ['react', 'vue', 'svelte', 'svg'],
    install: 'npm i @phosphor-icons/react', method: 'npm', license: 'MIT', commercial: true, free: true,
    hints: ['Choose Phosphor when you need weight variants or duotone to express hierarchy'], evidence: 'https://github.com/phosphor-icons/core/blob/main/LICENSE',
  },
  // ---- Illustrations ----
  {
    id: 'undraw', name: 'unDraw', type: 'asset', category: 'assets', docs: 'https://undraw.co/illustrations',
    desc: 'Open-source style SVG illustrations with an on-site color picker, free for commercial use without attribution.',
    tags: ['illustrations', 'svg', 'undraw', 'empty-states', 'onboarding'], stack: ['svg'],
    install: undefined, method: 'reference', license: 'custom', commercial: true, free: true,
    limits: 'Own license: commercial use allowed with no attribution; you may not redistribute illustrations in packs, scrape or embed them without consent, sell them as your product, or use them to train AI/ML models.',
    hints: ['Recolor to the project accent token; avoid using as the main brand visual (very recognizable)'], evidence: 'https://undraw.co/license',
  },
  {
    id: 'storyset', name: 'Storyset', type: 'asset', category: 'assets', docs: 'https://storyset.com/',
    desc: 'Customizable and animated illustration collections (Freepik) with a style, color and animation editor.',
    tags: ['illustrations', 'animated', 'storyset', 'freepik', 'lottie'], stack: ['svg'],
    install: undefined, method: 'reference', license: 'custom', commercial: 'conditional', free: true,
    limits: 'Free use requires crediting Storyset/Freepik; removing attribution needs a Flaticon Premium subscription. Reselling, sublicensing and stock-collection use are prohibited. Read the terms before commercial use.',
    hints: ['Plan for the attribution line in the footer or credits page, or budget the subscription'], evidence: 'https://storyset.com/terms',
  },
  // ---- Design-tool libraries ----
  {
    id: 'figma-community', name: 'Figma Community', type: 'design-system', category: 'design-system', docs: 'https://www.figma.com/community',
    desc: 'Community-published Figma files: UI kits, design systems, icon libraries and templates (for example the free edition of the Flowbite design system).',
    tags: ['figma', 'ui-kit', 'design-system', 'templates', 'community'], stack: ['figma'],
    install: undefined, method: 'reference', license: 'custom', commercial: 'conditional', free: true,
    limits: 'Free community files are published under CC BY 4.0 (commercial use allowed, credit the creator); paid files use the Community Paid Resource License. The license is per file: always check the file page.',
    hints: ['Use as a visual and structural reference or starting kit; export tokens into DESIGN.md', 'Credit CC BY files in the project credits'], evidence: 'https://www.figma.com/legal/community-free-resource-license/',
  },
  {
    id: 'canva', name: 'Canva', type: 'design-system', category: 'assets', docs: 'https://www.canva.com/',
    desc: 'Drag-and-drop design tool with templates, graphics, photos and video for marketing visuals, social posts and presentations.',
    tags: ['canva', 'templates', 'graphics', 'social', 'marketing'], stack: ['web'],
    install: undefined, method: 'reference', license: 'proprietary', commercial: 'conditional', free: true,
    limits: 'Canva Content License Agreement: free and Pro content can be used commercially in your designs, but not resold as standalone assets, and Branded/Disney content is restricted to personal use. Check people, logos and trademarks in images.',
    hints: ['Good for campaign graphics and social images, not for UI components or product screens'], evidence: 'https://www.canva.com/policies/content-license-agreement/',
  },
  // ---- Paid or partly paid UI kits (reference only: nothing is copied or indexed per component) ----
  {
    id: 'tailwind-plus', name: 'Tailwind Plus (UI Blocks, Templates, Catalyst)', type: 'design-system', category: 'blocks-sections', docs: 'https://tailwindcss.com/plus',
    desc: 'Official Tailwind Labs library of 500+ polished UI blocks, site templates and the Catalyst application UI kit; paid one-time license.',
    tags: ['tailwind', 'tailwind-plus', 'ui-blocks', 'catalyst', 'templates', 'paid'], stack: ['react', 'vue', 'html', 'tailwind'],
    install: undefined, method: 'reference', license: 'proprietary', commercial: true, free: false,
    limits: 'Paid: Personal license $299 one-time (Team $979; single packages $149 at the time of checking). Allowed in your own and client projects as the license permits; redistribution of the code is not allowed. Verify current prices.',
    hints: ['Highest visual polish of the Tailwind options; only recommend if the user has or will buy a license', 'Never copy its code into the kit or a public repo'], evidence: 'https://tailwindcss.com/plus',
  },
  {
    id: 'untitled-ui', name: 'Untitled UI React', type: 'design-system', category: 'design-system', docs: 'https://www.untitledui.com/react',
    desc: 'Large React component library built on Tailwind CSS and React Aria with a free MIT tier (base components, hundreds of application UI components and marketing sections) and a PRO tier.',
    tags: ['untitled-ui', 'react', 'tailwind', 'react-aria', 'design-system', 'figma'], stack: ['react', 'tailwind', 'react-aria'],
    install: 'npx untitledui@latest add button', method: 'npm', license: 'MIT', commercial: true, free: true,
    limits: 'Free components are MIT. PRO (from $349) adds more components, 250+ page examples and Figma sync and requires `npx untitledui@latest login`; PRO code is not MIT.',
    hints: ['Check each component page for the Free/PRO badge before adopting', 'Closest drop-in alternative to shadcn/ui with a stronger visual system'], evidence: 'https://www.untitledui.com/react/docs/cli',
  },
  {
    id: 'flowbite-blocks', name: 'Flowbite Blocks', type: 'block', category: 'blocks-sections', docs: 'https://flowbite.com/blocks/',
    desc: 'Tailwind CSS sections for marketing, application, e-commerce and publisher pages (hero, pricing, contact, dashboards); a free subset under MIT and a larger Pro collection.',
    tags: ['flowbite', 'blocks', 'sections', 'tailwind', 'hero', 'pricing'], stack: ['html', 'tailwind'],
    install: undefined, method: 'copy-paste', license: 'MIT', commercial: true, free: true,
    limits: 'Only the free blocks are MIT; the full collection (Pro, with Figma files) is paid and not indexed. Check the block page for the Pro badge.',
    hints: ['Pair with the Flowbite component source (`--source flowbite`)'], evidence: 'https://flowbite.com/pro/',
  },
];

const entries = R.map((r) =>
  buildEntry({
    id: `resources-${r.category}-${r.id}`,
    name: r.name,
    source: 'Curated resources',
    entryType: r.type,
    category: r.category,
    description: r.desc,
    useCase: USE_BY_CATEGORY[r.category],
    decisionHints: r.hints,
    searchTags: r.tags,
    docsUrl: r.docs,
    stack: r.stack,
    installMethod: r.method,
    installCommand: r.install,
    manualSteps: [`Docs: ${r.docs}`, `License evidence: ${r.evidence}`],
    licenseType: r.license,
    commercialUse: r.commercial,
    free: r.free,
    limits: r.limits,
    extractionNote: 'Hand-curated on 2026-10-04: license facts checked against the linked evidence; no machine-readable registry exists.',
  }),
);

writeSource(
  'resources',
  {
    sourceName: 'Curated resources',
    sourceUrl: 'https://github.com/urben88/ai-frontend-guide-kit',
    catalogUrl: 'https://github.com/urben88/ai-frontend-guide-kit',
    licenseSummary: 'Per resource: icon sets MIT/ISC, illustrations with custom terms, paid kits proprietary. See each entry.',
    granularity: 'curated: icon sets, illustrations, design-tool libraries and paid UI kits (reference level)',
    extraction: { channel: 'manual', method: 'Hand-curated list; license evidence linked in manual_steps', evidence_url: 'https://github.com/urben88/ai-frontend-guide-kit/blob/main/tools/extract/resources.mjs' },
  },
  entries,
);
