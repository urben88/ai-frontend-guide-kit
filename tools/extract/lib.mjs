/**
 * Shared helpers for extraction scripts (no external dependencies).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..', '..');
export const MANIFEST_DIR = join(ROOT, 'manifest');
export const SOURCES_DIR = join(MANIFEST_DIR, 'sources');
export const CACHE_DIR = join(ROOT, 'tools', '.cache');
export const TODAY = new Date().toISOString().slice(0, 10);

const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  accept: 'text/html,application/json,text/plain,*/*',
};

export async function fetchText(url, options = {}) {
  const { headers = {}, timeout = 30000, retries = 2, method = 'GET' } = options;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { ...DEFAULT_HEADERS, ...headers },
        signal: AbortSignal.timeout(timeout),
      });
      const text = await response.text();
      return { status: response.status, ok: response.ok, text, url: response.url };
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function fetchJSON(url, options = {}) {
  const { text, status } = await fetchText(url, options);
  try {
    return { status, data: JSON.parse(text) };
  } catch {
    throw new Error(`Invalid JSON from ${url} (status ${status})`);
  }
}

export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function titleCase(text) {
  return String(text)
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function truncate(text, max = 220) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function ensureMinLength(text, fallback) {
  const value = String(text ?? '').trim();
  return value.length >= 10 ? value : fallback;
}

export const USE_BY_CATEGORY = {
  navigation: 'Build site and app navigation structures that stay clear at any depth.',
  hero: 'Create above-the-fold sections that communicate the value proposition immediately.',
  features: 'Explain product capabilities with structured, scannable sections.',
  pricing: 'Present plans and comparisons to drive conversion decisions.',
  cta: 'Prompt the next user action with focused, high-contrast sections.',
  testimonials: 'Reinforce trust with social proof from customers and partners.',
  faq: 'Answer recurring questions and reduce support friction.',
  forms: 'Capture user input with accessible, validated controls.',
  'data-display': 'Show structured information such as tables, stats and timelines.',
  feedback: 'Communicate system status: alerts, loaders, progress and notifications.',
  overlay: 'Present dialogs, drawers and popovers without leaving the page.',
  layout: 'Structure the page: dividers, footers, headers and empty states.',
  'backgrounds-effects': 'Add decorative depth to a section; use sparingly (1–2 per view).',
  'micro-interactions': 'Add tactile feedback to interactive elements.',
  text: 'Animate or emphasize typography for key messages.',
  media: 'Display images, video, carousels and device mockups.',
  'blocks-sections': 'Compose complete page sections that combine several components.',
  'ai-surfaces': 'Build agent and AI conversation interfaces (chat, thinking, tools, streaming).',
  'design-system': 'Reference a full design system for tokens, components and theming guidance.',
  template: 'Start from a complete page template and adapt it to the product.',
};

export const RULE_REUSE = 'Prefer reuse or adaptation before writing a new component. See 05-REUSE.';

/**
 * rules: array of [RegExp, canonicalCategory] checked in order.
 */
export function categoryFromKeywords(name, rules, fallback) {
  const haystack = String(name).toLowerCase();
  for (const [pattern, category] of rules) {
    if (pattern.test(haystack)) return category;
  }
  return fallback;
}

export function buildEntry({
  id,
  name,
  source,
  entryType = 'component',
  category,
  subcategory,
  description,
  useCase,
  decisionHints = [],
  searchTags = [],
  docsUrl,
  registryUrl,
  stack,
  dependencies = [],
  installMethod,
  installCommand,
  manualSteps = [],
  variants = [],
  licenseType,
  commercialUse,
  free = true,
  limits,
  extractionNote,
  verifiedAt = TODAY,
}) {
  const entry = {
    id,
    name,
    source,
    entry_type: entryType,
    category,
    description: ensureMinLength(description, `${name} — ${category} ${entryType} from ${source}.`),
    use_case: ensureMinLength(useCase, USE_BY_CATEGORY[category] ?? USE_BY_CATEGORY['blocks-sections']),
    search_tags: [...new Set([...searchTags, category, source.toLowerCase().replace(/\s+/g, '-')])],
    docs_url: docsUrl,
    stack,
    dependencies,
    license_type: licenseType,
    commercial_use: commercialUse,
    free,
    verified_at: verifiedAt,
  };
  if (subcategory) entry.subcategory = subcategory;
  if (decisionHints.length > 0) entry.decision_hints = decisionHints;
  if (registryUrl) entry.registry_url = registryUrl;
  if (installMethod) entry.install_method = installMethod;
  if (installCommand) entry.install_command = installCommand;
  if (manualSteps.length > 0) entry.manual_steps = manualSteps;
  if (variants.length > 0) entry.variants = variants.slice(0, 24);
  if (limits) entry.limits = limits;
  if (extractionNote) entry.extraction_note = extractionNote;
  return entry;
}

export function writeSource(sourceId, meta, entries) {
  const unique = new Map();
  for (const entry of entries) unique.set(entry.id, entry);
  const sorted = [...unique.values()].sort((a, b) => a.id.localeCompare(b.id));
  const doc = {
    schema_version: '1.0',
    source_id: sourceId,
    source_name: meta.sourceName,
    source_url: meta.sourceUrl,
    catalog_url: meta.catalogUrl,
    license_summary: meta.licenseSummary,
    granularity: meta.granularity,
    extraction: meta.extraction,
    generated_at: TODAY,
    entries: sorted,
  };
  mkdirSync(SOURCES_DIR, { recursive: true });
  writeFileSync(join(SOURCES_DIR, `${sourceId}.json`), `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  console.log(`${sourceId}: ${sorted.length} entries -> manifest/sources/${sourceId}.json`);
  return sorted.length;
}
