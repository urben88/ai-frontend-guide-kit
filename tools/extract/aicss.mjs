/**
 * Extraction: docs-structured channel — aicss.dev.
 * Parses the official llms.txt (AI-assistant instructions allow indexing free
 * components) and indexes only the 13 free components (MIT). Pro is excluded.
 *
 * Usage: node tools/extract/aicss.mjs
 */
import { fetchText, buildEntry, writeSource, slugify, truncate } from './lib.mjs';

async function main() {
  const { text, status } = await fetchText('https://www.aicss.dev/llms.txt');
  if (status !== 200) throw new Error(`aicss llms.txt status ${status}`);

  const itemPattern = /^-\s\[([^\]]+)\]\((https:\/\/www\.aicss\.dev\/components\/[^)]+)\)\s*\((free|licensed)\)\s*:\s*(.*?)\s*Code:\s*(\S+)\s*$/gm;
  const items = [...text.matchAll(itemPattern)].map((match) => ({
    name: match[1].trim(),
    docsUrl: match[2].trim(),
    tier: match[3],
    description: match[4].trim(),
    codeUrl: match[5].trim(),
  }));
  const free = items.filter((item) => item.tier === 'free');
  console.log(`aicss: ${items.length} components listed, ${free.length} free indexed, ${items.length - free.length} Pro excluded`);

  const entries = free.map((item) => {
    const slug = item.docsUrl.split('/').filter(Boolean).pop();
    return buildEntry({
      id: `aicss-ai-surfaces-${slugify(slug)}`,
      name: `AICSS ${item.name}`,
      source: 'aicss.dev',
      entryType: 'component',
      category: 'ai-surfaces',
      description: truncate(item.description),
      useCase: 'Build agent/AI conversation interfaces: thinking states, tool calls, streaming text, citations and structured outputs.',
      decisionHints: ['Ships React, Vue and Svelte code', 'Self-contained CSS (no Tailwind required)'],
      searchTags: ['aicss', 'agent-ui', 'chat', ...slug.split('-')],
      docsUrl: item.docsUrl,
      registryUrl: item.codeUrl,
      stack: ['react', 'vue', 'svelte'],
      dependencies: [],
      installMethod: 'npm',
      installCommand: `npx @aicss/cli add ${slug}`,
      manualSteps: [
        `Alternative: npx shadcn@latest add ${item.codeUrl}`,
        `Or copy the React/Vue/Svelte code from ${item.docsUrl}`,
      ],
      licenseType: 'MIT',
      commercialUse: true,
      free: true,
      limits: 'The 5 Pro components ($89 Personal / $299 Enterprise, one-time) are excluded from this catalog; do not reconstruct their source.',
      extractionNote: 'Indexed from llms.txt, the channel explicitly allowed for AI assistants; /r/ endpoints are disallowed for named AI bots in robots.txt.',
    });
  });

  return writeSource(
    'aicss',
    {
      sourceName: 'aicss.dev',
      sourceUrl: 'https://www.aicss.dev',
      catalogUrl: 'https://www.aicss.dev',
      licenseSummary: 'MIT (free components); Pro under a custom one-time license',
      granularity: 'complete for the 13 free components (Pro excluded by design)',
      extraction: {
        channel: 'docs-structured',
        method: 'Node script parsing the official llms.txt (sanctioned channel for AI assistants)',
        evidence_url: 'https://www.aicss.dev/llms.txt',
      },
    },
    entries,
  );
}

await main();
