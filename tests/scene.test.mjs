import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildTokens } from '../ai-frontend-guide-kit/tools/tokens.mjs';
import { PARTS } from '../ai-frontend-guide-kit/tools/flow-steps.mjs';
import { REQUIRED_KIT_FILES, REQUIRED_REPO_FILES } from '../tools/build-kit.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KIT = join(ROOT, 'ai-frontend-guide-kit');
const TOOL = join(KIT, 'tools', 'scene.mjs');
const SVG = join(KIT, 'tools', 'svg.mjs');

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};
const scene = (dir, ...args) => spawnSync(process.execPath, [TOOL, ...args, '--dir', dir], { encoding: 'utf8', env: cleanEnv() });
const project = (tokens = true) => {
  const dir = mkdtempSync(join(tmpdir(), 'scene-'));
  if (tokens) writeFileSync(join(dir, 'design-tokens.json'), JSON.stringify(buildTokens({ primary: '#2563eb' })));
  return dir;
};

const GOOD = `# Scene spec

## Purpose
Show the product as one calm object above the fold, so the visitor sees what it is in a second.

## Subject
- object: a rounded cube with a soft bevel
- style: soft clay

## Camera
- type: perspective
- fov: 40
- position: 0, 1.2, 5
- target: 0, 0, 0

## Light
- ambient: intensity 0.5
- key: directional, intensity 2.5
- key-position: 3, 4, 5

## Materials
- body: token=primary, roughness=0.4, metalness=0.1
- base: token=neutral-200, roughness=0.9, metalness=0

## Motion
- idle: slow rotation, 0.2 rad per second
- reduced-motion: one still frame, no rotation

## Interaction
- input: none

## Performance budget
- triangles: 20000
- textures: 1
- draw-calls: 10
- target-fps: 60
- max-kb: 400

## Fallback
- image: public/scene-poster.webp
- when: no WebGL, reduced data or the scene has not loaded yet

## Accessibility
- label: A blue rounded cube, decorative

## Output
- mode: code
`;

const write = (dir, text, name = 'SCENE-SPEC.md') => {
  writeFileSync(join(dir, name), text);
  return name;
};
const check = (dir, text) => {
  write(dir, text);
  const run = scene(dir, 'check', 'SCENE-SPEC.md', '--json');
  return { run, data: JSON.parse(run.stdout) };
};
const ids = (data) => data.findings.map((finding) => finding.id);

// ---------------------------------------------------------------- init

test('init writes the skeleton with every section and refuses to overwrite it', () => {
  const dir = project();
  const out = join(dir, 'spec', 'SCENE-SPEC.md');
  const run = scene(dir, 'init', '--out', out);
  assert.equal(run.status, 0, run.stderr);
  const text = readFileSync(out, 'utf8');
  for (const heading of ['Purpose', 'Subject', 'Camera', 'Light', 'Materials', 'Motion', 'Interaction', 'Performance budget', 'Fallback', 'Accessibility', 'Output']) {
    assert.ok(text.includes(`## ${heading}`), heading);
  }
  for (const key of ['triangles', 'textures', 'draw-calls', 'target-fps', 'max-kb', 'reduced-motion']) assert.ok(text.includes(`${key}:`), key);
  assert.match(run.stdout, /scene\.mjs check/);
  const again = scene(dir, 'init', '--out', out);
  assert.equal(again.status, 1);
  assert.match(again.stderr, /already exists/);
  assert.equal(scene(dir, 'init', '--out', out, '--force').status, 0);
});

test('init without --out writes ai-frontend-output/SCENE-SPEC.md in the project', () => {
  const dir = project();
  assert.equal(scene(dir, 'init').status, 0);
  assert.ok(existsSync(join(dir, 'ai-frontend-output', 'SCENE-SPEC.md')));
});

// ---------------------------------------------------------------- check

test('check on the empty skeleton lists numbered findings and exits 1', () => {
  const dir = project();
  scene(dir, 'init', '--out', join(dir, 'SCENE-SPEC.md'));
  const run = scene(dir, 'check', 'SCENE-SPEC.md');
  assert.equal(run.status, 1);
  assert.match(run.stdout, /^1\. \[high\] /m);
  assert.match(run.stdout, /placeholder/);
  const json = JSON.parse(scene(dir, 'check', 'SCENE-SPEC.md', '--json').stdout);
  assert.ok(json.counts.high > 5);
  assert.deepEqual(json.findings.map((f) => f.n), json.findings.map((_, i) => i + 1));
});

test('check passes a complete spec whose materials are real tokens (exit 0)', () => {
  const dir = project();
  const { run, data } = check(dir, GOOD);
  assert.equal(run.status, 0, run.stdout);
  assert.equal(data.counts.high, 0);
  assert.equal(data.tokens, true);
});

test('check names a material token that is not in design-tokens.json', () => {
  const dir = project();
  const { run, data } = check(dir, GOOD.replace('token=primary', 'token=hot-pink'));
  assert.equal(run.status, 1);
  const hit = data.findings.find((f) => f.id === 'material-token');
  assert.ok(hit && hit.severity === 'high');
  assert.match(hit.what, /hot-pink/);
});

test('check accepts the token spellings the project uses (color.primary, --color-primary, primary-500)', () => {
  const dir = project();
  for (const name of ['color.primary', '--color-primary', 'primary-500', 'ramp.primary.500']) {
    const { run } = check(dir, GOOD.replace('token=primary', `token=${name}`));
    assert.equal(run.status, 0, `${name}: ${run.stdout}`);
  }
});

test('check finds a missing budget number, a missing fallback and a missing reduced-motion statement', () => {
  const dir = project();
  const noBudget = check(dir, GOOD.replace('- triangles: 20000\n', '').replace('- max-kb: 400\n', ''));
  assert.deepEqual(ids(noBudget.data).filter((id) => id === 'budget').length, 2);
  assert.equal(noBudget.run.status, 1);
  const noFallback = check(dir, GOOD.replace(/## Fallback[\s\S]*?(?=## Accessibility)/, ''));
  assert.ok(ids(noFallback.data).includes('section-missing'));
  assert.match(noFallback.data.findings.find((f) => f.id === 'section-missing').what, /Fallback/);
  const emptyImage = check(dir, GOOD.replace('- image: public/scene-poster.webp', '- image:'));
  assert.ok(ids(emptyImage.data).includes('fallback'));
  const noReduced = check(dir, GOOD.replace('- reduced-motion: one still frame, no rotation\n', ''));
  assert.ok(ids(noReduced.data).includes('reduced-motion'));
  assert.equal(noReduced.run.status, 1);
});

test('check flags a budget that is a number but too heavy, as medium (exit 0 unless --strict)', () => {
  const dir = project();
  const heavy = GOOD.replace('- triangles: 20000', '- triangles: 900000');
  const { run, data } = check(dir, heavy);
  assert.equal(run.status, 0);
  const hit = data.findings.find((f) => f.id === 'budget-heavy');
  assert.equal(hit.severity, 'medium');
  assert.equal(scene(dir, 'check', 'SCENE-SPEC.md', '--strict').status, 1);
});

test('without design-tokens.json the token check is skipped and said so', () => {
  const dir = project(false);
  const { run, data } = check(dir, GOOD);
  assert.equal(run.status, 0, run.stdout);
  assert.equal(data.tokens, false);
  assert.match(data.skipped.join(' '), /design-tokens\.json/);
});

test('check on a missing file or no argument is a usage error (2) or a refusal that says what to do', () => {
  const dir = project();
  const missing = scene(dir, 'check', 'nope.md');
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /does not exist/);
  assert.match(missing.stderr, /scene\.mjs init/);
});

// ---------------------------------------------------------------- prompt

test('prompt is deterministic and carries the colors, budget and fallback of the spec', () => {
  const dir = project();
  write(dir, GOOD);
  const a = scene(dir, 'prompt', 'SCENE-SPEC.md');
  const b = scene(dir, 'prompt', 'SCENE-SPEC.md');
  assert.equal(a.status, 0, a.stderr);
  assert.equal(a.stdout, b.stdout);
  assert.match(a.stdout, /#2563eb/i);
  assert.match(a.stdout, /rounded cube/);
  assert.match(a.stdout, /20000 triangles/);
  assert.match(a.stdout, /glb/i);
  assert.ok(!/<[^>\n]+>/.test(a.stdout.replace(/<\/?[a-z]+>/g, '')), 'no placeholder left');
});

test('prompt and code refuse a spec with a high finding and point to check', () => {
  const dir = project();
  scene(dir, 'init', '--out', join(dir, 'SCENE-SPEC.md'));
  for (const command of ['prompt', 'code']) {
    const run = scene(dir, command, 'SCENE-SPEC.md');
    assert.equal(run.status, 1, command);
    assert.equal(run.stdout, '');
    assert.match(run.stderr, /scene\.mjs check/);
  }
});

// ---------------------------------------------------------------- code

test('code is deterministic and keeps the fallback, reduced motion, pixel ratio cap, lazy load and dispose', () => {
  const dir = project();
  write(dir, GOOD);
  const a = scene(dir, 'code', 'SCENE-SPEC.md');
  const b = scene(dir, 'code', 'SCENE-SPEC.md');
  assert.equal(a.status, 0, a.stderr);
  assert.equal(a.stdout, b.stdout);
  const code = a.stdout;
  assert.match(code, /public\/scene-poster\.webp/);
  assert.match(code, /prefers-reduced-motion: reduce/);
  assert.match(code, /Math\.min\(window\.devicePixelRatio, 2\)/);
  assert.match(code, /await import\('three'\)/);
  assert.match(code, /\.dispose\(\)/);
  assert.match(code, /cancelAnimationFrame/);
  assert.match(code, /0x2563eb/i);
  assert.match(code, /PerspectiveCamera\(40/);
  assert.match(code, /TARGET_FPS = 60/);
  assert.match(code, /MAX_TRIANGLES = 20000/);
  assert.match(code, /three@0\.187\.0|"three": "0\.187\.0"/);
});

test('the output is not written anywhere by prompt or code (stdout only, --out writes a file)', () => {
  const dir = project();
  write(dir, GOOD);
  const out = join(dir, 'scene.js');
  const run = scene(dir, 'code', 'SCENE-SPEC.md', '--out', out);
  assert.equal(run.status, 0, run.stderr);
  assert.match(readFileSync(out, 'utf8'), /export async function mountScene/);
});

// ---------------------------------------------------------------- wiring and existing commands

test('compose build names scene.mjs only when the brief, inventory or spec mention 3D', () => {
  const adapt = PARTS.compose.find((part) => part.id === 'adapt');
  const env = (wants3d) => ({ run: (tool, args) => `node kit/tools/${tool} ${args}`, kit: (path) => `kit/${path}`, skill: (name) => name === 'scene-3d', dep: () => false, mcp: () => false, laya: false, techniques: () => ({ directions: [], ids: [] }), wants3d });
  const without = adapt.build(env(false)).steps.filter(Boolean).join('\n');
  const withIt = adapt.build(env(true)).steps.filter(Boolean).join('\n');
  assert.ok(!without.includes('scene.mjs'), 'no 3D line without 3D');
  assert.match(withIt, /node kit\/tools\/scene\.mjs init/);
  assert.match(withIt, /skill scene-3d/);
  assert.ok(without.includes('svg.mjs gen'), 'the svg line is unchanged');
});

test('build-kit requires the tool and the skill, and the skill stays short and points to the tool', () => {
  assert.ok(REQUIRED_KIT_FILES.includes('tools/scene.mjs'));
  assert.ok(REQUIRED_REPO_FILES.includes('skills/scene-3d/SKILL.md'));
  const skill = readFileSync(join(ROOT, 'skills', 'scene-3d', 'SKILL.md'), 'utf8');
  assert.ok(skill.split('\n').length <= 60, `${skill.split('\n').length} lines`);
  assert.match(skill, /^name: scene-3d$/m);
  for (const word of ['SCENE-SPEC.md', 'scene.mjs check', 'prefers-reduced-motion', 'dispose']) assert.ok(skill.includes(word), word);
  assert.match(readFileSync(join(ROOT, 'skills', 'technique-3d', 'SKILL.md'), 'utf8'), /scene-3d/);
  for (const file of ['INDEX.md', 'HELP.md', 'HELP.es.md']) assert.match(readFileSync(join(KIT, file), 'utf8'), /scene\.mjs/, file);
});

test('svg.mjs keeps its behavior: same bytes for gen, same usage error for an unknown kind', () => {
  const dir = project();
  const a = spawnSync(process.execPath, [SVG, 'gen', 'wave', '--dir', dir, '--seed', '3'], { encoding: 'utf8', env: cleanEnv() });
  const b = spawnSync(process.execPath, [SVG, 'gen', 'wave', '--dir', dir, '--seed', '3'], { encoding: 'utf8', env: cleanEnv() });
  assert.equal(a.status, 0);
  assert.equal(a.stdout, b.stdout);
  assert.match(a.stdout, /^<svg /);
  assert.equal(spawnSync(process.execPath, [SVG, 'gen', 'nope', '--dir', dir], { encoding: 'utf8', env: cleanEnv() }).status, 2);
});
