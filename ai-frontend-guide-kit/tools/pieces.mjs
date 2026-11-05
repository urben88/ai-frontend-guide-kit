#!/usr/bin/env node
/**
 * pieces — shared library of reusable UI pieces (micro to large), with versions, variants, use and feedback.
 *
 * A piece is a real component whose variants are props, never a copy per variant. The library is shared by every
 * project; each project keeps only its usage and personality in ai-frontend-output/pieces.json. No dependencies.
 *
 * Library layout (files are the source of truth):
 *   <lib>/<piece-name>/piece.json     name, level, summary, variants, contexts, composedOf, license, latest, versions
 *   <lib>/<piece-name>/v<N>.<ext>     the source of each version
 *   <lib>/history.jsonl               append-only events: add, version, use, like, dislike, note
 *
 * Library: --lib, then AI_FRONTEND_PIECES, then ~/.ai-frontend-guide-kit/pieces.
 * Project root: --dir, then AI_FRONTEND_PROJECT, then the folder that holds the kit.
 * Output folder: AI_FRONTEND_OUTPUT, else <project-root>/ai-frontend-output.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogCandidates, matchName } from './ui-map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_DIR = resolve(__dirname, '..');

const LEVELS = ['micro', 'small', 'medium', 'large'];
const COMMANDS = ['add', 'version', 'use', 'like', 'dislike', 'note', 'show', 'list', 'index', 'find', 'personality'];
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ---------------------------------------------------------------- arguments and paths

const VALUE_OPTIONS = new Set(['dir', 'lib', 'level', 'file', 'summary', 'variants', 'contexts', 'composed-of', 'license', 'reason', 'version', 'variant', 'note', 'text', 'need']);
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

function resolveLibrary(flags) {
  if (flags.lib) return resolve(flags.lib);
  if (process.env.AI_FRONTEND_PIECES) return resolve(process.env.AI_FRONTEND_PIECES);
  return join(homedir(), '.ai-frontend-guide-kit', 'pieces');
}

const USAGE = `pieces — shared library of reusable UI pieces (micro, small, medium, large)

Usage:
  node tools/pieces.mjs add <name> --level micro|small|medium|large --file <src>
        [--summary "..."] [--variants a,b] [--contexts x,y] [--composed-of p1,p2] [--license MIT]
        [--need "the need you searched"] [--new --reason "why no existing piece fits"]
                                               register a new piece (version 1). Refused unless "find" ran for this
                                               need in this project and no exact, close or same-structure piece exists;
                                               --new --reason overrides that, and the reason is kept on record
  node tools/pieces.mjs version <name> --file <src> [--note "..."] [--variants a,b] [--contexts x,y]
                                               save a polished version; identical content is never stored twice
  node tools/pieces.mjs use <name> [--version N] [--variant v]
                                               record that this project uses the piece (latest version by default)
  node tools/pieces.mjs like <name> [--version N] [--note "..."]
  node tools/pieces.mjs dislike <name> [--version N] [--note "..."]
  node tools/pieces.mjs note <name> "text"     free note about the piece
  node tools/pieces.mjs show <name>            latest state first, then the history
  node tools/pieces.mjs list [--level micro|small|medium|large] [--liked] [--text "words"]
                                               ranked: liked and most used first, disliked last
  node tools/pieces.mjs find <need> [--file <src>]
                                               search order: own piece > new variant of a close piece > kit catalog >
                                               new piece. Records that it ran; --file also flags a same-structure piece
  node tools/pieces.mjs index                  rebuild/refresh <lib>/index.db (SQLite + FTS5); only changed pieces are read again
  node tools/pieces.mjs personality set <key> <value>
  node tools/pieces.mjs personality show       this project's settings (spacing, image weight, ...)

Options:
  --lib <dir>            shared library (default: AI_FRONTEND_PIECES, then ~/.ai-frontend-guide-kit/pieces)
  --dir <project-root>   project (default: AI_FRONTEND_PROJECT, then the folder that holds the kit)
  --json                 machine-readable output
  --help                 this text

Names are kebab-case. A variant is a prop of the same piece, never a copy. The library history is append-only.
Every command that changes the library refreshes index.db. Without node:sqlite (Node older than 22.13) the files are
scanned instead and one notice is printed; the results are the same.
The project keeps only its usage and personality in ai-frontend-output/pieces.json (or AI_FRONTEND_OUTPUT).`;

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

// ---------------------------------------------------------------- library files

const now = () => new Date().toISOString();
const pieceDir = (lib, name) => join(lib, name);
const piecePath = (lib, name) => join(lib, name, 'piece.json');

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  renameSync(temp, path);
}

function readJsonFile(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
  } catch {
    return fallback;
  }
}

function loadPiece(lib, name) {
  return existsSync(piecePath(lib, name)) ? readJsonFile(piecePath(lib, name), null) : null;
}

function requirePiece(lib, name) {
  const piece = loadPiece(lib, name);
  if (!piece) throw new Fail(`no piece "${name}" in ${lib}. Registered pieces: ${pieceNames(lib).join(', ') || 'none'}`);
  return piece;
}

function pieceNames(lib) {
  if (!existsSync(lib)) return [];
  return readdirSync(lib, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(piecePath(lib, entry.name)))
    .map((entry) => entry.name)
    .sort();
}

const historyPath = (lib) => join(lib, 'history.jsonl');

/** One JSON object per line, appended with a single write so concurrent writers never interleave. */
function appendHistory(lib, event) {
  mkdirSync(lib, { recursive: true });
  appendFileSync(historyPath(lib), `${JSON.stringify({ ts: now(), ...event })}\n`, 'utf8');
}

function readHistory(lib) {
  if (!existsSync(historyPath(lib))) return [];
  const events = [];
  for (const line of readFileSync(historyPath(lib), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // a torn or foreign line never breaks the library
    }
  }
  return events;
}

/** Likes, dislikes and uses per piece, from the history. */
function statsFrom(events) {
  const stats = new Map();
  for (const event of events) {
    if (!event.piece) continue;
    if (!stats.has(event.piece)) stats.set(event.piece, { likes: 0, dislikes: 0, uses: 0, projects: new Set() });
    const entry = stats.get(event.piece);
    if (event.type === 'like') entry.likes += 1;
    else if (event.type === 'dislike') entry.dislikes += 1;
    else if (event.type === 'use') {
      entry.uses += 1;
      if (event.project) entry.projects.add(event.project);
    }
  }
  return stats;
}

const emptyStats = () => ({ likes: 0, dislikes: 0, uses: 0, projects: new Set() });
const publicStats = (stats) => ({ likes: stats.likes, dislikes: stats.dislikes, uses: stats.uses, projects: stats.projects.size });

// ---------------------------------------------------------------- index (S6, S7): SQLite + FTS5 through node:sqlite

const SQLITE_NOTICE = 'pieces: node:sqlite is unavailable (needs Node 22.13+); scanning the library files instead (no index.db)';
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

const indexPath = (lib) => join(lib, 'index.db');
const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS pieces(name TEXT PRIMARY KEY, level TEXT, summary TEXT, variants TEXT, contexts TEXT, composed_of TEXT, license TEXT, latest INTEGER, piece_hash TEXT);
CREATE TABLE IF NOT EXISTS versions(piece TEXT, n INTEGER, sha256 TEXT, structural TEXT, PRIMARY KEY(piece, n));
CREATE INDEX IF NOT EXISTS versions_structural ON versions(structural);
CREATE INDEX IF NOT EXISTS versions_sha256 ON versions(sha256);
CREATE TABLE IF NOT EXISTS stats(piece TEXT PRIMARY KEY, likes INTEGER NOT NULL DEFAULT 0, dislikes INTEGER NOT NULL DEFAULT 0, uses INTEGER NOT NULL DEFAULT 0, last_used TEXT);
CREATE VIRTUAL TABLE IF NOT EXISTS pieces_fts USING fts5(name, summary, variants, contexts, composed_of);
`;

/** Opens index.db and creates the schema; null when node:sqlite or FTS5 is missing. A corrupt file is replaced. */
async function openIndex(lib) {
  const sqlite = await loadSqlite();
  if (!sqlite) return null;
  mkdirSync(lib, { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let db;
    try {
      db = new sqlite.DatabaseSync(indexPath(lib));
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
      renameSync(indexPath(lib), `${indexPath(lib)}.broken`);
    }
  }
  return null;
}

const asText = (list) => list.join(' ');

function upsertPiece(db, piece, hash) {
  db.prepare('DELETE FROM pieces WHERE name = ?').run(piece.name);
  db.prepare('DELETE FROM versions WHERE piece = ?').run(piece.name);
  db.prepare('DELETE FROM pieces_fts WHERE name = ?').run(piece.name);
  db.prepare('INSERT INTO pieces(name, level, summary, variants, contexts, composed_of, license, latest, piece_hash) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(piece.name, piece.level, piece.summary ?? '', JSON.stringify(piece.variants ?? []), JSON.stringify(piece.contexts ?? []), JSON.stringify(piece.composedOf ?? []), piece.license ?? null, piece.latest, hash);
  for (const version of piece.versions ?? []) {
    db.prepare('INSERT INTO versions(piece, n, sha256, structural) VALUES (?,?,?,?)').run(piece.name, version.n, version.sha256, version.structural);
  }
  db.prepare('INSERT INTO pieces_fts(name, summary, variants, contexts, composed_of) VALUES (?,?,?,?,?)')
    .run(piece.name, piece.summary ?? '', asText(piece.variants ?? []), asText(piece.contexts ?? []), asText(piece.composedOf ?? []));
}

function removePiece(db, name) {
  db.prepare('DELETE FROM pieces WHERE name = ?').run(name);
  db.prepare('DELETE FROM versions WHERE piece = ?').run(name);
  db.prepare('DELETE FROM pieces_fts WHERE name = ?').run(name);
}

/** Folds the history lines past the stored offset into stats; a shorter file starts over. Returns the events consumed. */
function indexHistory(db, lib) {
  const stored = db.prepare("SELECT value FROM meta WHERE key = 'history_bytes'").get();
  let offset = stored ? Number(stored.value) : 0;
  const path = historyPath(lib);
  const buffer = existsSync(path) ? readFileSync(path) : Buffer.alloc(0);
  if (buffer.length < offset) {
    db.exec('DELETE FROM stats');
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
      db.prepare('INSERT OR IGNORE INTO stats(piece) VALUES (?)').run(event.piece);
      const column = event.type === 'like' ? 'likes' : event.type === 'dislike' ? 'dislikes' : 'uses';
      db.prepare(`UPDATE stats SET ${column} = ${column} + 1${event.type === 'use' ? ', last_used = ?' : ''} WHERE piece = ?`)
        .run(...(event.type === 'use' ? [event.ts ?? now(), event.piece] : [event.piece]));
    }
  }
  db.prepare("INSERT OR REPLACE INTO meta(key, value) VALUES ('history_bytes', ?)").run(String(Math.max(offset, end)));
  return events;
}

/** Brings index.db up to date: only pieces whose piece.json hash changed, and only the new history lines. */
function syncIndex(db, lib) {
  const known = new Map(db.prepare('SELECT name, piece_hash FROM pieces').all().map((row) => [row.name, row.piece_hash]));
  const names = pieceNames(lib);
  const result = { pieces: names.length, changed: 0, unchanged: 0, removed: 0, events: 0 };
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const name of names) {
      const raw = readFileSync(piecePath(lib, name), 'utf8');
      const hash = sha256(raw);
      if (known.get(name) === hash) {
        result.unchanged += 1;
        continue;
      }
      const piece = readJsonFile(piecePath(lib, name), null);
      if (!piece) continue;
      upsertPiece(db, piece, hash);
      result.changed += 1;
    }
    for (const name of known.keys()) {
      if (names.includes(name)) continue;
      removePiece(db, name);
      result.removed += 1;
    }
    result.events = indexHistory(db, lib);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return result;
}

/** Index refresh used by the commands that search: sqlite when available, null for the file-scan fallback. */
async function freshIndex(lib) {
  const db = await openIndex(lib);
  if (!db) {
    sayFallback();
    return null;
  }
  try {
    syncIndex(db, lib);
  } catch (error) {
    db.close();
    throw error;
  }
  return db;
}

/** Called after every command that changes the library. A locked or broken index never fails the command itself. */
async function afterMutation(lib) {
  let db;
  try {
    db = await openIndex(lib);
    if (!db) {
      sayFallback();
      return;
    }
    syncIndex(db, lib);
  } catch (error) {
    console.error(`pieces: index not refreshed (${error.message}); run: pieces.mjs index`);
  } finally {
    db?.close();
  }
}

const tasteScore = (stats) => stats.likes * 3 + stats.uses - stats.dislikes * 4;
const singularWord = (word) => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word);
const wordsOf = (text) => String(text).toLowerCase().match(/[a-z0-9]+/g) ?? [];
/** Each query word also matches its singular, as a word prefix. */
const queryTerms = (text) => [...new Set(wordsOf(text))].map((word) => [...new Set([word, singularWord(word)])]);

function summaryRow(piece, stats) {
  return {
    name: piece.name,
    level: piece.level,
    latest: piece.latest,
    summary: piece.summary ?? '',
    variants: piece.variants ?? [],
    contexts: piece.contexts ?? [],
    composedOf: piece.composedOf ?? [],
    license: piece.license ?? null,
    likes: stats.likes,
    dislikes: stats.dislikes,
    uses: stats.uses,
  };
}

/** How many query words appear (as word prefixes) in the piece's searchable text. */
function matchedTerms(row, terms) {
  const words = wordsOf([row.name, row.summary, ...row.variants, ...row.contexts, ...row.composedOf].join(' '));
  return terms.filter((forms) => forms.some((form) => words.some((word) => word.startsWith(form)))).length;
}

/**
 * Pieces for list and find: filtered by level / liked / text, ranked by matched words, then taste
 * (likes and uses up, dislikes down), then name. Both engines produce the same order.
 */
async function rankedPieces(lib, { text, level, liked } = {}) {
  const db = await freshIndex(lib);
  let rows;
  if (db) {
    try {
      const pieces = db.prepare('SELECT p.*, COALESCE(s.likes, 0) AS likes, COALESCE(s.dislikes, 0) AS dislikes, COALESCE(s.uses, 0) AS uses FROM pieces p LEFT JOIN stats s ON s.piece = p.name').all();
      rows = pieces.map((p) => summaryRow({ name: p.name, level: p.level, latest: p.latest, summary: p.summary, variants: JSON.parse(p.variants), contexts: JSON.parse(p.contexts), composedOf: JSON.parse(p.composed_of), license: p.license }, p));
      if (text && queryTerms(text).length > 0) {
        const match = queryTerms(text).flat().map((form) => `"${form}"*`).join(' OR ');
        const hits = new Set(db.prepare('SELECT name FROM pieces_fts WHERE pieces_fts MATCH ?').all(match).map((r) => r.name));
        rows = rows.filter((row) => hits.has(row.name) || matchedTerms(row, queryTerms(text)) > 0);
      }
    } finally {
      db.close();
    }
  } else {
    const stats = statsFrom(readHistory(lib));
    rows = pieceNames(lib).map((name) => loadPiece(lib, name)).filter(Boolean).map((piece) => summaryRow(piece, stats.get(piece.name) ?? emptyStats()));
  }
  const terms = text ? queryTerms(text) : [];
  const scored = rows.map((row) => ({ row, matched: terms.length > 0 ? matchedTerms(row, terms) : 0 }));
  return scored
    .filter(({ row, matched }) => (!level || row.level === level) && (!liked || row.likes > row.dislikes) && (terms.length === 0 || matched > 0))
    .sort((a, b) => b.matched - a.matched || tasteScore(b.row) - tasteScore(a.row) || (a.row.name < b.row.name ? -1 : 1))
    .map(({ row }) => row);
}

/** Pieces (latest matching version) whose source has the same structural hash. */
async function structuralDuplicates(lib, hash) {
  const db = await freshIndex(lib);
  if (db) {
    try {
      return db.prepare('SELECT piece, MAX(n) AS version FROM versions WHERE structural = ? GROUP BY piece ORDER BY piece').all(hash).map((row) => ({ piece: row.piece, version: Number(row.version) }));
    } finally {
      db.close();
    }
  }
  const found = [];
  for (const name of pieceNames(lib)) {
    const matching = (loadPiece(lib, name)?.versions ?? []).filter((version) => version.structural === hash);
    if (matching.length > 0) found.push({ piece: name, version: Math.max(...matching.map((version) => version.n)) });
  }
  return found;
}

const FIND_KEEP = 200;

function recordFind(root, need) {
  const project = loadProject(root);
  project.finds = [...project.finds, { need, ts: now() }].slice(-FIND_KEEP);
  saveProject(root, project);
}

async function runFind(lib, root, flags) {
  const need = flags._.slice(1).join(' ').trim();
  if (!need) throw usageError('find needs the need you are looking for: pieces.mjs find "pricing table"');
  const terms = queryTerms(need);
  const own = (await rankedPieces(lib, { text: need })).map((row) => {
    const byName = matchName(need, row.name);
    const matched = matchedTerms(row, terms);
    const match = byName ?? (terms.length >= 2 && matched === terms.length ? 'text' : 'related');
    return { name: row.name, level: row.level, latest: row.latest, summary: row.summary, variants: row.variants, likes: row.likes, dislikes: row.dislikes, uses: row.uses, match };
  });
  const order = { exact: 0, close: 1, text: 1, related: 2 };
  own.sort((a, b) => order[a.match] - order[b.match]);
  const exact = own.find((piece) => piece.match === 'exact');
  const close = own.find((piece) => piece.match === 'close' || piece.match === 'text');
  let status = 'new';
  let catalog = [];
  let decision = 'nothing fits in the library or the catalog: this is a new piece. Build it as a real component with variants as props, then register it with: pieces.mjs add <name> --level micro|small|medium|large --file <src>';
  if (exact) {
    status = 'reuse';
    decision = `reuse ${exact.name} (v${exact.latest}); record it with: pieces.mjs use ${exact.name}`;
  } else if (close) {
    status = 'variant';
    decision = `a close piece exists: make a new variant or version of ${close.name} instead of a new piece (pieces.mjs version ${close.name} --file <src> [--variants <v>])`;
  } else {
    catalog = catalogCandidates(need);
    if (catalog.length > 0) {
      status = 'catalog';
      decision = 'no own piece fits: adapt a catalog candidate (node tools/get.mjs <id>), then register the result with pieces.mjs add';
    }
  }
  let nearDuplicates = [];
  if (flags.file) {
    const { text } = readSource(flags.file);
    nearDuplicates = await structuralDuplicates(lib, structuralHash(text));
  }
  recordFind(root, need);
  if (flags.json) {
    console.log(JSON.stringify({ need, status, own, catalog, nearDuplicates, decision: `Decision: ${decision}` }, null, 2));
    return 0;
  }
  console.log(`find "${need}": ${status}`);
  if (own.length > 0) {
    console.log('Own pieces:');
    for (const piece of own.slice(0, 5)) console.log(`  - ${piece.name} [${piece.level}] v${piece.latest} (${piece.match}) +${piece.likes} -${piece.dislikes} used ${piece.uses}${piece.summary ? ` — ${piece.summary}` : ''}`);
  }
  if (catalog.length > 0) {
    console.log('Candidates (catalog):');
    for (const entry of catalog) console.log(`  - ${entry.id} | ${entry.name} | ${entry.category} | q${entry.quality ?? '-'}`);
  }
  for (const duplicate of nearDuplicates) console.log(`Warning: near-duplicate of ${duplicate.piece} v${duplicate.version} (same structure as the file given)`);
  console.log(`Decision: ${decision}.`);
  return 0;
}

async function runIndex(lib, root, flags) {
  if (flags._.length > 1) throw usageError(`index takes no arguments (got "${flags._.slice(1).join(' ')}")`);
  const db = await openIndex(lib);
  if (!db) {
    sayFallback();
    const count = pieceNames(lib).length;
    emit(flags, { engine: 'files', pieces: count, changed: 0, unchanged: count, removed: 0, events: 0 }, `index: no index.db without node:sqlite; ${count} piece(s) are read from the files on demand`);
    return 0;
  }
  try {
    const result = syncIndex(db, lib);
    emit(flags, { engine: 'sqlite', index: indexPath(lib), ...result },
      `index: sqlite — ${result.pieces} piece(s) (${result.changed} changed, ${result.unchanged} unchanged, ${result.removed} removed), ${result.events} new history event(s) — ${indexPath(lib)}`);
  } finally {
    db.close();
  }
  return 0;
}

// ---------------------------------------------------------------- project file (S2)

const projectFile = (root) => join(resolveOutputDir(root), 'pieces.json');

function loadProject(root) {
  const data = readJsonFile(projectFile(root), {});
  return { version: 1, pieces: {}, settings: {}, finds: [], ...data };
}

const saveProject = (root, data) => writeJson(projectFile(root), data);

// ---------------------------------------------------------------- helpers

function nameArg(flags, command) {
  const name = flags._[1];
  if (!name) throw usageError(`${command} needs a piece name`);
  if (!NAME_PATTERN.test(name)) throw usageError(`piece name "${name}" must be kebab-case (lowercase letters, digits and hyphens)`);
  return name;
}

const listOption = (value) => (value ? [...new Set(String(value).split(',').map((part) => part.trim()).filter(Boolean))] : []);
const merge = (current, extra) => [...new Set([...current, ...extra])];

function levelOption(value) {
  if (!LEVELS.includes(value)) throw usageError(`--level must be one of ${LEVELS.join(', ')} (got "${value}")`);
  return value;
}

function versionOption(flags) {
  if (flags.version === undefined) return null;
  if (!/^[1-9]\d*$/.test(String(flags.version))) throw usageError(`--version must be a positive integer (got "${flags.version}")`);
  return Number(flags.version);
}

function readSource(path) {
  const full = resolve(path);
  if (!existsSync(full) || !statSync(full).isFile()) throw new Fail(`source file not found: ${path}`);
  return { text: readFileSync(full, 'utf8'), ext: extname(full) || '.txt' };
}

function requireVersion(piece, number) {
  const found = piece.versions.find((v) => v.n === number);
  if (!found) throw new Fail(`"${piece.name}" has no version ${number} (latest is v${piece.latest})`);
  return found;
}

const versionFile = (version) => `v${version.n}${version.ext}`;
const shortHash = (hash) => hash.slice(0, 8);

function versionEntry(n, text, ext, note) {
  return { n, ext, sha256: sha256(normalizeNewlines(text)), structural: structuralHash(text), ts: now(), ...(note ? { note } : {}) };
}

// ---------------------------------------------------------------- commands

/** S3: a new piece is the last conclusion. Refuses without a find for the need or when an own piece already fits. */
async function checkReuse(lib, root, name, text, flags) {
  const need = flags.need ?? name.replace(/-/g, ' ');
  const finds = loadProject(root).finds;
  const searched = finds.some((entry) => (flags.need ? matchName(entry.need, flags.need) === 'exact' : matchName(entry.need, name) !== null));
  const override = 'or, if none fits, say why: --new --reason "..."';
  if (!searched) {
    throw new Fail(`no find ran for "${need}" in this project. Search before creating: node tools/pieces.mjs find "${need}" (${flags.need ? 'then add with the same --need' : 'it must be about this piece'}); ${override}`);
  }
  for (const other of pieceNames(lib)) {
    const match = matchName(name, other);
    if (!match) continue;
    throw new Fail(`"${name}" is ${match === 'exact' ? 'the same as' : 'close to'} "${other}". Reuse it (pieces.mjs use ${other}) or polish it (pieces.mjs version ${other} --file <src> [--variants <v>]); ${override}`);
  }
  const duplicate = (await structuralDuplicates(lib, structuralHash(text)))[0];
  if (duplicate) {
    throw new Fail(`the file has the same structure as "${duplicate.piece}" v${duplicate.version} (names, texts and comments aside). Reuse it (pieces.mjs use ${duplicate.piece}), add a variant (pieces.mjs version ${duplicate.piece} --file <src> --variants <v>); ${override}`);
  }
}

async function runAdd(lib, root, flags) {
  const name = nameArg(flags, 'add');
  if (!flags.level) throw usageError('add needs --level micro|small|medium|large');
  const level = levelOption(flags.level);
  if (!flags.file) throw usageError('add needs --file <source file>');
  if (loadPiece(lib, name)) throw new Fail(`piece "${name}" already exists; save a polished version with: pieces.mjs version ${name} --file <src>`);
  const { text, ext } = readSource(flags.file);
  if (flags.new && !flags.reason) throw usageError('--new needs --reason "why no existing piece fits"');
  if (flags.reason && !flags.new) throw usageError('--reason only goes with --new');
  if (!flags.new) await checkReuse(lib, root, name, text, flags);
  const entry = versionEntry(1, text, ext, null);
  const piece = {
    name,
    level,
    summary: flags.summary ?? '',
    variants: listOption(flags.variants),
    contexts: listOption(flags.contexts),
    composedOf: listOption(flags['composed-of']),
    license: flags.license ?? null,
    created: entry.ts,
    ...(flags.new ? { newReason: flags.reason } : {}),
    latest: 1,
    versions: [entry],
  };
  mkdirSync(pieceDir(lib, name), { recursive: true });
  writeFileSync(join(pieceDir(lib, name), versionFile(entry)), text, 'utf8');
  writeJson(piecePath(lib, name), piece);
  appendHistory(lib, { type: 'add', piece: name, version: 1, level, ...(flags.new ? { reason: flags.reason } : {}), project: root });
  await afterMutation(lib);
  emit(flags, { action: 'add', piece: name, level, version: 1, file: join(pieceDir(lib, name), versionFile(entry)) },
    `pieces: added "${name}" (${level}) v1 — ${join(pieceDir(lib, name), versionFile(entry))}`);
  return 0;
}

async function runVersion(lib, root, flags) {
  const name = nameArg(flags, 'version');
  if (!flags.file) throw usageError('version needs --file <source file>');
  const piece = requirePiece(lib, name);
  const { text, ext } = readSource(flags.file);
  const candidate = versionEntry(piece.latest + 1, text, ext, flags.note);
  const metadata = {
    summary: flags.summary ?? piece.summary,
    variants: merge(piece.variants, listOption(flags.variants)),
    contexts: merge(piece.contexts, listOption(flags.contexts)),
    composedOf: merge(piece.composedOf, listOption(flags['composed-of'])),
  };
  const metadataChanged = JSON.stringify(metadata) !== JSON.stringify({ summary: piece.summary, variants: piece.variants, contexts: piece.contexts, composedOf: piece.composedOf });
  const same = piece.versions.find((v) => v.sha256 === candidate.sha256);
  if (same) {
    if (metadataChanged) {
      Object.assign(piece, metadata);
      writeJson(piecePath(lib, name), piece);
      appendHistory(lib, { type: 'note', piece: name, note: `metadata updated: ${Object.keys(metadata).join(', ')}`, project: root });
      await afterMutation(lib);
    }
    emit(flags, { action: 'version', piece: name, created: false, equals: same.n, metadataUpdated: metadataChanged },
      `pieces: "${name}" unchanged: identical to v${same.n}${metadataChanged ? ' (variants/contexts/summary updated)' : ''}`);
    return 0;
  }
  Object.assign(piece, metadata);
  piece.versions.push(candidate);
  piece.latest = candidate.n;
  writeFileSync(join(pieceDir(lib, name), versionFile(candidate)), text, 'utf8');
  writeJson(piecePath(lib, name), piece);
  appendHistory(lib, { type: 'version', piece: name, version: candidate.n, sha256: candidate.sha256, ...(flags.note ? { note: flags.note } : {}), project: root });
  await afterMutation(lib);
  emit(flags, { action: 'version', piece: name, created: true, version: candidate.n, sha256: candidate.sha256 },
    `pieces: "${name}" v${candidate.n} saved (sha256 ${shortHash(candidate.sha256)})`);
  return 0;
}

async function runUse(lib, root, flags) {
  const name = nameArg(flags, 'use');
  const piece = requirePiece(lib, name);
  const version = versionOption(flags) ?? piece.latest;
  requireVersion(piece, version);
  if (flags.variant && !piece.variants.includes(flags.variant)) {
    throw new Fail(`"${name}" has no variant "${flags.variant}" (variants: ${piece.variants.join(', ') || 'none'}); add it with: pieces.mjs version ${name} --file <src> --variants ${flags.variant}`);
  }
  const project = loadProject(root);
  project.pieces[name] = { version, ...(flags.variant ? { variant: flags.variant } : {}), ts: now() };
  saveProject(root, project);
  appendHistory(lib, { type: 'use', piece: name, version, ...(flags.variant ? { variant: flags.variant } : {}), project: root });
  await afterMutation(lib);
  emit(flags, { action: 'use', piece: name, version, variant: flags.variant ?? null },
    `pieces: using "${name}" v${version}${flags.variant ? ` (variant ${flags.variant})` : ''} — recorded in ${projectFile(root)}`);
  return 0;
}

async function runFeedback(lib, root, flags, type) {
  const name = nameArg(flags, type);
  const piece = requirePiece(lib, name);
  const version = versionOption(flags) ?? piece.latest;
  requireVersion(piece, version);
  appendHistory(lib, { type, piece: name, version, ...(flags.note ? { note: flags.note } : {}), project: root });
  const stats = statsFrom(readHistory(lib)).get(name) ?? emptyStats();
  // piece.json carries a convenience copy of the like count; the history is the truth, so a lost race here is harmless.
  try {
    writeJson(piecePath(lib, name), { ...(loadPiece(lib, name) ?? piece), likes: stats.likes });
  } catch {
    // another writer holds the file
  }
  await afterMutation(lib);
  emit(flags, { action: type, piece: name, version, ...publicStats(stats) },
    `pieces: ${type}d "${name}" v${version} (likes ${stats.likes}, dislikes ${stats.dislikes})`);
  return 0;
}

async function runNote(lib, root, flags) {
  const name = nameArg(flags, 'note');
  requirePiece(lib, name);
  const text = flags._.slice(2).join(' ').trim() || flags.note;
  if (!text) throw usageError('note needs the text: pieces.mjs note <name> "text"');
  appendHistory(lib, { type: 'note', piece: name, note: text, project: root });
  await afterMutation(lib);
  emit(flags, { action: 'note', piece: name, note: text }, `pieces: noted "${name}"`);
  return 0;
}

const HISTORY_SHOWN = 30;

function describeEvent(event) {
  const parts = [event.ts, event.type];
  if (event.version) parts.push(`v${event.version}`);
  if (event.variant) parts.push(`variant=${event.variant}`);
  if (event.project) parts.push(`project=${event.project}`);
  if (event.note) parts.push(`"${event.note}"`);
  return parts.join(' ');
}

async function runShow(lib, root, flags) {
  const name = nameArg(flags, 'show');
  const piece = requirePiece(lib, name);
  const events = readHistory(lib).filter((event) => event.piece === name).reverse();
  const stats = statsFrom(readHistory(lib)).get(name) ?? emptyStats();
  if (flags.json) {
    console.log(JSON.stringify({ piece, stats: publicStats(stats), history: events }, null, 2));
    return 0;
  }
  const lines = [];
  lines.push(`${piece.name} [${piece.level}] latest v${piece.latest}`);
  if (piece.summary) lines.push(`summary: ${piece.summary}`);
  lines.push(`variants: ${piece.variants.join(', ') || 'none'} | contexts: ${piece.contexts.join(', ') || 'none'} | composed of: ${piece.composedOf.join(', ') || 'none'} | license: ${piece.license ?? 'unset'}`);
  lines.push(`likes ${stats.likes} · dislikes ${stats.dislikes} · used ${stats.uses} time(s) in ${stats.projects.size} project(s)`);
  lines.push('Versions:');
  for (const version of [...piece.versions].reverse()) {
    lines.push(`  v${version.n} ${version.ts} ${shortHash(version.sha256)} ${join(pieceDir(lib, name), versionFile(version))}${version.note ? ` — ${version.note}` : ''}`);
  }
  lines.push(`History (newest first, ${events.length}):`);
  for (const event of events.slice(0, HISTORY_SHOWN)) lines.push(`  ${describeEvent(event)}`);
  if (events.length > HISTORY_SHOWN) lines.push(`  ... +${events.length - HISTORY_SHOWN} older in ${historyPath(lib)}`);
  console.log(lines.join('\n'));
  return 0;
}

async function runList(lib, root, flags) {
  if (flags._.length > 1) throw usageError(`list takes no arguments (got "${flags._.slice(1).join(' ')}")`);
  if (flags.level) levelOption(flags.level);
  const pieces = await rankedPieces(lib, { text: flags.text, level: flags.level, liked: flags.liked });
  if (flags.json) {
    console.log(JSON.stringify({ lib, pieces }, null, 2));
    return 0;
  }
  if (pieces.length === 0) {
    console.log(`pieces: no pieces${flags.level ? ` at level ${flags.level}` : ''}${flags.text ? ` matching "${flags.text}"` : ''} in ${lib}`);
    return 0;
  }
  const width = Math.max(...pieces.map((piece) => piece.name.length));
  for (const piece of pieces) {
    console.log(`${piece.name.padEnd(width)} | ${piece.level.padEnd(6)} | v${piece.latest} | +${piece.likes} -${piece.dislikes} | used ${piece.uses} | ${piece.summary}`);
  }
  return 0;
}

async function runPersonality(lib, root, flags) {
  const action = flags._[1];
  if (action === 'show') {
    if (flags._.length > 2) throw usageError('personality show takes no arguments');
    const project = loadProject(root);
    const entries = Object.entries(project.settings);
    if (flags.json) console.log(JSON.stringify({ settings: project.settings, pieces: project.pieces }, null, 2));
    else if (entries.length === 0) console.log(`personality: no settings yet in ${projectFile(root)} (set one with: pieces.mjs personality set <key> <value>)`);
    else for (const [key, value] of entries) console.log(`${key}: ${value}`);
    return 0;
  }
  if (action === 'set') {
    const key = flags._[2];
    const value = flags._.slice(3).join(' ');
    if (!key || !value) throw usageError('personality set needs a key and a value: pieces.mjs personality set <key> <value>');
    const project = loadProject(root);
    project.settings[key] = value;
    saveProject(root, project);
    emit(flags, { action: 'personality', key, value }, `personality: ${key} = ${value} — recorded in ${projectFile(root)}`);
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
  const lib = resolveLibrary(flags);
  const root = resolveProjectRoot(flags);
  try {
    if (command === 'add') return await runAdd(lib, root, flags);
    if (command === 'version') return await runVersion(lib, root, flags);
    if (command === 'use') return await runUse(lib, root, flags);
    if (command === 'like' || command === 'dislike') return await runFeedback(lib, root, flags, command);
    if (command === 'note') return await runNote(lib, root, flags);
    if (command === 'show') return await runShow(lib, root, flags);
    if (command === 'list') return await runList(lib, root, flags);
    if (command === 'index') return await runIndex(lib, root, flags);
    if (command === 'find') return await runFind(lib, root, flags);
    return await runPersonality(lib, root, flags);
  } catch (error) {
    console.error(`pieces: ${error.message}`);
    if (error.code === 2) console.error(`\n${USAGE}`);
    return error instanceof Fail ? error.code : 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await main();
