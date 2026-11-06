/**
 * Extraction: agent-research channel (public sitemap) — IndoUI (free React + Tailwind copy-paste components).
 * One entry per component page listed in the sitemap; each page holds several variants.
 *
 * Usage: node tools/extract/indoui.mjs
 */
import { fetchText, buildEntry, writeSource, slugify, titleCase, categoryFromKeywords, USE_BY_CATEGORY } from './lib.mjs';

const RULES = [
  [/hero|header/, 'hero'], [/pricing/, 'pricing'], [/testimonial|trusted-brands/, 'testimonials'], [/faq/, 'faq'],
  [/call-to-action|newsletter|promotional/, 'cta'], [/feature/, 'features'], [/footer|404|cookie/, 'layout'],
  [/dropdown/, 'overlay'], [/navbar|menu|tabs/, 'navigation'], [/alert|toast|progress|banner/, 'feedback'],
  [/form|input|search|toggle|switch|slider/, 'forms'], [/gallery|image/, 'media'], [/card|badge|statistic|profile/, 'data-display'],
  [/button/, 'micro-interactions'], [/about|team/, 'blocks-sections'],
];

async function main() {
  const { text } = await fetchText('https://www.indoui.com/sitemap.xml');
  const paths = [...new Set([...text.matchAll(/<loc>https:\/\/(?:www\.)?indoui\.com(\/components\/[a-z0-9/-]+)<\/loc>/g)].map((m) => m[1]))];
  if (paths.length < 20) throw new Error(`indoui: only ${paths.length} component pages in the sitemap`);
  const entries = paths.map((path) => {
    const slug = path.replace(/^\/components\//, '');
    const display = titleCase(slug.replace(/\//g, ' '));
    const category = categoryFromKeywords(slug, RULES, 'blocks-sections');
    return buildEntry({
      id: `indoui-${category}-${slugify(slug)}`,
      name: `IndoUI ${display}`,
      source: 'IndoUI',
      entryType: /section|footer|header|hero|404|navbar/.test(slug) ? 'block' : 'component',
      category,
      description: `${display} variants from IndoUI: free React + Tailwind CSS components to copy and paste.`,
      useCase: USE_BY_CATEGORY[category],
      decisionHints: ['Copy-paste React + Tailwind; the page shows several variants to pick from', 'Custom free license (not MIT): copy, modify and use in commercial projects'],
      searchTags: ['indoui', ...slug.split(/[/-]/)],
      docsUrl: `https://www.indoui.com${path}`,
      stack: ['react', 'tailwind'],
      installMethod: 'copy-paste',
      manualSteps: [`Open https://www.indoui.com${path} and copy the variant you need`],
      licenseType: 'custom',
      commercialUse: true,
      free: true,
      limits: 'IndoUI terms allow copying, modifying and using components in personal or commercial projects, provided as-is (https://www.indoui.com/terms).',
    });
  });
  return writeSource('indoui', {
    sourceName: 'IndoUI', sourceUrl: 'https://www.indoui.com', catalogUrl: 'https://www.indoui.com/components',
    licenseSummary: 'Custom free license: copy, modify and use in personal or commercial projects (not OSI)',
    granularity: 'one entry per component page of the sitemap (each page holds several variants)',
    extraction: { channel: 'agent-research', method: 'Node script reading the public sitemap', evidence_url: 'https://www.indoui.com/sitemap.xml' },
  }, entries);
}

await main();
