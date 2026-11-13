#!/usr/bin/env node
/**
 * recipe — page recipes: for each kind of page, the sections in order, the job of each section and the
 * words to search the catalog with. Data: experience/page-recipes.json (the single source). The layout
 * names and numbers: experience/LAYOUT-RULES.md. No dependencies.
 *
 * The model does not write the inventory from nothing: `suggest` names the recipe of each screen and
 * `inventory --write` turns those recipes into the rows of ai-frontend-output/INVENTORY.md, with the
 * category, priority, layout and search words filled. The model then removes and adds rows.
 *
 * Project root: --dir, then AI_FRONTEND_PROJECT, then the folder that holds the kit.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INVENTORY_COLUMNS, sections as markdownSections, table } from './flow-gates.mjs';
import { runTool, toolPath } from './kit-path.mjs';

const SELF = fileURLToPath(import.meta.url);
const KIT_DIR = resolve(dirname(SELF), '..');
const RECIPES_FILE = join(KIT_DIR, 'experience', 'page-recipes.json');
const RULES_FILE = join(KIT_DIR, 'experience', 'LAYOUT-RULES.md');
const ARCHETYPES_FILE = join(KIT_DIR, 'experience', 'SITE-ARCHETYPES.md');
const TAXONOMY_FILE = join(KIT_DIR, 'catalog', 'taxonomy.md');

const NARRATIVES = ['attention', 'interest', 'proof', 'objection', 'action', 'orientation', 'task'];
const SERVES = { G: 'the primary action', O: 'an objection', P: 'a proof' };
const NAVIGATION_MODELS = ['single-page-anchors', 'linear-wizard', 'hub', 'catalog', 'console', 'tree'];
const NAVIGATION_ALIAS = { flow: 'linear-wizard', 'one-page': 'single-page-anchors' };
const STATES = ['empty', 'loading', 'error'];
const OUT_NAME = 'ai-frontend-output';

class UsageError extends Error {}
class Refusal extends Error {}

// ---------------------------------------------------------------- command line

const USAGE = `recipe — page recipes: sections in order, the job of each, and the catalog words to search

Usage:
  node ${toolPath('recipe.mjs')} list [--archetype <name>]   one line per recipe; the archetype is a site or an experience archetype
  node ${toolPath('recipe.mjs')} show <id> [<section>]       the sections in order with job, narrative, layout and query; one section in full
  node ${toolPath('recipe.mjs')} suggest                     the recipe of each screen of UX-SPEC.md (or the pages of EXPERIENCE-BRIEF.md), with the reason
  node ${toolPath('recipe.mjs')} inventory [--write] [--force]   the inventory rows built from those recipes; --write saves ai-frontend-output/INVENTORY.md
  node ${toolPath('recipe.mjs')} check [--recipes <file>]    validate page-recipes.json: shape, categories, layouts, archetypes
Options: --dir <project>, --json, --help
Exit: 0 ok, 1 refused or a check failed, 2 wrong usage. inventory --write never overwrites INVENTORY.md without --force.
`;

const VALUE_OPTIONS = ['dir', 'archetype', 'recipes'];
const FLAG_OPTIONS = ['json', 'write', 'force'];
const ALLOWED = {
  list: ['dir', 'archetype', 'recipes', 'json'],
  show: ['dir', 'recipes', 'json'],
  suggest: ['dir', 'recipes', 'json'],
  inventory: ['dir', 'recipes', 'json', 'write', 'force'],
  check: ['dir', 'recipes', 'json'],
};

function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '-h') flags.help = true;
    else if (!token.startsWith('--')) flags._.push(token);
    else {
      const eq = token.indexOf('=');
      const name = (eq === -1 ? token : token.slice(0, eq)).slice(2);
      if (name === 'help') flags.help = true;
      else if (FLAG_OPTIONS.includes(name) && eq === -1) flags[name] = true;
      else if (VALUE_OPTIONS.includes(name)) {
        const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
        if (value === undefined || value === '' || (eq === -1 && value.startsWith('--'))) throw new UsageError(`option --${name} needs a value`);
        flags[name] = value;
        if (eq === -1) i += 1;
      } else throw new UsageError(`unknown option "${token}"`);
    }
  }
  return flags;
}

const rootOf = (flags) => (flags.dir ? resolve(flags.dir) : process.env.AI_FRONTEND_PROJECT ? resolve(process.env.AI_FRONTEND_PROJECT) : dirname(KIT_DIR));
const outOf = (root) => (process.env.AI_FRONTEND_OUTPUT ? resolve(process.env.AI_FRONTEND_OUTPUT) : join(root, OUT_NAME));
const shown = (root, file) => {
  const rel = relative(root, file).replace(/\\/g, '/');
  return rel && !rel.startsWith('..') && !isAbsolute(rel) ? rel : file.replace(/\\/g, '/');
};
/** The command line of this tool in the one path form of the project (from its root). */
const selfCommand = (root, args) => runTool('recipe.mjs', args, root);
const say = (flags, json, text) => console.log(flags.json ? JSON.stringify(json, null, 2) : text);
const numbered = (lines) => lines.map((line, at) => `${at + 1}. ${line}`).join('\n');
const readText = (file) => (existsSync(file) ? readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null);

// ---------------------------------------------------------------- data

/** The parsed recipes file; a missing or broken file is refused with what to do. */
export function loadRecipes(file = RECIPES_FILE) {
  const text = readText(file);
  if (text === null) throw new Refusal(`${file.replace(/\\/g, '/')} not found; restore it from the kit`);
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Refusal(`${file.replace(/\\/g, '/')} is not valid JSON (${error.message})`);
  }
  if (!Array.isArray(data?.recipes)) throw new Refusal(`${file.replace(/\\/g, '/')} has no "recipes" list`);
  return data;
}

/** What the validation checks against: the categories, the layouts and the archetype names, read from their own documents. */
function referenceSets() {
  const names = (text, pattern) => [...(text ?? '').matchAll(pattern)].map((match) => match[1]);
  const categories = names(readText(TAXONOMY_FILE), /^\| `([a-z0-9-]+)` \|/gm);
  const layouts = names(readText(RULES_FILE), /^\| `([a-z0-9-]+)` \|/gm);
  const archetypes = readText(ARCHETYPES_FILE) ?? '';
  const part = (from, to) => {
    const start = archetypes.indexOf(from);
    const end = archetypes.indexOf(to, start + 1);
    return start === -1 ? '' : archetypes.slice(start, end === -1 ? undefined : end);
  };
  const rows = (text) => names(text, /^\| ([^|\n]+?) \|/gm).filter((name) => !/^(Archetype|-+)$/.test(name));
  return { categories, layouts, site: rows(part('## 1', '## 2')), experience: rows(part('## 2', '## 3')) };
}

const isText = (value, min = 1) => typeof value === 'string' && value.trim().length >= min;

/** The problems of a recipes file, each naming where it is. An empty list means the file is valid. */
export function checkRecipes(data, sets = referenceSets()) {
  const problems = [];
  if (data.version !== 1) problems.push('"version" must be 1');
  if (!data.recipes.length) problems.push('"recipes" is empty');
  const ids = new Set();
  const listOf = (value) => (Array.isArray(value) ? value : []);
  for (const [at, recipe] of data.recipes.entries()) {
    const where = isText(recipe?.id) ? recipe.id : `recipe #${at + 1}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(recipe?.id ?? '')) problems.push(`${where}: "id" must be lowercase words joined by "-"`);
    else if (ids.has(recipe.id)) problems.push(`${where}: duplicate recipe id`);
    ids.add(recipe?.id);
    for (const field of ['name', 'use_when']) if (!isText(recipe?.[field], 8)) problems.push(`${where}: "${field}" must be a sentence`);
    if (!listOf(recipe?.match).length || !listOf(recipe.match).every((word) => isText(word))) problems.push(`${where}: "match" must list the words of a screen name`);
    for (const [field, label, known] of [['site_archetypes', 'site', sets.site], ['experience_archetypes', 'experience', sets.experience]]) {
      if (!listOf(recipe?.[field]).length) problems.push(`${where}: "${field}" is empty`);
      for (const name of listOf(recipe?.[field])) if (!known.includes(name)) problems.push(`${where}: ${label} archetype "${name}" is not in SITE-ARCHETYPES.md`);
    }
    if (!NAVIGATION_MODELS.includes(recipe?.navigation_model)) problems.push(`${where}: navigation_model "${recipe?.navigation_model}" is not one of: ${NAVIGATION_MODELS.join(', ')}`);
    if (!listOf(recipe?.sections).length) problems.push(`${where}: "sections" is empty`);
    const seen = new Set();
    for (const [index, section] of listOf(recipe?.sections).entries()) {
      const at2 = `${where}/${isText(section?.id) ? section.id : `section #${index + 1}`}`;
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(section?.id ?? '')) problems.push(`${at2}: "id" must be lowercase words joined by "-"`);
      else if (seen.has(section.id)) problems.push(`${at2}: duplicate section id`);
      seen.add(section?.id);
      for (const field of ['job', 'avoid']) if (!isText(section?.[field], 15)) problems.push(`${at2}: "${field}" must be a sentence`);
      if (!NARRATIVES.includes(section?.narrative)) problems.push(`${at2}: narrative "${section?.narrative}" is not one of: ${NARRATIVES.join(', ')}`);
      if (section?.serves !== null && !Object.hasOwn(SERVES, section?.serves)) problems.push(`${at2}: serves "${section?.serves}" must be G, O, P or null`);
      if (!sets.categories.includes(section?.category)) problems.push(`${at2}: category "${section?.category}" is not in catalog/taxonomy.md`);
      if (!isText(section?.query)) problems.push(`${at2}: "query" must hold the words to search`);
      if (typeof section?.required !== 'boolean') problems.push(`${at2}: "required" must be true or false`);
      if (!sets.layouts.includes(section?.layout)) problems.push(`${at2}: layout "${section?.layout}" is not defined in LAYOUT-RULES.md`);
      for (const state of listOf(section?.states)) if (!STATES.includes(state)) problems.push(`${at2}: state "${state}" is not one of: ${STATES.join(', ')}`);
      if (section?.shared !== undefined && typeof section.shared !== 'boolean') problems.push(`${at2}: "shared" must be true or false`);
    }
    if (listOf(recipe?.sections).length && !listOf(recipe.sections).some((section) => section?.required === true)) problems.push(`${where}: no section is required`);
  }
  return problems;
}

const withRecipes = (flags) => loadRecipes(flags.recipes ? resolve(flags.recipes) : RECIPES_FILE).recipes;

// ---------------------------------------------------------------- list, show, check

const summary = (recipe) => `${recipe.id} — ${recipe.name} (${recipe.sections.length} sections; ${recipe.navigation_model})`;

function archetypeMatches(recipe, wanted) {
  const key = wanted.trim().toLowerCase();
  return [...recipe.site_archetypes, ...recipe.experience_archetypes].some((name) => name.toLowerCase() === key || name.toLowerCase().split(' / ')[0] === key);
}

function list(flags) {
  const recipes = withRecipes(flags);
  let chosen = recipes;
  if (flags.archetype) {
    const sets = referenceSets();
    const known = [...sets.site, ...sets.experience, ...recipes.flatMap((recipe) => [...recipe.site_archetypes, ...recipe.experience_archetypes])];
    const key = flags.archetype.trim().toLowerCase();
    if (!known.some((name) => name.toLowerCase() === key || name.toLowerCase().split(' / ')[0] === key)) throw new UsageError(`unknown archetype "${flags.archetype}"; the names are in experience/SITE-ARCHETYPES.md`);
    chosen = recipes.filter((recipe) => archetypeMatches(recipe, flags.archetype));
  }
  if (flags.json) return console.log(JSON.stringify(chosen.map((recipe) => ({ id: recipe.id, name: recipe.name, use_when: recipe.use_when, navigation_model: recipe.navigation_model, sections: recipe.sections.length })), null, 2));
  if (!chosen.length) return console.log(`No recipe for the archetype "${flags.archetype}": describe the blocks of its pages by hand.`);
  console.log(chosen.map(summary).join('\n'));
}

function show(flags) {
  const [, id, sectionId, ...extra] = flags._;
  if (!id || extra.length) throw new UsageError('show needs a recipe id and optionally a section id: show <id> [<section>]');
  const recipe = withRecipes(flags).find((entry) => entry.id === id);
  if (!recipe) throw new UsageError(`unknown recipe "${id}"; list them with: ${selfCommand(rootOf(flags), 'list')}`);
  if (sectionId !== undefined) {
    const section = recipe.sections.find((entry) => entry.id === sectionId);
    if (!section) throw new UsageError(`recipe "${id}" has no section "${sectionId}" (sections: ${recipe.sections.map((entry) => entry.id).join(', ')})`);
    if (flags.json) return console.log(JSON.stringify(section, null, 2));
    const lines = [`${recipe.id} / ${section.id} — ${section.required ? 'required' : 'optional'}`, `job: ${section.job}`, `avoid: ${section.avoid}`, `narrative: ${section.narrative} · layout: ${section.layout}`, `find: "${section.query}" --category ${section.category}`];
    if (section.serves) lines.push(`serves: ${section.serves} (${SERVES[section.serves]} in PRODUCT.md)`);
    if (section.states?.length) lines.push(`states: ${section.states.join(', ')}`);
    return console.log(lines.join('\n'));
  }
  if (flags.json) return console.log(JSON.stringify(recipe, null, 2));
  const lines = [`${recipe.id} — ${recipe.name}`, `use: ${recipe.use_when}`, `navigation: ${recipe.navigation_model} · site: ${recipe.site_archetypes.join(', ')} · experience: ${recipe.experience_archetypes.join(', ')}`];
  recipe.sections.forEach((section, at) => {
    lines.push(`${at + 1} ${section.id} · ${section.narrative} · ${section.layout} · ${section.required ? 'must' : 'should'} · find "${section.query}"${section.serves ? ` · serves ${section.serves}` : ''}`, `   ${section.job}`);
  });
  console.log(lines.join('\n'));
}

function check(flags) {
  const data = loadRecipes(flags.recipes ? resolve(flags.recipes) : RECIPES_FILE);
  const problems = checkRecipes(data);
  const count = data.recipes.reduce((total, recipe) => total + (Array.isArray(recipe?.sections) ? recipe.sections.length : 0), 0);
  if (problems.length) {
    if (flags.json) console.log(JSON.stringify({ ok: false, recipes: data.recipes.length, sections: count, problems }, null, 2));
    else console.error(`page-recipes.json: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n${numbered(problems)}`);
    process.exitCode = 1;
    return;
  }
  say(flags, { ok: true, recipes: data.recipes.length, sections: count, problems: [] }, `page-recipes.json: ${data.recipes.length} recipes, ${count} sections, all valid.`);
}

// ---------------------------------------------------------------- suggest

const plain = (text) => String(text).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const tokensOf = (text) => plain(text).split(/[^a-z0-9]+/).filter(Boolean);
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The sections of the files a suggestion reads; null when the file does not exist. */
function readInputs(root) {
  const out = outOf(root);
  return { brief: readText(join(out, 'ux', 'EXPERIENCE-BRIEF.md')), spec: readText(join(out, 'ux', 'UX-SPEC.md')), product: readText(join(root, 'PRODUCT.md')) };
}

/** What the brief says: archetype names, navigation_model and the page names. */
function readBrief(text, recipes) {
  if (text === null) return { archetypes: [], navigation: null, pages: [] };
  const all = markdownSections(text);
  const body = all.find((section) => section.key === 'archetype')?.body ?? '';
  const names = [...new Set(recipes.flatMap((recipe) => [...recipe.site_archetypes, ...recipe.experience_archetypes]))];
  const archetypes = names.filter((name) => [name, name.split(' / ')[0]].some((form) => new RegExp(`\\b${escapeRegExp(form)}\\b`, 'i').test(body)));
  const model = /navigation_model\s*:\s*`?([a-z-]+)/i.exec(text)?.[1]?.toLowerCase();
  const navigation = NAVIGATION_ALIAS[model] ?? model ?? null;
  const lines = body.split('\n');
  const start = lines.findIndex((line) => /^\s*pages\s*:/i.test(line));
  const pages = [];
  if (start !== -1) {
    const chunks = [lines[start].replace(/^\s*pages\s*:/i, '')];
    for (const line of lines.slice(start + 1)) {
      if (!/^\s*[-*•]/.test(line)) break;
      chunks.push(line.replace(/^\s*[-*•]\s*/, ''));
    }
    for (const chunk of chunks) for (const piece of chunk.split(';')) {
      const name = piece.split(/\s[—–-]\s|:/)[0].trim();
      if (name && !name.includes('<')) pages.push({ screen: name, purpose: piece.slice(piece.indexOf(name) + name.length).replace(/^\s*[—–:-]\s*/, '') });
    }
  }
  return { archetypes, navigation, pages };
}

/** The rows of the Screens table of UX-SPEC.md. */
function readScreens(text) {
  if (text === null) return [];
  const body = markdownSections(text).find((section) => section.key === 'screens')?.body ?? '';
  const { header, rows } = table(body);
  const at = (pattern) => header.findIndex((name) => pattern.test(name));
  const [screen, purpose, action] = [at(/^screen/), at(/^purpose/), at(/^primary action/)];
  if (screen < 0) return [];
  return rows.filter((row) => row[screen] && !row[screen].includes('<')).map((row) => ({ screen: row[screen], purpose: [row[purpose], row[action]].filter(Boolean).join(' ') }));
}

/** The words of a recipe that appear in a text: single words (also in the plural) and phrases. */
function wordHits(recipe, text) {
  const tokens = tokensOf(text);
  const padded = ` ${tokens.join(' ')} `;
  return recipe.match.map(plain).filter((word) => (word.includes(' ') ? padded.includes(` ${word} `) : tokens.some((token) => token === word || token === `${word}s` || token === `${word}es`)));
}

const HOME_WORDS = ['home', 'homepage', 'inicio', 'start'];

/** The recipe for one screen with the reason, or recipe null when no recipe fits with confidence. */
function pick(entry, recipes, brief) {
  const nameTokens = tokensOf(entry.screen);
  let reason = null;
  const scored = recipes.map((recipe) => {
    let hits = wordHits(recipe, entry.screen);
    let homeConsole = false;
    if (nameTokens.length === 1 && HOME_WORDS.includes(nameTokens[0]) && brief.navigation === 'console') {
      homeConsole = recipe.id === 'dashboard-home';
      hits = homeConsole ? [nameTokens[0]] : hits.filter((word) => !HOME_WORDS.includes(word));
    }
    const archetype = [...recipe.experience_archetypes, ...recipe.site_archetypes].find((name) => brief.archetypes.includes(name));
    const longest = Math.max(0, ...hits.map((word) => word.length));
    return { recipe, hits, homeConsole, archetype, score: hits.length ? 100 + longest + (archetype ? 10 : 0) + Math.min(wordHits(recipe, entry.purpose).length, 3) : 0 };
  }).filter((candidate) => candidate.score > 0).sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return { recipe: null, reason };
  const word = [...best.hits].sort((a, b) => b.length - a.length)[0];
  reason = `${best.homeConsole ? `name "${word}" and the brief is a console` : `name "${word}"`}${best.archetype ? `; archetype ${best.archetype}` : ''}`;
  return { recipe: best.recipe, reason };
}

function suggestions(flags) {
  const root = rootOf(flags);
  const recipes = withRecipes(flags);
  const { brief, spec, product } = readInputs(root);
  const info = readBrief(brief, recipes);
  const fromSpec = readScreens(spec);
  const source = fromSpec.length ? 'UX-SPEC.md' : 'the pages of EXPERIENCE-BRIEF.md (no UX-SPEC.md yet)';
  const screens = fromSpec.length ? fromSpec : info.pages;
  if (!screens.length) throw new Refusal(`no screens to read: write ${shown(root, join(outOf(root), 'ux', 'UX-SPEC.md'))} (route ux) or the pages line of EXPERIENCE-BRIEF.md first. To read a recipe without them: ${selfCommand(root, 'list')}`);
  const result = screens.map((entry) => ({ screen: entry.screen, ...pick(entry, recipes, info) }));
  return { root, recipes, info, product, source, result };
}

function suggest(flags) {
  const { root, info, source, result } = suggestions(flags);
  const json = { source, navigation_model: info.navigation, archetypes: info.archetypes, screens: result.map((entry) => ({ screen: entry.screen, recipe: entry.recipe?.id ?? null, reason: entry.reason })) };
  const lines = [`Screens from ${source}:`, ...result.map((entry) => (entry.recipe ? `${entry.screen} → ${entry.recipe.id} (${entry.reason})` : `${entry.screen} → no recipe: describe its blocks by hand`))];
  if (result.some((entry) => entry.recipe)) lines.push(`Sections of a recipe: ${selfCommand(root, 'show <id>')}`, `Next: ${selfCommand(root, 'inventory --write')}`);
  say(flags, json, lines.join('\n'));
}

// ---------------------------------------------------------------- inventory

/** The ids of PRODUCT.md by kind: G (primary action), O (objections), P (proof), in the order they appear. */
function productIds(text) {
  const ids = { G: [], O: [], P: [] };
  if (text === null) return ids;
  for (const match of text.matchAll(/^[\s>*_-]*([GOP]\d+)\b\s*[:.)—-]/gm)) if (!ids[match[1][0]].includes(match[1])) ids[match[1][0]].push(match[1]);
  return ids;
}

const cell = (value) => String(value ?? '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '/').trim();

/** The inventory rows (objects keyed by column) of the screens that have a recipe; blocks shared by two screens or more are one row. */
function inventoryRows(result, product) {
  const ids = productIds(product);
  const used = new Map();
  for (const entry of result.filter((item) => item.recipe)) {
    for (const section of entry.recipe.sections) if (section.shared) used.set(section.id, [...(used.get(section.id) ?? []), entry.screen]);
  }
  const done = new Set();
  const rows = [];
  for (const entry of result.filter((item) => item.recipe)) {
    for (const section of entry.recipe.sections) {
      const users = used.get(section.id) ?? [];
      const shared = section.shared && users.length > 1;
      if (shared && done.has(section.id)) continue;
      if (shared) done.add(section.id);
      const notes = [section.job, section.states?.length ? `States: ${section.states.join(', ')}.` : '', shared ? `Used by: ${users.join(', ')}.` : ''].filter(Boolean).join(' ');
      rows.push({
        Screen: shared ? 'shared' : entry.screen,
        Block: section.id,
        Category: section.category,
        Priority: section.required ? 'must' : 'should',
        Notes: notes,
        Candidates: '',
        Decision: '',
        Serves: section.serves ? ids[section.serves].join(', ') : '',
        Layout: section.layout,
        Query: section.query,
      });
    }
  }
  return rows;
}

function inventoryText(rows) {
  const line = (cells) => `| ${cells.map(cell).join(' | ')} |`;
  return [
    '# Inventory',
    '<!-- Written by recipe.mjs inventory from the recipe of each screen. Remove the blocks the product does not need, add the ones it lacks. Candidates and Decision come later. -->',
    line(INVENTORY_COLUMNS),
    `|${INVENTORY_COLUMNS.map(() => '---').join('|')}|`,
    ...rows.map((row) => line(INVENTORY_COLUMNS.map((name) => row[name]))),
    '',
  ].join('\n');
}

/** True for a file that holds only the scaffold of the flow (every table row still has a <token>) or nothing at all: nothing of the reader's would be lost. */
function templateOnly(text) {
  if (!text.trim()) return true;
  const { rows } = table(text);
  return rows.length > 0 && rows.every((row) => row.some((value) => value.includes('<')));
}

function inventory(flags) {
  const { root, product, result } = suggestions(flags);
  const rows = inventoryRows(result, product);
  const without = result.filter((entry) => !entry.recipe).map((entry) => entry.screen);
  if (!rows.length) throw new Refusal(`no screen has a recipe, so there is nothing to write (${without.join(', ')}); describe the blocks by hand with the template of the flow`);
  const note = without.length ? `No recipe for: ${without.join(', ')}. Add their rows by hand.` : '';
  const text = inventoryText(rows);
  if (!flags.write) {
    if (flags.json) return console.log(JSON.stringify({ columns: INVENTORY_COLUMNS, rows, without_recipe: without }, null, 2));
    process.stdout.write(text);
    if (note) console.error(note);
    return;
  }
  const file = join(outOf(root), 'INVENTORY.md');
  const existing = [file, join(root, 'INVENTORY.md')].find((candidate) => existsSync(candidate) && !templateOnly(readText(candidate)));
  if (existing && !flags.force) throw new Refusal(`${shown(root, existing)} already exists and was not changed; use --force to replace it with the rows of the recipes`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  const screens = new Set(rows.map((row) => row.Screen)).size;
  say(flags, { file: shown(root, file), rows: rows.length, without_recipe: without }, `Wrote ${shown(root, file)}: ${rows.length} rows for ${screens} screens or shared blocks.${note ? `\n${note}` : ''}\nNow review the rows: remove what the product does not need, add what is missing. Keep the file at about 30 rows.`);
}

// ---------------------------------------------------------------- main

function main() {
  try {
    const flags = parseArgs(process.argv.slice(2));
    if (flags.help) return console.log(USAGE);
    const command = flags._[0];
    if (!command) throw new UsageError('missing command');
    if (!(command in ALLOWED)) throw new UsageError(`unknown command "${command}"`);
    for (const name of Object.keys(flags)) if (!['_', 'help'].includes(name) && !ALLOWED[command].includes(name)) throw new UsageError(`option --${name} does not apply to ${command}`);
    if (command !== 'show' && flags._.length > 1) throw new UsageError(`unexpected argument "${flags._[1]}"`);
    if (command === 'list') return list(flags);
    if (command === 'show') return show(flags);
    if (command === 'suggest') return suggest(flags);
    if (command === 'inventory') return inventory(flags);
    return check(flags);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`recipe: ${error.message}\n\n${USAGE}`);
      process.exitCode = 2;
    } else if (error instanceof Refusal) {
      console.error(`recipe: ${error.message}`);
      process.exitCode = 1;
    } else throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) main();
