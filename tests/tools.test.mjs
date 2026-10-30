import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
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
  assert.ok(!existsSync(join(target, 'CLAUDE.md')), 'no CLAUDE.md created when absent');
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
  assert.ok(readFileSync(join(target, 'CLAUDE.md'), 'utf8').startsWith('# Claude rules\n\nUse tabs.\n'));
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
