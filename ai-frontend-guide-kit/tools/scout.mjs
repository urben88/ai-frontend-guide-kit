#!/usr/bin/env node
/**
 * scout — check a component site cheaply: is it already a catalog source? If not, what does it offer?
 *
 * Without --fetch it only compares the URL with the catalog sources (no network).
 * With --fetch it reads that one page and prints a small report: title, component links,
 * install commands, license and paid-plan hints. It never reads more than the page given.
 * With --record it stores the site in the project's libraries (`memory.mjs lib add`):
 * a catalog source as `using`, an unknown site as `research`.
 *
 * Usage:
 *   node tools/scout.mjs <url> [--fetch] [--record] [--dir <project>] [--json]
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_DIR = resolve(__dirname, '..');
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_COMPONENTS = 40;
const COMPONENT_PATH = /\/(components|blocks|elements|ui|primitives)\/([a-z0-9][a-z0-9-]*)\/?$/i;
const LICENSES = [['MIT', /\bMIT\b/], ['Apache-2.0', /Apache[- ]2(\.0)?/i], ['BSD', /\bBSD\b/], ['ISC', /\bISC\b/], ['GPL', /\bA?GPL\b/], ['CC BY', /\bCC[- ]BY\b/i], ['non-commercial', /non[- ]commercial/i]];
const PAID = [['pricing', /pricing/i], ['pro', /\bpro\b/i], ['premium', /premium/i], ['paid', /\bpaid\b/i]];

class UsageError extends Error {}
class Refusal extends Error {}

function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dir') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new UsageError('option --dir needs a value');
      flags.dir = argv[++i];
    } else if (['--fetch', '--record', '--json'].includes(token)) flags[token.slice(2)] = true;
    else if (token === '--help' || token === '-h') flags.help = true;
    else if (token.startsWith('--')) throw new UsageError(`unknown option "${token}"`);
    else flags._.push(token);
  }
  return flags;
}

const bareHost = (host) => host.toLowerCase().replace(/^www\./, '');
const sharedHost = (host) => host === 'github.com' || host.endsWith('.github.io');

function findSource(url) {
  const dir = join(KIT_DIR, 'catalog', 'sources');
  if (!existsSync(dir)) return null;
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.json')).sort()) {
    const source = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    for (const candidate of [source.source_url, source.catalog_url]) {
      let ref;
      try {
        ref = new URL(candidate);
      } catch {
        continue;
      }
      if (bareHost(ref.host) !== bareHost(url.host)) continue;
      const prefix = ref.pathname.replace(/\/+$/, '');
      if (sharedHost(bareHost(url.host)) && prefix && !url.pathname.startsWith(prefix)) continue;
      return { id: source.source_id, name: source.source_name, entries: source.entries.length, license: source.license_summary ?? null };
    }
  }
  return null;
}

async function fetchPage(url) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'user-agent': 'ai-frontend-guide-kit-scout' } });
  } catch (error) {
    throw new Refusal(`could not fetch ${url.href}: ${error.cause?.code ?? error.message}`);
  }
  if (!response.ok) throw new Refusal(`could not fetch ${url.href}: HTTP ${response.status}`);
  const text = await response.text();
  return text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;
}

function readPage(html, url) {
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim();
  const components = [];
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#?]+)/gi)) {
    let link;
    try {
      link = new URL(href, url);
    } catch {
      continue;
    }
    if (bareHost(link.host) !== bareHost(url.host)) continue;
    const slug = link.pathname.match(COMPONENT_PATH)?.[2]?.toLowerCase();
    if (slug && !components.includes(slug) && components.length < MAX_COMPONENTS) components.push(slug);
  }
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&');
  const install = [...new Set([
    ...[...text.matchAll(/(?:npx|pnpm dlx|bunx|yarn dlx)[ \t]+[\w@./:=-]+(?:[ \t]+[\w@./:=-]+){0,3}/g)].map((m) => m[0]),
    ...[...text.matchAll(/(?:npm (?:i|install)|pnpm add|yarn add|bun add)[ \t]+[\w@./-]+/g)].map((m) => m[0]),
  ])].slice(0, 3);
  const licenses = LICENSES.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  const paid = PAID.filter(([, pattern]) => pattern.test(text) || pattern.test(html.match(/href\s*=\s*["'][^"']*/gi)?.join(' ') ?? '')).map(([name]) => name);
  return { title, components, install, licenses, paid };
}

function record(flags, url, source, page) {
  const root = flags.dir ? resolve(flags.dir) : process.env.AI_FRONTEND_PROJECT ? resolve(process.env.AI_FRONTEND_PROJECT) : dirname(KIT_DIR);
  const out = process.env.AI_FRONTEND_OUTPUT ? resolve(process.env.AI_FRONTEND_OUTPUT) : join(root, 'ai-frontend-output');
  const notes = [url.href];
  if (page) {
    notes.push(`${page.components.length} components`);
    if (page.install.length) notes.push(`install: ${page.install[0]}`);
    if (page.licenses.length) notes.push(`license hints: ${page.licenses.join(', ')}`);
    if (page.paid.length) notes.push(`paid hints: ${page.paid.join(', ')}`);
  }
  const args = [join(__dirname, 'memory.mjs'), 'lib', 'add', bareHost(url.host), '--status', source ? 'using' : 'research', '--notes', notes.join(' · '), '--dir', out];
  if (source) args.push('--source', source.id);
  const run = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (run.status !== 0) throw new Refusal(`could not record: ${run.stderr.trim()}`);
  return out;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) return console.log('Usage: node tools/scout.mjs <url> [--fetch] [--record] [--dir <project>] [--json]');
  if (flags._.length !== 1) throw new UsageError('give exactly one URL');
  let url;
  try {
    url = new URL(flags._[0]);
  } catch {
    url = null;
  }
  if (!url || !/^https?:$/.test(url.protocol)) throw new UsageError(`"${flags._[0]}" is not a valid http(s) URL`);

  const source = findSource(url);
  const page = flags.fetch ? readPage(await fetchPage(url), url) : null;
  const recorded = flags.record ? record(flags, url, source, page) : null;

  if (flags.json) return console.log(JSON.stringify({ url: url.href, source, page, recorded }, null, 2));
  const lines = [];
  if (source) {
    lines.push(`In the catalog: \`${source.id}\` (${source.name}, ${source.entries} entries${source.license ? `, ${source.license}` : ''})`);
    lines.push(`Query it instead of reading the site: node tools/find.mjs --source ${source.id} [--category <category>]`);
  } else {
    lines.push(`Not in the catalog: ${bareHost(url.host)}`);
    if (!page) lines.push('Run again with --fetch for a small report of this page, then check the license on the site before using anything.');
  }
  if (page) {
    if (page.title) lines.push(`Title: ${page.title}`);
    lines.push(`Components (${page.components.length}): ${page.components.join(', ') || 'none found on this page (try its components index URL)'}`);
    lines.push(`Install: ${page.install.join(' | ') || 'no command found on this page'}`);
    lines.push(`License hints: ${page.licenses.join(', ') || 'none found (verify on the site)'}`);
    if (page.paid.length) lines.push(`Paid hints: ${page.paid.join(', ')} (some components may not be free)`);
    if (!source) lines.push('Treat these as provisional: verify the license on the origin page before production.');
  }
  if (recorded) lines.push(`Recorded in ${join(recorded, 'libraries.json')} as ${source ? 'using' : 'research'}`);
  console.log(lines.join('\n'));
}

main().catch((error) => {
  if (error instanceof UsageError) {
    console.error(`scout: ${error.message}\nUsage: node tools/scout.mjs <url> [--fetch] [--record] [--dir <project>] [--json]`);
    process.exitCode = 2;
  } else if (error instanceof Refusal) {
    console.error(`scout: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.error(error);
    process.exitCode = 1;
  }
});
