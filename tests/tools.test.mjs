import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { scanText } from '../ai-frontend-guide-kit/tools/audit-honesty.mjs';
import { classify } from '../tools/check-licenses.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const node = (args, options = {}) => spawnSync(process.execPath, args, { encoding: 'utf8', ...options });

test('audit-honesty flags deceptive tells and passes honest copy', () => {
  const bad = scanText(
    [
      '<p>Only 3 left! Hurry, offer ends soon</p>',
      '<button>No thanks, I hate saving money</button>',
      '<input type="checkbox" checked name="insurance">',
      '<p>John Doe says it is great. Trusted by 10,000+ teams</p>',
      '<button>Accept all cookies</button>',
    ].join('\n'),
  );
  const rules = new Set(bad.map((f) => f.rule));
  for (const rule of ['fake-scarcity', 'urgency-copy', 'confirmshaming', 'prechecked-extra', 'placeholder-proof', 'unverified-metric', 'consent-asymmetry']) {
    assert.ok(rules.has(rule), `missing ${rule}`);
  }
  const good = scanText('<button>Accept all</button><button>Reject all</button><p>Plans start at $9/month, cancel any time.</p>');
  assert.equal(good.length, 0);
});

test('audit-honesty CLI --strict fails on high findings and passes on clean dirs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'honesty-'));
  writeFileSync(join(dir, 'a.html'), '<p>Only 2 left</p>');
  assert.equal(node([join(ROOT, 'ai-frontend-guide-kit/tools/audit-honesty.mjs'), dir, '--strict']).status, 1);
  const clean = mkdtempSync(join(tmpdir(), 'honesty-'));
  writeFileSync(join(clean, 'a.html'), '<p>Plans start at $9.</p>');
  assert.equal(node([join(ROOT, 'ai-frontend-guide-kit/tools/audit-honesty.mjs'), clean, '--strict']).status, 0);
});

test('audit-a11y and audit-perf print usage and exit 2 without arguments', () => {
  assert.equal(node([join(ROOT, 'ai-frontend-guide-kit/tools/audit-a11y.mjs')]).status, 2);
  assert.equal(node([join(ROOT, 'ai-frontend-guide-kit/tools/audit-perf.mjs')]).status, 2);
});

test('license classifier recognises MIT, Apache, Commons Clause and AGPL texts', () => {
  assert.equal(classify('MIT License\n\nPermission is hereby granted, free of charge, to any person obtaining a copy').spdx, 'MIT');
  assert.equal(classify('Apache License\nVersion 2.0, January 2004').spdx, 'Apache-2.0');
  assert.equal(classify('MIT + Commons Clause License Condition v1.0 Permission is hereby granted, free of charge').label, 'MIT + Commons Clause');
  assert.equal(classify('GNU AFFERO GENERAL PUBLIC LICENSE Version 3').label, 'AGPL-3.0');
  assert.equal(classify('all rights reserved').spdx, 'unknown');
});

test('experience manifest: unique ids, required fields, every reference card is indexed', () => {
  const exp = join(ROOT, 'ai-frontend-guide-kit', 'experience');
  const manifest = JSON.parse(readFileSync(join(exp, 'experience-manifest.json'), 'utf8'));
  const ids = new Set();
  for (const e of manifest.entries) {
    assert.ok(!ids.has(e.id), `duplicate ${e.id}`);
    ids.add(e.id);
    for (const f of ['id', 'kind', 'name', 'category', 'description', 'use_case', 'search_tags', 'source', 'license_type', 'commercial_use']) {
      assert.ok(e[f] !== undefined, `${e.id} missing ${f}`);
    }
  }
  const index = readFileSync(join(exp, 'references', 'INDEX.md'), 'utf8');
  const cards = readdirSync(join(exp, 'references')).filter((f) => f.startsWith('reference-'));
  assert.ok(cards.length >= 23);
  for (const card of cards) {
    assert.ok(existsSync(join(exp, 'references', card)), `${card} exists`);
    assert.ok(index.includes(card), `${card} indexed`);
  }
});

test('installer is idempotent: second run adds nothing and keeps one AGENTS.md pointer', () => {
  const target = mkdtempSync(join(tmpdir(), 'kit-install-'));
  const args = [join(ROOT, 'install.mjs'), '--target', target, '--no-skills', '--no-mcp'];
  const first = node(args);
  assert.equal(first.status, 0, first.stderr);
  assert.ok(existsSync(join(target, 'ai-frontend-guide-kit', 'AGENTS.md')));
  assert.ok(existsSync(join(target, 'ai-frontend-guide-kit', 'catalog', 'explorer.html')));
  assert.ok(existsSync(join(target, 'ai-frontend-output')));
  const second = node(args);
  assert.equal(second.status, 0, second.stderr);
  const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8');
  assert.equal(agents.split('ai-frontend-guide-kit/AGENTS.md').length - 1, 1);
});

const install = (target) => node([join(ROOT, 'install.mjs'), '--target', target, '--no-skills', '--no-mcp']);
const count = (text, needle) => text.split(needle).length - 1;
const MARK = '<!-- ai-frontend-guide-kit:start -->';

test('installer routes every design request (EN + ES) to the kit', () => {
  const target = mkdtempSync(join(tmpdir(), 'kit-route-'));
  assert.equal(install(target).status, 0);
  const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8');
  assert.equal(count(agents, MARK), 1);
  for (const word of ['design', 'diseño', 'colores', 'tipografía', 'pantalla', 'landing']) {
    assert.ok(agents.includes(word), `trigger "${word}" present`);
  }
  assert.match(agents, /impeccable/);
  assert.equal(count(readFileSync(join(target, 'CLAUDE.md'), 'utf8'), MARK), 1, 'CLAUDE.md is created with the block (Claude Code does not read AGENTS.md)');
});

test('installer fetches the 5 external design skill repos, and only landing-page-design from elayadesign', () => {
  const target = mkdtempSync(join(tmpdir(), 'kit-design-skills-'));
  const stub = mkdtempSync(join(tmpdir(), 'kit-npx-stub-'));
  const log = join(stub, 'npx.log');
  writeFileSync(join(stub, 'npx'), '#!/bin/sh\necho "$@" >> "$NPX_LOG"\n', { mode: 0o755 });
  writeFileSync(join(stub, 'npx.cmd'), '@echo %*>> "%NPX_LOG%"\r\n');
  const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH');
  const env = { ...process.env, NPX_LOG: log, [pathKey]: `${stub}${delimiter}${process.env[pathKey]}` };

  const run = node([join(ROOT, 'install.mjs'), '--target', target, '--no-mcp'], { env });
  assert.equal(run.status, 0, run.stderr);
  const calls = readFileSync(log, 'utf8');
  for (const expected of [
    'skills add https://github.com/pbakaus/impeccable --skill impeccable',
    'skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend',
    'skills add https://github.com/emilkowalski/skills',
    'skills add https://github.com/nutlope/hallmark --skill hallmark',
    'skills add https://github.com/elayadesign/ai-design-skills --skill landing-page-design',
  ]) {
    assert.ok(calls.includes(expected), `missing call: ${expected}`);
  }
  assert.equal(calls.trim().split(/\r?\n/).length, 5);

  writeFileSync(log, '');
  const skipped = mkdtempSync(join(tmpdir(), 'kit-no-design-skills-'));
  const noDesign = node([join(ROOT, 'install.mjs'), '--target', skipped, '--no-mcp', '--no-design-skills'], { env });
  assert.equal(noDesign.status, 0, noDesign.stderr);
  assert.equal(readFileSync(log, 'utf8'), '');
});

test('routing block and guide 00 place each external design skill at its flow step', () => {
  const target = mkdtempSync(join(tmpdir(), 'kit-skill-steps-'));
  assert.equal(install(target).status, 0);
  const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8');
  const guide = readFileSync(join(ROOT, 'ai-frontend-guide-kit', 'guides', '00-START-HERE.md'), 'utf8');
  for (const skill of ['landing-page-design', 'hallmark', 'design-taste-frontend', 'impeccable', 'emilkowalski']) {
    assert.ok(agents.includes(skill), `routing block names ${skill}`);
    assert.ok(guide.includes(skill), `guide 00 names ${skill}`);
  }
  assert.ok(!agents.includes('run only inside phase 3'), 'stale phase 3 only rule removed');
  assert.ok(!guide.includes('only when its description matches'), 'stale load rule removed');
});

test('HELP.md and HELP.es.md name every kit tool and every skill', () => {
  const kit = join(ROOT, 'ai-frontend-guide-kit');
  const tools = readdirSync(join(kit, 'tools'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(mjs|py)$/.test(entry.name))
    .map((entry) => entry.name);
  const skills = readdirSync(join(ROOT, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.ok(tools.length >= 10, `found ${tools.length} tools`);
  assert.ok(skills.length >= 19, `found ${skills.length} skills`);
  for (const file of ['HELP.md', 'HELP.es.md']) {
    const help = readFileSync(join(kit, file), 'utf8');
    for (const name of [...tools, ...skills]) assert.ok(help.includes(name), `${file} names ${name}`);
  }
});

test('the routing block sends a request to explain the tool to HELP.md', () => {
  const target = mkdtempSync(join(tmpdir(), 'kit-help-route-'));
  assert.equal(install(target).status, 0);
  const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8');
  assert.match(agents, /ai-frontend-guide-kit\/HELP\.md/);
  assert.match(agents, /resumen de esta herramienta/);
  const kitAgents = readFileSync(join(target, 'ai-frontend-guide-kit', 'AGENTS.md'), 'utf8');
  assert.match(kitAgents, /HELP\.md/);
});

test('installer help counts 5 external design skill repos', () => {
  const help = node([join(ROOT, 'install.mjs'), '--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /5 external design skill repos/);
  assert.match(help.stdout, /hallmark/);
  assert.match(help.stdout, /landing-page-design/);
});

test('installer upgrades the legacy unmarked block and keeps user content', () => {
  const target = mkdtempSync(join(tmpdir(), 'kit-legacy-'));
  writeFileSync(join(target, 'AGENTS.md'), '# Mine\n\nKeep me.\n\n## Frontend UI\nBefore creating UI components, follow `ai-frontend-guide-kit/AGENTS.md` (reuse-first workflow).\nold line\n\n## Other\nAlso keep me.\n');
  assert.equal(install(target).status, 0);
  const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8');
  assert.equal(count(agents, MARK), 1);
  assert.equal(count(agents, '## Frontend UI\n'), 0);
  assert.ok(!agents.includes('old line'));
  assert.ok(agents.includes('Keep me.') && agents.includes('## Other\nAlso keep me.'));
});

test('installer upgrades a CRLF legacy block, keeps CRLF endings and is idempotent', () => {
  const target = mkdtempSync(join(tmpdir(), 'kit-crlf-'));
  writeFileSync(join(target, 'AGENTS.md'), '# Mine\r\n\r\n## Frontend UI\r\nBefore creating UI components, follow `ai-frontend-guide-kit/AGENTS.md`.\r\n\r\n## Other\r\nKeep.\r\n');
  assert.equal(install(target).status, 0);
  assert.equal(install(target).status, 0);
  const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8');
  assert.equal(count(agents, MARK), 1);
  assert.equal(count(agents, '## Frontend UI\r\n'), 0);
  assert.equal(count(agents.replace(/\r\n/g, ''), '\n'), 0, 'no bare LF mixed into a CRLF file');
  assert.ok(agents.includes('## Other\r\nKeep.'));
});

test('installer does not swallow user text after an orphan start marker', () => {
  const target = mkdtempSync(join(tmpdir(), 'kit-orphan-'));
  writeFileSync(join(target, 'AGENTS.md'), `# Mine\n\n${MARK}\nUser text.\n`);
  assert.equal(install(target).status, 0);
  assert.equal(install(target).status, 0);
  assert.ok(readFileSync(join(target, 'AGENTS.md'), 'utf8').includes('User text.'));
});

test('installer adds the block to an existing CLAUDE.md (Claude Code ignores AGENTS.md then), idempotently', () => {
  const target = mkdtempSync(join(tmpdir(), 'kit-claude-'));
  writeFileSync(join(target, 'CLAUDE.md'), '# Claude rules\n\nUse tabs.\n');
  mkdirSync(join(target, '.claude'));
  writeFileSync(join(target, '.claude', 'CLAUDE.md'), '# Nested\n');
  assert.equal(install(target).status, 0);
  assert.equal(install(target).status, 0);
  for (const file of ['CLAUDE.md', join('.claude', 'CLAUDE.md')]) {
    const text = readFileSync(join(target, file), 'utf8');
    assert.equal(count(text, MARK), 1, `${file} has one block`);
    assert.ok(text.includes('diseño'));
  }
  const claude = readFileSync(join(target, 'CLAUDE.md'), 'utf8');
  assert.ok(claude.startsWith('# Claude rules\n') && claude.endsWith('Use tabs.\n'),'the block goes below the title; the user text stays intact');
});

test('ai-frontend-guide skill triggers on design talk in English and Spanish', () => {
  const head = readFileSync(join(ROOT, 'skills', 'ai-frontend-guide', 'SKILL.md'), 'utf8').split('---')[1];
  for (const word of ['diseño', 'colores', 'design', 'restyle']) assert.ok(head.includes(word), `skill trigger "${word}"`);
});

test('installer prints the Agentation message (not with --no-mcp) and ships guide 11', () => {
  const withMcp = mkdtempSync(join(tmpdir(), 'kit-agentation-'));
  const run = node([join(ROOT, 'install.mjs'), '--target', withMcp, '--no-skills']);
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /claude mcp add agentation -- npx -y agentation-mcp server/);
  assert.ok(existsSync(join(withMcp, 'ai-frontend-guide-kit', 'guides', '11-VISUAL-FEEDBACK.md')));

  const noMcp = mkdtempSync(join(tmpdir(), 'kit-agentation-'));
  const skipped = node([join(ROOT, 'install.mjs'), '--target', noMcp, '--no-skills', '--no-mcp']);
  assert.equal(skipped.status, 0, skipped.stderr);
  assert.doesNotMatch(skipped.stdout, /agentation-mcp/);
});

test('memory tool records the optional component type and warns on an unknown one', () => {
  const target = mkdtempSync(join(tmpdir(), 'kit-mem-type-'));
  const env = { ...process.env, AI_FRONTEND_OUTPUT: join(target, 'out') };
  const memory = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'memory.mjs');
  const add = node([memory, 'add', '--screen', 'home', '--block', 'orders', '--need', 'order table', '--decision', 'reuse', '--id', 'shadcn-data-display-table', '--type', 'table'], { env });
  assert.equal(add.status, 0, add.stderr);
  const typed = JSON.parse(readFileSync(join(target, 'out', 'selections.jsonl'), 'utf8').trim().split('\n')[0]);
  assert.equal(typed.component_type.name, 'Table', 'the canonical name is recorded');
  assert.equal(typed.component_type.layer, 'shared');
  const unknown = node([memory, 'add', '--screen', 'home', '--block', 'x', '--need', 'n', '--decision', 'reuse', '--id', 'shadcn-data-display-table', '--type', 'widgeto'], { env });
  assert.equal(unknown.status, 0, 'an unknown type still records the decision');
  assert.match(unknown.stderr + unknown.stdout, /widgeto/);
  const list = node([memory, 'list', '--json'], { env });
  assert.equal(list.status, 0, list.stderr);
  assert.ok(JSON.parse(list.stdout).decisions.some((row) => row.component_type?.name === 'Table'));
  const legacy = node([memory, 'add', '--screen', 'home', '--block', 'y', '--need', 'n', '--decision', 'reuse', '--id', 'shadcn-data-display-table'], { env });
  assert.equal(legacy.status, 0, 'a record without a type stays valid');
});

test('memory tool records and lists a decision', () => {
  const target = mkdtempSync(join(tmpdir(), 'kit-mem-'));
  mkdirSync(join(target, 'out'));
  const env = { ...process.env, AI_FRONTEND_OUTPUT: join(target, 'out') };
  const memory = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'memory.mjs');
  const add = node([memory, 'add', '--screen', 'home', '--block', 'hero', '--need', 'headline', '--decision', 'reuse', '--id', 'magicui-text-animated-shiny-text'], { env });
  assert.equal(add.status, 0, add.stderr);
  const list = node([memory, 'list'], { env });
  assert.equal(list.status, 0, list.stderr);
  assert.match(list.stdout, /hero/);
});

const skillDirs = () =>
  readdirSync(join(ROOT, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

test('guide 12 names the three architecture modes, the adapters and the Steiger limit', () => {
  const guide = readFileSync(join(ROOT, 'ai-frontend-guide-kit', 'guides', '12-ARCHITECTURE.md'), 'utf8');
  for (const word of ['`map`', '`fsd-new`', '`fsd-refactor`', 'Next.js', 'Nuxt', 'Steiger']) {
    assert.ok(guide.includes(word), `guide 12 names ${word}`);
  }
  const lines = guide.replace(/\r\n/g, '\n').trimEnd().split('\n').length;
  assert.ok(lines <= 125, `guide 12 has ${lines} lines (cap 125)`);
});

test('frontend-refactor skill runs only on request and cites the FSD migration guide', () => {
  const skill = readFileSync(join(ROOT, 'skills', 'frontend-refactor', 'SKILL.md'), 'utf8');
  const head = skill.split('---')[1] ?? '';
  assert.match(head, /^name: frontend-refactor$/m);
  assert.match(head, /description:[\s\S]*only on explicit request/, 'the description says it runs only on request');
  assert.ok(skill.includes('ai-frontend-output/architecture.json'), 'names the artifact');
  assert.ok(skill.includes('https://feature-sliced.design/docs/guides/migration/from-custom'), 'cites the official migration guide');
});

test('installer copies every kit skill and no skill count contradicts skills/', () => {
  const skills = skillDirs();
  assert.equal(skills.length, 20, `skills/ has ${skills.length} directories`);
  assert.ok(skills.includes('frontend-refactor'), 'frontend-refactor is a kit skill');

  const target = mkdtempSync(join(tmpdir(), 'kit-skill-count-'));
  const run = node([join(ROOT, 'install.mjs'), '--target', target, '--no-mcp', '--no-design-skills']);
  assert.equal(run.status, 0, run.stderr);
  const installed = readdirSync(join(target, '.agents', 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(installed, skills, 'every kit skill is copied into .agents/skills');

  const claims = [
    ['install.mjs', /(\d+) kit skills/g],
    ['README.md', /(\d+) skills of this repo/g],
    ['README.es.md', /(\d+) skills de este repo/g],
    ['RESUMEN.md', /(\d+) skills propias/g],
  ];
  for (const [file, pattern] of claims) {
    const found = [...readFileSync(join(ROOT, file), 'utf8').matchAll(pattern)].map((match) => Number(match[1]));
    assert.ok(found.length > 0, `${file} states a skill count`);
    for (const claimed of found) assert.equal(claimed, skills.length, `${file} claims ${claimed} skills`);
  }
});
