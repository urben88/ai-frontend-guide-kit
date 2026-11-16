#!/usr/bin/env node
/**
 * technique — the technique repertoire of the kit: one short card per design technique or psychology
 * principle, in experience/techniques.json (the single source). No dependencies.
 *
 * A card says when to use the technique, when not, the steps, how to check it (naming the kit tool that
 * measures it when there is one), the cost, a fallback and the style directions it fits. A card of
 * kind "external" is for what needs a tool outside the kit (image, 3D asset or texture generation, AR,
 * direct manipulation): its steps are the instruction or prompt to give that tool.
 *
 * Commands: `find` (ranked list, one line per card), `get` (one card), `digest` (the one-page list by area,
 * experience/TECHNIQUES.md), `check` (the file is well formed). Every answer of find and get is under 1 KB.
 * `flow.mjs next` also uses `directionCards` and `resolveDirections`: the tool, not the model, picks the few
 * cards that fit the style direction chosen in the project.
 *
 * Usage:
 *   node ai-frontend-guide-kit/tools/technique.mjs find <query> [--area a] [--direction d] [--limit n] [--json]
 *   node ai-frontend-guide-kit/tools/technique.mjs get <id> [--json]
 *   node ai-frontend-guide-kit/tools/technique.mjs digest [--write]
 *   node ai-frontend-guide-kit/tools/technique.mjs check [--file <path>] [--json]
 * Exit: 0 done, 1 problems found or no such card, 2 wrong usage.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTool, toolPath } from './kit-path.mjs';
import { matchInfo } from './find.mjs';

const SELF = fileURLToPath(import.meta.url);
const KIT_DIR = resolve(dirname(SELF), '..');
const DATA_FILE = join(KIT_DIR, 'experience', 'techniques.json');
export const DIGEST_FILE = join(KIT_DIR, 'experience', 'TECHNIQUES.md');

export const AREAS = ['layout', 'type', 'color', 'motion', 'imagery', '3d', 'svg', 'interaction', 'content', 'direction', 'psychology'];
export const COSTS = ['low', 'medium', 'high'];
export const KINDS = ['technique', 'external'];
export const MAX_CARD_BYTES = 1024;
const REQUIRED = ['id', 'area', 'title', 'when', 'when_not', 'steps', 'check', 'cost', 'fallback', 'directions'];
const TEXT_FIELDS = ['title', 'when', 'when_not', 'check', 'fallback'];
const MAX_STEPS = 6;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

class UsageError extends Error {}

/** The size of a card in bytes: its compact JSON, which is what a `get` prints. */
export const cardBytes = (card) => Buffer.byteLength(JSON.stringify(card));

const isText = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * What the validator compares a card with: the tools of tools/, the style directions of the experience
 * manifest (the id without `exp-style-`, plus "any") and the files of the kit that `refs` may name.
 */
export function loadContext(kitDir = KIT_DIR) {
  const tools = new Set(readdirSync(join(kitDir, 'tools')).filter((name) => /\.(mjs|py)$/.test(name)));
  const manifest = JSON.parse(readFileSync(join(kitDir, 'experience', 'experience-manifest.json'), 'utf8'));
  const directions = new Set(['any', ...manifest.entries.filter((entry) => entry.kind === 'style').map((entry) => entry.id.replace(/^exp-style-/, ''))]);
  return { tools, directions, hasFile: (rel) => existsSync(join(kitDir, rel)) };
}

/** The problems of one card (a list of texts, empty when it is well formed). `seen` holds the ids met before. */
function cardProblems(card, at, seen, ctx) {
  const problems = [];
  if (!card || typeof card !== 'object' || Array.isArray(card)) return [`card ${at}: it is not an object`];
  const label = isText(card.id) ? card.id : `card ${at}`;
  const add = (text) => problems.push(`${label}: ${text}`);
  for (const field of REQUIRED) if (!(field in card)) add(`"${field}" is missing`);
  if ('id' in card) {
    if (!isText(card.id) || !KEBAB.test(card.id)) problems.push(`"${card.id}": the id must be kebab-case`);
    else if (seen.has(card.id)) add('the id is used twice');
    else seen.add(card.id);
  }
  if ('area' in card && !AREAS.includes(card.area)) add(`area "${card.area}" is not one of: ${AREAS.join(', ')}`);
  if ('cost' in card && !COSTS.includes(card.cost)) add(`cost "${card.cost}" is not one of: ${COSTS.join(', ')}`);
  if ('kind' in card && !KINDS.includes(card.kind)) add(`kind "${card.kind}" is not one of: ${KINDS.join(', ')}`);
  for (const field of TEXT_FIELDS) if (field in card && !isText(card[field])) add(`"${field}" must be a non-empty text`);
  if ('steps' in card && !(Array.isArray(card.steps) && card.steps.length >= 1 && card.steps.length <= MAX_STEPS && card.steps.every(isText))) add(`"steps" must be a list of 1 to ${MAX_STEPS} non-empty texts`);
  if ('directions' in card) {
    if (!Array.isArray(card.directions) || !card.directions.length) add('"directions" must be a list of 1 or more style directions (or "any")');
    else for (const direction of card.directions) if (!ctx.directions.has(direction)) add(`direction "${direction}" is not a style direction of the kit`);
  }
  if (isText(card.check)) {
    for (const [name] of card.check.matchAll(/[\w-]+\.(?:mjs|py)\b/g)) if (!ctx.tools.has(name)) add(`"check" names the tool ${name}, which is not in tools/`);
  }
  if ('refs' in card) for (const ref of Array.isArray(card.refs) ? card.refs : [card.refs]) if (!ctx.hasFile(String(ref))) add(`ref ${ref} is not a file of the kit`);
  if (isText(card.id) && KEBAB.test(card.id)) {
    const external = card.kind === 'external';
    if (external && !card.id.startsWith('ext-')) add('an external card needs an id that starts with ext-');
    if (!external && card.id.startsWith('ext-')) add('only external cards have an id that starts with ext-');
  }
  const bytes = cardBytes(card);
  if (bytes >= MAX_CARD_BYTES) add(`the card is ${bytes} bytes; the limit is under ${MAX_CARD_BYTES}`);
  return problems;
}

/** Every problem of the data of techniques.json: unique ids, required fields, allowed values, tools and files that exist, size per card. */
export function validateCards(data, ctx = loadContext()) {
  if (!Array.isArray(data?.cards) || !data.cards.length) return ['"cards" must be a non-empty list'];
  const seen = new Set();
  return data.cards.flatMap((card, index) => cardProblems(card, index + 1, seen, ctx));
}

/** How many cards each area has, in the order of AREAS. */
export function countByArea(data) {
  const counts = Object.fromEntries(AREAS.map((area) => [area, 0]));
  for (const card of data?.cards ?? []) if (card?.area in counts) counts[card.area] += 1;
  return counts;
}

// ---------------------------------------------------------------- reading the cards

/** The cards of techniques.json (from `file`, the one of the kit by default). */
export function loadCards(file = DATA_FILE) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** The style directions of the kit (the ones a card may list), without "any". */
export const styleDirections = (kitDir = KIT_DIR) => new Set([...loadContext(kitDir).directions].filter((name) => name !== 'any'));

const COST_ORDER = { low: 0, medium: 1, high: 2 };
const words = (text) => String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const fits = (card, direction) => card.directions.includes(direction) || card.directions.includes('any');
const specific = (card, direction) => (card.directions.includes(direction) ? 1 : 0);

/**
 * The cards that answer a query, best first. A card is shaped like a catalog entry so that the ranking words of
 * find.mjs (matchInfo: name > tags > category > description, at least half of the words) are reused as they are.
 * With a direction, a card for that direction comes before a card for any direction. Ties: cheaper, then id.
 */
export function searchCards(cards, { query = '', area, direction } = {}) {
  const scored = [];
  for (const card of cards) {
    if (area && card.area !== area) continue;
    if (direction && !fits(card, direction)) continue;
    const entry = { name: `${card.title} ${card.id.replace(/-/g, ' ')}`, search_tags: [card.id, card.area, ...card.directions], category: card.area, description: `${card.when} ${card.check}`, use_case: card.fallback, source: '' };
    const info = query.trim() ? matchInfo(entry, query) : { matched: 1, strong: 0, categoryHits: 0, needed: 1, score: 0 };
    if (info.matched >= info.needed) scored.push({ card, info });
  }
  return scored
    .sort((a, b) => (direction ? specific(b.card, direction) - specific(a.card, direction) : 0) || b.info.matched + b.info.strong - a.info.matched - a.info.strong || b.info.categoryHits - a.info.categoryHits || b.info.score - a.info.score || COST_ORDER[a.card.cost] - COST_ORDER[b.card.cost] || a.card.id.localeCompare(b.card.id))
    .map((row) => row.card);
}

/**
 * The few cards that fit one style direction, for `flow.mjs next`: only cards that name the direction (not "any"),
 * never an external card, only of the given areas (the ones the step works on), the most specific and the cheapest first,
 * one per area before a second of the same area.
 */
export function directionCards(data, direction, limit = 5, areas = AREAS) {
  const pool = data.cards
    .filter((card) => card.kind !== 'external' && direction !== 'any' && areas.includes(card.area) && card.directions.includes(direction))
    .sort((a, b) => a.directions.length - b.directions.length || COST_ORDER[a.cost] - COST_ORDER[b.cost] || a.id.localeCompare(b.id));
  const picked = [];
  for (const round of [0, 1, 2]) {
    for (const card of pool) {
      if (picked.length >= limit) break;
      if (picked.includes(card) || picked.filter((other) => other.area === card.area).length > round) continue;
      picked.push(card);
    }
  }
  return picked;
}

const spaced = (text) => ` ${words(text).join(' ')} `;

/** The known style directions that a text names, in the order they appear (`exp-style-swiss`, `dark technical` and `dark-technical` all count). */
function directionsIn(text, known) {
  const haystack = spaced(String(text).replace(/exp-style-/gi, ''));
  return [...known]
    .map((name) => ({ name, at: haystack.indexOf(spaced(name)) }))
    .filter((hit) => hit.at !== -1)
    .sort((a, b) => a.at - b.at)
    .map((hit) => hit.name);
}

const sectionOf = (text, heading) => text.match(new RegExp(`^#{2,3} ${heading}[^\\n]*\\n([\\s\\S]*?)(?=^#{1,3} |(?![\\s\\S]))`, 'im'))?.[1] ?? '';

/**
 * The style direction the user chose, found in the project and not asked of the model: the id of "Recommended direction"
 * in EXPERIENCE-BRIEF.md, then the `style:` line of its "Visual brief", then the latest `direction:<id>` of the selection
 * memory (selections.jsonl). Only names of the style directions of the kit count; at most 2 are returned.
 */
export function resolveDirections(briefText = '', selectionsText = '', known = styleDirections()) {
  const id = sectionOf(briefText, 'Recommended direction').match(/(?:^|[\s·,;])id\s*:\s*([^\s·]+)/i)?.[1] ?? '';
  const style = sectionOf(briefText, 'Visual brief').match(/style\s*:\s*([^·\n]+)/i)?.[1] ?? '';
  const fromBrief = [...new Set([...directionsIn(id, known), ...directionsIn(style, known)])];
  if (fromBrief.length) return fromBrief.slice(0, 2);
  const fromMemory = selectionsText.split('\n').flatMap((line) => {
    try {
      const record = JSON.parse(line);
      const text = `${record.ref ?? ''} ${record.notes ?? ''}`;
      const chosen = text.match(/direction:([\w-]+)/)?.[1];
      return chosen ? [chosen] : [];
    } catch {
      return [];
    }
  });
  return directionsIn(fromMemory.at(-1) ?? '', known).slice(0, 2);
}

// ---------------------------------------------------------------- what is printed

/** One card as text, under 1 KB (the card is under 1 KB as JSON; the optional lines go first when it does not fit). */
export function renderCard(card) {
  const head = `${card.id} (${card.area}, cost ${card.cost}${card.kind === 'external' ? ', external tool' : ''}) ${card.title}`;
  const body = [`when: ${card.when}`, `not: ${card.when_not}`, ...card.steps.map((step, index) => `${index + 1}. ${step}`), `check: ${card.check}`, `fallback: ${card.fallback}`];
  const extras = [`fits: ${card.directions.join(', ')}`, ...(card.refs ? [`see: ${[].concat(card.refs).join(', ')}`] : [])];
  for (let keep = extras.length; keep >= 0; keep -= 1) {
    const text = [head, ...body, ...extras.slice(0, keep)].join('\n');
    if (Buffer.byteLength(text) < MAX_CARD_BYTES) return text;
  }
  return [head, ...body].join('\n').slice(0, MAX_CARD_BYTES - 4) + '...';
}

/** The lines that fit under 1 KB together with the header: lines are dropped from the end, never cut. */
function fitLines(header, lines, footer = '') {
  const kept = [...lines];
  while (kept.length && Buffer.byteLength([header, ...kept, footer].filter(Boolean).join('\n') + '\n') >= MAX_CARD_BYTES) kept.pop();
  return { kept, text: [header, ...kept, footer].filter(Boolean).join('\n') };
}

const cut = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 3).trimEnd()}...`);

/** What each area is for and the skill that carries its rules (the digest and the skills say the same). */
export const AREA_INFO = {
  layout: ['page structure, grids, rhythm', 'technique-layout'],
  type: ['fonts, scale, headlines', 'technique-type'],
  color: ['palette, gradients, dark mode', 'technique-color'],
  motion: ['animation, scroll, microinteractions', 'technique-motion'],
  imagery: ['photos, art direction, prompts for image tools', 'technique-imagery'],
  '3d': ['3D scenes and products, fallback, budget', 'technique-3d'],
  svg: ['icons and illustrations', 'svg-craft'],
  interaction: ['overlays, disclosure, accessibility tests', null],
  content: ['naming, scannable copy, SEO', null],
  direction: ['variations, locks, feedback', null],
  psychology: ['attention, choice, forms, trust, honesty', 'technique-psychology'],
};

/** The one-page digest (experience/TECHNIQUES.md): per area its job, its skill and every card id. Generated, never edited. */
export function renderDigest(data) {
  const run = 'node ai-frontend-guide-kit/tools/technique.mjs';
  const lines = [
    '# Technique digest',
    '',
    `Generated by \`technique.mjs digest --write\` from \`techniques.json\` (${data.cards.length} cards); \`node tools/build-kit.mjs\` rewrites it. Do not edit.`,
    '',
    `Find: \`${run} find "<need>" [--area <area>] [--direction <style>]\`. Read one card: \`${run} get <id>\`. A \`*\` marks a card that is a prompt for a tool outside the kit.`,
  ];
  for (const area of AREAS) {
    const cards = data.cards.filter((card) => card.area === area);
    if (!cards.length) continue;
    const [use, skill] = AREA_INFO[area];
    lines.push('', `## ${area} (${cards.length}) · ${use}${skill ? ` · skill ${skill}` : ''}`, cards.map((card) => `${card.id}${card.kind === 'external' ? '*' : ''}`).join(', '));
  }
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------- commands

const USAGE = `technique — the technique repertoire: one short card per technique or principle

Usage:
  node ${toolPath('technique.mjs')} find <query> [--area <area>] [--direction <style>] [--limit <n>] [--json]
  node ${toolPath('technique.mjs')} get <id> [--json]
  node ${toolPath('technique.mjs')} digest [--write]
  node ${toolPath('technique.mjs')} check [--file <path>] [--json]

  find    the cards that answer a query (or an area, or a direction), best first, one line each, under ${MAX_CARD_BYTES} bytes
  get     one card: when to use, when not, steps, check, fallback; under ${MAX_CARD_BYTES} bytes
  digest  the one-page list of every card by area (--write: experience/TECHNIQUES.md)
  check   validate experience/techniques.json: unique ids, required fields, allowed areas and costs,
          tools and files that exist, directions of the kit, under ${MAX_CARD_BYTES} bytes per card
  --area       keep one area   --direction  keep the cards of a style direction (and of any)
  --limit      most lines to print (default 8)   --file  another file to check   --json  data instead of text
Areas: ${AREAS.join(', ')}.
`;

const VALUE_OPTIONS = ['--file', '--area', '--direction', '--limit'];

function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const eq = token.startsWith('--') ? token.indexOf('=') : -1;
    const name = eq === -1 ? token : token.slice(0, eq);
    if (VALUE_OPTIONS.includes(name)) {
      const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
      if (!value || (eq === -1 && value.startsWith('--'))) throw new UsageError(`option ${name} needs a value`);
      flags[name.slice(2)] = value;
      if (eq === -1) i += 1;
    } else if (eq === -1 && token === '--json') flags.json = true;
    else if (eq === -1 && token === '--write') flags.write = true;
    else if (eq === -1 && (token === '--help' || token === '-h')) flags.help = true;
    else if (token.startsWith('-') && token.length > 1) throw new UsageError(`unknown option "${token}"`);
    else flags._.push(token);
  }
  return flags;
}

function check(flags) {
  const file = flags.file ? resolve(flags.file) : DATA_FILE;
  let data = null;
  let problems = [];
  if (!existsSync(file)) problems = [`the file ${flags.file ?? 'experience/techniques.json'} does not exist`];
  else {
    try {
      data = JSON.parse(readFileSync(file, 'utf8'));
      problems = validateCards(data);
    } catch (error) {
      problems = [error instanceof SyntaxError ? 'the file is not valid JSON' : String(error.message)];
    }
  }
  const byArea = countByArea(data);
  const cards = Array.isArray(data?.cards) ? data.cards.length : 0;
  if (flags.json) console.log(JSON.stringify({ cards, by_area: byArea, problems }, null, 2));
  else if (problems.length) {
    for (const problem of problems) console.error(`  ${problem}`);
    console.error(`technique: ${cards} cards, ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  } else console.log(`technique: ${cards} cards in ${Object.values(byArea).filter(Boolean).length} areas, 0 problems`);
  if (problems.length) process.exitCode = 1;
}

function find(flags) {
  const query = flags._.slice(1).join(' ');
  if (!query && !flags.area && !flags.direction) throw new UsageError('find needs a query, --area or --direction');
  if (flags.area && !AREAS.includes(flags.area)) throw new UsageError(`area "${flags.area}" is not one of: ${AREAS.join(', ')}`);
  if (flags.direction && !styleDirections().has(flags.direction)) throw new UsageError(`direction "${flags.direction}" is not a style direction of the kit`);
  const limit = flags.limit === undefined ? 8 : Number(flags.limit);
  if (!Number.isInteger(limit) || limit < 1) throw new UsageError('option --limit needs a whole number of 1 or more');
  const found = searchCards(loadCards().cards, { query, area: flags.area, direction: flags.direction });
  const shown = found.slice(0, limit);
  if (flags.json) {
    const rows = shown.map((card) => ({ id: card.id, area: card.area, title: card.title, cost: card.cost }));
    const make = (list) => JSON.stringify({ total: found.length, shown: list.length, results: list });
    while (rows.length && Buffer.byteLength(make(rows)) >= MAX_CARD_BYTES) rows.pop();
    return console.log(make(rows));
  }
  if (!found.length) return console.log(`No matches. Try other words, or --area <${AREAS.join('|')}>.`);
  const lines = shown.map((card) => cut(`${card.id} | ${card.area} | ${card.title}: ${card.when}`, 92));
  const { kept, text } = fitLines(`# ${found.length} matches (showing ${shown.length}) — ${runTool('technique.mjs', 'get <id>')}`, lines);
  console.log(kept.length < shown.length ? text.replace(/showing \d+/, `showing ${kept.length}`) : text);
}

function get(flags) {
  const id = flags._[1];
  if (!id) throw new UsageError('get needs a card id');
  const card = loadCards().cards.find((item) => item.id === id);
  if (!card) {
    const close = loadCards().cards.filter((item) => item.id.includes(id) || words(id).some((word) => item.id.split('-').includes(word))).slice(0, 3).map((item) => item.id);
    console.error(`technique: no card "${id}"${close.length ? `; closest: ${close.join(', ')}` : ''}. Search: ${runTool('technique.mjs', 'find "<need>"')}`);
    process.exitCode = 1;
    return;
  }
  console.log(flags.json ? JSON.stringify(card) : renderCard(card));
}

function digest(flags) {
  const text = renderDigest(loadCards());
  if (!flags.write) return process.stdout.write(text);
  writeFileSync(DIGEST_FILE, text);
  console.log(`technique: wrote ${relative(process.cwd(), DIGEST_FILE).replace(/\\/g, '/')} (${text.split('\n').length - 1} lines)`);
}

/** The commands and how many arguments each takes after its name (find takes the words of the query). */
const COMMANDS = { check: [check, 0], find: [find, Infinity], get: [get, 1], digest: [digest, 0] };

function main() {
  try {
    const flags = parseArgs(process.argv.slice(2));
    if (flags.help) return console.log(USAGE);
    const command = flags._[0];
    if (!command) throw new UsageError('missing command');
    if (!(command in COMMANDS)) throw new UsageError(`unknown command "${command}"`);
    const [run, arity] = COMMANDS[command];
    if (flags._.length - 1 > arity) throw new UsageError(`unexpected argument "${flags._[arity + 1]}"`);
    return run(flags);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`technique: ${error.message}\n\n${USAGE}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) main();
