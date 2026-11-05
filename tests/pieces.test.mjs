import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'pieces.mjs');
const GET = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'get.mjs');

// Every test builds its own projects and global index under the system temp dir; the real home is never touched.
const baseEnv = (extra = {}) => {
  const env = { ...process.env };
  for (const key of ['AI_FRONTEND_OUTPUT', 'AI_FRONTEND_PROJECT', 'AI_FRONTEND_PIECES', 'AI_FRONTEND_PIECES_NO_SQLITE']) delete env[key];
  return { ...env, ...extra };
};
const rel = (name) => `src/components/${name}`;

/** A project with a src/components folder. raw runs a command as given; run seeds `add` past the reuse guard. */
function makeProject(base, name, globalDir, extraEnv = {}) {
  const root = join(base, name);
  mkdirSync(join(root, 'src', 'components'), { recursive: true });
  const env = baseEnv({ AI_FRONTEND_PIECES: globalDir, ...extraEnv });
  const raw = (...args) => spawnSync(process.execPath, [TOOL, ...args, '--dir', root], { encoding: 'utf8', env });
  const run = (...args) => (args[0] === 'add' && !args.includes('--new') ? raw(...args, '--new', '--reason', 'test seed') : raw(...args));
  const write = (file, text) => {
    const path = join(root, 'src', 'components', file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text, 'utf8');
    return path;
  };
  return { root, name, env, raw, run, write, out: join(root, 'ai-frontend-output', 'pieces') };
}
const sandbox = () => {
  const base = mkdtempSync(join(tmpdir(), 'pieces-'));
  const global = join(base, 'global');
  const project = makeProject(base, 'project', global);
  const other = (name) => makeProject(base, name, global, project.env.AI_FRONTEND_PIECES_NO_SQLITE ? { AI_FRONTEND_PIECES_NO_SQLITE: '1' } : {});
  const outside = (file, text) => {
    const path = join(base, file);
    writeFileSync(path, text, 'utf8');
    return path;
  };
  return { base, global, ...project, other, outside };
};
const registry = (p) => (existsSync(join(p.out, 'pieces.json')) ? JSON.parse(readFileSync(join(p.out, 'pieces.json'), 'utf8')) : { pieces: {}, used: {}, settings: {}, finds: [] });
const history = (p) => (existsSync(join(p.out, 'history.jsonl')) ? readFileSync(join(p.out, 'history.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : []);
const sha = (text) => createHash('sha256').update(text).digest('hex');
const jsonOf = (run) => JSON.parse(run.stdout);

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
const SECRET = 'SECRET_COMPONENT_MARKER_9f3a';
const SECRET_FILE = `// ${SECRET}\nexport const Secret = () => <aside className="secret">${SECRET}</aside>;\n`;

const filesUnder = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)]));
};
const holdsMarker = (dir) => filesUnder(dir).filter((file) => readFileSync(file).includes(SECRET));

// ---------------------------------------------------------------- registry, versions, hashes (S1, S2, S4, S7)

test('add registers the project file and keeps only metadata (S1, S2)', () => {
  const s = sandbox();
  const file = s.write('Hero.tsx', BANNER);
  const run = s.run('add', 'hero-banner', '--level', 'large', '--file', file, '--summary', 'Full width hero', '--variants', 'calm,loud', '--contexts', 'landing,wide', '--composed-of', 'badge,button', '--license', 'MIT');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /added "hero-banner" \(large\) v1 — src\/components\/Hero\.tsx/);
  const piece = registry(s).pieces['hero-banner'];
  assert.equal(piece.name, 'hero-banner');
  assert.equal(piece.level, 'large');
  assert.equal(piece.summary, 'Full width hero');
  assert.deepEqual(piece.variants, ['calm', 'loud']);
  assert.deepEqual(piece.contexts, ['landing', 'wide']);
  assert.deepEqual(piece.composedOf, ['badge', 'button']);
  assert.equal(piece.license, 'MIT');
  assert.deepEqual(piece.files, [rel('Hero.tsx')]);
  assert.equal(piece.latest, 1);
  assert.equal(piece.versions[0].sha256, sha(BANNER));
  assert.equal(JSON.stringify(piece).includes('HeroBanner'), false, 'no source text in the registry');
  assert.equal(readFileSync(file, 'utf8'), BANNER, 'the project file is untouched');
  const events = history(s);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'add');
  assert.equal(events[0].piece, 'hero-banner');
  assert.equal(events[0].version, 1);
  assert.ok(Date.parse(events[0].ts) > 0);
});

test('the kit never stores component code: neither the project output nor the global index holds a copy (S2)', () => {
  const s = sandbox();
  const file = s.write('Secret.tsx', SECRET_FILE);
  assert.equal(s.run('add', 'secret-aside', '--level', 'small', '--file', file, '--summary', 'An aside').status, 0);
  writeFileSync(file, `${SECRET_FILE}export const More = 1;\n`);
  assert.equal(s.run('version', 'secret-aside', '--note', 'more').status, 0);
  assert.equal(s.run('use', 'secret-aside').status, 0);
  assert.equal(s.run('like', 'secret-aside').status, 0);
  assert.equal(s.run('index').status, 0);
  assert.equal(s.raw('find', 'aside').status, 0);
  assert.deepEqual(holdsMarker(s.out), []);
  assert.deepEqual(holdsMarker(s.global), []);
  assert.deepEqual(holdsMarker(join(s.root, 'ai-frontend-output')), []);
  assert.equal(holdsMarker(join(s.root, 'src')).length, 1, 'the code stays in the project component folder');
  const allowedOut = new Set(['pieces.json', 'history.jsonl', 'index.db']);
  for (const file of filesUnder(s.out)) assert.ok(allowedOut.has(file.slice(s.out.length + 1)), `unexpected file in the project output: ${file}`);
  const allowedGlobal = new Set(['index.db', 'projects.json']);
  for (const file of filesUnder(s.global)) assert.ok(allowedGlobal.has(file.slice(s.global.length + 1)), `unexpected file in the global dir: ${file}`);
});

test('add rejects bad input and a file outside the project without writing anything', () => {
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
  const missing = s.run('add', 'hero-banner', '--level', 'large', '--file', 'src/components/nope.tsx');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /not found/);
  const outside = s.run('add', 'hero-banner', '--level', 'large', '--file', s.outside('Elsewhere.tsx', BANNER));
  assert.equal(outside.status, 1);
  assert.match(outside.stderr, /outside the project.*never copies component code/);
  assert.equal(existsSync(join(s.out, 'pieces.json')), false);
  assert.equal(history(s).length, 0);
  assert.equal(s.run('add', 'hero-banner', '--level', 'large', '--file', file).status, 0);
  const again = s.run('add', 'hero-banner', '--level', 'large', '--file', file);
  assert.equal(again.status, 1);
  assert.match(again.stderr, /already exists.*version/);
  const twice = s.run('add', 'hero-two', '--level', 'large', '--file', file);
  assert.equal(twice.status, 1);
  assert.match(twice.stderr, /already registered as piece "hero-banner"/);
});

test('unknown options and commands are errors (exit 2) and --help prints the usage', () => {
  const s = sandbox();
  const unknown = s.run('list', '--bogus');
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /unknown option "--bogus"/);
  const oldOption = s.run('list', '--lib', 'x');
  assert.equal(oldOption.status, 2);
  const noValue = s.run('add', 'x', '--level');
  assert.equal(noValue.status, 2);
  assert.match(noValue.stderr, /needs a value/);
  const command = s.run('frobnicate');
  assert.equal(command.status, 2);
  assert.match(command.stderr, /unknown command "frobnicate"/);
  const help = s.run('--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
  assert.match(help.stdout, /never copies or stores component code/);
  assert.doesNotMatch(help.stdout, /central|shared library of code/i);
});

test('a version is the SHA-256 of the real file; an unchanged file adds none (S7)', () => {
  const s = sandbox();
  const file = s.write('Hero.tsx', BANNER);
  s.run('add', 'hero-banner', '--level', 'large', '--file', file);
  const changed = BANNER.replace('calm', 'serene');
  writeFileSync(file, changed);
  const v2 = s.run('version', 'hero-banner', '--note', 'more air');
  assert.equal(v2.status, 0, v2.stderr);
  assert.match(v2.stdout, /"hero-banner" v2 recorded/);
  const piece = registry(s).pieces['hero-banner'];
  assert.equal(piece.latest, 2);
  assert.equal(piece.versions[1].sha256, sha(changed));
  assert.equal(piece.versions[1].note, 'more air');
  assert.equal(history(s).at(-1).type, 'version');
  const before = history(s).length;
  writeFileSync(file, changed.replace(/\n/g, '\r\n'));
  const same = s.run('version', 'hero-banner', '--note', 'again');
  assert.equal(same.status, 0, same.stderr);
  assert.match(same.stdout, /unchanged: identical to v2/);
  assert.equal(registry(s).pieces['hero-banner'].latest, 2);
  assert.equal(history(s).length, before);
  // going back to an older state is a new state of the file, recorded as such
  writeFileSync(file, BANNER);
  const back = s.run('version', 'hero-banner');
  assert.match(back.stdout, /v3 recorded.*same content as v1/);
  assert.equal(registry(s).pieces['hero-banner'].versions[2].sameAs, 1);
  assert.equal(s.run('version', 'ghost').status, 1);
  assert.match(s.run('version', 'ghost').stderr, /no piece "ghost"/);
});

test('version records the git commit when the project is a repository (S7)', (t) => {
  const s = sandbox();
  const git = (...args) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: s.root, encoding: 'utf8' });
  if (git('init').status !== 0) return t.skip('git is not available');
  const file = s.write('Hero.tsx', BANNER);
  git('add', '-A');
  assert.equal(git('commit', '-m', 'first').status, 0);
  const head = git('rev-parse', 'HEAD').stdout.trim();
  s.run('add', 'hero-banner', '--level', 'large', '--file', file);
  assert.equal(registry(s).pieces['hero-banner'].versions[0].commit, head);
  assert.equal(registry(s).pieces['hero-banner'].versions[0].dirty, undefined);
  writeFileSync(file, BANNER.replace('calm', 'serene'));
  const run = s.run('version', 'hero-banner');
  assert.match(run.stdout, new RegExp(`commit ${head.slice(0, 8)}\\+uncommitted`));
  assert.equal(registry(s).pieces['hero-banner'].versions[1].commit, head);
  assert.equal(registry(s).pieces['hero-banner'].versions[1].dirty, true);
});

test('version can add a variant without new code (polish becomes a variant, not a new piece)', () => {
  const s = sandbox();
  s.run('add', 'badge', '--level', 'micro', '--file', s.write('Badge.tsx', BADGE), '--variants', 'solid');
  const run = s.run('version', 'badge', '--variants', 'outline');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /identical to v1/);
  assert.deepEqual(registry(s).pieces.badge.variants, ['solid', 'outline']);
});

test('each version stores a sha256 and a structural hash that ignores names, strings, comments and whitespace (S7)', () => {
  const s = sandbox();
  s.run('add', 'hero-banner', '--level', 'large', '--file', s.write('Hero.tsx', BANNER));
  s.run('add', 'top-stripe', '--level', 'large', '--file', s.write('Stripe.tsx', BANNER_RENAMED));
  s.run('add', 'badge', '--level', 'micro', '--file', s.write('Badge.tsx', BADGE));
  const { pieces } = registry(s);
  const a = pieces['hero-banner'].versions[0];
  const b = pieces['top-stripe'].versions[0];
  const c = pieces.badge.versions[0];
  assert.equal(a.sha256, sha(BANNER));
  assert.notEqual(a.sha256, b.sha256);
  assert.equal(a.structural, b.structural);
  assert.notEqual(a.structural, c.structural);
  assert.match(a.structural, /^[0-9a-f]{64}$/);
});

test('use records the choice in the project registry and the history (S2, S4)', () => {
  const s = sandbox();
  const file = s.write('Hero.tsx', BANNER);
  s.run('add', 'hero-banner', '--level', 'large', '--file', file, '--variants', 'calm,loud');
  writeFileSync(file, BANNER.replace('calm', 'serene'));
  s.run('version', 'hero-banner');
  const latest = s.run('use', 'hero-banner', '--variant', 'loud');
  assert.equal(latest.status, 0, latest.stderr);
  assert.match(latest.stdout, /using "hero-banner" v2/);
  assert.equal(registry(s).used['hero-banner'].version, 2);
  assert.equal(registry(s).used['hero-banner'].variant, 'loud');
  assert.equal(s.run('use', 'hero-banner', '--version', '1').status, 0);
  assert.equal(registry(s).used['hero-banner'].version, 1);
  const uses = history(s).filter((event) => event.type === 'use');
  assert.equal(uses.length, 2);
  assert.equal(uses[0].variant, 'loud');
  assert.equal(uses[1].version, 1);
  const badVariant = s.run('use', 'hero-banner', '--variant', 'neon');
  assert.equal(badVariant.status, 1);
  assert.match(badVariant.stderr, /variant "neon".*calm, loud/);
  const badVersion = s.run('use', 'hero-banner', '--version', '9');
  assert.equal(badVersion.status, 1);
  assert.match(badVersion.stderr, /no version 9/);
  assert.equal(history(s).filter((event) => event.type === 'use').length, 2);
});

test('like, dislike and note append to the history; show prints the latest state first (S1, S4)', () => {
  const s = sandbox();
  const file = s.write('Hero.tsx', BANNER);
  s.run('add', 'hero-banner', '--level', 'large', '--file', file, '--summary', 'Full width hero');
  assert.equal(s.run('like', 'hero-banner', '--note', 'love the spacing').status, 0);
  assert.equal(s.run('like', 'hero-banner').status, 0);
  assert.equal(s.run('dislike', 'hero-banner', '--version', '1', '--note', 'too tall').status, 0);
  const note = s.run('note', 'hero-banner', 'use only on landing pages');
  assert.equal(note.status, 0, note.stderr);
  assert.deepEqual(history(s).map((event) => event.type), ['add', 'like', 'like', 'dislike', 'note']);
  assert.equal(history(s)[1].note, 'love the spacing');
  assert.equal(history(s)[3].version, 1);
  assert.equal(history(s)[4].note, 'use only on landing pages');
  const show = s.run('show', 'hero-banner');
  assert.equal(show.status, 0, show.stderr);
  assert.ok(show.stdout.indexOf('latest v1') < show.stdout.indexOf('History'), 'state before history');
  assert.match(show.stdout, /Full width hero/);
  assert.match(show.stdout, /files: src\/components\/Hero\.tsx/);
  assert.match(show.stdout, /origin: generated · relation: chosen/);
  assert.match(show.stdout, /likes 2.*dislikes 1/);
  assert.ok(show.stdout.indexOf('use only on landing pages') < show.stdout.indexOf('love the spacing'), 'newest history first');
  assert.doesNotMatch(show.stdout, /changed since/);
  writeFileSync(file, BANNER.replace('calm', 'serene'));
  assert.match(s.run('show', 'hero-banner').stdout, /changed since v1: run pieces\.mjs version hero-banner/);
  const json = jsonOf(s.run('show', 'hero-banner', '--json'));
  assert.equal(json.piece.latest, 1);
  assert.equal(json.stats.likes, 2);
  assert.equal(json.drift, true);
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
  assert.match(all.stdout, /badge .*micro.*v1.*generated\/chosen.*Small label/);
  assert.match(all.stdout, /hero-banner .*large.*v1.*generated\/chosen.*Full width hero/);
  const micro = jsonOf(s.run('list', '--level', 'micro', '--json'));
  assert.deepEqual(micro.pieces.map((p) => p.name), ['badge']);
  assert.equal(s.run('list', '--level', 'huge').status, 2);
  const empty = sandbox().run('list');
  assert.equal(empty.status, 0);
  assert.match(empty.stdout, /no pieces/);
});

test('personality set and show keep the project settings in the registry (S2)', () => {
  const s = sandbox();
  const set = s.run('personality', 'set', 'spacing', 'airy');
  assert.equal(set.status, 0, set.stderr);
  assert.equal(s.run('personality', 'set', 'image-weight', 'heavy').status, 0);
  assert.deepEqual(registry(s).settings, { spacing: 'airy', 'image-weight': 'heavy' });
  assert.match(s.run('personality', 'show').stdout, /spacing: airy/);
  assert.deepEqual(jsonOf(s.run('personality', 'show', '--json')).settings, { spacing: 'airy', 'image-weight': 'heavy' });
  assert.equal(s.run('personality', 'set', 'spacing').status, 2);
  assert.equal(s.run('personality').status, 2);
});

test('the global index defaults to ~/.ai-frontend-guide-kit and --global overrides the environment (S2)', () => {
  const s = sandbox();
  const home = join(s.base, 'home');
  mkdirSync(home);
  const env = baseEnv({ HOME: home, USERPROFILE: home });
  const file = s.write('Badge.tsx', BADGE);
  const run = spawnSync(process.execPath, [TOOL, 'add', 'badge', '--level', 'micro', '--file', file, '--new', '--reason', 'test seed', '--dir', s.root], { encoding: 'utf8', env });
  assert.equal(run.status, 0, run.stderr);
  assert.ok(existsSync(join(home, '.ai-frontend-guide-kit', 'projects.json')));
  assert.equal(JSON.parse(readFileSync(join(home, '.ai-frontend-guide-kit', 'projects.json'), 'utf8')).projects[0].root, s.root);
  const flagGlobal = join(s.base, 'flag-global');
  const viaFlag = spawnSync(process.execPath, [TOOL, 'index', '--global', flagGlobal, '--dir', s.root], { encoding: 'utf8', env: baseEnv({ AI_FRONTEND_PIECES: join(s.base, 'env-global') }) });
  assert.equal(viaFlag.status, 0, viaFlag.stderr);
  assert.ok(existsSync(join(flagGlobal, 'projects.json')));
  assert.equal(existsSync(join(s.base, 'env-global')), false);
});

test('AI_FRONTEND_OUTPUT moves the project registry', () => {
  const s = sandbox();
  const file = s.write('Badge.tsx', BADGE);
  const out = join(s.base, 'custom-out');
  const env = { ...s.env, AI_FRONTEND_OUTPUT: out };
  const run = spawnSync(process.execPath, [TOOL, 'add', 'badge', '--level', 'micro', '--file', file, '--new', '--reason', 'x', '--dir', s.root], { encoding: 'utf8', env });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(JSON.parse(readFileSync(join(out, 'pieces', 'pieces.json'), 'utf8')).pieces.badge.latest, 1);
  assert.equal(existsSync(join(s.root, 'ai-frontend-output')), false);
});

test('concurrent writers keep history.jsonl one valid JSON per line (append-only)', async () => {
  const s = sandbox();
  s.run('add', 'badge', '--level', 'micro', '--file', s.write('Badge.tsx', BADGE));
  const jobs = Array.from({ length: 8 }, (_, i) => new Promise((resolveJob) => {
    const child = spawn(process.execPath, [TOOL, 'like', 'badge', '--note', `n${i}`, '--dir', s.root], { env: s.env });
    child.on('close', resolveJob);
  }));
  assert.deepEqual(await Promise.all(jobs), Array(8).fill(0));
  const likes = history(s).filter((event) => event.type === 'like');
  assert.equal(likes.length, 8);
  assert.equal(new Set(likes.map((event) => event.note)).size, 8);
});

// ---------------------------------------------------------------- index (S6, S7)

const sqlite = await import('node:sqlite').catch(() => null);
const withDb = (path, fn) => {
  const db = new sqlite.DatabaseSync(path, { readOnly: true });
  try {
    return fn(db);
  } finally {
    db.close();
  }
};
const seedThree = (s) => {
  s.run('add', 'hero-banner', '--level', 'large', '--file', s.write('Hero.tsx', BANNER), '--summary', 'Full width hero with a headline');
  s.run('add', 'badge', '--level', 'micro', '--file', s.write('Badge.tsx', BADGE), '--summary', 'Small label');
  s.run('add', 'top-stripe', '--level', 'medium', '--file', s.write('Stripe.tsx', BANNER_RENAMED), '--summary', 'Announcement stripe');
};

test('every mutating command refreshes the project index; the registry stays the source of truth (S6)', { skip: !sqlite }, () => {
  const s = sandbox();
  seedThree(s);
  const index = join(s.out, 'index.db');
  assert.ok(existsSync(index));
  withDb(index, (db) => {
    assert.deepEqual(db.prepare('SELECT name FROM refs ORDER BY name').all().map((r) => r.name), ['badge', 'hero-banner', 'top-stripe']);
    assert.deepEqual(db.prepare("SELECT name FROM refs_fts WHERE refs_fts MATCH 'headline'").all().map((r) => r.name), ['hero-banner']);
    const row = db.prepare('SELECT sha256, structural, path FROM refs WHERE name = ?').get('hero-banner');
    assert.equal(row.sha256, sha(BANNER));
    assert.equal(row.path, rel('Hero.tsx'));
  });
  s.run('like', 'badge');
  s.run('like', 'badge');
  s.run('use', 'badge');
  s.run('dislike', 'top-stripe');
  withDb(index, (db) => {
    const stats = Object.fromEntries(db.prepare('SELECT piece, likes, dislikes, uses FROM stats').all().map((r) => [r.piece, r]));
    assert.equal(stats.badge.likes, 2);
    assert.equal(stats.badge.uses, 1);
    assert.equal(stats['top-stripe'].dislikes, 1);
  });
  writeFileSync(join(s.root, rel('Badge.tsx')), `${BADGE}export const X = 1;\n`);
  s.run('version', 'badge');
  withDb(index, (db) => assert.equal(db.prepare('SELECT latest FROM refs WHERE name = ?').get('badge').latest, 2));
});

test('the global index holds only references to registered projects, never code (S2, S6)', { skip: !sqlite }, () => {
  const s = sandbox();
  seedThree(s);
  s.run('like', 'badge');
  const projects = JSON.parse(readFileSync(join(s.global, 'projects.json'), 'utf8')).projects;
  assert.deepEqual(projects.map((p) => [p.name, p.root]), [['project', s.root]]);
  withDb(join(s.global, 'index.db'), (db) => {
    const columns = db.prepare('PRAGMA table_info(refs)').all().map((c) => c.name);
    assert.ok(!columns.includes('source') && !columns.includes('content') && !columns.includes('code'));
    const row = db.prepare('SELECT * FROM refs WHERE name = ?').get('hero-banner');
    assert.equal(row.project, s.root);
    assert.equal(row.path, rel('Hero.tsx'));
    assert.equal(row.sha256, sha(BANNER));
    assert.equal(row.level, 'large');
    assert.equal(db.prepare('SELECT likes FROM stats WHERE piece = ?').get('badge').likes, 1);
  });
});

test('index re-processes only pieces whose record or real file changed, and only the new history lines (S7)', { skip: !sqlite }, () => {
  const s = sandbox();
  seedThree(s);
  const first = jsonOf(s.run('index', '--json'));
  assert.equal(first.engine, 'sqlite');
  assert.deepEqual([first.pieces, first.changed, first.unchanged, first.removed, first.events], [3, 0, 3, 0, 0]);
  // a hand edit of one registry record
  const data = registry(s);
  data.pieces.badge.summary = 'Tiny pill label';
  writeFileSync(join(s.out, 'pieces.json'), JSON.stringify(data, null, 2));
  const second = jsonOf(s.run('index', '--json'));
  assert.deepEqual([second.changed, second.unchanged], [1, 2]);
  withDb(join(s.out, 'index.db'), (db) => assert.equal(db.prepare('SELECT summary FROM refs WHERE name = ?').get('badge').summary, 'Tiny pill label'));
  // a change in the real component file
  writeFileSync(join(s.root, rel('Hero.tsx')), BANNER.replace('calm', 'serene'));
  const third = jsonOf(s.run('index', '--json'));
  assert.deepEqual([third.changed, third.unchanged], [1, 2]);
  withDb(join(s.out, 'index.db'), (db) => assert.equal(db.prepare('SELECT live_sha FROM refs WHERE name = ?').get('hero-banner').live_sha, sha(BANNER.replace('calm', 'serene'))));
  // a touched file with the same content is not processed again
  const when = new Date(Date.now() + 60000);
  utimesSync(join(s.root, rel('Badge.tsx')), when, when);
  assert.deepEqual([jsonOf(s.run('index', '--json')).changed], [0]);
  // a history line written by another process is consumed once
  const line = JSON.stringify({ ts: new Date().toISOString(), type: 'like', piece: 'hero-banner', version: 1 });
  writeFileSync(join(s.out, 'history.jsonl'), `${readFileSync(join(s.out, 'history.jsonl'), 'utf8')}${line}\n`);
  const fourth = jsonOf(s.run('index', '--json'));
  assert.equal(fourth.events, 1);
  assert.equal(fourth.changed, 0);
  assert.equal(jsonOf(s.run('index', '--json')).events, 0);
  withDb(join(s.out, 'index.db'), (db) => assert.equal(db.prepare('SELECT likes FROM stats WHERE piece = ?').get('hero-banner').likes, 1));
});

test('index rebuilds from the registry after index.db is deleted, a piece disappears or the file is corrupt (S6)', { skip: !sqlite }, () => {
  const s = sandbox();
  seedThree(s);
  s.run('like', 'badge');
  rmSync(join(s.out, 'index.db'));
  const rebuilt = jsonOf(s.run('index', '--json'));
  assert.deepEqual([rebuilt.pieces, rebuilt.changed, rebuilt.events], [3, 3, 4]);
  withDb(join(s.out, 'index.db'), (db) => assert.equal(db.prepare('SELECT likes FROM stats WHERE piece = ?').get('badge').likes, 1));
  const data = registry(s);
  delete data.pieces['top-stripe'];
  writeFileSync(join(s.out, 'pieces.json'), JSON.stringify(data, null, 2));
  const gone = jsonOf(s.run('index', '--json'));
  assert.deepEqual([gone.removed, gone.pieces], [1, 2]);
  withDb(join(s.out, 'index.db'), (db) => assert.equal(db.prepare("SELECT count(*) AS n FROM refs_fts WHERE refs_fts MATCH 'stripe'").get().n, 0));
  withDb(join(s.global, 'index.db'), (db) => assert.equal(db.prepare('SELECT count(*) AS n FROM refs WHERE name = ?').get('top-stripe').n, 0));
  writeFileSync(join(s.out, 'index.db'), 'this is not a database');
  const repaired = s.run('index', '--json');
  assert.equal(repaired.status, 0, repaired.stderr);
  assert.equal(jsonOf(repaired).pieces, 2);
});

const rank = (s, ...extra) => jsonOf(s.run('list', '--json', ...extra)).pieces.map((p) => p.name);
const tasteSeed = (s) => {
  seedThree(s);
  s.run('like', 'top-stripe');
  s.run('like', 'top-stripe');
  s.run('use', 'top-stripe');
  s.run('dislike', 'hero-banner');
};

test('list ranks liked and most-used pieces first and disliked ones last (S6)', () => {
  const s = sandbox();
  tasteSeed(s);
  assert.deepEqual(rank(s), ['top-stripe', 'badge', 'hero-banner']);
  assert.deepEqual(jsonOf(s.run('list', '--liked', '--json')).pieces.map((p) => p.name), ['top-stripe']);
  const table = s.run('list');
  assert.ok(table.stdout.indexOf('top-stripe') < table.stdout.indexOf('badge'));
});

test('list --text searches name, summary, variants and contexts, ranked by match then taste (S6)', () => {
  const s = sandbox();
  tasteSeed(s);
  s.run('version', 'badge', '--variants', 'pill', '--contexts', 'sidebar');
  assert.deepEqual(rank(s, '--text', 'headline'), ['hero-banner']);
  assert.deepEqual(rank(s, '--text', 'pill sidebar'), ['badge']);
  assert.deepEqual(rank(s, '--text', 'banners'), ['hero-banner']);
  assert.deepEqual(rank(s, '--text', 'unrelated gizmo'), []);
  const none = s.run('list', '--text', 'unrelated gizmo');
  assert.equal(none.status, 0);
  assert.match(none.stdout, /no pieces/);
});

test('without node:sqlite every command still works from the registries and says so once (S6)', () => {
  const s = sandbox();
  s.env.AI_FRONTEND_PIECES_NO_SQLITE = '1';
  tasteSeed(s);
  assert.equal(existsSync(join(s.out, 'index.db')), false);
  assert.equal(existsSync(join(s.global, 'index.db')), false);
  const list = s.run('list', '--json');
  assert.equal(list.status, 0, list.stderr);
  assert.deepEqual(jsonOf(list).pieces.map((p) => p.name), ['top-stripe', 'badge', 'hero-banner']);
  assert.equal(list.stderr.match(/node:sqlite is unavailable/g).length, 1);
  assert.deepEqual(rank(s, '--text', 'headline'), ['hero-banner']);
  assert.deepEqual(rank(s, '--text', 'banners'), ['hero-banner']);
  const index = s.run('index', '--json');
  assert.equal(index.status, 0, index.stderr);
  assert.equal(jsonOf(index).engine, 'files');
  assert.equal(jsonOf(index).pieces, 3);
  const mutate = s.run('like', 'badge');
  assert.equal(mutate.status, 0, mutate.stderr);
  assert.equal(mutate.stderr.match(/node:sqlite is unavailable/g).length, 1);
  assert.equal(history(s).filter((event) => event.type === 'like').length, 3);
});

test('the sqlite and the file-scan engines rank identically (S6)', { skip: !sqlite }, () => {
  const a = sandbox();
  tasteSeed(a);
  const b = sandbox();
  b.env.AI_FRONTEND_PIECES_NO_SQLITE = '1';
  tasteSeed(b);
  for (const extra of [[], ['--text', 'stripe'], ['--text', 'hero banner'], ['--liked'], ['--level', 'micro']]) {
    assert.deepEqual(rank(a, ...extra), rank(b, ...extra), extra.join(' '));
  }
});

// ---------------------------------------------------------------- find and the reuse guard (S3)

const find = (s, need, ...extra) => s.raw('find', need, '--json', ...extra);
const heroSeed = (s) => s.run('add', 'hero-banner', '--level', 'large', '--file', s.write('Hero.tsx', BANNER), '--summary', 'Full width hero with a headline', '--variants', 'calm');

test('find on an empty project ends in "new piece" and records that it ran in the project (S3)', () => {
  const s = sandbox();
  const run = find(s, 'zzqx frobnicator');
  assert.equal(run.status, 0, run.stderr);
  const result = jsonOf(run);
  assert.equal(result.status, 'new');
  assert.deepEqual(result.own, []);
  assert.deepEqual(result.others, []);
  assert.deepEqual(result.catalog, []);
  assert.match(result.decision, /new piece/);
  const finds = registry(s).finds;
  assert.equal(finds.length, 1);
  assert.equal(finds[0].need, 'zzqx frobnicator');
  assert.ok(Date.parse(finds[0].ts) > 0);
  assert.match(s.raw('find', 'zzqx', 'frobnicator').stdout, /Decision: .*new piece/);
  assert.equal(s.raw('find').status, 2);
});

test('find prefers an exact own piece, then a new variant of a close one (S3)', () => {
  const s = sandbox();
  heroSeed(s);
  const exact = jsonOf(find(s, 'Hero Banner'));
  assert.equal(exact.status, 'reuse');
  assert.equal(exact.own[0].name, 'hero-banner');
  assert.equal(exact.own[0].match, 'exact');
  assert.equal(exact.own[0].path, rel('Hero.tsx'));
  assert.match(exact.decision, /reuse hero-banner/);
  const close = jsonOf(find(s, 'banner'));
  assert.equal(close.status, 'variant');
  assert.match(close.decision, /new variant or version of hero-banner/);
  const byText = jsonOf(find(s, 'headline hero'));
  assert.equal(byText.status, 'variant');
  assert.equal(byText.own[0].name, 'hero-banner');
  assert.deepEqual(jsonOf(find(s, 'hero banner')).catalog, []);
});

test('find falls back to the kit catalog, and only then to a new piece (S3)', () => {
  const s = sandbox();
  heroSeed(s);
  const result = jsonOf(find(s, 'marquee'));
  assert.equal(result.status, 'catalog');
  assert.deepEqual(result.own, []);
  assert.ok(result.catalog.length > 0);
  assert.ok(result.catalog[0].id);
  assert.match(result.decision, /catalog/);
  assert.match(s.raw('find', 'marquee').stdout, /Candidates \(catalog\)/);
});

test('find --file flags a near-duplicate by structural hash (S7, S3)', () => {
  const s = sandbox();
  heroSeed(s);
  const result = jsonOf(find(s, 'zzqx stripe', '--file', s.write('Stripe.tsx', BANNER_RENAMED)));
  assert.equal(result.nearDuplicates.length, 1);
  assert.equal(result.nearDuplicates[0].piece, 'hero-banner');
  assert.equal(result.nearDuplicates[0].version, 1);
  assert.match(s.raw('find', 'zzqx stripe', '--file', rel('Stripe.tsx')).stdout, /near-duplicate.*hero-banner v1/);
  assert.deepEqual(jsonOf(find(s, 'zzqx badge', '--file', s.write('Badge.tsx', BADGE))).nearDuplicates, []);
});

test('add refuses when find did not run for the need, and nothing is written (S3)', () => {
  const s = sandbox();
  const file = s.write('Table.tsx', BADGE);
  const refused = s.raw('add', 'pricing-table', '--level', 'medium', '--file', file);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /pieces\.mjs find "pricing table"/);
  assert.equal(registry(s).pieces?.['pricing-table'], undefined);
  assert.equal(history(s).length, 0);
  find(s, 'testimonial carousel');
  assert.equal(s.raw('add', 'pricing-table', '--level', 'medium', '--file', file).status, 1);
  find(s, 'pricing table');
  const ok = s.raw('add', 'pricing-table', '--level', 'medium', '--file', file);
  assert.equal(ok.status, 0, ok.stderr);
  assert.ok(registry(s).pieces['pricing-table']);
});

test('add --need accepts a searched need that differs from the piece name; find is per project (S3)', () => {
  const s = sandbox();
  const file = s.write('Table.tsx', BADGE);
  find(s, 'plans comparison grid');
  assert.equal(s.raw('add', 'pricing-table', '--level', 'medium', '--file', file).status, 1);
  const ok = s.raw('add', 'pricing-table', '--level', 'medium', '--file', file, '--need', 'plans comparison grid');
  assert.equal(ok.status, 0, ok.stderr);
  const b = s.other('site-b');
  const elsewhere = b.raw('add', 'plan-card', '--level', 'small', '--file', b.write('Plan.tsx', SECRET_FILE), '--need', 'plans comparison grid');
  assert.equal(elsewhere.status, 1);
  assert.match(elsewhere.stderr, /find/);
});

test('add refuses a name that matches an own piece, naming it, unless --new --reason (S3)', () => {
  const s = sandbox();
  heroSeed(s);
  const file = s.write('Wide.tsx', SECRET_FILE);
  find(s, 'hero banner wide');
  const refused = s.raw('add', 'hero-banner-wide', '--level', 'large', '--file', file);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /close to "hero-banner"/);
  assert.match(refused.stderr, /version hero-banner/);
  assert.equal(registry(s).pieces['hero-banner-wide'], undefined);
  const noReason = s.raw('add', 'hero-banner-wide', '--level', 'large', '--file', file, '--new');
  assert.equal(noReason.status, 2);
  assert.match(noReason.stderr, /--reason/);
  assert.equal(s.raw('add', 'hero-banner-wide', '--level', 'large', '--file', file, '--reason', 'x').status, 2);
  const forced = s.raw('add', 'hero-banner-wide', '--level', 'large', '--file', file, '--new', '--reason', 'needs a different layout engine');
  assert.equal(forced.status, 0, forced.stderr);
  assert.equal(registry(s).pieces['hero-banner-wide'].newReason, 'needs a different layout engine');
  assert.equal(history(s).filter((e) => e.type === 'add').pop().reason, 'needs a different layout engine');
});

test('add refuses a structural duplicate of an own piece, naming it (S3, S7)', () => {
  const s = sandbox();
  heroSeed(s);
  find(s, 'top stripe');
  const file = s.write('Stripe.tsx', BANNER_RENAMED);
  const refused = s.raw('add', 'top-stripe', '--level', 'large', '--file', file);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /same structure as "hero-banner" v1/);
  assert.equal(registry(s).pieces['top-stripe'], undefined);
  const forced = s.raw('add', 'top-stripe', '--level', 'large', '--file', file, '--new', '--reason', 'different brand, same skeleton on purpose');
  assert.equal(forced.status, 0, forced.stderr);
});

test('find and the guard work without node:sqlite too (S3, S6)', () => {
  const s = sandbox();
  s.env.AI_FRONTEND_PIECES_NO_SQLITE = '1';
  heroSeed(s);
  assert.equal(jsonOf(find(s, 'banner')).status, 'variant');
  find(s, 'hero banner wide');
  const refused = s.raw('add', 'hero-banner-wide', '--level', 'large', '--file', s.write('Wide.tsx', SECRET_FILE));
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /close to "hero-banner"/);
});

// ---------------------------------------------------------------- other projects: find, guard, adopt (S2, S3, S7)

const withDonor = (extraEnv = {}) => {
  const s = sandbox();
  if (extraEnv.AI_FRONTEND_PIECES_NO_SQLITE) s.env.AI_FRONTEND_PIECES_NO_SQLITE = '1';
  const donor = s.other('site-a');
  donor.run('add', 'hero-banner', '--level', 'large', '--file', donor.write('Hero.tsx', BANNER), '--summary', 'Full width hero with a headline', '--variants', 'calm', '--license', 'MIT');
  return { s, donor };
};

test('find returns a piece of another registered project and proposes adopt (S2, S3)', () => {
  const { s, donor } = withDonor();
  const result = jsonOf(find(s, 'hero banner'));
  assert.equal(result.status, 'adopt');
  assert.deepEqual(result.own, []);
  assert.equal(result.others[0].name, 'hero-banner');
  assert.equal(result.others[0].projectName, 'site-a');
  assert.equal(result.others[0].project, donor.root);
  assert.equal(result.others[0].path, rel('Hero.tsx'));
  assert.match(result.decision, /pieces\.mjs adopt hero-banner --from site-a/);
  const text = s.raw('find', 'hero banner').stdout;
  assert.match(text, /Other projects:/);
  assert.match(text, /hero-banner .* in site-a/);
  // an own piece still wins over the other project's
  s.run('add', 'hero-banner', '--level', 'large', '--file', s.write('Own.tsx', BADGE));
  assert.equal(jsonOf(find(s, 'hero banner')).status, 'reuse');
  // a piece whose file vanished in the other project is not offered
  rmSync(join(donor.root, rel('Hero.tsx')));
  assert.equal(jsonOf(find(sandboxWith(s), 'hero banner')).others.some((row) => row.project === donor.root), false);
});
const sandboxWith = (s) => {
  const fresh = s.other('fresh-project');
  return { raw: fresh.raw };
};

test('find reaches other projects without node:sqlite too (S2, S6)', () => {
  const { s } = withDonor({ AI_FRONTEND_PIECES_NO_SQLITE: '1' });
  const result = jsonOf(find(s, 'hero banner'));
  assert.equal(result.status, 'adopt');
  assert.equal(result.others[0].projectName, 'site-a');
});

test('add refuses what another project already has, by name or by structure, unless --new --reason (S3, S7)', () => {
  const { s } = withDonor();
  find(s, 'hero banner wide');
  const byName = s.raw('add', 'hero-banner-wide', '--level', 'large', '--file', s.write('Wide.tsx', SECRET_FILE));
  assert.equal(byName.status, 1);
  assert.match(byName.stderr, /close to "hero-banner" in project site-a/);
  assert.match(byName.stderr, /pieces\.mjs adopt hero-banner --from site-a/);
  find(s, 'top stripe');
  const byShape = s.raw('add', 'top-stripe', '--level', 'large', '--file', s.write('Stripe.tsx', BANNER_RENAMED));
  assert.equal(byShape.status, 1);
  assert.match(byShape.stderr, /same structure as "hero-banner" v1 in project site-a/);
  assert.equal(registry(s).pieces?.['top-stripe'], undefined);
  const forced = s.raw('add', 'top-stripe', '--level', 'large', '--file', join(s.root, rel('Stripe.tsx')), '--new', '--reason', 'brand specific');
  assert.equal(forced.status, 0, forced.stderr);
  const near = jsonOf(find(s, 'zzqx', '--file', rel('Stripe.tsx'))).nearDuplicates;
  assert.deepEqual(near.map((d) => [d.piece, d.projectName]).sort(), [['hero-banner', 'site-a'], ['top-stripe', 'project']]);
});

test('adopt copies the other project\'s file into this project and records where it came from (S2, S8)', () => {
  const { s, donor } = withDonor();
  const run = s.raw('adopt', 'hero-banner');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /adopted "hero-banner" from project site-a/);
  const copied = join(s.root, rel('Hero.tsx'));
  assert.equal(readFileSync(copied, 'utf8'), BANNER);
  assert.equal(readFileSync(join(donor.root, rel('Hero.tsx')), 'utf8'), BANNER, 'the donor is untouched');
  const piece = registry(s).pieces['hero-banner'];
  assert.equal(piece.origin, 'project:site-a:src/components/Hero.tsx');
  assert.equal(piece.relation, 'chosen');
  assert.equal(piece.license, 'MIT');
  assert.equal(piece.level, 'large');
  assert.deepEqual(piece.variants, ['calm']);
  assert.deepEqual(piece.files, [rel('Hero.tsx')]);
  assert.equal(piece.versions[0].sha256, sha(BANNER));
  assert.equal(history(s)[0].type, 'adopt');
  assert.equal(history(s)[0].origin, 'project:site-a:src/components/Hero.tsx');
  assert.deepEqual(holdsMarker(s.out), []);
  // it evolves here: a later edit is a version of this project's piece and the origin stays
  writeFileSync(copied, BANNER.replace('calm', 'serene'));
  assert.equal(s.run('version', 'hero-banner', '--note', 'ours now').status, 0);
  const evolved = registry(s).pieces['hero-banner'];
  assert.equal(evolved.latest, 2);
  assert.equal(evolved.origin, 'project:site-a:src/components/Hero.tsx');
  assert.equal(readFileSync(join(donor.root, rel('Hero.tsx')), 'utf8'), BANNER);
});

test('adopt honors --to and --as, and refuses to overwrite, to guess between projects or to adopt what is not there (S2)', () => {
  const { s, donor } = withDonor();
  const second = s.other('site-c');
  second.run('add', 'hero-banner', '--level', 'large', '--file', second.write('Hero.tsx', BANNER_RENAMED + '// c\n'));
  const ambiguous = s.raw('adopt', 'hero-banner');
  assert.equal(ambiguous.status, 1);
  assert.match(ambiguous.stderr, /several projects \(site-a, site-c\).*--from/);
  assert.equal(existsSync(join(s.root, rel('Hero.tsx'))), false);
  const missing = s.raw('adopt', 'no-such-piece');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /no piece "no-such-piece"/);
  const placed = s.raw('adopt', 'hero-banner', '--from', 'site-a', '--to', 'src/ui', '--as', 'landing-hero');
  assert.equal(placed.status, 0, placed.stderr);
  assert.equal(readFileSync(join(s.root, 'src', 'ui', 'Hero.tsx'), 'utf8'), BANNER);
  assert.deepEqual(registry(s).pieces['landing-hero'].files, ['src/ui/Hero.tsx']);
  const clash = s.raw('adopt', 'hero-banner', '--from', 'site-a', '--to', 'src/ui', '--as', 'other-name');
  assert.equal(clash.status, 1);
  assert.match(clash.stderr, /already exists/);
  const duplicate = s.raw('adopt', 'hero-banner', '--from', 'site-a', '--as', 'landing-hero');
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /piece "landing-hero" already exists/);
  rmSync(join(donor.root, rel('Hero.tsx')));
  const gone = s.raw('adopt', 'hero-banner', '--from', 'site-a', '--as', 'again');
  assert.equal(gone.status, 1);
});

test('adopt defaults to the project\'s own component folder (S2)', () => {
  const { s } = withDonor();
  mkdirSync(join(s.root, 'components'));
  rmSync(join(s.root, 'src'), { recursive: true });
  const run = s.raw('adopt', 'hero-banner');
  assert.equal(run.status, 0, run.stderr);
  assert.ok(existsSync(join(s.root, 'components', 'Hero.tsx')));
  assert.deepEqual(registry(s).pieces['hero-banner'].files, ['components/Hero.tsx']);
});

test('adopt works from the registries without node:sqlite (S2, S6)', () => {
  const { s } = withDonor({ AI_FRONTEND_PIECES_NO_SQLITE: '1' });
  const run = s.raw('adopt', 'hero-banner');
  assert.equal(run.status, 0, run.stderr);
  assert.equal(registry(s).pieces['hero-banner'].origin, 'project:site-a:src/components/Hero.tsx');
});
