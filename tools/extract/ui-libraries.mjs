/**
 * Extraction: component libraries distributed as npm packages (not copy-paste registries).
 * Sources: Mantine (MIT), Base UI (MIT, unstyled primitives), React Aria Components (Apache-2.0, accessible primitives).
 * Component lists come from the public GitHub directory listing of each package.
 *
 * Usage: node tools/extract/ui-libraries.mjs [mantine|baseui|reactaria|all]
 */
import { fetchJSON, buildEntry, writeSource, slugify, titleCase, categoryFromKeywords, USE_BY_CATEGORY } from './lib.mjs';

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

const target = process.argv[2] ?? 'all';
if (target === 'all' || target === 'mantine') await mantine();
if (target === 'all' || target === 'baseui') await baseui();
if (target === 'all' || target === 'reactaria') await reactaria();
