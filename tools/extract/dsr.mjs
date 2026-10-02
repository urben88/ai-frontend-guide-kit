/**
 * Extraction: docs-structured channel — Design Systems Repo (designsystemsrepo.ai).
 * One low-frequency GET to the site's public CMS endpoint (Bearer = the site's
 * public anon key embedded in its own bundle). The raw response is cached under
 * tools/.cache/ and the manifest keeps only minimal metadata with attribution.
 *
 * Usage: node tools/extract/dsr.mjs
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchText, buildEntry, writeSource, slugify, truncate, CACHE_DIR } from './lib.mjs';

const BUNDLE_URL = 'https://designsystemsrepo.ai/_components/v2/ada9d646073e272c3edf2ff62d8c57f099dd55a3.js';
const API_URL = 'https://ltuqsyevoyzlrokbbpjf.supabase.co/functions/v1/make-server-9f3e46c1/cms/design-systems';
const CACHE_FILE = join(CACHE_DIR, 'dsr-design-systems.json');

async function loadRows() {
  const { text: bundle, status } = await fetchText(BUNDLE_URL, { timeout: 60000 });
  if (status !== 200) throw new Error(`DSR bundle status ${status}`);
  const jwt = bundle.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (!jwt) throw new Error('DSR anon key not found in bundle');
  const { text: body, status: apiStatus } = await fetchText(API_URL, {
    headers: { authorization: `Bearer ${jwt[0]}` },
    timeout: 45000,
  });
  if (apiStatus !== 200) throw new Error(`DSR API status ${apiStatus}`);
  const rows = JSON.parse(body);
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  return rows;
}

async function main() {
  let rows;
  try {
    rows = await loadRows();
    console.log(`dsr: fetched ${rows.length} design systems (cached at tools/.cache/dsr-design-systems.json)`);
  } catch (error) {
    if (existsSync(CACHE_FILE)) {
      rows = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
      console.log(`dsr: live fetch failed (${error.message}); using cached copy (${rows.length} rows)`);
    } else {
      throw error;
    }
  }

  const entries = rows.map((row) => {
    const badges = Array.isArray(row.badges) ? row.badges : [];
    const hints = ['Licenses are not captured by the directory; verify on the design system site before use.'];
    if (row.figmaKit) hints.push(`Figma kit: ${row.figmaKit}`);
    if (badges.includes('mcp-support')) hints.push('Provides MCP support according to the directory.');
    const name = row.company && !String(row.name).toLowerCase().includes(String(row.company).toLowerCase())
      ? `${row.name} (${row.company})`
      : row.name;
    return buildEntry({
      id: `dsr-design-system-${slugify(row.name)}`,
      name,
      source: 'Design Systems Repo (designsystemsrepo.ai)',
      entryType: 'design-system',
      category: 'design-system',
      description: truncate(`${row.name} design system${row.company ? ` by ${row.company}` : ''}${badges.length ? ` [${badges.join(', ')}]` : ''}.`),
      useCase: 'Reference a full design system for tokens, component guidance, Figma kits and theming before choosing individual components.',
      decisionHints: hints,
      searchTags: ['design-system', 'design-systems-repo', ...slugify(row.name).split('-'), ...badges.map(slugify)],
      docsUrl: row.url,
      stack: ['design-tokens'],
      installMethod: 'reference',
      manualSteps: [
        `Open ${row.url} to read the system documentation and tokens.`,
        row.figmaKit ? `Figma kit: ${row.figmaKit}` : 'Look for a Figma kit or token export on the system site.',
      ],
      licenseType: 'unknown',
      commercialUse: 'conditional',
      free: true,
      limits: 'The directory does not expose licenses; each design system keeps its own license.',
      extractionNote: 'Metadata only (name, company, links, badges); no component code stored. Credit designsystemsrepo.ai (Shift+R, non-profit).',
    });
  });

  return writeSource(
    'dsr',
    {
      sourceName: 'Design Systems Repo',
      sourceUrl: 'https://designsystemsrepo.ai',
      catalogUrl: 'https://designsystemsrepo.ai/design-systems',
      licenseSummary: 'Directory has no declared content license; each indexed system keeps its own',
      granularity: 'complete (26 design systems)',
      extraction: {
        channel: 'docs-structured',
        method: 'Single low-frequency GET to the public CMS endpoint; raw payload cached locally, minimal metadata published',
        evidence_url: 'https://designsystemsrepo.ai/design-systems',
        note: 'Machine Mode Markdown is the human-facing fallback; do not redistribute the dataset.',
      },
    },
    entries,
  );
}

await main();
