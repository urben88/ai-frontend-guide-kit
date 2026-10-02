/**
 * Extraction: docs-structured channel — Agents Kit.
 * Uses the official shadcn registry (224 blocks) for component metadata and
 * llms.txt to map each entry to its collection section, which determines the
 * license: ported collections keep MIT/Apache-2.0; original Agents Kit
 * families are non-commercial.
 *
 * Usage: node tools/extract/agentskit.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  fetchText,
  fetchJSON,
  buildEntry,
  writeSource,
  slugify,
  truncate,
  categoryFromKeywords,
  CACHE_DIR,
  USE_BY_CATEGORY,
} from './lib.mjs';

const REGISTRY_URL = 'https://agents-ui.github.io/agents-kit/c/registry.json';
const LLMS_URL = 'https://agents-ui.github.io/agents-kit/llms.txt';
const CACHE_FILE = join(CACHE_DIR, 'agentskit-registry.json');

const SECTION_LICENSE = {
  'Generated results and runtime controls': { license: 'non-commercial', commercial: false },
  'AI Elements': { license: 'Apache-2.0', commercial: true },
  'Beautiful UI': { license: 'MIT', commercial: true },
  beUI: { license: 'MIT', commercial: true },
  'Blocks.so': { license: 'MIT', commercial: true },
  BoardUI: { license: 'MIT', commercial: true },
  'Libraries.dev': { license: 'MIT', commercial: true },
  'Prompt Kit': { license: 'MIT', commercial: true },
  ElevenLabs: { license: 'MIT', commercial: true },
  'App examples': { license: 'non-commercial', commercial: false },
  LiveKit: { license: 'Apache-2.0', commercial: true },
  OrbKit: { license: 'MIT', commercial: true },
  'v0.1 compatibility': { license: 'non-commercial', commercial: false },
};

const CATEGORY_RULES = [
  [/code-block|markdown|terminal|test-results|file-tree|json|artifact|attachment/, 'text'],
  [/voice|audio|orb|waveform|microphone/, 'ai-surfaces'],
  [/chat|conversation|prompt|message|thinking|reasoning|tool|response|streaming|agent|generative/, 'ai-surfaces'],
  [/toolbar|navbar|sidebar|nav\b/, 'navigation'],
  [/card|table|timeline|stats|avatar|badge/, 'data-display'],
  [/dialog|modal|popover|dropdown|sheet|drawer/, 'overlay'],
  [/form|input|select|checkbox|radio|switch|slider|calendar/, 'forms'],
  [/loader|spinner|progress|skeleton|alert|toast|notification/, 'feedback'],
  [/example|app\b|workflow|dashboard/, 'blocks-sections'],
  [/background|gradient|glow|grid|pattern|beam|particles/, 'backgrounds-effects'],
  [/button|toggle|copy|swap|hover|motion|reveal/, 'micro-interactions'],
];

function stripVersion(dependency) {
  return String(dependency).replace(/@[\^~><=\d][\w.\-^~<>=]*$/, '');
}

function parseSections(llmsText) {
  const map = new Map();
  let current = null;
  for (const line of llmsText.split('\n')) {
    const section = line.match(/^###\s+(.+?)\s*\(\d+\)\s*$/);
    if (section) {
      current = section[1].trim();
      continue;
    }
    if (/^##\s/.test(line)) {
      current = null;
      continue;
    }
    const item = line.match(/^-\s+\[([^\]]+)\]\(https:\/\/agents-ui\.github\.io\/agents-kit\/c\/[^)]+\)/);
    if (item && current) map.set(item[1], current);
  }
  return map;
}

async function loadRegistry() {
  try {
    const { data } = await fetchJSON(REGISTRY_URL, { timeout: 90000 });
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, `${JSON.stringify(data)}\n`, 'utf8');
    return data;
  } catch (error) {
    if (existsSync(CACHE_FILE)) {
      console.log(`agentskit: live fetch failed (${error.message}); using cached registry`);
      return JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
    }
    throw error;
  }
}

async function main() {
  const [registry, llms] = await Promise.all([loadRegistry(), fetchText(LLMS_URL)]);
  const sections = parseSections(llms.text);
  const items = registry.items ?? [];
  console.log(`agentskit: registry has ${items.length} blocks; llms.txt maps ${sections.size} names to sections`);

  let unmapped = 0;
  const entries = items.map((item) => {
    const name = item.name;
    const display = item.title ?? name;
    const section = sections.get(name);
    if (!section) unmapped += 1;
    const licenseInfo = SECTION_LICENSE[section] ?? { license: 'non-commercial', commercial: false };
    const category = categoryFromKeywords(`${name} ${display}`, CATEGORY_RULES, 'ai-surfaces');
    const registryUrl = `https://agents-ui.github.io/agents-kit/c/${name}.json`;
    return buildEntry({
      id: `agentskit-${category}-${slugify(name)}`,
      name: `Agents Kit ${display}`,
      source: 'Agents Kit',
      entryType: 'block',
      category,
      description: truncate(item.description ?? `${display} block for agent interfaces from Agents Kit.`),
      useCase: USE_BY_CATEGORY[category],
      decisionHints: [
        'React 19 + Tailwind v4 + shadcn/ui required',
        licenseInfo.commercial
          ? `Ported collection (${licenseInfo.license}): commercial use allowed`
          : 'Original Agents Kit family: non-commercial without written permission',
      ],
      searchTags: ['agents-kit', 'agent-ui', section ? slugify(section) : 'unmapped', ...slugify(name).split('-')],
      docsUrl: 'https://agents-ui.github.io/agents-kit/components',
      registryUrl,
      stack: ['react', 'tailwind', 'shadcn'],
      dependencies: [...new Set((item.dependencies ?? []).map(stripVersion))],
      installMethod: 'shadcn-cli',
      installCommand: `npx shadcn@latest add ${registryUrl}`,
      manualSteps: [
        'Import the required styles (styles/agents.css and collection CSS) as described in the docs.',
        'Some v0.1 components retain Next.js-specific code; verify imports.',
      ],
      licenseType: licenseInfo.license,
      commercialUse: licenseInfo.commercial,
      free: true,
      limits: licenseInfo.commercial
        ? 'Ported collection keeps its upstream MIT/Apache-2.0 license; keep the notices.'
        : 'Agents Kit original license is non-commercial; commercial use requires prior written permission (see LICENSE.md).',
      extractionNote: section
        ? `License from llms.txt section "${section}"; items may bundle shared agents-ui files — verify per-file notices before commercial use.`
        : 'Not found in llms.txt sections; classified conservatively as non-commercial.',
    });
  });

  const counts = {};
  for (const entry of entries) counts[entry.license_type] = (counts[entry.license_type] ?? 0) + 1;
  console.log(`agentskit: ${entries.length} entries ${JSON.stringify(counts)} (${unmapped} unmapped names)`);

  return writeSource(
    'agentskit',
    {
      sourceName: 'Agents Kit',
      sourceUrl: 'https://agents-ui.github.io/agents-kit/',
      catalogUrl: 'https://agents-ui.github.io/agents-kit/components',
      licenseSummary: 'Non-commercial for original families; MIT/Apache-2.0 for ported collections',
      granularity: 'complete (224 registry blocks)',
      extraction: {
        channel: 'docs-structured',
        method: 'Node script downloading the official shadcn registry; license mapped from llms.txt collection sections',
        evidence_url: 'https://agents-ui.github.io/agents-kit/llms.txt',
        note: 'All entries are free to install; commercial usability depends on the collection of origin.',
      },
    },
    entries,
  );
}

await main();
