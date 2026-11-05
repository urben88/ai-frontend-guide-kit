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

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_DIR = resolve(__dirname, '..');

const LEVELS = ['micro', 'small', 'medium', 'large'];
const COMMANDS = ['add', 'version', 'use', 'like', 'dislike', 'note', 'show', 'list', 'personality'];
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ---------------------------------------------------------------- arguments and paths

const VALUE_OPTIONS = new Set(['dir', 'lib', 'level', 'file', 'summary', 'variants', 'contexts', 'composed-of', 'license', 'reason', 'version', 'variant', 'note']);
const BOOLEAN_OPTIONS = new Set(['json', 'help']);

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
                                               register a new piece (version 1)
  node tools/pieces.mjs version <name> --file <src> [--note "..."] [--variants a,b] [--contexts x,y]
                                               save a polished version; identical content is never stored twice
  node tools/pieces.mjs use <name> [--version N] [--variant v]
                                               record that this project uses the piece (latest version by default)
  node tools/pieces.mjs like <name> [--version N] [--note "..."]
  node tools/pieces.mjs dislike <name> [--version N] [--note "..."]
  node tools/pieces.mjs note <name> "text"     free note about the piece
  node tools/pieces.mjs show <name>            latest state first, then the history
  node tools/pieces.mjs list [--level micro|small|medium|large]
  node tools/pieces.mjs personality set <key> <value>
  node tools/pieces.mjs personality show       this project's settings (spacing, image weight, ...)

Options:
  --lib <dir>            shared library (default: AI_FRONTEND_PIECES, then ~/.ai-frontend-guide-kit/pieces)
  --dir <project-root>   project (default: AI_FRONTEND_PROJECT, then the folder that holds the kit)
  --json                 machine-readable output
  --help                 this text

Names are kebab-case. A variant is a prop of the same piece, never a copy. The library history is append-only.
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

/** Called after every command that changes the library; the index (see pieces index) hooks in here. */
function afterMutation() {}

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

function runAdd(lib, root, flags) {
  const name = nameArg(flags, 'add');
  if (!flags.level) throw usageError('add needs --level micro|small|medium|large');
  const level = levelOption(flags.level);
  if (!flags.file) throw usageError('add needs --file <source file>');
  if (loadPiece(lib, name)) throw new Fail(`piece "${name}" already exists; save a polished version with: pieces.mjs version ${name} --file <src>`);
  const { text, ext } = readSource(flags.file);
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
    latest: 1,
    versions: [entry],
  };
  mkdirSync(pieceDir(lib, name), { recursive: true });
  writeFileSync(join(pieceDir(lib, name), versionFile(entry)), text, 'utf8');
  writeJson(piecePath(lib, name), piece);
  appendHistory(lib, { type: 'add', piece: name, version: 1, level, project: root });
  afterMutation(lib);
  emit(flags, { action: 'add', piece: name, level, version: 1, file: join(pieceDir(lib, name), versionFile(entry)) },
    `pieces: added "${name}" (${level}) v1 — ${join(pieceDir(lib, name), versionFile(entry))}`);
  return 0;
}

function runVersion(lib, root, flags) {
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
      afterMutation(lib);
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
  afterMutation(lib);
  emit(flags, { action: 'version', piece: name, created: true, version: candidate.n, sha256: candidate.sha256 },
    `pieces: "${name}" v${candidate.n} saved (sha256 ${shortHash(candidate.sha256)})`);
  return 0;
}

function runUse(lib, root, flags) {
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
  afterMutation(lib);
  emit(flags, { action: 'use', piece: name, version, variant: flags.variant ?? null },
    `pieces: using "${name}" v${version}${flags.variant ? ` (variant ${flags.variant})` : ''} — recorded in ${projectFile(root)}`);
  return 0;
}

function runFeedback(lib, root, flags, type) {
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
  afterMutation(lib);
  emit(flags, { action: type, piece: name, version, ...publicStats(stats) },
    `pieces: ${type}d "${name}" v${version} (likes ${stats.likes}, dislikes ${stats.dislikes})`);
  return 0;
}

function runNote(lib, root, flags) {
  const name = nameArg(flags, 'note');
  requirePiece(lib, name);
  const text = flags._.slice(2).join(' ').trim() || flags.note;
  if (!text) throw usageError('note needs the text: pieces.mjs note <name> "text"');
  appendHistory(lib, { type: 'note', piece: name, note: text, project: root });
  afterMutation(lib);
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

function runShow(lib, root, flags) {
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

function runList(lib, root, flags) {
  if (flags._.length > 1) throw usageError(`list takes no arguments (got "${flags._.slice(1).join(' ')}")`);
  if (flags.level) levelOption(flags.level);
  const stats = statsFrom(readHistory(lib));
  const pieces = pieceNames(lib)
    .map((name) => loadPiece(lib, name))
    .filter((piece) => piece && (!flags.level || piece.level === flags.level))
    .map((piece) => ({ name: piece.name, level: piece.level, latest: piece.latest, summary: piece.summary, variants: piece.variants, ...publicStats(stats.get(piece.name) ?? emptyStats()) }));
  if (flags.json) {
    console.log(JSON.stringify({ lib, pieces }, null, 2));
    return 0;
  }
  if (pieces.length === 0) {
    console.log(`pieces: no pieces${flags.level ? ` at level ${flags.level}` : ''} in ${lib}`);
    return 0;
  }
  const width = Math.max(...pieces.map((piece) => piece.name.length));
  for (const piece of pieces) {
    console.log(`${piece.name.padEnd(width)} | ${piece.level.padEnd(6)} | v${piece.latest} | +${piece.likes} -${piece.dislikes} | used ${piece.uses} | ${piece.summary}`);
  }
  return 0;
}

function runPersonality(lib, root, flags) {
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

function main() {
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
    if (command === 'add') return runAdd(lib, root, flags);
    if (command === 'version') return runVersion(lib, root, flags);
    if (command === 'use') return runUse(lib, root, flags);
    if (command === 'like' || command === 'dislike') return runFeedback(lib, root, flags, command);
    if (command === 'note') return runNote(lib, root, flags);
    if (command === 'show') return runShow(lib, root, flags);
    if (command === 'list') return runList(lib, root, flags);
    return runPersonality(lib, root, flags);
  } catch (error) {
    console.error(`pieces: ${error.message}`);
    if (error.code === 2) console.error(`\n${USAGE}`);
    return error instanceof Fail ? error.code : 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main();
