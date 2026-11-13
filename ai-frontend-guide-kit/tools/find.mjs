#!/usr/bin/env node
/**
 * find — query the component catalog with minimal output.
 *
 * Usage:
 *   node ai-frontend-guide-kit/tools/find.mjs [query] [--category hero] [--stack react] [--license MIT]
 *                       [--commercial] [--free] [--licensed] [--source magicui]
 *                       [--type component|block|design-system|icon] [--text <query>]
 *                       [--min-quality N] [--sort relevance|quality|name]
 *                       [--all] [--limit N] [--json]
 *
 * Behavior:
 *   A positional query works like --text:  node ai-frontend-guide-kit/tools/find.mjs "pricing card"
 *   --text splits into words, ignores stopwords (with, and, the...) and needs at least half of the words to match.
 *   Ranking: sources with a large free catalog first (ReUI, shadcn/ui, Shadcn Space), then other licensed sources, then
 *   unknown license; inside a group, entries matching more words first, then role order, then weighted relevance
 *   (name > tags > category > description), then quality.
 *   Without --text, results are ranked by quality (license clarity, install effort, dependencies, source tier) unless --sort says otherwise.
 *   Near-identical entries (same name, category and framework across sources) are collapsed to the best one; --all shows every copy.
 *   Icons are hidden unless --type icon or --all.
 *   --licensed drops entries whose license is unknown.
 *   --source takes a source id (mui, shadcn, reactaria, ...) for an exact match, or part of a source name.
 *
 * Examples:
 *   node ai-frontend-guide-kit/tools/find.mjs --category hero --stack react --commercial
 *   node ai-frontend-guide-kit/tools/find.mjs "pricing card with toggle" --limit 5
 *   node ai-frontend-guide-kit/tools/find.mjs --text "marquee logos" --min-quality 60
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = process.env.KIT_CATALOG_DIR ?? join(__dirname, '..', 'catalog');
const SOURCES_DIR = join(CATALOG_DIR, 'sources');

const BOOLEAN_FLAGS = new Set(['json', 'commercial', 'free', 'licensed', 'all']);

export function parseArgs(argv) {
  const args = { limit: 12, json: false };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json') args.json = true;
    else if (token.startsWith('--')) {
      const key = token.slice(2);
      if (BOOLEAN_FLAGS.has(key)) args[key] = true;
      else args[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    } else positional.push(token);
  }
  // A positional query works like --text; an explicit --text wins.
  if (positional.length > 0 && typeof args.text !== 'string') args.text = positional.join(' ');
  return args;
}

export function loadEntries() {
  if (!existsSync(SOURCES_DIR)) {
    console.error('Catalog not found. Run this script from the ai-frontend-guide-kit folder or rebuild the kit.');
    process.exit(1);
  }
  const entries = [];
  for (const file of readdirSync(SOURCES_DIR).filter((name) => name.endsWith('.json')).sort()) {
    const data = JSON.parse(readFileSync(join(SOURCES_DIR, file), 'utf8'));
    entries.push(...data.entries);
  }
  return entries;
}

const squash = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const words = (value) => String(value).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// Words that carry no meaning for a component search.
const STOPWORDS = new Set(['a', 'an', 'the', 'with', 'and', 'or', 'for', 'of', 'to', 'in', 'on', 'my', 'me', 'i', 'want', 'need', 'like', 'some', 'that', 'this', 'is', 'it', 'by', 'from', 'as', 'at', 'using', 'make', 'build', 'create']);

export function queryTerms(query) {
  const all = words(query);
  const kept = all.filter((term) => !STOPWORDS.has(term));
  return kept.length > 0 ? kept : all;
}

// Source order (S4): sources with a large free catalog first, strictly: ReUI, shadcn/ui, Shadcn Space.
// Mirrors FREE_CATALOG_TIER in tools/quality.mjs. Any other licensed source follows; unknown license comes last.
const SOURCE_ORDER = ['reui', 'shadcn', 'shadcnspace'];

export function sourceTier(entry) {
  const index = SOURCE_ORDER.indexOf(String(entry.id).split('-')[0]);
  if (index >= 0) return index;
  return entry.license_type === 'unknown' ? SOURCE_ORDER.length + 1 : SOURCE_ORDER.length;
}

// Strict group: the big free sources first, then other licensed sources, then unknown license.
export function sourceGroup(entry) {
  const tier = sourceTier(entry);
  return tier < SOURCE_ORDER.length ? 0 : tier === SOURCE_ORDER.length ? 1 : 2;
}

// Whole-word match, singular/plural tolerant ("table" matches "tables", "forms" matches "form"); "sortable" does not match "table".
const singular = (word) => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word);
const hasWord = (text, term) => words(text).some((word) => singular(word) === singular(term));

// Matched words and weighted score. Words are matched independently; stopwords are ignored.
export function matchInfo(entry, query) {
  const terms = queryTerms(query);
  if (terms.length === 0) return { matched: 0, strong: 0, categoryHits: 0, needed: 1, score: 0 };
  const name = String(entry.name).toLowerCase();
  const tags = (entry.search_tags ?? []).join(' ').toLowerCase();
  const category = String(entry.category).toLowerCase();
  const description = `${entry.description ?? ''} ${entry.use_case ?? ''}`.toLowerCase();
  const source = String(entry.source).toLowerCase();
  let score = 0;
  let matched = 0;
  let strong = 0; // words found as whole words in the name or category (tags and descriptions list dependencies and are noisier)
  let categoryHits = 0; // words equal to the category: the entry IS that kind of component, not just named like it
  for (const term of terms) {
    const hit = (name.includes(term) ? 5 : 0) + (tags.includes(term) ? 3 : 0) + (category.includes(term) ? 2 : 0) + (source.includes(term) ? 1 : 0) + (description.includes(term) ? 1 : 0);
    if (hit > 0) matched += 1;
    if (hasWord(name, term) || hasWord(category, term)) strong += 1;
    if (hasWord(category, term)) categoryHits += 1;
    score += hit;
  }
  return { matched, strong, categoryHits, needed: Math.ceil(terms.length / 2), score };
}

// Weighted relevance (name > tags > category > description). 0 when too few words match (at least half of them are required).
export function relevance(entry, query) {
  const info = matchInfo(entry, query);
  return info.matched >= info.needed ? info.score : 0;
}

export function matches(entry, args) {
  if (args.category && entry.category !== args.category) return false;
  if (args.type) {
    if (entry.entry_type !== args.type) return false;
  } else if (!args.all && entry.entry_type === 'icon') return false;
  if (args.source) {
    // A source id (the id prefix, e.g. mui, shadcn, reactaria) matches exactly; otherwise fall back to a name substring.
    if (args._exactSource) {
      if (!entry.id.startsWith(`${args.source}-`)) return false;
    } else if (!squash(entry.source).includes(squash(args.source))) return false;
  }
  if (args.stack && !(entry.stack ?? []).some((item) => String(item).toLowerCase() === String(args.stack).toLowerCase())) return false;
  if (args.license && entry.license_type !== args.license) return false;
  if (args.licensed && entry.license_type === 'unknown') return false;
  if (args.commercial && entry.commercial_use === false) return false;
  if (args.free && entry.free !== true) return false;
  if (args['min-quality'] && (entry.quality ?? 0) < Number(args['min-quality'])) return false;
  if (args.text && relevance(entry, args.text) === 0) return false;
  return true;
}

function frameworkOf(entry) {
  const stack = (entry.stack ?? []).map((s) => String(s).toLowerCase());
  return ['react', 'vue', 'svelte', 'html'].find((f) => stack.includes(f)) ?? stack[0] ?? 'any';
}

function dedupeKey(entry) {
  const base = squash(String(entry.name).replace(new RegExp(`^${String(entry.source).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i'), '').replace(/\b(demo|example)\b/gi, ''));
  return `${entry.category}|${frameworkOf(entry)}|${base}`;
}

export function search(entries, args) {
  if (args.source && args._exactSource === undefined) args = { ...args, _exactSource: entries.some((entry) => entry.id.startsWith(`${args.source}-`)) };
  const filtered = entries.filter((entry) => matches(entry, args));
  const sort = args.sort ?? (args.text ? 'relevance' : 'quality');
  const info = new Map(filtered.map((entry) => [entry, args.text ? matchInfo(entry, args.text) : { matched: 0, strong: 0, categoryHits: 0, score: 0 }]));
  const compare = {
    // Big free sources first (S4), then more matched words, then entries whose category is a query word (a pricing block beats a form that only mentions pricing),
    // then the role order, then weighted relevance, then quality.
    relevance: (a, b) => sourceGroup(a) - sourceGroup(b) || info.get(b).matched + info.get(b).strong - info.get(a).matched - info.get(a).strong || info.get(b).categoryHits - info.get(a).categoryHits || sourceTier(a) - sourceTier(b) || info.get(b).score - info.get(a).score || (b.quality ?? 0) - (a.quality ?? 0) || a.id.localeCompare(b.id),
    quality: (a, b) => (b.quality ?? 0) - (a.quality ?? 0) || a.id.localeCompare(b.id),
    name: (a, b) => a.name.localeCompare(b.name),
  }[sort] ?? ((a, b) => a.id.localeCompare(b.id));
  const ranked = [...filtered].sort(compare);
  if (args.all) return { total: ranked.length, hidden: 0, results: ranked };
  const seen = new Set();
  const results = [];
  for (const entry of ranked) {
    const key = dedupeKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(entry);
  }
  return { total: results.length, hidden: ranked.length - results.length, results };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { total, hidden, results } = search(loadEntries(), args);
  const limited = results.slice(0, Number(args.limit));

  if (args.json) {
    console.log(JSON.stringify({ total, hidden_duplicates: hidden, shown: limited.length, results: limited }, null, 2));
    return;
  }

  const note = hidden > 0 ? `, ${hidden} near-duplicates hidden (use --all)` : '';
  console.log(`# ${total} matches (showing ${limited.length}${note}) — use get <id> for details`);
  for (const entry of limited) {
    const license = entry.license_type + (entry.commercial_use === false ? ' (non-commercial)' : entry.commercial_use === 'conditional' ? ' (verify)' : '');
    console.log(`${entry.id} | ${entry.name} | ${entry.source} | ${entry.category} | ${license} | q${entry.quality ?? '-'}`);
  }
  if (total === 0) {
    console.log('No matches. Broaden filters or check the category list in catalog/component-manifest.md.');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
