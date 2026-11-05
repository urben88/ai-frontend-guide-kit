import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'pieces.mjs');

// Every test gets its own library and project under the system temp dir; the real home library is never touched.
const baseEnv = (extra = {}) => {
  const env = { ...process.env, ...extra };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  delete env.AI_FRONTEND_PIECES;
  delete env.AI_FRONTEND_PIECES_NO_SQLITE;
  return { ...env, ...extra };
};
const sandbox = () => {
  const base = mkdtempSync(join(tmpdir(), 'pieces-'));
  const lib = join(base, 'lib');
  const project = join(base, 'project');
  mkdirSync(project, { recursive: true });
  const src = join(base, 'src');
  mkdirSync(src, { recursive: true });
  const write = (name, text) => {
    const path = join(src, name);
    writeFileSync(path, text, 'utf8');
    return path;
  };
  const env = baseEnv({ AI_FRONTEND_PIECES: lib });
  const run = (...args) => spawnSync(process.execPath, [TOOL, ...args, '--dir', project], { encoding: 'utf8', env });
  return { base, lib, project, write, env, run };
};
const history = (lib) => {
  const path = join(lib, 'history.jsonl');
  return existsSync(path) ? readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [];
};
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const projectState = (project) => readJson(join(project, 'ai-frontend-output', 'pieces.json'));

const BANNER = `// Hero banner
export function HeroBanner({ title, tone = 'calm' }) {
  return <section className={\`hero hero-\${tone}\`}><h1>{title}</h1></section>;
}
`;
// Same structure as BANNER with other names, strings and comments.
const BANNER_RENAMED = `/* Another banner */
export function TopStripe({ heading, mood = 'loud' }) {
  return <section className={\`strip strip-\${mood}\`}><h1>{heading}</h1></section>;
}
`;
const BADGE = `export const Badge = ({ label }) => (
  <span className="badge">{label}</span>
);
`;

test('add creates piece.json, the versioned source file and a history entry (S1, S4)', () => {
  const s = sandbox();
  const run = s.run('add', 'hero-banner', '--level', 'large', '--file', s.write('Hero.tsx', BANNER), '--summary', 'Full width hero', '--variants', 'calm,loud', '--contexts', 'landing,wide', '--composed-of', 'badge,button', '--license', 'MIT');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /added "hero-banner" \(large\) v1/);
  const piece = readJson(join(s.lib, 'hero-banner', 'piece.json'));
  assert.equal(piece.name, 'hero-banner');
  assert.equal(piece.level, 'large');
  assert.equal(piece.summary, 'Full width hero');
  assert.deepEqual(piece.variants, ['calm', 'loud']);
  assert.deepEqual(piece.contexts, ['landing', 'wide']);
  assert.deepEqual(piece.composedOf, ['badge', 'button']);
  assert.equal(piece.license, 'MIT');
  assert.equal(piece.latest, 1);
  assert.equal(readFileSync(join(s.lib, 'hero-banner', 'v1.tsx'), 'utf8'), BANNER);
  const events = history(s.lib);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'add');
  assert.equal(events[0].piece, 'hero-banner');
  assert.equal(events[0].version, 1);
  assert.equal(events[0].project, s.project);
  assert.ok(Date.parse(events[0].ts) > 0);
});

test('add rejects bad input without writing anything', () => {
  const s = sandbox();
  const file = s.write('Hero.tsx', BANNER);
  const badLevel = s.run('add', 'hero-banner', '--level', 'huge', '--file', file);
  assert.equal(badLevel.status, 2);
  assert.match(badLevel.stderr, /level/);
  const noFile = s.run('add', 'hero-banner', '--level', 'large');
  assert.equal(noFile.status, 2);
  assert.match(noFile.stderr, /--file/);
  const badName = s.run('add', 'Hero Banner', '--level', 'large', '--file', file);
  assert.equal(badName.status, 2);
  assert.match(badName.stderr, /kebab/);
  const missing = s.run('add', 'hero-banner', '--level', 'large', '--file', join(s.base, 'nope.tsx'));
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /not found/);
  assert.equal(existsSync(s.lib) ? readdirSync(s.lib).length : 0, 0);
  assert.equal(s.run('add', 'hero-banner', '--level', 'large', '--file', file).status, 0);
  const again = s.run('add', 'hero-banner', '--level', 'large', '--file', file);
  assert.equal(again.status, 1);
  assert.match(again.stderr, /already exists.*version/);
});

test('unknown options and commands are errors (exit 2) and --help prints the usage', () => {
  const s = sandbox();
  const unknown = s.run('list', '--bogus');
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /unknown option "--bogus"/);
  const noValue = s.run('add', 'x', '--level');
  assert.equal(noValue.status, 2);
  assert.match(noValue.stderr, /needs a value/);
  const command = s.run('frobnicate');
  assert.equal(command.status, 2);
  assert.match(command.stderr, /unknown command "frobnicate"/);
  const help = s.run('--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
  assert.match(help.stdout, /pieces\.mjs add/);
});

test('version stores a new version, and identical content is never stored twice (S7)', () => {
  const s = sandbox();
  s.run('add', 'hero-banner', '--level', 'large', '--file', s.write('Hero.tsx', BANNER));
  const changed = BANNER.replace('calm', 'serene');
  const v2 = s.run('version', 'hero-banner', '--file', s.write('Hero2.tsx', changed), '--note', 'more air');
  assert.equal(v2.status, 0, v2.stderr);
  assert.match(v2.stdout, /"hero-banner" v2 saved/);
  assert.equal(readFileSync(join(s.lib, 'hero-banner', 'v2.tsx'), 'utf8'), changed);
  const piece = readJson(join(s.lib, 'hero-banner', 'piece.json'));
  assert.equal(piece.latest, 2);
  assert.equal(piece.versions[1].note, 'more air');
  assert.equal(piece.versions[1].sha256, createHash('sha256').update(changed).digest('hex'));
  const before = history(s.lib).length;
  const same = s.run('version', 'hero-banner', '--file', s.write('Hero3.tsx', changed.replace(/\n/g, '\r\n')), '--note', 'again');
  assert.equal(same.status, 0, same.stderr);
  assert.match(same.stdout, /unchanged: identical to v2/);
  assert.equal(existsSync(join(s.lib, 'hero-banner', 'v3.tsx')), false);
  assert.equal(readJson(join(s.lib, 'hero-banner', 'piece.json')).latest, 2);
  assert.equal(history(s.lib).length, before);
  // an old version also counts as identical
  const old = s.run('version', 'hero-banner', '--file', s.write('Hero4.tsx', BANNER));
  assert.match(old.stdout, /identical to v1/);
  const missing = s.run('version', 'ghost', '--file', s.write('G.tsx', BADGE));
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /no piece "ghost"/);
});

test('version can add a variant without new code (polish becomes a variant, not a new piece)', () => {
  const s = sandbox();
  s.run('add', 'badge', '--level', 'micro', '--file', s.write('Badge.tsx', BADGE), '--variants', 'solid');
  const run = s.run('version', 'badge', '--file', s.write('Badge2.tsx', BADGE), '--variants', 'outline');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /identical to v1/);
  assert.deepEqual(readJson(join(s.lib, 'badge', 'piece.json')).variants, ['solid', 'outline']);
});

test('each version stores a sha256 and a structural hash that ignores names, strings, comments and whitespace (S7)', () => {
  const s = sandbox();
  s.run('add', 'hero-banner', '--level', 'large', '--file', s.write('Hero.tsx', BANNER));
  s.run('add', 'top-stripe', '--level', 'large', '--file', s.write('Stripe.tsx', BANNER_RENAMED));
  s.run('add', 'badge', '--level', 'micro', '--file', s.write('Badge.tsx', BADGE));
  const a = readJson(join(s.lib, 'hero-banner', 'piece.json')).versions[0];
  const b = readJson(join(s.lib, 'top-stripe', 'piece.json')).versions[0];
  const c = readJson(join(s.lib, 'badge', 'piece.json')).versions[0];
  assert.equal(a.sha256, createHash('sha256').update(BANNER).digest('hex'));
  assert.notEqual(a.sha256, b.sha256);
  assert.equal(a.structural, b.structural);
  assert.notEqual(a.structural, c.structural);
  assert.match(a.structural, /^[0-9a-f]{64}$/);
});

test('use records the choice in the project and in the library history (S2, S4)', () => {
  const s = sandbox();
  s.run('add', 'hero-banner', '--level', 'large', '--file', s.write('Hero.tsx', BANNER), '--variants', 'calm,loud');
  s.run('version', 'hero-banner', '--file', s.write('Hero2.tsx', BANNER.replace('calm', 'serene')));
  const latest = s.run('use', 'hero-banner', '--variant', 'loud');
  assert.equal(latest.status, 0, latest.stderr);
  assert.match(latest.stdout, /using "hero-banner" v2/);
  const state = projectState(s.project);
  assert.equal(state.pieces['hero-banner'].version, 2);
  assert.equal(state.pieces['hero-banner'].variant, 'loud');
  const pinned = s.run('use', 'hero-banner', '--version', '1');
  assert.equal(pinned.status, 0, pinned.stderr);
  assert.equal(projectState(s.project).pieces['hero-banner'].version, 1);
  const uses = history(s.lib).filter((event) => event.type === 'use');
  assert.equal(uses.length, 2);
  assert.equal(uses[0].variant, 'loud');
  assert.equal(uses[0].project, s.project);
  assert.equal(uses[1].version, 1);
  const badVariant = s.run('use', 'hero-banner', '--variant', 'neon');
  assert.equal(badVariant.status, 1);
  assert.match(badVariant.stderr, /variant "neon".*calm, loud/);
  const badVersion = s.run('use', 'hero-banner', '--version', '9');
  assert.equal(badVersion.status, 1);
  assert.match(badVersion.stderr, /no version 9/);
  assert.equal(history(s.lib).filter((event) => event.type === 'use').length, 2);
  // the library holds no project settings; the project holds no library files
  assert.equal(existsSync(join(s.project, 'hero-banner')), false);
});

test('like, dislike and note append to the history; show prints the latest state first (S1, S4)', () => {
  const s = sandbox();
  s.run('add', 'hero-banner', '--level', 'large', '--file', s.write('Hero.tsx', BANNER), '--summary', 'Full width hero');
  assert.equal(s.run('like', 'hero-banner', '--note', 'love the spacing').status, 0);
  assert.equal(s.run('like', 'hero-banner').status, 0);
  assert.equal(s.run('dislike', 'hero-banner', '--version', '1', '--note', 'too tall').status, 0);
  const note = s.run('note', 'hero-banner', 'use only on landing pages');
  assert.equal(note.status, 0, note.stderr);
  const types = history(s.lib).map((event) => event.type);
  assert.deepEqual(types, ['add', 'like', 'like', 'dislike', 'note']);
  assert.equal(history(s.lib)[1].note, 'love the spacing');
  assert.equal(history(s.lib)[3].version, 1);
  assert.equal(history(s.lib)[4].note, 'use only on landing pages');
  const show = s.run('show', 'hero-banner');
  assert.equal(show.status, 0, show.stderr);
  assert.ok(show.stdout.indexOf('latest v1') < show.stdout.indexOf('History'), 'state before history');
  assert.match(show.stdout, /Full width hero/);
  assert.match(show.stdout, /likes 2.*dislikes 1/);
  assert.ok(show.stdout.indexOf('use only on landing pages') < show.stdout.indexOf('love the spacing'), 'newest history first');
  const json = JSON.parse(s.run('show', 'hero-banner', '--json').stdout);
  assert.equal(json.piece.latest, 1);
  assert.equal(json.stats.likes, 2);
  assert.equal(json.history.length, 5);
  assert.equal(s.run('like', 'ghost').status, 1);
  assert.equal(s.run('show', 'ghost').status, 1);
});

test('list prints a compact view, filters by level and supports --json (S1)', () => {
  const s = sandbox();
  s.run('add', 'hero-banner', '--level', 'large', '--file', s.write('Hero.tsx', BANNER), '--summary', 'Full width hero');
  s.run('add', 'badge', '--level', 'micro', '--file', s.write('Badge.tsx', BADGE), '--summary', 'Small label');
  const all = s.run('list');
  assert.equal(all.status, 0, all.stderr);
  assert.match(all.stdout, /badge .*micro.*v1.*Small label/);
  assert.match(all.stdout, /hero-banner .*large.*v1.*Full width hero/);
  const micro = JSON.parse(s.run('list', '--level', 'micro', '--json').stdout);
  assert.deepEqual(micro.pieces.map((p) => p.name), ['badge']);
  assert.equal(s.run('list', '--level', 'huge').status, 2);
  const empty = sandbox().run('list');
  assert.equal(empty.status, 0);
  assert.match(empty.stdout, /no pieces/);
});

test('personality set and show keep the project settings in pieces.json (S2)', () => {
  const s = sandbox();
  const set = s.run('personality', 'set', 'spacing', 'airy');
  assert.equal(set.status, 0, set.stderr);
  assert.equal(s.run('personality', 'set', 'image-weight', 'heavy').status, 0);
  assert.deepEqual(projectState(s.project).settings, { spacing: 'airy', 'image-weight': 'heavy' });
  const show = s.run('personality', 'show');
  assert.match(show.stdout, /spacing: airy/);
  assert.deepEqual(JSON.parse(s.run('personality', 'show', '--json').stdout).settings, { spacing: 'airy', 'image-weight': 'heavy' });
  assert.equal(s.run('personality', 'set', 'spacing').status, 2);
  assert.equal(s.run('personality').status, 2);
});

test('the library defaults to ~/.ai-frontend-guide-kit/pieces and --lib overrides the environment (S2)', () => {
  const s = sandbox();
  const home = join(s.base, 'home');
  mkdirSync(home);
  const env = baseEnv({ HOME: home, USERPROFILE: home });
  const file = s.write('Badge.tsx', BADGE);
  const run = spawnSync(process.execPath, [TOOL, 'add', 'badge', '--level', 'micro', '--file', file, '--dir', s.project], { encoding: 'utf8', env });
  assert.equal(run.status, 0, run.stderr);
  assert.ok(existsSync(join(home, '.ai-frontend-guide-kit', 'pieces', 'badge', 'piece.json')));
  const flagLib = join(s.base, 'flag-lib');
  const viaFlag = spawnSync(process.execPath, [TOOL, 'add', 'badge', '--level', 'micro', '--file', file, '--lib', flagLib, '--dir', s.project], { encoding: 'utf8', env: baseEnv({ AI_FRONTEND_PIECES: join(s.base, 'env-lib') }) });
  assert.equal(viaFlag.status, 0, viaFlag.stderr);
  assert.ok(existsSync(join(flagLib, 'badge', 'piece.json')));
  assert.equal(existsSync(join(s.base, 'env-lib')), false);
});

test('AI_FRONTEND_OUTPUT moves the project file', () => {
  const s = sandbox();
  s.run('add', 'badge', '--level', 'micro', '--file', s.write('Badge.tsx', BADGE));
  const out = join(s.base, 'custom-out');
  const env = { ...s.env, AI_FRONTEND_OUTPUT: out };
  const run = spawnSync(process.execPath, [TOOL, 'use', 'badge', '--dir', s.project], { encoding: 'utf8', env });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(readJson(join(out, 'pieces.json')).pieces.badge.version, 1);
  assert.equal(existsSync(join(s.project, 'ai-frontend-output')), false);
});

test('concurrent writers keep history.jsonl one valid JSON per line (append-only)', async () => {
  const s = sandbox();
  s.run('add', 'badge', '--level', 'micro', '--file', s.write('Badge.tsx', BADGE));
  const jobs = Array.from({ length: 8 }, (_, i) => new Promise((resolveJob) => {
    const child = spawn(process.execPath, [TOOL, 'like', 'badge', '--note', `n${i}`, '--dir', s.project], { env: s.env });
    child.on('close', resolveJob);
  }));
  const codes = await Promise.all(jobs);
  assert.deepEqual(codes, Array(8).fill(0));
  const events = history(s.lib);
  assert.equal(events.filter((event) => event.type === 'like').length, 8);
  assert.deepEqual(new Set(events.filter((event) => event.type === 'like').map((event) => event.note)).size, 8);
});
