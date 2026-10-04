/**
 * Extraction: agent-research channel — 21st.dev.
 * Uses only sanctioned public channels (markdown twins of category pages);
 * no scraping of the app. Top 30 components per category tag.
 *
 * Usage: node tools/extract/twentyfirst.mjs
 */
import { fetchText, buildEntry, writeSource, mapLimit, slugify, truncate, USE_BY_CATEGORY } from './lib.mjs';

const TAGS = [
  'hero', 'text', 'cta', 'navigation-menu', 'images', 'background', 'features', 'pricing-section',
  'faqs', 'testimonials', 'stats', 'steppers', 'team', 'marquees', 'timelines', 'announcements',
  'footer', 'button', 'card', 'form', 'input', 'badge', 'avatar', 'toggle', 'dropdown',
  'spinner', 'dashboard', 'progress', 'modal', 'table', 'tooltip', 'ai-chat', 'notification',
  'chart', 'alert', 'calendar', 'carousel', 'tabs', 'accordion', 'search-bar',
];

const TAG_CATEGORY = {
  hero: 'hero',
  text: 'text',
  cta: 'cta',
  'navigation-menu': 'navigation',
  images: 'media',
  background: 'backgrounds-effects',
  features: 'features',
  'pricing-section': 'pricing',
  faqs: 'faq',
  testimonials: 'testimonials',
  stats: 'data-display',
  steppers: 'navigation',
  team: 'blocks-sections',
  marquees: 'micro-interactions',
  timelines: 'data-display',
  announcements: 'cta',
  footer: 'layout',
  button: 'micro-interactions',
  card: 'data-display',
  form: 'forms',
  input: 'forms',
  badge: 'data-display',
  avatar: 'data-display',
  toggle: 'forms',
  dropdown: 'overlay',
  spinner: 'feedback',
  dashboard: 'blocks-sections',
  progress: 'feedback',
  modal: 'overlay',
  table: 'data-display',
  tooltip: 'feedback',
  'ai-chat': 'ai-surfaces',
  notification: 'feedback',
  chart: 'data-display',
  alert: 'feedback',
  calendar: 'forms',
  carousel: 'media',
  tabs: 'navigation',
  accordion: 'faq',
  'search-bar': 'forms',
};

const KNOWN_MIT_AUTHORS = new Set(['shadcn', 'cult-ui', 'dillionverma', 'serafimcloud', 'sean0205']);

async function fetchTag(tag) {
  const url = `https://21st.dev/community/components/s/${tag}.md`;
  try {
    const { text, status } = await fetchText(url, { timeout: 25000, retries: 1 });
    if (status !== 200) return { tag, items: [] };
    const items = [...text.matchAll(/^- \[([^\]]+)\]\((https:\/\/21st\.dev\/[^)]+?)\.md\) — by (.+)$/gm)]
      .map((match) => ({ name: match[1].trim(), pageUrl: match[2], author: match[3].trim() }));
    return { tag, items: items.slice(0, 30) };
  } catch {
    return { tag, items: [] };
  }
}

async function main() {
  const results = await mapLimit(TAGS, 5, fetchTag);
  const entries = [];
  for (const { tag, items } of results) {
    const tagCategory = TAG_CATEGORY[tag] ?? 'blocks-sections';
    if (items.length === 0) console.log(`21stdev: tag "${tag}" returned no items`);
    for (const item of items) {
      // Components are listed under several tags (heroes under 'cta', pricing under 'cta'): trust a clear name over the tag.
      const category = /(^|[^a-z])hero([^a-z]|$)/i.test(item.name) ? 'hero' : /pricing/i.test(item.name) ? 'pricing' : tagCategory;
      const authorSlug = (item.pageUrl.match(/21st\.dev\/@([^/]+)/) ?? [])[1] ?? slugify(item.author);
      const license = KNOWN_MIT_AUTHORS.has(authorSlug) || KNOWN_MIT_AUTHORS.has(item.author) ? 'MIT' : 'unknown';
      entries.push(
        buildEntry({
          id: `21stdev-${category}-${slugify(authorSlug)}-${slugify(item.name)}`,
          name: `21st.dev ${item.name}`,
          source: '21st.dev',
          entryType: 'component',
          category,
          subcategory: tag,
          description: truncate(`${item.name} by ${item.author} — 21st.dev community component (${tag}).`),
          useCase: USE_BY_CATEGORY[category],
          decisionHints: [
            'Free plan allows 2 code copies/installs per day',
            license === 'MIT' ? 'Known MIT author' : 'License not verified per entry — check the component page before production use',
          ],
          searchTags: ['21stdev', 'shadcn-compatible', tag, ...slugify(item.name).split('-')],
          docsUrl: item.pageUrl,
          stack: ['react', 'tailwind', 'shadcn'],
          dependencies: [],
          installMethod: 'copy-paste',
          manualSteps: [
            `Open ${item.pageUrl} and copy the prompt or TSX code.`,
            'With an API key you can install via the shadcn CLI: npx shadcn@latest add "https://21st.dev/r/<author>/<slug>?api_key=$API_KEY_21ST"',
          ],
          licenseType: license,
          commercialUse: license === 'MIT' ? true : 'conditional',
          free: true,
          limits: 'Free tier: 2 code copies/installs per day (shared across web, MCP and CLI). Builder plan removes the limit. Verify each entry license; templates have separate terms.',
          extractionNote: 'Indexed from the public markdown twins of category pages (sanctioned channel; 21st.dev ToS forbids scraping).',
        }),
      );
    }
  }

  const unique = new Map();
  for (const entry of entries) unique.set(entry.id, entry);
  console.log(`21stdev: ${unique.size} entries across ${TAGS.length} tags`);

  return writeSource(
    '21stdev',
    {
      sourceName: '21st.dev',
      sourceUrl: 'https://21st.dev',
      catalogUrl: 'https://21st.dev/community/components',
      licenseSummary: 'Varies per component (MIT frequent; some unknown)',
      granularity: `curated: top 30 per tag across ${TAGS.length} tags`,
      extraction: {
        channel: 'agent-research',
        method: 'Node script fetching the public markdown twins (/community/components/s/<tag>.md)',
        evidence_url: 'https://21st.dev/sitemap.xml',
        note: 'No scraping: only sitemap/markdown public pages were used.',
      },
    },
    entries,
  );
}

await main();
