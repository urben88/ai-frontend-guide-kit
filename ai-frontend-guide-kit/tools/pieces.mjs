#!/usr/bin/env node
/**
 * pieces — a registry of the project's own reusable components (micro to large): versions, variants, use,
 * feedback and provenance. No dependencies.
 *
 * The kit NEVER copies or stores component code. A piece is a real component that lives in the project's own
 * component folders, following its architecture; the kit only records where it is and what happened to it.
 *
 * Per project (ai-frontend-output/pieces/, or AI_FRONTEND_OUTPUT/pieces/):
 *   pieces.json     registry: one record per piece (level, summary, variants, contexts, composedOf, license,
 *                   origin, relation, file paths, versions), plus usage, personality settings and the finds that ran
 *   history.jsonl   append-only events: add, adopt, version, use, like, dislike, note
 *   index.db        SQLite + FTS5 index of the above (rebuilt from the files; optional)
 * Global (--global, then AI_FRONTEND_PIECES, then ~/.ai-frontend-guide-kit/):
 *   projects.json   the registered projects
 *   index.db        references only: project, path, hash, metadata, likes. Never code.
 *
 * Project root: --dir, then AI_FRONTEND_PROJECT, then the folder that holds the kit.
 */
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogCandidates, matchName } from './ui-map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_DIR = resolve(__dirname, '..');

const LEVELS = ['micro', 'small', 'medium', 'large'];
const RELATIONS = ['chosen', 'modified', 'copied'];
const ORIGIN_KINDS = ['generated', 'catalog', 'internet', 'project'];
const COMMANDS = ['add', 'adopt', 'version', 'use', 'like', 'dislike', 'note', 'show', 'list', 'index', 'find', 'personality'];
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COMPONENT_DIRS = ['src/components', 'components', 'app/components', 'src/shared/ui', 'src/ui'];

// ---------------------------------------------------------------- arguments and paths

const VALUE_OPTIONS = new Set(['dir', 'global', 'level', 'file', 'summary', 'variants', 'contexts', 'composed-of', 'license', 'reason', 'version', 'variant', 'note', 'text', 'need', 'origin', 'relation', 'from', 'to', 'as']);
const BOOLEAN_OPTIONS = new Set(['json', 'help', 'liked', 'new']);

/** Strict parsing: unknown options and missing values are errors (flags.error), never silently ignored. */
function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length && !flags.error; i += 1) {
    const token = argv[i];
    if (token === '-h') {
      flags.help = true;
      continue;
    }
    if (!token.startsWith('--')) {
      if (token.startsWith('-') && token.length > 1) flags.error = `unknown option "${token}"`;
      else flags._.push(token);
      continue;
    }
    const eq = token.indexOf('=');
    const name = (eq === -1 ? token : token.slice(0, eq)).slice(2);
    if (VALUE_OPTIONS.has(name)) {
      const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
      if (!value || (eq === -1 && value.startsWith('--'))) flags.error = `option --${name} needs a value (--${name} <value> or --${name}=<value>)`;
      else {
        flags[name] = value;
        if (eq === -1) i += 1;
      }
    } else if (BOOLEAN_OPTIONS.has(name) && eq === -1) flags[name] = true;
    else flags.error = `unknown option "${token}"`;
  }
  return flags;
}

function resolveProjectRoot(flags) {
  if (flags.dir) return resolve(flags.dir);
  if (process.env.AI_FRONTEND_PROJECT) return resolve(process.env.AI_FRONTEND_PROJECT);
  return dirname(KIT_DIR);
}

function resolveOutputDir(root) {
  return process.env.AI_FRONTEND_OUTPUT ? resolve(process.env.AI_FRONTEND_OUTPUT) : join(root, 'ai-frontend-output');
}

function resolveGlobalDir(flags) {
  if (flags.global) return resolve(flags.global);
  if (process.env.AI_FRONTEND_PIECES) return resolve(process.env.AI_FRONTEND_PIECES);
  return join(homedir(), '.ai-frontend-guide-kit');
}

/** Everything a command needs to know about where things are. */
function makeContext(flags) {
  const root = resolveProjectRoot(flags);
  const out = resolveOutputDir(root);
  const dir = join(out, 'pieces');
  const globalDir = resolveGlobalDir(flags);
  return {
    root,
    out,
    dir,
    name: basename(root),
    registry: join(dir, 'pieces.json'),
    history: join(dir, 'history.jsonl'),
    index: join(dir, 'index.db'),
    globalDir,
    globalIndex: join(globalDir, 'index.db'),
    projects: join(globalDir, 'projects.json'),
  };
}

const USAGE = `pieces — registry of the project's own reusable components (micro, small, medium, large)

The kit never copies or stores component code: a piece is a real file in the project's own component folders.
The kit keeps metadata, history and an index only.

Usage:
  node tools/pieces.mjs find <need> [--file <path>]
                                               search order: own piece > new variant of an own piece > a piece of another
                                               registered project (adopt) > kit catalog > new piece. Records that it ran.
  node tools/pieces.mjs add <name> --level micro|small|medium|large --file <path>
        [--summary "..."] [--variants a,b] [--contexts x,y] [--composed-of p1,p2] [--license MIT]
        [--origin generated|catalog:<id>|internet:<url>|project:<name>:<path>] [--relation chosen|modified|copied]
        [--need "the need you searched"] [--new --reason "why no existing piece fits"]
                                               register a component that already exists in this project (--file is its path
                                               inside the project, comma-separated for several files). Refused unless "find"
                                               ran for this need and no exact, close or same-structure piece exists (here or
                                               in another registered project); --new --reason overrides and is kept on record.
  node tools/pieces.mjs adopt <name> [--from <project>] [--to <dir>] [--as <new-name>]
                                               copy a piece of another registered project into this project's component
                                               folder and register it with origin project:<name>:<path>
  node tools/pieces.mjs version <name> [--file <path>] [--note "..."] [--variants a,b] [--contexts x,y] [--relation r]
                                               record the file's current content as a new version (SHA-256 of the real
                                               file, plus the git commit when there is one); an unchanged file adds none
  node tools/pieces.mjs use <name> [--version N] [--variant v]
  node tools/pieces.mjs like <name> [--version N] [--note "..."]
  node tools/pieces.mjs dislike <name> [--version N] [--note "..."]
  node tools/pieces.mjs note <name> "text"
  node tools/pieces.mjs show <name>            latest state first, then the history
  node tools/pieces.mjs list [--level micro|small|medium|large] [--origin generated|catalog|internet|project] [--liked] [--text "words"]
                                               ranked: liked and most used first, disliked last
  node tools/pieces.mjs index                  refresh this project's index and the global reference index
  node tools/pieces.mjs personality set <key> <value>
  node tools/pieces.mjs personality show       this project's settings (spacing, image weight, ...)

Options:
  --dir <project-root>   project (default: AI_FRONTEND_PROJECT, then the folder that holds the kit)
  --global <dir>         global index of registered projects (default: AI_FRONTEND_PIECES, then ~/.ai-frontend-guide-kit)
  --json                 machine-readable output
  --help                 this text

Names are kebab-case. A variant is a prop of the same piece, never a copy. Origin says where the component came from;
relation says what the project did with it: chosen (as is), modified (adapted) or copied (traced from a reference).
Every command that changes a registry refreshes the indexes (SQLite + FTS5 through node:sqlite). Without it (Node older
than 22.13) the registries are scanned instead and one notice is printed; the results are the same.`;

// ---------------------------------------------------------------- errors and output

class Fail extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}
const usageError = (message) => new Fail(message, 2);

function emit(flags, data, text) {
  if (flags.json) console.log(JSON.stringify(data, null, 2));
  else console.log(text);
}

// ---------------------------------------------------------------- hashes (S7)

const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const normalizeNewlines = (text) => text.replace(/\r\n/g, '\n');

const KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for',
  'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void',
  'while', 'with', 'yield', 'async', 'await', 'from', 'as', 'of', 'null', 'undefined', 'true', 'false', 'interface', 'type', 'enum',
]);
const TOKEN = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$-]*|\d[\w.]*|\s+|[\s\S]/g;

/**
 * SHA-256 of the source with comments dropped, strings and numbers replaced by a placeholder, identifiers renamed
 * to one placeholder and whitespace removed: two pieces with the same shape but other names, texts or comments
 * share it. Keywords stay, so a different structure changes the hash. Heuristic by design (no parser).
 */
export function structuralHash(text) {
  const tokens = [];
  for (const match of normalizeNewlines(text).matchAll(TOKEN)) {
    const token = match[0];
    if (token.startsWith('/*') || token.startsWith('//') || /^\s+$/.test(token)) continue;
    if (/^["'`]/.test(token)) tokens.push('S');
    else if (/^\d/.test(token)) tokens.push('N');
    else if (/^[A-Za-z_$]/.test(token)) tokens.push(KEYWORDS.has(token) ? token : 'I');
    else tokens.push(token);
  }
  return sha256(tokens.join(' '));
}

// ---------------------------------------------------------------- files: registry, history, project files

const now = () => new Date().toISOString();

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Atomic replace; a few retries because Windows refuses a rename while another process holds the target. */
function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  for (let attempt = 0; ; attempt += 1) {
    try {
      renameSync(temp, path);
      return;
    } catch (error) {
      if (attempt >= 8 || !['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) {
        rmSync(temp, { force: true });
        throw error;
      }
      sleep(25);
    }
  }
}

function readJsonFile(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
  } catch {
    return fallback;
  }
}

const INDEX_IGNORE = ['index.db', 'index.db-wal', 'index.db-shm', 'index.db.broken'].map((name) => `${name}\n`).join('');

/** Keeps the rebuildable SQLite index out of git: writes pieces/.gitignore once. The project's own .gitignore is never touched. */
function ignoreIndex(dir) {
  const path = join(dir, '.gitignore');
  if (existsSync(path)) return;
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, INDEX_IGNORE, 'utf8');
}

const emptyRegistry = () => ({ version: 2, pieces: {}, used: {}, settings: {}, finds: [] });
const registryAt = (path) => ({ ...emptyRegistry(), ...readJsonFile(path, {}) });
const loadRegistry = (ctx) => registryAt(ctx.registry);
const saveRegistry = (ctx, registry) => {
  ignoreIndex(ctx.dir);
  writeJson(ctx.registry, registry);
};

function requirePiece(registry, name) {
  const piece = registry.pieces[name];
  if (!piece) throw new Fail(`no piece "${name}" in this project. Registered pieces: ${Object.keys(registry.pieces).sort().join(', ') || 'none'}`);
  return piece;
}

/** One JSON object per line, appended with a single write so concurrent writers never interleave. */
function appendHistory(ctx, event) {
  ignoreIndex(ctx.dir);
  appendFileSync(ctx.history, `${JSON.stringify({ ts: now(), ...event })}\n`, 'utf8');
}

function readHistoryAt(path) {
  if (!existsSync(path)) return [];
  const events = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // a torn or foreign line never breaks the registry
    }
  }
  return events;
}

/** Likes, dislikes and uses per piece, from a history. */
function statsFrom(events) {
  const stats = new Map();
  for (const event of events) {
    if (!event.piece) continue;
    if (!stats.has(event.piece)) stats.set(event.piece, { likes: 0, dislikes: 0, uses: 0 });
    const entry = stats.get(event.piece);
    if (event.type === 'like') entry.likes += 1;
    else if (event.type === 'dislike') entry.dislikes += 1;
    else if (event.type === 'use') entry.uses += 1;
  }
  return stats;
}
const emptyStats = () => ({ likes: 0, dislikes: 0, uses: 0 });

/** A path inside the project, stored relative with forward slashes. The kit never reaches outside the project. */
function relativeInProject(ctx, file) {
  const abs = resolve(ctx.root, file);
  const rel = relative(ctx.root, abs);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Fail(`"${file}" is outside the project (${ctx.root}). A piece is a component that already lives in the project's own folders; the kit never copies component code`);
  }
  return rel.split(sep).join('/');
}

function readProjectFile(root, rel) {
  const abs = join(root, rel);
  if (!existsSync(abs) || !statSync(abs).isFile()) throw new Fail(`source file not found: ${rel} (in ${root})`);
  return readFileSync(abs, 'utf8');
}

function gitInfo(root, rels) {
  const head = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (head.error || head.status !== 0) return {};
  const dirty = spawnSync('git', ['-C', root, 'status', '--porcelain', '--', ...rels], { encoding: 'utf8' });
  return { commit: head.stdout.trim(), ...(dirty.status === 0 && dirty.stdout.trim() ? { dirty: true } : {}) };
}

const combinedHash = (texts) => (texts.length === 1 ? sha256(texts[0]) : sha256(texts.map(sha256).join('\n')));

/** The current state of a piece's files: content hashes (never the content) and the git commit when there is one. */
function snapshot(ctx, rels) {
  const texts = rels.map((rel) => normalizeNewlines(readProjectFile(ctx.root, rel)));
  return {
    sha256: texts.length === 1 ? sha256(texts[0]) : sha256(texts.map(sha256).join('\n')),
    structural: structuralHash(texts[0]),
    text: texts[0],
    ...gitInfo(ctx.root, rels),
  };
}

function versionEntry(n, snap, note) {
  return { n, ts: now(), sha256: snap.sha256, structural: snap.structural, ...(snap.commit ? { commit: snap.commit } : {}), ...(snap.dirty ? { dirty: true } : {}), ...(note ? { note } : {}) };
}

// ---------------------------------------------------------------- options

const listOption = (value) => (value ? [...new Set(String(value).split(',').map((part) => part.trim()).filter(Boolean))] : []);
const merge = (current, extra) => [...new Set([...current, ...extra])];

function nameArg(flags, command) {
  const name = flags._[1];
  if (!name) throw usageError(`${command} needs a piece name`);
  if (!NAME_PATTERN.test(name)) throw usageError(`piece name "${name}" must be kebab-case (lowercase letters, digits and hyphens)`);
  return name;
}

function levelOption(value) {
  if (!LEVELS.includes(value)) throw usageError(`--level must be one of ${LEVELS.join(', ')} (got "${value}")`);
  return value;
}

function relationOption(value) {
  if (!RELATIONS.includes(value)) throw usageError(`--relation must be one of ${RELATIONS.join(', ')} (got "${value}")`);
  return value;
}

function originOption(value) {
  const text = String(value);
  const ok = text === 'generated' || /^catalog:\S+$/.test(text) || /^internet:https?:\/\/\S+$/.test(text) || /^project:[^:\s]+:\S+$/.test(text);
  if (!ok) throw usageError(`--origin must be generated, catalog:<entry-id>, internet:<url> or project:<name>:<path> (got "${value}")`);
  return text;
}

function originKindOption(value) {
  if (!ORIGIN_KINDS.includes(value)) throw usageError(`--origin filter must be one of ${ORIGIN_KINDS.join(', ')} (got "${value}")`);
  return value;
}

function versionOption(flags) {
  if (flags.version === undefined) return null;
  if (!/^[1-9]\d*$/.test(String(flags.version))) throw usageError(`--version must be a positive integer (got "${flags.version}")`);
  return Number(flags.version);
}

function requireVersion(piece, number) {
  const found = piece.versions.find((v) => v.n === number);
  if (!found) throw new Fail(`"${piece.name}" has no version ${number} (latest is v${piece.latest})`);
  return found;
}

const shortHash = (hash) => hash.slice(0, 8);
const originKind = (origin) => String(origin).split(':')[0];

// ---------------------------------------------------------------- projects (global)

function registerProject(ctx) {
  const entries = readJsonFile(ctx.projects, { projects: [] }).projects ?? [];
  const entry = { name: ctx.name, root: ctx.root, out: ctx.out };
  const known = entries.find((item) => item.root === ctx.root);
  if (known && known.name === entry.name && known.out === entry.out) return;
  writeJson(ctx.projects, { projects: [...entries.filter((item) => item.root !== ctx.root), entry].sort((a, b) => (a.root < b.root ? -1 : 1)) });
}

const registeredProjects = (ctx) => (readJsonFile(ctx.projects, { projects: [] }).projects ?? []).filter((item) => item.root !== ctx.root);
const entryContext = (item) => ({ root: item.root, out: item.out, name: item.name, registry: join(item.out, 'pieces', 'pieces.json'), history: join(item.out, 'pieces', 'history.jsonl') });

// ---------------------------------------------------------------- index (S6, S7): SQLite + FTS5 through node:sqlite

const SQLITE_NOTICE = 'pieces: node:sqlite is unavailable (needs Node 22.13+); scanning the registries instead (no index.db)';
let sqliteModule; // undefined: not tried yet · null: unavailable
let noticePrinted = false;

/** Loads node:sqlite once, silently. AI_FRONTEND_PIECES_NO_SQLITE=1 forces the file-scan fallback (used by the tests). */
async function loadSqlite() {
  if (sqliteModule !== undefined) return sqliteModule;
  if (process.env.AI_FRONTEND_PIECES_NO_SQLITE === '1') {
    sqliteModule = null;
    return null;
  }
  const emitWarning = process.emitWarning;
  process.emitWarning = (warning, ...rest) => (String(warning?.message ?? warning).includes('SQLite') ? undefined : emitWarning.call(process, warning, ...rest));
  try {
    sqliteModule = await import('node:sqlite');
  } catch {
    sqliteModule = null;
  } finally {
    process.emitWarning = emitWarning;
  }
  return sqliteModule;
}

function sayFallback() {
  if (noticePrinted) return;
  noticePrinted = true;
  console.error(SQLITE_NOTICE);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS refs(
  project TEXT NOT NULL, project_name TEXT, name TEXT NOT NULL, level TEXT, summary TEXT, variants TEXT, contexts TEXT, composed_of TEXT,
  license TEXT, origin TEXT, relation TEXT, path TEXT, latest INTEGER, sha256 TEXT, structural TEXT,
  live_sha TEXT, live_mtime REAL, live_size INTEGER, rec_hash TEXT, PRIMARY KEY(project, name));
CREATE TABLE IF NOT EXISTS versions(project TEXT NOT NULL, piece TEXT NOT NULL, n INTEGER, sha256 TEXT, structural TEXT, PRIMARY KEY(project, piece, n));
CREATE INDEX IF NOT EXISTS versions_structural ON versions(structural);
CREATE TABLE IF NOT EXISTS stats(project TEXT NOT NULL, piece TEXT NOT NULL, likes INTEGER NOT NULL DEFAULT 0, dislikes INTEGER NOT NULL DEFAULT 0, uses INTEGER NOT NULL DEFAULT 0, last_used TEXT, PRIMARY KEY(project, piece));
CREATE VIRTUAL TABLE IF NOT EXISTS refs_fts USING fts5(project UNINDEXED, name, summary, variants, contexts, composed_of);
`;

/** Opens an index database and creates the schema; null when node:sqlite or FTS5 is missing. A corrupt file is replaced. */
async function openDb(path) {
  const sqlite = await loadSqlite();
  if (!sqlite) return null;
  mkdirSync(dirname(path), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let db;
    try {
      db = new sqlite.DatabaseSync(path);
      db.exec('PRAGMA busy_timeout = 5000');
      db.exec(SCHEMA);
      return db;
    } catch (error) {
      try {
        db?.close();
      } catch {
        // already closed
      }
      if (/fts5|no such module/i.test(String(error.message))) return null;
      if (attempt === 1 || /locked|busy/i.test(String(error.message))) throw error;
      renameSync(path, `${path}.broken`);
    }
  }
  return null;
}

async function openProjectDb(ctx) {
  ignoreIndex(ctx.dir);
  return openDb(ctx.index);
}

const asText = (json) => JSON.parse(json).join(' ');

function insertRow(db, row, versions) {
  deleteRow(db, row.project, row.name);
  db.prepare(`INSERT INTO refs(project, project_name, name, level, summary, variants, contexts, composed_of, license, origin, relation, path, latest, sha256, structural, live_sha, live_mtime, live_size, rec_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(row.project, row.project_name, row.name, row.level, row.summary, row.variants, row.contexts, row.composed_of, row.license, row.origin, row.relation, row.path, row.latest, row.sha256, row.structural, row.live_sha, row.live_mtime, row.live_size, row.rec_hash);
  for (const version of versions) db.prepare('INSERT INTO versions(project, piece, n, sha256, structural) VALUES (?,?,?,?,?)').run(row.project, row.name, version.n, version.sha256, version.structural);
  db.prepare('INSERT INTO refs_fts(project, name, summary, variants, contexts, composed_of) VALUES (?,?,?,?,?,?)')
    .run(row.project, row.name, row.summary ?? '', asText(row.variants), asText(row.contexts), asText(row.composed_of));
}

function deleteRow(db, project, name) {
  db.prepare('DELETE FROM refs WHERE project = ? AND name = ?').run(project, name);
  db.prepare('DELETE FROM versions WHERE project = ? AND piece = ?').run(project, name);
  db.prepare('DELETE FROM refs_fts WHERE project = ? AND name = ?').run(project, name);
}

const statSafe = (path) => {
  try {
    return statSync(path);
  } catch {
    return null;
  }
};

/** A registry record as an index row. The row holds metadata and hashes, never source text. */
function rowFromRecord(ctx, record, recHash, live, st) {
  return {
    project: ctx.root,
    project_name: ctx.name,
    name: record.name,
    level: record.level,
    summary: record.summary ?? '',
    variants: JSON.stringify(record.variants ?? []),
    contexts: JSON.stringify(record.contexts ?? []),
    composed_of: JSON.stringify(record.composedOf ?? []),
    license: record.license ?? null,
    origin: record.origin ?? 'generated',
    relation: record.relation ?? 'chosen',
    path: record.files[0],
    latest: record.latest,
    sha256: record.versions.at(-1)?.sha256 ?? null,
    structural: record.versions.at(-1)?.structural ?? null,
    live_sha: live,
    live_mtime: st ? st.mtimeMs : null,
    live_size: st ? st.size : null,
    rec_hash: recHash,
  };
}

/** Folds the history lines past the stored offset into stats; a shorter file starts over. Returns the events consumed. */
function indexHistory(db, ctx) {
  const stored = db.prepare("SELECT value FROM meta WHERE key = 'history_bytes'").get();
  let offset = stored ? Number(stored.value) : 0;
  const buffer = existsSync(ctx.history) ? readFileSync(ctx.history) : Buffer.alloc(0);
  if (buffer.length < offset) {
    db.prepare('DELETE FROM stats WHERE project = ?').run(ctx.root);
    offset = 0;
  }
  const end = buffer.lastIndexOf(10) + 1; // only complete lines
  let events = 0;
  if (end > offset) {
    for (const line of buffer.subarray(offset, end).toString('utf8').split('\n')) {
      if (!line.trim()) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }
      events += 1;
      if (!event.piece || !['like', 'dislike', 'use'].includes(event.type)) continue;
      db.prepare('INSERT OR IGNORE INTO stats(project, piece) VALUES (?, ?)').run(ctx.root, event.piece);
      const column = event.type === 'like' ? 'likes' : event.type === 'dislike' ? 'dislikes' : 'uses';
      db.prepare(`UPDATE stats SET ${column} = ${column} + 1${event.type === 'use' ? ', last_used = ?' : ''} WHERE project = ? AND piece = ?`)
        .run(...(event.type === 'use' ? [event.ts ?? now(), ctx.root, event.piece] : [ctx.root, event.piece]));
    }
  }
  db.prepare("INSERT OR REPLACE INTO meta(key, value) VALUES ('history_bytes', ?)").run(String(Math.max(offset, end)));
  return events;
}

/**
 * Brings the project's index up to date. A piece is read again only when its registry record changed or its real
 * file changed (size/mtime first, then the SHA-256); the history is folded in from the stored byte offset.
 */
function syncProject(db, ctx) {
  const registry = loadRegistry(ctx);
  const known = new Map(db.prepare('SELECT * FROM refs WHERE project = ?').all(ctx.root).map((row) => [row.name, row]));
  const names = Object.keys(registry.pieces);
  const result = { pieces: names.length, changed: 0, unchanged: 0, removed: 0, events: 0 };
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const name of names) {
      const record = registry.pieces[name];
      const recHash = sha256(JSON.stringify(record));
      const st = statSafe(join(ctx.root, record.files[0]));
      const previous = known.get(name);
      if (previous && previous.rec_hash === recHash && st && previous.live_mtime === st.mtimeMs && previous.live_size === st.size) {
        result.unchanged += 1;
        continue;
      }
      const live = st ? sha256(normalizeNewlines(readFileSync(join(ctx.root, record.files[0]), 'utf8'))) : null;
      if (previous && previous.rec_hash === recHash && previous.live_sha === live) {
        db.prepare('UPDATE refs SET live_mtime = ?, live_size = ? WHERE project = ? AND name = ?').run(st?.mtimeMs ?? null, st?.size ?? null, ctx.root, name);
        result.unchanged += 1;
        continue;
      }
      insertRow(db, rowFromRecord(ctx, record, recHash, live, st), record.versions);
      result.changed += 1;
    }
    for (const name of known.keys()) {
      if (registry.pieces[name]) continue;
      deleteRow(db, ctx.root, name);
      result.removed += 1;
    }
    result.events = indexHistory(db, ctx);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return result;
}

/** Copies this project's references (metadata, hashes, stats; no code) into the global index. */
function pushGlobal(gdb, pdb, ctx) {
  const rows = pdb.prepare('SELECT * FROM refs WHERE project = ?').all(ctx.root);
  const known = new Map(gdb.prepare('SELECT name, rec_hash, live_sha FROM refs WHERE project = ?').all(ctx.root).map((row) => [row.name, row]));
  const summary = { pieces: rows.length, changed: 0, removed: 0 };
  gdb.exec('BEGIN IMMEDIATE');
  try {
    for (const row of rows) {
      const previous = known.get(row.name);
      if (previous && previous.rec_hash === row.rec_hash && previous.live_sha === row.live_sha) continue;
      insertRow(gdb, row, pdb.prepare('SELECT n, sha256, structural FROM versions WHERE project = ? AND piece = ?').all(ctx.root, row.name));
      summary.changed += 1;
    }
    const names = new Set(rows.map((row) => row.name));
    for (const name of known.keys()) {
      if (names.has(name)) continue;
      deleteRow(gdb, ctx.root, name);
      summary.removed += 1;
    }
    gdb.prepare('DELETE FROM stats WHERE project = ?').run(ctx.root);
    for (const stat of pdb.prepare('SELECT * FROM stats WHERE project = ?').all(ctx.root)) {
      gdb.prepare('INSERT INTO stats(project, piece, likes, dislikes, uses, last_used) VALUES (?,?,?,?,?,?)').run(stat.project, stat.piece, stat.likes, stat.dislikes, stat.uses, stat.last_used);
    }
    gdb.exec('COMMIT');
  } catch (error) {
    gdb.exec('ROLLBACK');
    throw error;
  }
  return summary;
}

/** Project index synced, then the global references pushed. Returns null (and says so) without node:sqlite. */
async function refreshAll(ctx) {
  registerProject(ctx);
  const pdb = await openProjectDb(ctx);
  if (!pdb) {
    sayFallback();
    return null;
  }
  let gdb;
  try {
    const local = syncProject(pdb, ctx);
    gdb = await openDb(ctx.globalIndex);
    const global = gdb ? pushGlobal(gdb, pdb, ctx) : null;
    return { ...local, global };
  } finally {
    pdb.close();
    gdb?.close();
  }
}

/** Called after every command that changes a registry. A locked or broken index never fails the command itself. */
async function afterMutation(ctx) {
  try {
    await refreshAll(ctx);
  } catch (error) {
    console.error(`pieces: index not refreshed (${error.message}); run: pieces.mjs index`);
  }
}

// ---------------------------------------------------------------- reading rows: own project and other projects

const tasteScore = (stats) => stats.likes * 3 + stats.uses - stats.dislikes * 4;
const singularWord = (word) => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word);
const wordsOf = (text) => String(text).toLowerCase().match(/[a-z0-9]+/g) ?? [];
/** Each query word also matches its singular, as a word prefix. */
const queryTerms = (text) => [...new Set(wordsOf(text))].map((word) => [...new Set([word, singularWord(word)])]);

function rowFromDb(r, ownRoot) {
  return {
    project: r.project,
    projectName: r.project_name,
    own: r.project === ownRoot,
    name: r.name,
    level: r.level,
    summary: r.summary ?? '',
    variants: JSON.parse(r.variants),
    contexts: JSON.parse(r.contexts),
    composedOf: JSON.parse(r.composed_of),
    license: r.license,
    origin: r.origin,
    relation: r.relation,
    path: r.path,
    latest: r.latest,
    likes: r.likes ?? 0,
    dislikes: r.dislikes ?? 0,
    uses: r.uses ?? 0,
  };
}

function rowFromRegistry(item, ownRoot, record, stats) {
  return {
    project: item.root,
    projectName: item.name,
    own: item.root === ownRoot,
    name: record.name,
    level: record.level,
    summary: record.summary ?? '',
    variants: record.variants ?? [],
    contexts: record.contexts ?? [],
    composedOf: record.composedOf ?? [],
    license: record.license ?? null,
    origin: record.origin ?? 'generated',
    relation: record.relation ?? 'chosen',
    path: record.files[0],
    latest: record.latest,
    likes: stats.likes,
    dislikes: stats.dislikes,
    uses: stats.uses,
  };
}

function queryRows(db, ownRoot, { only, except, text }) {
  const where = [];
  const params = [];
  if (only) {
    where.push('r.project = ?');
    params.push(only);
  }
  if (except) {
    where.push('r.project <> ?');
    params.push(except);
  }
  const rows = db.prepare(`SELECT r.*, COALESCE(s.likes, 0) AS likes, COALESCE(s.dislikes, 0) AS dislikes, COALESCE(s.uses, 0) AS uses
    FROM refs r LEFT JOIN stats s ON s.project = r.project AND s.piece = r.name${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`).all(...params);
  let hits = null;
  const terms = text ? queryTerms(text).flat() : [];
  if (terms.length > 0) {
    hits = new Set(db.prepare('SELECT project, name FROM refs_fts WHERE refs_fts MATCH ?').all(terms.map((form) => `"${form}"*`).join(' OR ')).map((r) => `${r.project}\0${r.name}`));
  }
  return rows.filter((r) => !hits || hits.has(`${r.project}\0${r.name}`)).map((r) => rowFromDb(r, ownRoot));
}

function registryRows(item, ownRoot) {
  const registry = registryAt(join(item.out, 'pieces', 'pieces.json'));
  const stats = statsFrom(readHistoryAt(join(item.out, 'pieces', 'history.jsonl')));
  return Object.values(registry.pieces).map((record) => rowFromRegistry(item, ownRoot, record, stats.get(record.name) ?? emptyStats()));
}

/** How many query words appear (as word prefixes) in the piece's searchable text. */
function matchedTerms(row, terms) {
  const words = wordsOf([row.name, row.summary, ...row.variants, ...row.contexts, ...row.composedOf].join(' '));
  return terms.filter((forms) => forms.some((form) => words.some((word) => word.startsWith(form)))).length;
}

/**
 * Pieces of this project and, when asked, of the other registered projects (references from the global index; the
 * registries are scanned without node:sqlite). Unranked: see rankRows.
 */
async function loadRows(ctx, { others = false, text } = {}) {
  const pdb = await openProjectDb(ctx);
  if (!pdb) {
    sayFallback();
    const own = registryRows({ root: ctx.root, name: ctx.name, out: ctx.out }, ctx.root);
    return { own, others: others ? registeredProjects(ctx).flatMap((item) => registryRows(item, ctx.root)) : [] };
  }
  let gdb;
  try {
    syncProject(pdb, ctx);
    const own = queryRows(pdb, ctx.root, { only: ctx.root, text });
    let elsewhere = [];
    if (others && existsSync(ctx.globalIndex)) {
      gdb = await openDb(ctx.globalIndex);
      if (gdb) elsewhere = queryRows(gdb, ctx.root, { except: ctx.root, text });
    }
    return { own, others: elsewhere };
  } finally {
    pdb.close();
    gdb?.close();
  }
}

/** Filtered by level / origin / liked / text, ranked by matched words, then taste (likes and uses up, dislikes down), then name. */
function rankRows(rows, { text, level, liked, origin } = {}) {
  const terms = text ? queryTerms(text) : [];
  return rows
    .map((row) => ({ row, matched: terms.length > 0 ? matchedTerms(row, terms) : 0 }))
    .filter(({ row, matched }) => (!level || row.level === level)
      && (!origin || originKind(row.origin) === origin)
      && (!liked || row.likes > row.dislikes)
      && (terms.length === 0 || matched > 0))
    .sort((a, b) => b.matched - a.matched || tasteScore(b.row) - tasteScore(a.row) || (a.row.name < b.row.name ? -1 : a.row.name > b.row.name ? 1 : 0)
      || (a.row.project < b.row.project ? -1 : 1))
    .map(({ row }) => row);
}

/** Pieces (latest matching version) whose source has the same structural hash, in this project and in the others. */
async function structuralDuplicates(ctx, hash) {
  const found = [];
  const pdb = await openProjectDb(ctx);
  if (!pdb) {
    sayFallback();
    for (const item of [{ root: ctx.root, name: ctx.name, out: ctx.out }, ...registeredProjects(ctx)]) {
      for (const record of Object.values(registryAt(join(item.out, 'pieces', 'pieces.json')).pieces)) {
        const matching = record.versions.filter((version) => version.structural === hash);
        if (matching.length > 0) found.push({ piece: record.name, version: Math.max(...matching.map((version) => version.n)), project: item.root, projectName: item.name, own: item.root === ctx.root });
      }
    }
    return found;
  }
  let gdb;
  try {
    syncProject(pdb, ctx);
    const query = 'SELECT v.piece, MAX(v.n) AS version, v.project, r.project_name FROM versions v JOIN refs r ON r.project = v.project AND r.name = v.piece WHERE v.structural = ?';
    for (const r of pdb.prepare(`${query} GROUP BY v.project, v.piece ORDER BY v.piece`).all(hash)) {
      found.push({ piece: r.piece, version: Number(r.version), project: r.project, projectName: r.project_name, own: true });
    }
    if (existsSync(ctx.globalIndex)) {
      gdb = await openDb(ctx.globalIndex);
      if (gdb) {
        for (const r of gdb.prepare(`${query} AND v.project <> ? GROUP BY v.project, v.piece ORDER BY v.project, v.piece`).all(hash, ctx.root)) {
          found.push({ piece: r.piece, version: Number(r.version), project: r.project, projectName: r.project_name, own: false });
        }
      }
    }
  } finally {
    pdb.close();
    gdb?.close();
  }
  return found;
}

// ---------------------------------------------------------------- guards other tools reuse (S5)

/** The needs `find` ran for in the project whose output folder is outputDir. */
export function readFinds(outputDir) {
  const data = readJsonFile(join(outputDir, 'pieces', 'pieces.json'), {});
  return Array.isArray(data.finds) ? data.finds : [];
}

/** True when a `find` was recorded for this need (same words, or one contains the other's words). */
export function findRan(outputDir, need) {
  return readFinds(outputDir).some((entry) => matchName(entry.need, need) !== null);
}

/** The piece registered in the project (outputDir) that a build's name or block resolves to (same matcher as add and find), or null. */
export function registeredPiece(name, block, outputDir) {
  const pieces = Object.keys(readJsonFile(join(outputDir, 'pieces', 'pieces.json'), {}).pieces ?? {});
  return pieces.find((piece) => (name && matchName(name, piece)) || (block && matchName(block, piece))) ?? null;
}

/** Pieces of the project (root, output folder) whose real file changed since the last recorded version. A missing file is not "changed". */
export function changedPieces(root, outputDir) {
  const pieces = Object.values(readJsonFile(join(outputDir, 'pieces', 'pieces.json'), {}).pieces ?? {});
  const changed = [];
  for (const piece of pieces) {
    const latest = piece.versions?.at(-1);
    if (!latest) continue;
    try {
      const texts = piece.files.map((file) => normalizeNewlines(readProjectFile(root, file)));
      if (combinedHash(texts) !== latest.sha256) changed.push({ name: piece.name, version: latest.n });
    } catch {
      // moved or deleted: `show` reports it, the guard does not
    }
  }
  return changed;
}

// ---------------------------------------------------------------- creating pieces

/** The one place that registers a piece: add, adopt and the components that land through get.mjs all come here. */
async function createPiece(ctx, spec, eventType = 'add') {
  const registry = loadRegistry(ctx);
  if (registry.pieces[spec.name]) throw new Fail(`piece "${spec.name}" already exists; record a polished state with: pieces.mjs version ${spec.name}`);
  const owner = Object.values(registry.pieces).find((piece) => piece.files.some((file) => spec.rels.includes(file)));
  if (owner) throw new Fail(`${spec.rels.join(', ')} is already registered as piece "${owner.name}"; record its changes with: pieces.mjs version ${owner.name}`);
  const entry = versionEntry(1, snapshot(ctx, spec.rels), null);
  const record = {
    name: spec.name,
    level: spec.level,
    summary: spec.summary ?? '',
    variants: spec.variants ?? [],
    contexts: spec.contexts ?? [],
    composedOf: spec.composedOf ?? [],
    license: spec.license ?? null,
    origin: spec.origin ?? 'generated',
    relation: spec.relation ?? 'chosen',
    files: spec.rels,
    created: entry.ts,
    ...(spec.reason ? { newReason: spec.reason } : {}),
    latest: 1,
    versions: [entry],
  };
  registry.pieces[spec.name] = record;
  saveRegistry(ctx, registry);
  appendHistory(ctx, { type: eventType, piece: spec.name, version: 1, level: spec.level, origin: record.origin, relation: record.relation, ...(spec.reason ? { reason: spec.reason } : {}) });
  await afterMutation(ctx);
  return record;
}

/** S3: a new piece is the last conclusion. Refuses without a find for the need or when a piece (here or elsewhere) already fits. */
async function checkReuse(ctx, name, text, flags) {
  const need = flags.need ?? name.replace(/-/g, ' ');
  const searched = readFinds(ctx.out).some((entry) => (flags.need ? matchName(entry.need, flags.need) === 'exact' : matchName(entry.need, name) !== null));
  const override = 'or, if none fits, say why: --new --reason "..."';
  if (!searched) {
    throw new Fail(`no find ran for "${need}" in this project. Search before creating: node tools/pieces.mjs find "${need}" (${flags.need ? 'then add with the same --need' : 'it must be about this piece'}); ${override}`);
  }
  const { own, others } = await loadRows(ctx, { others: true });
  for (const row of [...own, ...others]) {
    const match = matchName(name, row.name);
    if (!match) continue;
    const verb = match === 'exact' ? 'the same as' : 'close to';
    if (row.own) {
      throw new Fail(`"${name}" is ${verb} "${row.name}". Reuse it (pieces.mjs use ${row.name}) or polish it (pieces.mjs version ${row.name} [--variants <v>]); ${override}`);
    }
    throw new Fail(`"${name}" is ${verb} "${row.name}" in project ${row.projectName}. Bring it with: pieces.mjs adopt ${row.name} --from ${row.projectName}; ${override}`);
  }
  const duplicate = (await structuralDuplicates(ctx, structuralHash(text)))[0];
  if (duplicate) {
    const where = duplicate.own ? '' : ` in project ${duplicate.projectName}`;
    const reuse = duplicate.own
      ? `Reuse it (pieces.mjs use ${duplicate.piece}), add a variant (pieces.mjs version ${duplicate.piece} --variants <v>)`
      : `Bring it with: pieces.mjs adopt ${duplicate.piece} --from ${duplicate.projectName}`;
    throw new Fail(`the file has the same structure as "${duplicate.piece}" v${duplicate.version}${where} (names, texts and comments aside). ${reuse}; ${override}`);
  }
}

/** Registers a component that landed in the project (used by get.mjs --landed). Provenance is recorded, no guard: it came from the catalog. */
export async function registerLanded({ dir, global, name, level, file, origin, relation, license, summary }) {
  const ctx = makeContext({ dir, global });
  const rels = listOption(file).map((item) => relativeInProject(ctx, item));
  if (rels.length === 0) throw new Fail('registerLanded needs the path of the landed file');
  const pieceName = name ?? basename(rels[0], extname(rels[0])).replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase().replace(/^-+|-+$/g, '');
  if (!NAME_PATTERN.test(pieceName)) throw new Fail(`cannot derive a kebab-case piece name from "${rels[0]}"; pass --name`);
  return createPiece(ctx, {
    name: pieceName,
    level: levelOption(level ?? 'small'),
    rels,
    summary: summary ?? '',
    license: license ?? null,
    origin: originOption(origin ?? 'generated'),
    relation: relationOption(relation ?? 'chosen'),
  });
}

// ---------------------------------------------------------------- commands

async function runAdd(ctx, flags) {
  const name = nameArg(flags, 'add');
  if (!flags.level) throw usageError('add needs --level micro|small|medium|large');
  const level = levelOption(flags.level);
  if (!flags.file) throw usageError('add needs --file <path of the component in this project>');
  const origin = originOption(flags.origin ?? 'generated');
  const relation = relationOption(flags.relation ?? 'chosen');
  if (flags.new && !flags.reason) throw usageError('--new needs --reason "why no existing piece fits"');
  if (flags.reason && !flags.new) throw usageError('--reason only goes with --new');
  if (loadRegistry(ctx).pieces[name]) throw new Fail(`piece "${name}" already exists; record a polished state with: pieces.mjs version ${name}`);
  const rels = listOption(flags.file).map((item) => relativeInProject(ctx, item));
  const snap = snapshot(ctx, rels);
  if (!flags.new) await checkReuse(ctx, name, snap.text, flags);
  const record = await createPiece(ctx, {
    name,
    level,
    rels,
    summary: flags.summary,
    variants: listOption(flags.variants),
    contexts: listOption(flags.contexts),
    composedOf: listOption(flags['composed-of']),
    license: flags.license,
    origin,
    relation,
    reason: flags.new ? flags.reason : null,
  });
  emit(flags, { action: 'add', piece: name, level, version: 1, files: record.files, origin, relation }, `pieces: added "${name}" (${level}) v1 — ${record.files.join(', ')} [${origin}, ${relation}]`);
  return 0;
}

function detectComponentDir(root) {
  return COMPONENT_DIRS.find((dir) => existsSync(join(root, dir))) ?? 'src/components';
}

async function runAdopt(ctx, flags) {
  const wanted = nameArg(flags, 'adopt');
  if (flags.as && !NAME_PATTERN.test(flags.as)) throw usageError(`--as "${flags.as}" must be kebab-case`);
  const name = flags.as ?? wanted;
  const { others } = await loadRows(ctx, { others: true });
  let candidates = others.filter((row) => matchName(wanted, row.name) === 'exact');
  if (flags.from) candidates = candidates.filter((row) => row.projectName === flags.from || row.project === resolve(flags.from));
  if (candidates.length === 0) {
    throw new Fail(`no piece "${wanted}" in the other registered projects${flags.from ? ` (project ${flags.from})` : ''}. Search with: pieces.mjs find "${wanted.replace(/-/g, ' ')}"`);
  }
  const projects = [...new Set(candidates.map((row) => row.projectName))];
  if (projects.length > 1) throw new Fail(`"${wanted}" exists in several projects (${projects.join(', ')}); pick one with --from <project>`);
  const donorRow = candidates[0];
  const donorItem = registeredProjects(ctx).find((item) => item.root === donorRow.project);
  const donor = registryAt(join(donorItem.out, 'pieces', 'pieces.json')).pieces[donorRow.name];
  if (!donor) throw new Fail(`project ${donorRow.projectName} no longer has "${wanted}" in its registry; run pieces.mjs index there`);
  const registry = loadRegistry(ctx);
  if (registry.pieces[name]) throw new Fail(`piece "${name}" already exists in this project; adopt it under another name with --as <name>`);
  const targetDir = flags.to ?? detectComponentDir(ctx.root);
  const plan = donor.files.map((file) => {
    const from = join(donorRow.project, file);
    if (!existsSync(from)) throw new Fail(`${file} no longer exists in project ${donorRow.projectName}`);
    const rel = relativeInProject(ctx, join(targetDir, basename(file)));
    if (existsSync(join(ctx.root, rel))) throw new Fail(`${rel} already exists in this project; choose another folder with --to <dir>`);
    return { from, rel };
  });
  const duplicate = (await structuralDuplicates(ctx, structuralHash(readFileSync(plan[0].from, 'utf8')))).find((item) => item.own);
  if (duplicate) console.error(`pieces: warning: the file has the same structure as your piece "${duplicate.piece}" v${duplicate.version}; consider using that one`);
  for (const step of plan) {
    mkdirSync(dirname(join(ctx.root, step.rel)), { recursive: true });
    copyFileSync(step.from, join(ctx.root, step.rel));
  }
  const origin = `project:${donorRow.projectName}:${donor.files[0]}`;
  const record = await createPiece(ctx, {
    name,
    level: donor.level,
    rels: plan.map((step) => step.rel),
    summary: donor.summary,
    variants: donor.variants,
    contexts: donor.contexts,
    composedOf: donor.composedOf,
    license: donor.license,
    origin,
    relation: 'chosen',
  }, 'adopt');
  emit(flags, { action: 'adopt', piece: name, from: donorRow.projectName, origin, files: record.files },
    `pieces: adopted "${name}" from project ${donorRow.projectName} — copied to ${record.files.join(', ')} [${origin}]; it evolves in this project from now on`);
  return 0;
}

async function runVersion(ctx, flags) {
  const name = nameArg(flags, 'version');
  const registry = loadRegistry(ctx);
  const piece = requirePiece(registry, name);
  if (flags.relation) relationOption(flags.relation);
  const rels = flags.file ? listOption(flags.file).map((item) => relativeInProject(ctx, item)) : piece.files;
  const snap = snapshot(ctx, rels);
  const latest = piece.versions.at(-1);
  const metadata = {
    summary: flags.summary ?? piece.summary,
    variants: merge(piece.variants, listOption(flags.variants)),
    contexts: merge(piece.contexts, listOption(flags.contexts)),
    composedOf: merge(piece.composedOf, listOption(flags['composed-of'])),
  };
  const metadataChanged = JSON.stringify(metadata) !== JSON.stringify({ summary: piece.summary, variants: piece.variants, contexts: piece.contexts, composedOf: piece.composedOf });
  const moved = JSON.stringify(rels) !== JSON.stringify(piece.files);
  const relationChanged = flags.relation && flags.relation !== piece.relation;
  if (snap.sha256 === latest.sha256) {
    if (metadataChanged || moved || relationChanged) {
      Object.assign(piece, metadata, { files: rels }, relationChanged ? { relation: flags.relation } : {});
      saveRegistry(ctx, registry);
      appendHistory(ctx, { type: 'note', piece: name, note: `metadata updated: ${Object.keys(metadata).join(', ')}` });
      await afterMutation(ctx);
    }
    emit(flags, { action: 'version', piece: name, created: false, equals: latest.n, metadataUpdated: Boolean(metadataChanged || moved || relationChanged) },
      `pieces: "${name}" unchanged: identical to v${latest.n}${metadataChanged || moved || relationChanged ? ' (variants/contexts/summary/relation updated)' : ''}`);
    return 0;
  }
  const entry = versionEntry(latest.n + 1, snap, flags.note);
  const sameAs = piece.versions.find((version) => version.sha256 === snap.sha256);
  if (sameAs) entry.sameAs = sameAs.n;
  Object.assign(piece, metadata, { files: rels });
  piece.versions.push(entry);
  piece.latest = entry.n;
  // adapting a component that came from outside turns "chosen" into "modified"
  if (flags.relation) piece.relation = flags.relation;
  else if (piece.relation === 'chosen' && originKind(piece.origin) !== 'generated') piece.relation = 'modified';
  saveRegistry(ctx, registry);
  appendHistory(ctx, { type: 'version', piece: name, version: entry.n, sha256: entry.sha256, ...(entry.commit ? { commit: entry.commit } : {}), ...(flags.note ? { note: flags.note } : {}) });
  await afterMutation(ctx);
  emit(flags, { action: 'version', piece: name, created: true, version: entry.n, sha256: entry.sha256, commit: entry.commit ?? null, relation: piece.relation },
    `pieces: "${name}" v${entry.n} recorded (sha256 ${shortHash(entry.sha256)}${entry.commit ? `, commit ${entry.commit.slice(0, 8)}${entry.dirty ? '+uncommitted' : ''}` : ''})${sameAs ? `; same content as v${sameAs.n}` : ''}`);
  return 0;
}

async function runUse(ctx, flags) {
  const name = nameArg(flags, 'use');
  const registry = loadRegistry(ctx);
  const piece = requirePiece(registry, name);
  const version = versionOption(flags) ?? piece.latest;
  requireVersion(piece, version);
  if (flags.variant && !piece.variants.includes(flags.variant)) {
    throw new Fail(`"${name}" has no variant "${flags.variant}" (variants: ${piece.variants.join(', ') || 'none'}); add it with: pieces.mjs version ${name} --variants ${flags.variant}`);
  }
  registry.used[name] = { version, ...(flags.variant ? { variant: flags.variant } : {}), ts: now() };
  saveRegistry(ctx, registry);
  appendHistory(ctx, { type: 'use', piece: name, version, ...(flags.variant ? { variant: flags.variant } : {}) });
  await afterMutation(ctx);
  emit(flags, { action: 'use', piece: name, version, variant: flags.variant ?? null },
    `pieces: using "${name}" v${version}${flags.variant ? ` (variant ${flags.variant})` : ''} — recorded in ${ctx.registry}`);
  return 0;
}

async function runFeedback(ctx, flags, type) {
  const name = nameArg(flags, type);
  const piece = requirePiece(loadRegistry(ctx), name);
  const version = versionOption(flags) ?? piece.latest;
  requireVersion(piece, version);
  appendHistory(ctx, { type, piece: name, version, ...(flags.note ? { note: flags.note } : {}) });
  const stats = statsFrom(readHistoryAt(ctx.history)).get(name) ?? emptyStats();
  await afterMutation(ctx);
  emit(flags, { action: type, piece: name, version, ...stats }, `pieces: ${type}d "${name}" v${version} (likes ${stats.likes}, dislikes ${stats.dislikes})`);
  return 0;
}

async function runNote(ctx, flags) {
  const name = nameArg(flags, 'note');
  requirePiece(loadRegistry(ctx), name);
  const text = flags._.slice(2).join(' ').trim() || flags.note;
  if (!text) throw usageError('note needs the text: pieces.mjs note <name> "text"');
  appendHistory(ctx, { type: 'note', piece: name, note: text });
  await afterMutation(ctx);
  emit(flags, { action: 'note', piece: name, note: text }, `pieces: noted "${name}"`);
  return 0;
}

const HISTORY_SHOWN = 30;

function describeEvent(event) {
  const parts = [event.ts, event.type];
  if (event.version) parts.push(`v${event.version}`);
  if (event.variant) parts.push(`variant=${event.variant}`);
  if (event.origin) parts.push(`origin=${event.origin}`);
  if (event.note) parts.push(`"${event.note}"`);
  return parts.join(' ');
}

async function runShow(ctx, flags) {
  const name = nameArg(flags, 'show');
  const piece = requirePiece(loadRegistry(ctx), name);
  const all = readHistoryAt(ctx.history);
  const events = all.filter((event) => event.piece === name).reverse();
  const stats = statsFrom(all).get(name) ?? emptyStats();
  const latest = piece.versions.at(-1);
  let drift = false;
  try {
    drift = snapshot(ctx, piece.files).sha256 !== latest.sha256;
  } catch {
    drift = null; // the file is gone or moved
  }
  if (flags.json) {
    console.log(JSON.stringify({ piece, stats, drift, history: events }, null, 2));
    return 0;
  }
  const lines = [];
  lines.push(`${piece.name} [${piece.level}] latest v${piece.latest}`);
  if (piece.summary) lines.push(`summary: ${piece.summary}`);
  lines.push(`origin: ${piece.origin} · relation: ${piece.relation} · license: ${piece.license ?? 'unset'}`);
  lines.push(`files: ${piece.files.join(', ')}${drift === true ? ` (changed since v${latest.n}: run pieces.mjs version ${name})` : drift === null ? ' (missing: moved or deleted?)' : ''}`);
  lines.push(`variants: ${piece.variants.join(', ') || 'none'} | contexts: ${piece.contexts.join(', ') || 'none'} | composed of: ${piece.composedOf.join(', ') || 'none'}`);
  lines.push(`likes ${stats.likes} · dislikes ${stats.dislikes} · used ${stats.uses} time(s)`);
  lines.push('Versions:');
  for (const version of [...piece.versions].reverse()) {
    lines.push(`  v${version.n} ${version.ts} ${shortHash(version.sha256)}${version.commit ? ` commit ${version.commit.slice(0, 8)}${version.dirty ? '+' : ''}` : ''}${version.note ? ` — ${version.note}` : ''}`);
  }
  lines.push(`History (newest first, ${events.length}):`);
  for (const event of events.slice(0, HISTORY_SHOWN)) lines.push(`  ${describeEvent(event)}`);
  if (events.length > HISTORY_SHOWN) lines.push(`  ... +${events.length - HISTORY_SHOWN} older in ${ctx.history}`);
  console.log(lines.join('\n'));
  return 0;
}

async function runList(ctx, flags) {
  if (flags._.length > 1) throw usageError(`list takes no arguments (got "${flags._.slice(1).join(' ')}")`);
  if (flags.level) levelOption(flags.level);
  if (flags.origin) originKindOption(flags.origin);
  const { own } = await loadRows(ctx, { text: flags.text });
  const pieces = rankRows(own, { text: flags.text, level: flags.level, liked: flags.liked, origin: flags.origin });
  if (flags.json) {
    console.log(JSON.stringify({ project: ctx.root, pieces }, null, 2));
    return 0;
  }
  if (pieces.length === 0) {
    console.log(`pieces: no pieces${flags.level ? ` at level ${flags.level}` : ''}${flags.origin ? ` with origin ${flags.origin}` : ''}${flags.text ? ` matching "${flags.text}"` : ''} in ${ctx.root}`);
    return 0;
  }
  const width = Math.max(...pieces.map((piece) => piece.name.length));
  for (const piece of pieces) {
    console.log(`${piece.name.padEnd(width)} | ${piece.level.padEnd(6)} | v${piece.latest} | +${piece.likes} -${piece.dislikes} | used ${piece.uses} | ${piece.origin}/${piece.relation} | ${piece.summary}`);
  }
  return 0;
}

const FIND_KEEP = 200;

function recordFind(ctx, need) {
  const registry = loadRegistry(ctx);
  registry.finds = [...registry.finds, { need, ts: now() }].slice(-FIND_KEEP);
  saveRegistry(ctx, registry);
}

function classify(need, rows, terms) {
  return rows.map((row) => {
    const byName = matchName(need, row.name);
    const matched = matchedTerms(row, terms);
    const match = byName ?? (terms.length >= 2 && matched === terms.length ? 'text' : 'related');
    return { ...row, match };
  }).sort((a, b) => ({ exact: 0, close: 1, text: 1, related: 2 })[a.match] - ({ exact: 0, close: 1, text: 1, related: 2 })[b.match]);
}

async function runFind(ctx, flags) {
  const need = flags._.slice(1).join(' ').trim();
  if (!need) throw usageError('find needs the need you are looking for: pieces.mjs find "pricing table"');
  const terms = queryTerms(need);
  const rows = await loadRows(ctx, { others: true, text: need });
  const own = classify(need, rankRows(rows.own, { text: need }), terms);
  const elsewhere = classify(need, rankRows(rows.others.filter((row) => existsSync(join(row.project, row.path))), { text: need }), terms);
  const exact = own.find((piece) => piece.match === 'exact');
  const close = own.find((piece) => piece.match === 'close' || piece.match === 'text');
  const foreign = elsewhere.find((piece) => piece.match !== 'related');
  let status = 'new';
  let catalog = [];
  let decision = 'nothing fits in your pieces, other projects or the catalog: this is a new piece. Build it in the project as a real component with variants as props, then register it with: pieces.mjs add <name> --level micro|small|medium|large --file <path>';
  if (exact) {
    status = 'reuse';
    decision = `reuse ${exact.name} (v${exact.latest}, ${exact.path}); record it with: pieces.mjs use ${exact.name}`;
  } else if (close) {
    status = 'variant';
    decision = `a close piece exists: make a new variant or version of ${close.name} instead of a new piece (edit ${close.path}, then pieces.mjs version ${close.name} [--variants <v>])`;
  } else if (foreign) {
    status = 'adopt';
    decision = `project ${foreign.projectName} has ${foreign.name}: bring it with pieces.mjs adopt ${foreign.name} --from ${foreign.projectName}, then evolve it here`;
  } else {
    catalog = catalogCandidates(need);
    if (catalog.length > 0) {
      status = 'catalog';
      decision = 'no piece fits: adapt a catalog candidate (node tools/get.mjs <id>), place it in the project, then register it (get.mjs --landed <path> does it with its origin)';
    }
  }
  let nearDuplicates = [];
  if (flags.file) {
    const rel = relativeInProject(ctx, flags.file);
    nearDuplicates = await structuralDuplicates(ctx, structuralHash(readProjectFile(ctx.root, rel)));
  }
  recordFind(ctx, need);
  if (flags.json) {
    console.log(JSON.stringify({ need, status, own, others: elsewhere, catalog, nearDuplicates, decision: `Decision: ${decision}` }, null, 2));
    return 0;
  }
  console.log(`find "${need}": ${status}`);
  if (own.length > 0) {
    console.log('Own pieces:');
    for (const piece of own.slice(0, 5)) console.log(`  - ${piece.name} [${piece.level}] v${piece.latest} (${piece.match}) +${piece.likes} -${piece.dislikes} used ${piece.uses}${piece.summary ? ` — ${piece.summary}` : ''}`);
  }
  if (elsewhere.length > 0) {
    console.log('Other projects:');
    for (const piece of elsewhere.slice(0, 5)) console.log(`  - ${piece.name} [${piece.level}] in ${piece.projectName} (${piece.match}) ${piece.path}${piece.summary ? ` — ${piece.summary}` : ''}`);
  }
  if (catalog.length > 0) {
    console.log('Candidates (catalog):');
    for (const entry of catalog) console.log(`  - ${entry.id} | ${entry.name} | ${entry.category} | q${entry.quality ?? '-'}`);
  }
  for (const duplicate of nearDuplicates) console.log(`Warning: near-duplicate of ${duplicate.piece} v${duplicate.version}${duplicate.own ? '' : ` in project ${duplicate.projectName}`} (same structure as the file given)`);
  console.log(`Decision: ${decision}.`);
  return 0;
}

async function runIndex(ctx, flags) {
  if (flags._.length > 1) throw usageError(`index takes no arguments (got "${flags._.slice(1).join(' ')}")`);
  const result = await refreshAll(ctx);
  if (!result) {
    const count = Object.keys(loadRegistry(ctx).pieces).length;
    emit(flags, { engine: 'files', pieces: count, changed: 0, unchanged: count, removed: 0, events: 0, global: null }, `index: no index.db without node:sqlite; ${count} piece(s) are read from the registries on demand`);
    return 0;
  }
  emit(flags, { engine: 'sqlite', index: ctx.index, globalIndex: ctx.globalIndex, ...result },
    `index: sqlite — ${result.pieces} piece(s) (${result.changed} changed, ${result.unchanged} unchanged, ${result.removed} removed), ${result.events} new history event(s) — ${ctx.index}; global references ${result.global ? `${result.global.changed} updated` : 'unavailable'} — ${ctx.globalIndex}`);
  return 0;
}

async function runPersonality(ctx, flags) {
  const action = flags._[1];
  if (action === 'show') {
    if (flags._.length > 2) throw usageError('personality show takes no arguments');
    const registry = loadRegistry(ctx);
    const entries = Object.entries(registry.settings);
    if (flags.json) console.log(JSON.stringify({ settings: registry.settings, used: registry.used }, null, 2));
    else if (entries.length === 0) console.log(`personality: no settings yet in ${ctx.registry} (set one with: pieces.mjs personality set <key> <value>)`);
    else for (const [key, value] of entries) console.log(`${key}: ${value}`);
    return 0;
  }
  if (action === 'set') {
    const key = flags._[2];
    const value = flags._.slice(3).join(' ');
    if (!key || !value) throw usageError('personality set needs a key and a value: pieces.mjs personality set <key> <value>');
    const registry = loadRegistry(ctx);
    registry.settings[key] = value;
    saveRegistry(ctx, registry);
    emit(flags, { action: 'personality', key, value }, `personality: ${key} = ${value} — recorded in ${ctx.registry}`);
    return 0;
  }
  throw usageError('personality needs "set <key> <value>" or "show"');
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.error) {
    console.error(`pieces: ${flags.error}\n`);
    console.error(USAGE);
    return 2;
  }
  const command = flags._[0];
  if (flags.help || command === undefined) {
    console.log(USAGE);
    return 0;
  }
  if (!COMMANDS.includes(command)) {
    console.error(`pieces: unknown command "${command}"\n`);
    console.error(USAGE);
    return 2;
  }
  const ctx = makeContext(flags);
  try {
    if (command === 'add') return await runAdd(ctx, flags);
    if (command === 'adopt') return await runAdopt(ctx, flags);
    if (command === 'version') return await runVersion(ctx, flags);
    if (command === 'use') return await runUse(ctx, flags);
    if (command === 'like' || command === 'dislike') return await runFeedback(ctx, flags, command);
    if (command === 'note') return await runNote(ctx, flags);
    if (command === 'show') return await runShow(ctx, flags);
    if (command === 'list') return await runList(ctx, flags);
    if (command === 'index') return await runIndex(ctx, flags);
    if (command === 'find') return await runFind(ctx, flags);
    return await runPersonality(ctx, flags);
  } catch (error) {
    console.error(`pieces: ${error.message}`);
    if (error.code === 2) console.error(`\n${USAGE}`);
    return error instanceof Fail ? error.code : 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await main();
