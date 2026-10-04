/**
 * Extraction: component libraries distributed as npm packages (not copy-paste registries).
 * Sources: Mantine, Base UI, React Aria Components, Material UI, Chakra UI, Ant Design, Radix Primitives,
 *          Headless UI, Flowbite, Mantine UI (page-section categories).
 * Component lists come from the public GitHub directory listing of each package.
 *
 * Usage: node tools/extract/ui-libraries.mjs [mantine|baseui|reactaria|mui|chakra|antd|radix|headlessui|flowbite|mantineui|all]
 */
import { fetchJSON, fetchText, mapLimit, buildEntry, writeSource, slugify, titleCase, categoryFromKeywords, USE_BY_CATEGORY } from './lib.mjs';

const RULES = [
  [/accordion|collapse|disclosure|spoiler|tooltip-group/, 'micro-interactions'],
  [/alert-dialog|dialog|modal|drawer|sheet|popover|hover-card|preview-card|menu|context-menu|dropdown|command|spotlight|overlay|tooltip|floating-window/, 'overlay'],
  [/alert|notification|toast|progress|skeleton|loader|loading|spinner|meter|ring-progress|status/, 'feedback'],
  [/avatar|badge|card|chart|table|timeline|stat|list|tree|data-list|kbd|code|highlight|mark|indicator|color-swatch|image|blockquote|text|title|tag|pill|chip/, 'data-display'],
  [/breadcrumb|pagination|stepper|tabs|nav|burger|anchor|link|toolbar|app-shell|affix|scroll-to/, 'navigation'],
  [/button|toggle|action-icon|close-button|copy-button|file-button|rating/, 'micro-interactions'],
  [/checkbox|radio|select|autocomplete|combobox|cascader|input|field|form|slider|switch|number|otp|pin|calendar|date|time|color-picker|color-input|color-field|color-area|color-slider|color-wheel|file-input|json-input|mask|textarea|search|tags-input|picker|drop-zone|file-trigger|fieldset|angle|segmented|transfer|password/, 'forms'],
  [/carousel|slider|gallery|aspect|background-image|image/, 'media'],
  [/container|grid|flex|group|stack|center|divider|separator|scroll-area|simple-grid|space|paper|box|resizable|splitter|empty/, 'layout'],
];

const SKIP_MANTINE = /^(Box|Portal|Transition|FocusTrap|FloatingIndicator|Popper|VisuallyHidden|ScrollAreaAutosize|MantineProvider|InlineInput|Combobox|ComboboxPopover|PillsInput|UnstyledButton|Collapse|ColorSwatch)$/;
const SKIP_BASEUI = /^(global|index|internals|utils|types|floating-ui-react|merge-props|use-render|csp-provider|direction-provider|unstable-use-media-query|filter-dropdown)/;
const SKIP_ARIA = /^(Collection|DragAndDrop|SharedElementTransition|HiddenDateInput|OverlayArrow|NavigationTree|PreviewTrigger|FieldError|Header|Heading|Keyboard|Text|Label|Input|Group|Link|Sheet)\./;

const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

async function listDir(repo, path) {
  const { data } = await fetchJSON(`https://api.github.com/repos/${repo}/contents/${path}`);
  return Array.isArray(data) ? data : [];
}

function entryFor(cfg, name, slug) {
  const category = categoryFromKeywords(slug, RULES, 'data-display');
  const display = titleCase(slug);
  return buildEntry({
    id: `${cfg.prefix}-${category}-${slugify(slug)}`,
    name: `${cfg.label} ${display}`,
    source: cfg.label,
    entryType: 'component',
    category,
    description: `${display} from ${cfg.label}: ${cfg.blurb}`,
    useCase: USE_BY_CATEGORY[category],
    decisionHints: cfg.hints,
    searchTags: [cfg.prefix, ...slug.split('-')],
    docsUrl: cfg.docsUrl(name, slug),
    stack: cfg.stack,
    dependencies: [cfg.pkg],
    installMethod: 'npm',
    installCommand: cfg.install,
    manualSteps: [`Docs: ${cfg.docsUrl(name, slug)}`],
    licenseType: cfg.license,
    commercialUse: true,
    free: true,
  });
}

async function mantine() {
  const cfg = {
    prefix: 'mantine', label: 'Mantine', pkg: '@mantine/core', license: 'MIT', stack: ['react', 'css-modules'],
    blurb: 'a batteries-included React component with built-in theming and accessibility.',
    hints: ['Own styling system (CSS variables / PostCSS), not Tailwind-first; adapt tokens through the Mantine theme', 'Best for dashboards and data-heavy apps that want ready-made behavior'],
    install: 'npm i @mantine/core @mantine/hooks',
    docsUrl: (name, slug) => `https://mantine.dev/core/${slug}/`,
  };
  const dirs = (await listDir('mantinedev/mantine', 'packages/@mantine/core/src/components')).filter((i) => i.type === 'dir' && !SKIP_MANTINE.test(i.name));
  const entries = dirs.map((d) => entryFor(cfg, d.name, kebab(d.name)));
  return writeSource('mantine', { sourceName: cfg.label, sourceUrl: 'https://mantine.dev', catalogUrl: 'https://mantine.dev/core/getting-started/', licenseSummary: 'MIT', granularity: 'complete (components of @mantine/core)', extraction: { channel: 'github-contents', method: 'Directory listing of the @mantine/core components folder', evidence_url: 'https://github.com/mantinedev/mantine/tree/master/packages/@mantine/core/src/components' } }, entries);
}

async function baseui() {
  const cfg = {
    prefix: 'baseui', label: 'Base UI', pkg: '@base-ui/react', license: 'MIT', stack: ['react', 'headless'],
    blurb: 'an unstyled, accessible React primitive; you bring the styles (Tailwind, CSS).',
    hints: ['Unstyled: pair with your tokens or Tailwind classes', 'Good base when a design system must own all visuals'],
    install: 'npm i @base-ui/react',
    docsUrl: (name, slug) => `https://base-ui.com/react/components/${slug}`,
  };
  const dirs = (await listDir('mui/base-ui', 'packages/react/src')).filter((i) => i.type === 'dir' && !SKIP_BASEUI.test(i.name));
  const entries = dirs.map((d) => entryFor(cfg, d.name, d.name));
  return writeSource('baseui', { sourceName: cfg.label, sourceUrl: 'https://base-ui.com', catalogUrl: 'https://base-ui.com/react/overview/quick-start', licenseSummary: 'MIT', granularity: 'complete (components of @base-ui/react)', extraction: { channel: 'github-contents', method: 'Directory listing of packages/react/src', evidence_url: 'https://github.com/mui/base-ui/tree/master/packages/react/src' } }, entries);
}

async function reactaria() {
  const cfg = {
    prefix: 'reactaria', label: 'React Aria Components', pkg: 'react-aria-components', license: 'Apache-2.0', stack: ['react', 'headless'],
    blurb: 'an accessible, unstyled React component with strong keyboard, focus and i18n behavior.',
    hints: ['Unstyled and accessibility-first; strongest option for complex widgets (date pickers, comboboxes, tables, drag and drop)', 'Style with Tailwind via the tailwindcss-react-aria-components plugin or plain CSS'],
    install: 'npm i react-aria-components',
    docsUrl: (name) => `https://react-spectrum.adobe.com/react-aria/${name}.html`,
  };
  const files = (await listDir('adobe/react-spectrum', 'packages/react-aria-components/src')).filter((i) => i.type === 'file' && /\.tsx$/.test(i.name) && !SKIP_ARIA.test(i.name));
  const entries = files.map((f) => {
    const name = f.name.replace(/\.tsx$/, '');
    return entryFor(cfg, name, kebab(name));
  });
  return writeSource('reactaria', { sourceName: cfg.label, sourceUrl: 'https://react-spectrum.adobe.com/react-aria/', catalogUrl: 'https://react-spectrum.adobe.com/react-aria/components.html', licenseSummary: 'Apache-2.0', granularity: 'complete (react-aria-components source files)', extraction: { channel: 'github-contents', method: 'Directory listing of packages/react-aria-components/src', evidence_url: 'https://github.com/adobe/react-spectrum/tree/main/packages/react-aria-components/src' } }, entries);
}

/** Drops entries whose docs page is a 404 (names in repos do not always match the docs routes). 403/429/network errors are kept. */
async function verifyDocs(entries, label) {
  const checked = await mapLimit(entries, 8, async (entry) => {
    try {
      const { status } = await fetchText(entry.docs_url, { timeout: 15000, retries: 1, method: 'GET' });
      return { entry, dead: status === 404 || status === 410 };
    } catch {
      return { entry, dead: false };
    }
  });
  const alive = checked.filter((c) => !c.dead).map((c) => c.entry);
  console.log(`${label}: docs verified, ${checked.length - alive.length} dropped (404), ${alive.length} kept`);
  return alive;
}

async function simple(cfg, items, meta) {
  const entries = items.map(({ name, slug }) => entryFor(cfg, name, slug));
  return writeSource(cfg.prefix, meta, await verifyDocs(entries, cfg.label));
}

const dirNames = async (repo, path) => (await listDir(repo, path)).filter((i) => i.type === 'dir').map((i) => i.name);

// Folder names that do not match the docs route.
const MUI_DOC = { Fab: 'floating-action-button', CircularProgress: 'progress', LinearProgress: 'progress', Radio: 'radio-button', RadioGroup: 'radio-button', ImageList: 'image-list', SwipeableDrawer: 'drawer', MobileStepper: 'stepper', TablePagination: 'table', ToggleButtonGroup: 'toggle-button', Toolbar: 'app-bar', IconButton: 'button', FormControlLabel: 'checkbox', TextField: 'text-field', MenuItem: 'menu', MenuList: 'menu', ListSubheader: 'list', ImageListItem: 'image-list' };

async function mui() {
  const cfg = {
    prefix: 'mui', label: 'Material UI', pkg: '@mui/material', license: 'MIT', stack: ['react', 'emotion'],
    blurb: 'a Material Design React component with a deep theming system.',
    hints: ['Material Design look by default; heavy theming (createTheme) needed to avoid the default Material feel', 'Strong for dashboards and enterprise admin apps'],
    install: 'npm i @mui/material @emotion/react @emotion/styled',
    docsUrl: (name, slug) => `https://mui.com/material-ui/react-${MUI_DOC[name] ?? slug}/`,
  };
  const PART = /(Actions|Details|Summary|Title|Content|ContentText|Header|Media|ActionArea|Base|Label|ItemText|ItemIcon|ItemButton|ItemAvatar|Provider|Listener|Baseline|Context|Panel|Root|Track)$/;
  const KEEP_GROUPS = /^(ToggleButtonGroup|ButtonGroup|AvatarGroup)$/;
  const SKIP = /^(Fade|Grow|Slide|Zoom|Collapse|Icon|SvgIcon|Input|Tab)$|^(Portal|NoSsr|Popper|ScopedCssBaseline|StyledEngineProvider|GlobalStyles|InitColorSchemeScript|Unstable|Experimental|Pigment|OverridableComponent|FormControl$|FormGroup|FormHelperText|FormLabel|InputBase|InputAdornment|InputLabel|FilledInput|OutlinedInput|NativeSelect|Backdrop|ButtonBase|TextareaAutosize|Hidden)/;
  const names = (await dirNames('mui/material-ui', 'packages/mui-material/src')).filter((n) => /^[A-Z]/.test(n) && !SKIP.test(n) && (KEEP_GROUPS.test(n) || !PART.test(n)));
  return simple(cfg, names.map((name) => ({ name, slug: kebab(name) })), { sourceName: cfg.label, sourceUrl: 'https://mui.com/material-ui/', catalogUrl: 'https://mui.com/material-ui/all-components/', licenseSummary: 'MIT (core); MUI X Pro/Premium and templates are paid', granularity: 'main components of @mui/material (sub-parts folded into their parent, docs URLs verified)', extraction: { channel: 'github-contents', method: 'Directory listing of packages/mui-material/src with docs URL verification', evidence_url: 'https://github.com/mui/material-ui/tree/master/packages/mui-material/src' } });
}

async function chakra() {
  const cfg = {
    prefix: 'chakra', label: 'Chakra UI', pkg: '@chakra-ui/react', license: 'MIT', stack: ['react', 'emotion'],
    blurb: 'an accessible React component styled through Chakra theme tokens and style props.',
    hints: ['Own style system (tokens, recipes), not Tailwind; v3 uses Ark UI primitives', 'Good when a theme-token-driven system is wanted'],
    install: 'npm i @chakra-ui/react @emotion/react',
    docsUrl: (name, slug) => `https://chakra-ui.com/docs/components/${slug}`,
  };
  const SKIP = /^(absolute-center|bleed|circle|client-only|environment|focus-trap|float$|em$|download-trigger|format|locale|portal|presence|show|visually-hidden|for$|mark$|wrap|stack|group)/;
  const names = (await dirNames('chakra-ui/chakra-ui', 'packages/react/src/components')).filter((n) => !SKIP.test(n));
  return simple(cfg, names.map((name) => ({ name, slug: name })), { sourceName: cfg.label, sourceUrl: 'https://chakra-ui.com', catalogUrl: 'https://chakra-ui.com/docs/components/concepts/overview', licenseSummary: 'MIT', granularity: 'components of @chakra-ui/react v3 (docs URLs verified)', extraction: { channel: 'github-contents', method: 'Directory listing of packages/react/src/components with docs URL verification', evidence_url: 'https://github.com/chakra-ui/chakra-ui/tree/main/packages/react/src/components' } });
}

async function antd() {
  const cfg = {
    prefix: 'antd', label: 'Ant Design', pkg: 'antd', license: 'MIT', stack: ['react', 'css-in-js'],
    blurb: 'an enterprise-grade React component for admin apps, tables, forms and dashboards.',
    hints: ['Dense enterprise look; theme through design tokens (ConfigProvider)', 'Best for back-office and data-heavy products; large bundle'],
    install: 'npm i antd',
    docsUrl: (name, slug) => `https://ant.design/components/${slug}`,
  };
  const SKIP = /^(_|__|config-provider$|locale$|icon$|style$|theme$|index|version$|col$|row$|border-beam|back-top$|listy|masonry$)/;
  const names = (await dirNames('ant-design/ant-design', 'components')).filter((n) => !SKIP.test(n));
  return simple(cfg, names.map((name) => ({ name, slug: name })), { sourceName: cfg.label, sourceUrl: 'https://ant.design', catalogUrl: 'https://ant.design/components/overview', licenseSummary: 'MIT', granularity: 'components of antd (docs URLs verified)', extraction: { channel: 'github-contents', method: 'Directory listing of components/ with docs URL verification', evidence_url: 'https://github.com/ant-design/ant-design/tree/master/components' } });
}

async function radix() {
  const cfg = {
    prefix: 'radix', label: 'Radix Primitives', pkg: 'radix-ui', license: 'MIT', stack: ['react', 'headless'],
    blurb: 'an unstyled, accessible React primitive that owns behavior and focus management; you bring the styles.',
    hints: ['Headless: pairs with Tailwind or CSS; the foundation of shadcn/ui', 'Best when the design system must own every visual detail'],
    install: 'npm i radix-ui',
    docsUrl: (name, slug) => `https://www.radix-ui.com/primitives/docs/components/${slug}`,
  };
  const KEEP = new Set(['accessible-icon', 'accordion', 'alert-dialog', 'aspect-ratio', 'avatar', 'checkbox', 'collapsible', 'context-menu', 'dialog', 'dropdown-menu', 'form', 'hover-card', 'label', 'menubar', 'navigation-menu', 'one-time-password-field', 'password-toggle-field', 'popover', 'progress', 'radio-group', 'scroll-area', 'select', 'separator', 'slider', 'switch', 'tabs', 'toast', 'toggle', 'toggle-group', 'toolbar', 'tooltip', 'visually-hidden']);
  const names = (await dirNames('radix-ui/primitives', 'packages/react')).filter((n) => KEEP.has(n));
  return simple(cfg, names.map((name) => ({ name, slug: name })), { sourceName: cfg.label, sourceUrl: 'https://www.radix-ui.com/primitives', catalogUrl: 'https://www.radix-ui.com/primitives/docs/overview/introduction', licenseSummary: 'MIT', granularity: 'public primitives of Radix (docs URLs verified)', extraction: { channel: 'github-contents', method: 'Directory listing of packages/react filtered to public primitives with docs URL verification', evidence_url: 'https://github.com/radix-ui/primitives/tree/main/packages/react' } });
}

async function headlessui() {
  const cfg = {
    prefix: 'headlessui', label: 'Headless UI', pkg: '@headlessui/react', license: 'MIT', stack: ['react', 'vue', 'headless'],
    blurb: 'an unstyled, accessible component from the Tailwind team for React and Vue.',
    hints: ['Headless and Tailwind-friendly; fewer components than Radix/React Aria but a very simple API'],
    install: 'npm i @headlessui/react',
    docsUrl: (name, slug) => `https://headlessui.com/react/${slug}`,
  };
  const names = ['button', 'checkbox', 'combobox', 'description', 'dialog', 'disclosure', 'field', 'fieldset', 'input', 'label', 'legend', 'listbox', 'menu', 'popover', 'radio-group', 'select', 'switch', 'tabs', 'textarea', 'transition'];
  return simple(cfg, names.map((name) => ({ name, slug: name })), { sourceName: cfg.label, sourceUrl: 'https://headlessui.com', catalogUrl: 'https://headlessui.com/react/menu', licenseSummary: 'MIT', granularity: 'public components of @headlessui/react (docs URLs verified)', extraction: { channel: 'github-contents', method: 'Component list from the headlessui package with docs URL verification', evidence_url: 'https://github.com/tailwindlabs/headlessui/tree/main/packages/@headlessui-react/src/components' } });
}

async function flowbite() {
  const cfg = {
    prefix: 'flowbite', label: 'Flowbite', pkg: 'flowbite', license: 'MIT', stack: ['html', 'tailwind'],
    blurb: 'a Tailwind CSS component with ready HTML plus optional JavaScript behavior.',
    hints: ['Plain HTML + Tailwind classes; framework wrappers exist (React, Svelte, Vue)', 'Flowbite Pro blocks and templates are paid and are not indexed'],
    install: 'npm i flowbite (add the plugin in your Tailwind config)',
    docsUrl: (name, slug) => `https://flowbite.com/docs/components/${slug}/`,
  };
  const files = (await listDir('themesberg/flowbite', 'content/components')).filter((i) => i.type === 'file' && /\.md$/.test(i.name));
  return simple(cfg, files.map((f) => ({ name: f.name, slug: f.name.replace(/\.md$/, '') })), { sourceName: cfg.label, sourceUrl: 'https://flowbite.com', catalogUrl: 'https://flowbite.com/docs/getting-started/introduction/', licenseSummary: 'MIT (open-source components); Flowbite Pro blocks/templates and part of Flowbite Blocks are paid', granularity: 'components of the open-source Flowbite docs (docs URLs verified)', extraction: { channel: 'github-contents', method: 'Directory listing of content/components with docs URL verification', evidence_url: 'https://github.com/themesberg/flowbite/tree/main/content/components' } });
}

async function mantineui() {
  const text = (await fetchText('https://raw.githubusercontent.com/mantinedev/ui.mantine.dev/master/data/categories.ts')).text;
  const categories = [...text.matchAll(/slug:\s*'([^']+)',\s*name:\s*(?:'([^']+)'|"([^"]+)")/g)].map((m) => ({ slug: m[1], name: m[2] ?? m[3] }));
  const GROUP = { navbars: 'navigation', headers: 'navigation', footers: 'layout', grids: 'layout', users: 'data-display', inputs: 'forms', buttons: 'micro-interactions', sliders: 'media', dropzones: 'forms', 'app-cards': 'data-display', stats: 'data-display', tables: 'data-display', dnd: 'micro-interactions', carousels: 'media', hero: 'hero', features: 'features', authentication: 'forms', faq: 'faq', contact: 'forms', 'error-pages': 'layout', banners: 'cta', 'article-cards': 'blocks-sections', toc: 'navigation', comments: 'data-display' };
  const entries = categories.map(({ slug, name }) => {
    const category = GROUP[slug] ?? 'blocks-sections';
    return buildEntry({
      id: `mantineui-${category}-${slugify(slug)}`,
      name: `Mantine UI ${name}`,
      source: 'Mantine UI',
      entryType: 'block',
      category,
      description: `Collection of ready ${name.toLowerCase()} examples built on Mantine, with copy-paste code.`,
      useCase: USE_BY_CATEGORY[category],
      decisionHints: ['Requires Mantine (@mantine/core); one entry per category, each page holds several variants'],
      searchTags: ['mantine', 'mantine-ui', ...slugify(name).split('-')],
      docsUrl: `https://ui.mantine.dev/category/${slug}/`,
      stack: ['react', 'css-modules'],
      dependencies: ['@mantine/core'],
      installMethod: 'copy-paste',
      manualSteps: [`Open https://ui.mantine.dev/category/${slug}/ and copy the variant you need.`],
      licenseType: 'MIT',
      commercialUse: true,
      free: true,
    });
  });
  return writeSource('mantineui', { sourceName: 'Mantine UI', sourceUrl: 'https://ui.mantine.dev', catalogUrl: 'https://ui.mantine.dev', licenseSummary: 'MIT', granularity: 'one entry per category (about 120 variants inside)', extraction: { channel: 'github-contents', method: 'Category list from data/categories.ts of the ui.mantine.dev repository', evidence_url: 'https://github.com/mantinedev/ui.mantine.dev/blob/master/data/categories.ts' } }, await verifyDocs(entries, 'Mantine UI'));
}


const target = process.argv[2] ?? 'all';
if (target === 'all' || target === 'mantine') await mantine();
if (target === 'all' || target === 'baseui') await baseui();
if (target === 'all' || target === 'reactaria') await reactaria();
if (target === 'all' || target === 'mui') await mui();
if (target === 'all' || target === 'chakra') await chakra();
if (target === 'all' || target === 'antd') await antd();
if (target === 'all' || target === 'radix') await radix();
if (target === 'all' || target === 'headlessui') await headlessui();
if (target === 'all' || target === 'flowbite') await flowbite();
if (target === 'all' || target === 'mantineui') await mantineui();
