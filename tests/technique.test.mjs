import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { AREAS, COSTS, KINDS, MAX_CARD_BYTES, cardBytes, loadContext, validateCards } from '../ai-frontend-guide-kit/tools/technique.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KIT = join(ROOT, 'ai-frontend-guide-kit');
const TOOL = join(KIT, 'tools', 'technique.mjs');
const DATA = join(KIT, 'experience', 'techniques.json');
const CLASSIFICATION = join(ROOT, 'odd', 'tasks', 'weak-model-design-classification.md');

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};
const technique = (...args) => spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8', env: cleanEnv() });
const ctx = loadContext(KIT);
const card = (over = {}) => ({
  id: 'bento-grid',
  area: 'layout',
  title: 'Bento grid',
  when: 'Overview of 4 to 8 features of different weight.',
  when_not: 'Content that must be read in order.',
  steps: ['Pick a 4 column grid.', 'Make one tile double size.'],
  check: 'audit-design.mjs: no overflow-x at 360.',
  cost: 'low',
  fallback: 'Stack the tiles in one column.',
  directions: ['bento-grid', 'any'],
  ...over,
});
const problems = (cards) => validateCards({ cards }, ctx);

// ---------------------------------------------------------------- the validator, one rule at a time

test('a complete card has no problems, and the allowed values are the ones the docs name', () => {
  assert.deepEqual(problems([card()]), []);
  assert.deepEqual(AREAS, ['layout', 'type', 'color', 'motion', 'imagery', '3d', 'svg', 'interaction', 'content', 'direction', 'psychology']);
  assert.deepEqual(COSTS, ['low', 'medium', 'high']);
  assert.deepEqual(KINDS, ['technique', 'external']);
  assert.equal(MAX_CARD_BYTES, 1024);
});

test('an empty list or no list of cards is refused', () => {
  assert.match(validateCards({}, ctx).join('\n'), /"cards" must be a non-empty list/);
  assert.match(validateCards({ cards: [] }, ctx).join('\n'), /"cards" must be a non-empty list/);
});

test('ids are unique', () => {
  assert.match(problems([card(), card({ title: 'Other' })]).join('\n'), /bento-grid: the id is used twice/);
});

test('ids are kebab-case', () => {
  assert.match(problems([card({ id: 'Bento Grid' })]).join('\n'), /"Bento Grid": the id must be kebab-case/);
});

test('every required field must be there and not empty', () => {
  for (const field of ['id', 'area', 'title', 'when', 'when_not', 'steps', 'check', 'cost', 'fallback', 'directions']) {
    const broken = card();
    delete broken[field];
    assert.match(problems([broken]).join('\n'), new RegExp(`"${field}" is missing`), field);
  }
  assert.match(problems([card({ when: '  ' })]).join('\n'), /bento-grid: "when" must be a non-empty text/);
});

test('the area must be one of the allowed ones', () => {
  assert.match(problems([card({ area: 'sound' })]).join('\n'), /bento-grid: area "sound" is not one of: layout, type/);
});

test('the cost must be low, medium or high', () => {
  assert.match(problems([card({ cost: 'cheap' })]).join('\n'), /bento-grid: cost "cheap" is not one of: low, medium, high/);
});

test('the kind is technique (default) or external', () => {
  assert.deepEqual(problems([card({ kind: 'technique' })]), []);
  assert.match(problems([card({ kind: 'magic' })]).join('\n'), /bento-grid: kind "magic" is not one of: technique, external/);
});

test('steps are a list of 1 to 6 non-empty texts', () => {
  assert.match(problems([card({ steps: [] })]).join('\n'), /bento-grid: "steps" must be a list of 1 to 6 non-empty texts/);
  assert.match(problems([card({ steps: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] })]).join('\n'), /"steps" must be a list of 1 to 6/);
  assert.match(problems([card({ steps: ['ok', ''] })]).join('\n'), /"steps" must be a list of 1 to 6/);
});

test('a card of 1 KB or more is refused, and its size is its compact JSON in bytes', () => {
  const big = card({ steps: ['x'.repeat(300), 'y'.repeat(300), 'z'.repeat(300)] });
  assert.ok(cardBytes(big) >= MAX_CARD_BYTES);
  assert.match(problems([big]).join('\n'), new RegExp(`bento-grid: the card is ${cardBytes(big)} bytes; the limit is under 1024`));
  assert.equal(cardBytes({ a: 'é' }), Buffer.byteLength('{"a":"é"}'));
  assert.deepEqual(problems([card()]), []);
});

test('a tool named in "check" must exist in tools/', () => {
  assert.match(problems([card({ check: 'ghost-audit.mjs finds nothing' })]).join('\n'), /bento-grid: "check" names the tool ghost-audit\.mjs, which is not in tools\//);
  assert.deepEqual(problems([card({ check: 'by hand: look at it' })]), []);
  assert.deepEqual(problems([card({ check: 'svg.mjs check and audit-design.mjs' })]), []);
});

test('directions are known style directions or "any"', () => {
  assert.match(problems([card({ directions: ['bento-grid', 'vaporwave'] })]).join('\n'), /bento-grid: direction "vaporwave" is not a style direction of the kit/);
  assert.match(problems([card({ directions: [] })]).join('\n'), /"directions" must be a list of 1 or more/);
  assert.ok(ctx.directions.has('editorial') && ctx.directions.has('any'));
});

test('refs must be files of the kit', () => {
  assert.deepEqual(problems([card({ refs: ['experience/references/reference-laws-of-ux.md'] })]), []);
  assert.match(problems([card({ refs: ['experience/references/nothing.md'] })]).join('\n'), /bento-grid: ref experience\/references\/nothing\.md is not a file of the kit/);
});

test('external cards have an id that starts with ext-, and technique cards do not', () => {
  assert.deepEqual(problems([card({ id: 'ext-image-prompt', kind: 'external' })]), []);
  assert.match(problems([card({ kind: 'external' })]).join('\n'), /bento-grid: an external card needs an id that starts with ext-/);
  assert.match(problems([card({ id: 'ext-thing' })]).join('\n'), /ext-thing: only external cards have an id that starts with ext-/);
});

// ---------------------------------------------------------------- the command

test('check passes on the shipped techniques.json, prints counts by area and exits 0', () => {
  const run = technique('check');
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /^technique: \d+ cards in 11 areas, 0 problems$/m);
});

test('check lists every problem of another file and exits 1; it does not change the file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'technique-'));
  const file = join(dir, 'cards.json');
  const text = JSON.stringify({ cards: [card(), card({ area: 'sound' })] });
  writeFileSync(file, text);
  const run = technique('check', '--file', file);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /bento-grid: the id is used twice/);
  assert.match(run.stderr, /area "sound" is not one of/);
  assert.match(run.stderr, /^technique: 2 cards, 2 problems$/m);
  assert.equal(readFileSync(file, 'utf8'), text);
  writeFileSync(file, '{ nope');
  assert.match(technique('check', '--file', file).stderr, /the file is not valid JSON/);
  assert.equal(technique('check', '--file', join(dir, 'missing.json')).status, 1);
});

test('check --json prints the data', () => {
  const data = JSON.parse(technique('check', '--json').stdout);
  assert.equal(data.problems.length, 0);
  assert.ok(data.cards > 100);
  assert.ok(data.by_area.psychology > 20 && data.by_area['3d'] > 5);
});

test('an unknown command, option or a missing command exits 2 and prints the usage with the one path form', () => {
  for (const args of [[], ['frobnicate'], ['check', '--wat']]) {
    const run = technique(...args);
    assert.equal(run.status, 2, args.join(' '));
    assert.match(run.stderr, /node [^\n]*tools\/technique\.mjs check/);
    assert.doesNotMatch(run.stderr, /node tools\//);
  }
  const help = technique('--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /technique\.mjs check/);
});

// ---------------------------------------------------------------- the shipped data

const cards = () => JSON.parse(readFileSync(DATA, 'utf8')).cards;

test('techniques.json: every area has cards, the external ones exist, and psychology cites the laws of UX or the deceptive patterns', () => {
  const list = cards();
  for (const area of AREAS) assert.ok(list.some((entry) => entry.area === area), `no card in ${area}`);
  assert.ok(list.filter((entry) => entry.kind === 'external').length >= 8);
  const cited = new Set(list.flatMap((entry) => entry.refs ?? []));
  assert.ok(cited.has('experience/references/reference-laws-of-ux.md'));
  assert.ok(cited.has('experience/references/reference-deceptive-patterns.md'));
});

test('techniques.json: no card copies a reference, and the file is not minified', () => {
  const text = readFileSync(DATA, 'utf8');
  assert.ok(text.split('\n').length > cards().length, 'one card per line at least');
  assert.ok(cards().every((entry) => cardBytes(entry) < MAX_CARD_BYTES));
});

// ---------------------------------------------------------------- the classification (T11, T14)

const norm = (text) => text.toLowerCase().replace(/\*\*/g, '').replace(/[.:“”"¿?]/g, '').replace(/\s+/g, ' ').trim();

/** `{ section, key }` of every list item of a source file: the first three words of its name. */
function items(file) {
  const lines = readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((line) => line.startsWith('## '));
  const out = [];
  let section = '';
  for (const line of lines.slice(start)) {
    if (line.startsWith('## ')) {
      const title = norm(line.slice(3));
      section = title.match(/^\d+/)?.[0] ?? (title === 'regla de oro' ? 'oro' : title);
      continue;
    }
    const bullet = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/)?.[1] ?? line.match(/^\|\s*\*\*(.+?)\*\*\s*\|/)?.[1];
    if (!bullet) continue;
    const plain = bullet.replace(/\*\*/g, '');
    const head = plain.indexOf(':') > 0 && plain.indexOf(':') <= 60 ? plain.slice(0, plain.indexOf(':')) : plain;
    out.push({ section, key: norm(head).split(' ').slice(0, 3).join(' ') });
  }
  return out;
}

/** The classification split by its `## <number>` headings: the text of each part, and the rows `| item | class | target |`. */
function classification(heading) {
  const parts = new Map();
  let section = '';
  const rows = [];
  for (const line of readFileSync(CLASSIFICATION, 'utf8').replace(/\r\n/g, '\n').split('\n')) {
    const head = line.match(/^## (.+)$/);
    if (head && line.startsWith('## ')) {
      section = heading(norm(head[1]));
      continue;
    }
    if (!section) continue;
    parts.set(section, `${parts.get(section) ?? ''}\n${norm(line)}`);
    const row = line.match(/^\|\s*(.+?)\s*\|\s*([abcd])\s*\|\s*(.+?)\s*\|\s*$/);
    if (row) rows.push({ section, item: row[1], cls: row[2], target: row[3] });
  }
  return { parts, rows };
}

test('the classification file exists and every item of the technique list is in its own section with a class (S9)', () => {
  assert.ok(existsSync(CLASSIFICATION), 'odd/tasks/weak-model-design-classification.md');
  const found = classification((title) => `t:${title.match(/^t-?(\d+|oro)\b/)?.[1] ?? title}`);
  const missing = items(join(ROOT, 'odd', 'tasks', 'weak-model-design-techniques.md')).filter((item) => !(found.parts.get(`t:${item.section}`) ?? '').includes(item.key));
  assert.deepEqual(missing.map((item) => `${item.section}: ${item.key}`), []);
});

test('the classification file has every item of the psychology list in its own section with a class (S12)', () => {
  const found = classification((title) => `p:${title.match(/^p(\d+)\b/)?.[1] ?? title}`);
  const missing = items(join(ROOT, 'odd', 'tasks', 'weak-model-design-psychology.md')).filter((item) => !(found.parts.get(`p:${item.section}`) ?? '').includes(item.key));
  assert.deepEqual(missing.map((item) => `${item.section}: ${item.key}`), []);
});

test('every row has class a, b, c or d and a target; targets of class a and c are card ids of techniques.json, and every card is the target of some row', () => {
  const ids = new Set(cards().map((entry) => entry.id));
  const { rows } = classification((title) => title);
  assert.ok(rows.length >= 380, `${rows.length} rows`);
  const used = new Set();
  const bad = [];
  for (const row of rows) {
    const named = [...row.target.matchAll(/`([a-z0-9-]+)`/g)].map((match) => match[1]);
    if (row.cls === 'a' || row.cls === 'c') {
      if (!named.length || named.some((id) => !ids.has(id))) bad.push(`${row.item} -> ${row.target}`);
      named.forEach((id) => used.add(id));
    } else if (!row.target.trim()) bad.push(`${row.item}: empty target`);
    if (row.cls === 'c' && !named.every((id) => id.startsWith('ext-'))) bad.push(`${row.item}: class c needs ext- cards`);
    for (const id of named) if (ids.has(id)) used.add(id);
  }
  assert.deepEqual(bad, []);
  assert.deepEqual([...ids].filter((id) => !used.has(id)), [], 'a card no row points to');
});

test('class d rows name a file or tool that exists in the kit or the repository', () => {
  const { rows } = classification((title) => title);
  const names = new Set([...readdirSync(join(KIT, 'tools')), ...readdirSync(join(KIT, 'experience')), ...readdirSync(join(KIT, 'guides')), ...readdirSync(join(ROOT, 'skills')), ...readdirSync(join(KIT, 'experience', 'references'))]);
  const missing = [];
  for (const row of rows.filter((entry) => entry.cls === 'd' || entry.cls === 'b')) {
    for (const match of row.target.matchAll(/`([\w./-]+\.(?:mjs|md|json|py))`/g)) if (!names.has(match[1].split('/').pop())) missing.push(`${row.item}: ${match[1]}`);
  }
  assert.deepEqual(missing, []);
});
