#!/usr/bin/env node
/**
 * Cross-checks each source's declared license against the LICENSE file of its GitHub repo.
 *
 * Usage:
 *   node tools/check-licenses.mjs            # writes manifest/license-report.md
 *   node tools/check-licenses.mjs --apply    # also upgrades "unknown" entries when the repo license is detected
 *
 * Uses raw.githubusercontent.com (no token needed). Sources without a repo (21st.dev, dsr) are listed as
 * "per-entry" and must be verified entry by entry.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES_DIR, MANIFEST_DIR, TODAY, fetchText } from './extract/lib.mjs';

const REPOS = {
  shadcn: ['shadcn-ui/ui'],
  magicui: ['magicuidesign/magicui'],
  motionprimitives: ['ibelick/motion-primitives'],
  hyperui: ['markmead/hyperui'],
  daisyui: ['saadeghi/daisyui'],
  preline: ['htmlstreamofficial/preline'],
  cultui: ['nolly-studio/cult-ui'],
  animateui: ['imskyleen/animate-ui'],
  reactbits: ['DavidHDev/react-bits'],
  kiboui: ['haydenbleasel/kibo-ui', 'kibo-ui/kibo', 'shadcnblocks/kibo', 'haydenbleasel/kibo'],
  shadcnvue: ['unovue/shadcn-vue'],
  shadcnsvelte: ['huntabyte/shadcn-svelte'],
  mantine: ['mantinedev/mantine'],
  baseui: ['mui/base-ui'],
  reactaria: ['adobe/react-spectrum'],
  tailblocks: ['mertJF/tailblocks'],
  aicss: [],
  coss: ['cosscom/coss'],
  uiverse: ['uiverse-io/galaxy'],
};
// Known, documented divergences (repo root differs from the licensed subset we index).
const ACCEPTED = { coss: 'accepted: indexed component dirs are MIT; repo root is AGPL' };
const FILES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md', 'LICENCE'];
const BRANCHES = ['main', 'master'];

export function classify(text) {
  const t = text.slice(0, 4000);
  if (/commons clause/i.test(t)) return { spdx: 'custom', label: 'MIT + Commons Clause' };
  if (/AFFERO GENERAL PUBLIC/i.test(t)) return { spdx: 'custom', label: 'AGPL-3.0' };
  if (/GNU GENERAL PUBLIC/i.test(t)) return { spdx: 'custom', label: 'GPL' };
  if (/Apache License/i.test(t)) return { spdx: 'Apache-2.0', label: 'Apache-2.0' };
  if (/Permission is hereby granted, free of charge/i.test(t)) return { spdx: 'MIT', label: 'MIT' };
  return { spdx: 'unknown', label: 'unrecognized' };
}

async function detect(repos) {
  for (const repo of repos) {
    for (const branch of BRANCHES) {
      for (const file of FILES) {
        try {
          const { status, text } = await fetchText(`https://raw.githubusercontent.com/${repo}/${branch}/${file}`, { timeout: 15000, retries: 0 });
          if (status === 200 && text.length > 100) return { repo, file, ...classify(text) };
        } catch {
          /* try next */
        }
      }
    }
  }
  return null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const rows = [];
  for (const file of readdirSync(SOURCES_DIR).filter((f) => f.endsWith('.json')).sort()) {
    const path = join(SOURCES_DIR, file);
    const doc = JSON.parse(readFileSync(path, 'utf8'));
    const id = doc.source_id;
    const declared = [...new Set(doc.entries.map((e) => e.license_type))].join(', ');
    if (!(id in REPOS)) {
      rows.push([id, '-', declared, 'per-entry', 'verify each entry']);
      continue;
    }
    const found = REPOS[id].length ? await detect(REPOS[id]) : null;
    if (!found) {
      rows.push([id, REPOS[id].join(' / ') || '-', declared, 'not found', 'unresolved']);
      continue;
    }
    const consistent = declared.split(', ').some((d) => d === found.spdx || (d === 'proprietary' && found.spdx === 'unknown'));
    rows.push([id, found.repo, declared, found.label, consistent ? 'match' : ACCEPTED[id] ?? 'MISMATCH']);
    if (apply && declared === 'unknown' && found.spdx !== 'unknown') {
      for (const entry of doc.entries) {
        entry.license_type = found.spdx;
        entry.commercial_use = true;
        delete entry.limits;
      }
      doc.license_summary = `${found.label} (verified from ${found.repo}/${found.file} on ${TODAY})`;
      writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
      console.log(`applied: ${id} -> ${found.spdx}`);
    }
  }

  const lines = [
    '# License report',
    '',
    `Generated ${TODAY} by \`node tools/check-licenses.mjs\`. Declared = license_type values in \`manifest/sources/<id>.json\`; detected = repo LICENSE file.`,
    '',
    '| Source | Repo | Declared | Detected | Status |',
    '|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.join(' | ')} |`),
    '',
    'MISMATCH or unresolved rows need a manual look before shipping to a client. `per-entry` sources (21st.dev, DSR) keep each author\'s license.',
    '',
  ];
  writeFileSync(join(MANIFEST_DIR, 'license-report.md'), lines.join('\n'), 'utf8');
  console.table(rows.map(([s, r, d, det, st]) => ({ source: s, repo: r, declared: d, detected: det, status: st })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
