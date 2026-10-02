#!/usr/bin/env node
/**
 * find — query the component catalog with minimal output.
 *
 * Usage:
 *   node tools/find.mjs [--category hero] [--stack react] [--license MIT]
 *                       [--commercial] [--free] [--source magicui]
 *                       [--type component|block|design-system] [--text <query>]
 *                       [--limit N] [--json]
 *
 * Examples:
 *   node tools/find.mjs --category hero --stack react --commercial
 *   node tools/find.mjs --text marquee
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = join(__dirname, '..', 'catalog');
const SOURCES_DIR = join(CATALOG_DIR, 'sources');

function parseArgs(argv) {
  const args = { limit: 12, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json') args.json = true;
    else if (token.startsWith('--')) {
      const key = token.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = value;
    }
  }
  return args;
}

function loadEntries() {
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

function matches(entry, args) {
  if (args.category && entry.category !== args.category) return false;
  if (args.type && entry.entry_type !== args.type) return false;
  if (args.source && entry.source.toLowerCase().replace(/\s+/g, '-').includes(String(args.source).toLowerCase())) return false;
  if (args.stack && !(entry.stack ?? []).some((item) => String(item).toLowerCase() === String(args.stack).toLowerCase())) return false;
  if (args.license && entry.license_type !== args.license) return false;
  if (args.commercial && entry.commercial_use === false) return false;
  if (args.free && entry.free !== true) return false;
  if (args.text) {
    const haystack = [entry.name, entry.description, entry.category, entry.source, ...(entry.search_tags ?? [])].join(' ').toLowerCase();
    if (!haystack.includes(String(args.text).toLowerCase())) return false;
  }
  return true;
}

const args = parseArgs(process.argv.slice(2));
const entries = loadEntries().filter((entry) => matches(entry, args));
const limited = entries.slice(0, Number(args.limit));

if (args.json) {
  console.log(JSON.stringify({ total: entries.length, shown: limited.length, results: limited }, null, 2));
  process.exit(0);
}

console.log(`# ${entries.length} matches (showing ${limited.length}) — use get <id> for details`);
for (const entry of limited) {
  const license = entry.license_type + (entry.commercial_use === false ? ' (non-commercial)' : entry.commercial_use === 'conditional' ? ' (verify)' : '');
  console.log(`${entry.id} | ${entry.name} | ${entry.source} | ${entry.category} | ${license}`);
}
if (entries.length === 0) {
  console.log('No matches. Broaden filters or check the category list in catalog/component-manifest.md.');
}
