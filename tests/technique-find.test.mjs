import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as T from '../ai-frontend-guide-kit/tools/technique.mjs';
import { REQUIRED_REPO_FILES, REQUIRED_KIT_FILES } from '../tools/build-kit.mjs';

// weak-model-design T12 (S10): find and get under 1 KB, a one-page digest, direction sets, one skill per area.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KIT = join(ROOT, 'ai-frontend-guide-kit');
const TOOL = join(KIT, 'tools', 'technique.mjs');
const DATA = JSON.parse(readFileSync(join(KIT, 'experience', 'techniques.json'), 'utf8'));
const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8').replace(/\r\n/g, '\n');
const run = (...args) => spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8', cwd: ROOT });
const bytes = (text) => Buffer.byteLength(text);
const AREA_SKILLS = ['layout', 'type', 'color', 'motion', 'imagery', '3d', 'psychology'];

// ---------------------------------------------------------------- find

test('find ranks the card named by the query first and prints one line per card under 1 KB', () => {
  const result = run('find', 'bento grid');
  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.trimEnd().split('\n');
  assert.match(lines[0], /^# \d+ (cards|matches)/);
  assert.ok(lines[0].includes('ai-frontend-guide-kit/tools/technique.mjs get <id>'), lines[0]);
  assert.match(lines[1], /^bento-grid\b/);
  assert.ok(bytes(result.stdout) < 1024, `${bytes(result.stdout)} bytes`);
  const sticky = run('find', 'sticky header cta').stdout.split('\n')[1];
  assert.match(sticky, /^sticky-header-cta\b/);
});

test('find "hero layout" answers under 1 KB with layout cards first', () => {
  const result = run('find', 'hero layout');
  assert.equal(result.status, 0, result.stderr);
  assert.ok(bytes(result.stdout) < 1024, `${bytes(result.stdout)} bytes`);
  const rows = result.stdout.trimEnd().split('\n').slice(1);
  assert.ok(rows.length >= 2);
  assert.match(rows[0], /\blayout\b/);
});

test('find --area keeps only that area, --limit caps the list and every line names id and area', () => {
  const result = run('find', 'grid', '--area', 'layout', '--limit', '3');
  assert.equal(result.status, 0, result.stderr);
  const rows = result.stdout.trimEnd().split('\n').slice(1);
  assert.ok(rows.length >= 1 && rows.length <= 3, `${rows.length} rows`);
  for (const row of rows) {
    const id = row.split(/[ |:(]/)[0];
    assert.equal(DATA.cards.find((card) => card.id === id)?.area, 'layout', row);
  }
  const bad = run('find', 'grid', '--area', 'sound');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /area "sound" is not one of: layout/);
});

test('find --direction keeps cards of that direction (or any) and puts the specific ones first', () => {
  const result = run('find', '--area', 'layout', '--direction', 'editorial', '--json');
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.ok(data.results.length >= 2);
  const cards = data.results.map((row) => DATA.cards.find((card) => card.id === row.id));
  for (const card of cards) assert.ok(card.directions.includes('editorial') || card.directions.includes('any'), card.id);
  const firstAny = cards.findIndex((card) => !card.directions.includes('editorial'));
  const lastSpecific = cards.map((card) => card.directions.includes('editorial')).lastIndexOf(true);
  assert.ok(firstAny === -1 || firstAny > lastSpecific, 'specific cards come before the cards for any direction');
  const unknown = run('find', 'grid', '--direction', 'nope');
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /direction "nope" is not a style direction of the kit/);
});

test('find --json is compact, under 1 KB and keeps total, shown and results', () => {
  const result = run('find', 'motion', '--json');
  assert.equal(result.status, 0, result.stderr);
  assert.ok(bytes(result.stdout) < 1024, `${bytes(result.stdout)} bytes`);
  const data = JSON.parse(result.stdout);
  assert.ok(data.total >= data.shown && data.shown === data.results.length);
  assert.deepEqual(Object.keys(data.results[0]), ['id', 'area', 'title', 'cost']);
});

test('even a wide query stays under 1 KB: lines are dropped, never the limit of bytes', () => {
  for (const args of [['find', '--area', 'psychology', '--limit', '40'], ['find', 'a', 'b', 'c', '--limit', '99'], ['find', '--area', 'imagery', '--limit', '99', '--json']]) {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(bytes(result.stdout) < 1024, `${args.join(' ')}: ${bytes(result.stdout)} bytes`);
  }
});

test('find with no match says so and gives the next command; with nothing to search it is a usage error', () => {
  const none = run('find', 'zzzqqq');
  assert.equal(none.status, 0, none.stderr);
  assert.match(none.stdout, /No matches/);
  const empty = run('find');
  assert.equal(empty.status, 2);
  assert.match(empty.stderr, /find needs a query, --area or --direction/);
});

// ---------------------------------------------------------------- get

test('get prints one card: title, when, steps, check, fallback, and stays under 1 KB for all of them', () => {
  const one = run('get', 'bento-grid');
  assert.equal(one.status, 0, one.stderr);
  assert.match(one.stdout, /^bento-grid\b/);
  for (const word of ['when:', 'not:', 'check:', 'fallback:']) assert.ok(one.stdout.includes(word), word);
  assert.match(one.stdout, /\n1\. /);
  for (const card of DATA.cards) {
    const text = T.renderCard(card);
    assert.ok(bytes(text) < 1024, `${card.id}: ${bytes(text)} bytes`);
  }
});

test('get --json is the card itself, and an unknown id suggests the closest ones and exits 1', () => {
  const json = run('get', 'bento-grid', '--json');
  assert.equal(json.status, 0, json.stderr);
  assert.deepEqual(JSON.parse(json.stdout), DATA.cards.find((card) => card.id === 'bento-grid'));
  const miss = run('get', 'bento');
  assert.equal(miss.status, 1);
  assert.match(miss.stderr, /no card "bento"/);
  assert.match(miss.stderr, /bento-grid/);
  assert.equal(run('get').status, 2);
});

// ---------------------------------------------------------------- the digest

test('the digest is one page, names every card and is the file the tool generates (never drifts)', () => {
  const text = T.renderDigest(DATA);
  const lines = text.trimEnd().split('\n');
  assert.ok(lines.length <= 50, `${lines.length} lines`);
  assert.ok(bytes(text) <= 6000, `${bytes(text)} bytes`);
  for (const card of DATA.cards) assert.ok(text.includes(card.id), `the digest misses ${card.id}`);
  assert.ok(text.includes('ai-frontend-guide-kit/tools/technique.mjs find'));
  const file = join(KIT, 'experience', 'TECHNIQUES.md');
  assert.ok(existsSync(file), 'experience/TECHNIQUES.md is missing: run node tools/build-kit.mjs');
  assert.equal(read('ai-frontend-guide-kit', 'experience', 'TECHNIQUES.md'), text, 'the digest is stale: run node tools/build-kit.mjs');
  assert.equal(run('digest').stdout, text);
});

// ---------------------------------------------------------------- direction sets

test('directionCards proposes at most 5 cards of that direction, from different areas, cheapest first', () => {
  const set = T.directionCards(DATA, 'editorial', 5);
  assert.ok(set.length >= 3 && set.length <= 5, `${set.length}`);
  for (const card of set) assert.ok(card.directions.includes('editorial'), card.id);
  assert.ok(new Set(set.map((card) => card.area)).size >= 3, 'cards come from several areas');
  assert.ok(set.every((card) => card.kind !== 'external'), 'external cards are not proposed as the set');
  assert.deepEqual(T.directionCards(DATA, 'editorial', 5).map((card) => card.id), set.map((card) => card.id), 'deterministic');
  assert.deepEqual(T.directionCards(DATA, 'no-such-direction', 5), []);
});

test('resolveDirections reads the chosen direction from the brief, then from the memory, in the tool', () => {
  const known = new Set(['editorial', 'swiss', 'dark-technical']);
  const brief = (id, style = 'warm') => `## Recommended direction\nid: ${id} · rationale: fits\n## Visual brief\nstyle: ${style} · palette intent: x\n`;
  assert.deepEqual(T.resolveDirections(brief('editorial'), '', known), ['editorial']);
  assert.deepEqual(T.resolveDirections(brief('exp-style-swiss'), '', known), ['swiss']);
  assert.deepEqual(T.resolveDirections(brief('market', 'dark technical with swiss grid'), '', known), ['dark-technical', 'swiss']);
  assert.deepEqual(T.resolveDirections('', '{"ref":"direction:editorial"}\n', known), ['editorial']);
  assert.deepEqual(T.resolveDirections(brief('market'), '', known), []);
  assert.deepEqual(T.resolveDirections('', '', known), []);
});

// ---------------------------------------------------------------- one skill per area

test('every area has a short skill that names its find command, and svg reuses svg-craft', () => {
  for (const area of AREA_SKILLS) {
    const file = join(ROOT, 'skills', `technique-${area}`, 'SKILL.md');
    assert.ok(existsSync(file), `skills/technique-${area}/SKILL.md is missing`);
    const text = read('skills', `technique-${area}`, 'SKILL.md');
    assert.ok(text.trimEnd().split('\n').length < 40, `technique-${area} has ${text.trimEnd().split('\n').length} lines`);
    assert.match(text, new RegExp(`^---\\nname: technique-${area}\\ndescription: .{40,}\\n---\\n`));
    assert.ok(text.includes(`technique.mjs find --area ${area}`) || text.includes(`technique.mjs find "<need>" --area ${area}`), `${area}: find command`);
    assert.ok(text.includes('technique.mjs get <id>'), `${area}: get command`);
    const keyLine = text.split('\n').find((line) => line.startsWith('Key cards:'));
    assert.ok(keyLine, `${area}: a "Key cards:" line`);
    const ids = [...keyLine.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    assert.ok(ids.length >= 3, `${area}: at least 3 key cards`);
    for (const id of ids) assert.equal(DATA.cards.find((card) => card.id === id)?.area, area, `${area}: ${id} is a card of the area`);
  }
  assert.ok(!existsSync(join(ROOT, 'skills', 'technique-svg')), 'svg is served by svg-craft, not duplicated');
  assert.match(read('skills', 'svg-craft', 'SKILL.md'), /technique\.mjs find --area svg/);
});

test('each skill is loaded only at its step: the step files point at it', () => {
  const at = (step) => read('skills', 'ai-frontend-guide', 'steps', `${step}.md`);
  assert.match(at('tokens'), /technique-type/);
  assert.match(at('tokens'), /technique-color/);
  assert.match(at('compose'), /technique-layout/);
  assert.match(at('compose'), /technique-motion/);
  assert.match(at('compose'), /technique-imagery/);
  assert.match(at('compose'), /technique-3d/);
  assert.match(at('polish'), /technique-psychology/);
});

test('build-kit requires the new skills and the digest', () => {
  for (const area of AREA_SKILLS) assert.ok(REQUIRED_REPO_FILES.includes(`skills/technique-${area}/SKILL.md`), area);
  assert.ok(REQUIRED_KIT_FILES.includes('experience/TECHNIQUES.md'));
});

test('the tool still checks the file as before', () => {
  const result = run('check');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /technique: 133 cards in 11 areas, 0 problems/);
  assert.equal(run('nope').status, 2);
});
