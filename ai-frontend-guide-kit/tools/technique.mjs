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
 * Commands today: `check` (the file is well formed). `find` and `get` are added by the routing task and
 * plug into the COMMANDS table below; they answer with one card at a time, under 1 KB.
 *
 * Usage: node ai-frontend-guide-kit/tools/technique.mjs check [--file <path>] [--json]
 * Exit: 0 done, 1 problems found, 2 wrong usage.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolPath } from './kit-path.mjs';

const SELF = fileURLToPath(import.meta.url);
const KIT_DIR = resolve(dirname(SELF), '..');
const DATA_FILE = join(KIT_DIR, 'experience', 'techniques.json');

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

// ---------------------------------------------------------------- commands

const USAGE = `technique — the technique repertoire: one short card per technique or principle

Usage:
  node ${toolPath('technique.mjs')} check [--file <path>] [--json]

  check   validate experience/techniques.json: unique ids, required fields, allowed areas and costs,
          tools and files that exist, directions of the kit, under ${MAX_CARD_BYTES} bytes per card
  --file  another file to check (default: the one of the kit)
  --json  print the data instead of the text
Areas: ${AREAS.join(', ')}.
`;

function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const eq = token.startsWith('--') ? token.indexOf('=') : -1;
    const name = eq === -1 ? token : token.slice(0, eq);
    if (name === '--file') {
      const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
      if (!value || (eq === -1 && value.startsWith('--'))) throw new UsageError('option --file needs a value');
      flags.file = value;
      if (eq === -1) i += 1;
    } else if (eq === -1 && token === '--json') flags.json = true;
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

/** The commands; the routing task adds `find` and `get` here, each answering under 1 KB. */
const COMMANDS = { check };

function main() {
  try {
    const flags = parseArgs(process.argv.slice(2));
    if (flags.help) return console.log(USAGE);
    const command = flags._[0];
    if (!command) throw new UsageError('missing command');
    if (!(command in COMMANDS)) throw new UsageError(`unknown command "${command}"`);
    if (flags._.length > 1) throw new UsageError(`unexpected argument "${flags._[1]}"`);
    return COMMANDS[command](flags);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`technique: ${error.message}\n\n${USAGE}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) main();
