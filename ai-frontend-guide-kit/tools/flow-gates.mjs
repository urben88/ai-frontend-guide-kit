/**
 * flow-gates — what `flow.mjs done` checks inside a file, instead of "the file exists".
 *
 * Not a command: `flow.mjs` imports it. A gate is a pure function `(text, ctx) => string[]`: the
 * problems it finds, each saying the section and what is missing (the caller adds the file). An
 * empty list means the gate passes. `ctx` carries what a gate may need from the project:
 *   ctx.read(ref)     the text of another file ("out:ux/UX-SPEC.md", "root:PRODUCT.md"), or null
 *   ctx.ownProduct    true when the repository has its own product document (no PRODUCT.md)
 *   ctx.run(tool, args)  the command line of a kit tool, in the one path form of the project
 * A gate may also carry `also(ctx)`: problems about another file, already prefixed with that file's name.
 * It also holds the text-level helpers that `flow scaffold` and `flow report` use, so the template
 * a reader fills and the gate that reads it stay together.
 */

import { validateTokens } from './tokens.mjs';
import { runTool } from './kit-path.mjs';

const norm = (text) => text.toLowerCase().replace(/\s+/g, ' ').trim();

/** The headings of a markdown text with their bodies; a body runs until the next heading of the same or a higher level. */
export function sections(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const heads = [];
  let fenced = false;
  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) fenced = !fenced;
    const match = fenced ? null : line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (match) heads.push({ level: match[1].length, title: match[2].trim(), key: norm(match[2]), index });
  });
  return heads.map((head, n) => {
    const end = heads.slice(n + 1).find((next) => next.level <= head.level)?.index ?? lines.length;
    return { ...head, body: lines.slice(head.index + 1, end).join('\n') };
  });
}

const HTML_TAG = /^<\/?(br|b|i|em|strong|code|kbd|a|p|span|div|img|ul|ol|li|sup|sub)\b[^<>]*\/?>$|^<(https?:|mailto:)/i;

/** The template tokens (`<…>`, `<id>`) still in a text, ignoring code spans, HTML tags and HTML comments. */
export function tokensIn(text) {
  const plain = text.replace(/<!--[\s\S]*?-->/g, '').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  return [...new Set((plain.match(/<[^<>\s][^<>\n]*>/g) ?? []).filter((token) => !HTML_TAG.test(token)))];
}

/** The first table of a text: its header cells and its data rows (rows with at least one filled cell). */
export function table(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((line) => line.trim().startsWith('|'));
  const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
  const isSeparator = (line) => /^\|?[\s:|-]+\|?$/.test(line.trim()) && /-{3,}/.test(line);
  const [header = '', ...rest] = lines.filter((line) => !isSeparator(line));
  return { header: cells(header).map(norm), rows: rest.map(cells).filter((row) => row.some(Boolean)) };
}

const find = (all, title) => all.find((section) => section.key === norm(title));

/** Every title must be a heading, with a body that is not empty and holds no template token. */
function required(text, titles) {
  const all = sections(text);
  const problems = [];
  for (const title of titles) {
    const section = find(all, title);
    if (!section) problems.push(`section "${title}" is missing`);
    else if (!section.body.trim()) problems.push(`section "${title}" is empty`);
    else {
      const tokens = tokensIn(section.body);
      if (tokens.length) problems.push(`section "${title}" still has a template token (${tokens[0]}); replace it with the real content`);
    }
  }
  return problems;
}

const bodyOf = (text, title) => find(sections(text), title)?.body ?? null;
const filled = (body) => body !== null && body.trim() !== '' && tokensIn(body).length === 0;

const NAVIGATION_MODELS = ['single-page-anchors', 'linear-wizard', 'hub', 'catalog', 'console', 'tree'];
const ARCHITECTURE_MODES = ['map', 'fsd-new', 'fsd-refactor'];
const ID_LINE = { G: /^\s*(?:[-*]\s*)?G\d+\s*[:.]/m, O: /^\s*(?:[-*]\s*)?O\d+\s*[:.]/m, P: /^\s*(?:[-*]\s*)?P\d+\s*[:.]/m };

/** The ids a PRODUCT.md defines: G1 (primary action), O1… (objections), P1… (proof). */
export function productIds(text) {
  return new Set([...text.matchAll(/^\s*(?:[-*]\s*)?([GOP]\d+)\s*[:.]/gm)].map((match) => match[1].toUpperCase()));
}

function brief(titles, extra = () => []) {
  return (text) => [...required(text, titles), ...extra(text)];
}

function classify(text) {
  const problems = [];
  const archetype = bodyOf(text, 'Archetype');
  if (filled(archetype)) {
    const model = archetype.match(/navigation_model\s*:\s*([^\s·,;]+)/i)?.[1].replace(/[`*]/g, '');
    if (!model) problems.push(`section "Archetype": the line "navigation_model: …" is missing (one of: ${NAVIGATION_MODELS.join(', ')})`);
    else if (!model.startsWith('<') && !NAVIGATION_MODELS.includes(model.toLowerCase())) problems.push(`section "Archetype": navigation_model "${model}" is not one of: ${NAVIGATION_MODELS.join(', ')}`);
    if (!/^\s*pages\s*:/im.test(archetype)) problems.push('section "Archetype": the line "pages: …" is missing (one line per page, with its job)');
  }
  const philosophy = bodyOf(text, 'Philosophy');
  if (filled(philosophy) && !/discarded\s*:\s*\S/i.test(philosophy)) problems.push('section "Philosophy": the "discarded:" line is missing (the alternative you did not choose, and why)');
  return problems;
}

function journey(text) {
  const body = bodyOf(text, 'Journey');
  if (!filled(body)) return [];
  const { rows } = table(body);
  return rows.length >= 3 ? [] : [`section "Journey": the table needs at least 3 rows of data (it has ${rows.length})`];
}

function directions(text) {
  const all = sections(text);
  const head = find(all, 'Three directions');
  if (!head || !filled(head.body)) return [];
  const blocks = sections(head.body).filter((section) => section.level === head.level + 1);
  return ['safe', 'differentiated', 'experimental']
    .filter((kind) => !blocks.some((block) => block.key.startsWith(kind) && block.body.trim()))
    .map((kind) => `section "Three directions": no "${kind}" block (a "### ${kind}: <name>" heading with its lines)`);
}

function recommended(text) {
  const body = bodyOf(text, 'Recommended direction');
  if (!filled(body)) return [];
  const id = body.match(/(?:^|[\s·,;])id\s*:\s*([^\s·]+)/i);
  return id ? [] : ['section "Recommended direction": the line "id: …" is missing (the direction the user chose)'];
}

function product(text) {
  const problems = required(text, ['Audience', 'Primary action', 'Objections', 'Proof', 'Tone']);
  const ids = [['Primary action', 'G', 'give the action an id, "G1: …"'], ['Objections', 'O', 'give each objection an id, "O1: …"'], ['Proof', 'P', 'give each proof an id, "P1: …"']];
  for (const [title, letter, advice] of ids) {
    const body = bodyOf(text, title);
    if (filled(body) && !ID_LINE[letter].test(body)) problems.push(`section "${title}": ${advice}, so a screen can cite it`);
  }
  return problems;
}

function spec(text, ctx) {
  const problems = required(text, ['Screens', 'Flows', 'Navigation']);
  const screens = bodyOf(text, 'Screens');
  if (filled(screens)) {
    const { header, rows } = table(screens);
    const column = (pattern) => header.findIndex((name) => pattern.test(name));
    const states = [['empty', column(/empty/)], ['loading', column(/loading/)], ['error', column(/error/)]];
    const serves = column(/serves/);
    for (const [name, index] of states) if (index < 0) problems.push(`section "Screens": the table has no "${name[0].toUpperCase()}${name.slice(1)} state" column`);
    if (serves < 0) problems.push('section "Screens": the table has no "Serves" column; add it as the last column, with the ids of PRODUCT.md');
    if (!rows.length) problems.push('section "Screens": the table has no rows of data');
    const product = ctx.read('root:PRODUCT.md');
    const defined = product !== null && !ctx.ownProduct ? productIds(product) : null;
    rows.forEach((row, n) => {
      const where = `section "Screens", screen "${row[0] || `row ${n + 1}`}"`;
      for (const [name, index] of states) if (index >= 0 && !row[index]) problems.push(`${where}: the ${name} state is empty`);
      if (serves < 0) return;
      const cell = row[serves] ?? '';
      if (!cell) problems.push(`${where}: "Serves" is empty; cite the id of what it serves in PRODUCT.md (G1, O1, P1)`);
      else if (defined) {
        const cited = cell.match(/[GOP]\d+/gi)?.map((id) => id.toUpperCase()) ?? [];
        if (!cited.length) problems.push(`${where}: "Serves" holds no id; cite the id of what it serves in PRODUCT.md (G1, O1, P1)`);
        for (const id of cited) if (!defined.has(id)) problems.push(`${where}: "Serves" cites ${id}, which PRODUCT.md does not define`);
      }
    });
  }
  const flows = bodyOf(text, 'Flows');
  if (filled(flows) && !/^\s*1[.)]\s+\S/m.test(flows)) problems.push('section "Flows": no numbered flow; write each flow as "1. <screen> → …"');
  return problems;
}

/** Every string inside a parsed JSON value. */
function strings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

function parseJson(text) {
  try {
    return { data: JSON.parse(text) };
  } catch {
    return { error: 'the file is not valid JSON' };
  }
}

function map(text, ctx) {
  const { data, error } = parseJson(text);
  if (error) return [error];
  if (!Array.isArray(data?.elements) || !data.elements.length) return ['the map has no elements'];
  const specText = ctx.read('out:ux/UX-SPEC.md');
  if (specText === null) return [];
  const names = new Set(strings(data).map((value) => norm(value)));
  const screens = table(bodyOf(specText, 'Screens') ?? '').rows.map((row) => row[0]).filter(Boolean);
  return screens.filter((screen) => ![...names].some((name) => name.includes(norm(screen)))).map((screen) => `the screen "${screen}" of UX-SPEC.md is not a node of the map`);
}

function design(text) {
  const problems = required(text, ['Visual intent', 'Color', 'Type', 'Spacing', 'Radius', 'Motion', 'Contrast']);
  const color = bodyOf(text, 'Color');
  if (filled(color) && !table(color).rows.length) problems.push('section "Color": the table has no rows of data');
  const contrast = bodyOf(text, 'Contrast');
  if (filled(contrast)) {
    const ratio = contrast.match(/(\d+(?:\.\d+)?)\s*:\s*1\b/) ?? contrast.match(/(\d+(?:\.\d+)?)/);
    if (!ratio) problems.push('section "Contrast": write the measured ratio of the body text on its background, for example "7.1:1"');
    else if (Number(ratio[1]) < 4.5) problems.push(`section "Contrast": ${ratio[1]} is below 4.5; change the colors until the body text reaches 4.5:1`);
  }
  return problems;
}

/** design-tokens.json, next to DESIGN.md: it exists, every value parses, references resolve and every declared contrast pair passes. */
function tokensFile(ctx) {
  const text = ctx.read('root:design-tokens.json');
  const run = ctx.run ?? ((tool, args) => runTool(tool, args));
  if (text === null) return [`design-tokens.json: the file is missing; write it with: ${run('tokens.mjs', 'init --primary <hex>')} (then check, css and doc)`];
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return ['design-tokens.json: the file is not valid JSON'];
  }
  return validateTokens(data).problems.map((problem) => `design-tokens.json: ${problem}`);
}

/**
 * The columns of INVENTORY.md, in order. The one list: the template in flow-steps.mjs and the rows
 * recipe.mjs writes both take it from here. The gate below finds columns by name, so an older table
 * with only the first seven columns still passes.
 */
export const INVENTORY_COLUMNS = ['Screen', 'Block', 'Category', 'Priority', 'Notes', 'Candidates', 'Decision', 'Serves', 'Layout', 'Query'];

/** The rows of the inventory with the cells a check needs; `where` names a row the way a reader finds it. */
function inventoryRows(text) {
  const { header, rows } = table(text);
  const column = (pattern) => header.findIndex((name) => pattern.test(name));
  const at = { screen: column(/^screen/), block: column(/^block/), priority: column(/^priority/), candidates: column(/^candidates/), decision: column(/^decision/) };
  return { at, rows: rows.map((row) => ({ row, where: `row "${row[at.screen] || '?'} / ${row[at.block] || '?'}"`, priority: (row[at.priority] ?? '').toLowerCase() })) };
}

function inventory(text) {
  const { at, rows } = inventoryRows(text);
  if (!rows.length) return ['the table has no rows of data'];
  const problems = [];
  const tokens = tokensIn(text);
  if (tokens.length) problems.push(`the inventory still has a template token (${tokens[0]}); replace it with the real content`);
  for (const { row, where, priority } of rows) {
    for (const name of ['screen', 'block']) if (at[name] >= 0 && !row[at[name]]) problems.push(`${where}: the ${name} is empty`);
    if (!['must', 'should', 'nice'].includes(priority)) problems.push(`${where}: Priority "${row[at.priority] ?? ''}" is not must, should or nice`);
  }
  return problems;
}

/** Every must and should row needs the cell `field` filled: a candidate, or the words of the searches that found nothing. */
function inventoryColumn(field, missing) {
  return (text) => {
    const { at, rows } = inventoryRows(text);
    if (at[field] < 0) return [`the table has no "${field[0].toUpperCase()}${field.slice(1)}" column`];
    return rows.filter(({ row, priority }) => ['must', 'should'].includes(priority) && !row[at[field]]).map(({ where }) => `${where}: ${missing}`);
  };
}

function architecture(text) {
  const { data, error } = parseJson(text);
  if (error) return [error];
  const problems = [];
  const walk = (value, path) => {
    if (typeof value === 'string' && tokensIn(value).length) problems.push(`"${path}" still has a template token (${tokensIn(value)[0]}); replace it with the real content`);
    else if (Array.isArray(value)) value.forEach((item) => walk(item, path));
    else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) walk(item, key);
  };
  walk(data, 'file');
  if (!ARCHITECTURE_MODES.includes(data?.mode)) problems.push(`mode "${data?.mode ?? ''}" is not one of: ${ARCHITECTURE_MODES.join(', ')}`);
  if (!data?.layers || typeof data.layers !== 'object' || Array.isArray(data.layers)) problems.push('"layers" must be an object');
  return problems;
}

const BRIEF_FILE = ['out:ux/EXPERIENCE-BRIEF.md'];
const INVENTORY_FILE = ['out:INVENTORY.md', 'root:INVENTORY.md'];

/** Gates by micro-step (`<step>.<part>`, or `<step>` for a step with one part): the files they read and the check. */
export const GATES = {
  'direction.questions': { files: BRIEF_FILE, check: brief(['Context', 'Goal']) },
  'direction.classify': { files: BRIEF_FILE, check: brief(['Archetype', 'Philosophy'], classify) },
  'direction.journey': { files: BRIEF_FILE, check: brief(['Journey', 'Information architecture'], journey) },
  'direction.references': { files: BRIEF_FILE, check: brief(['Reference discoveries']) },
  'direction.directions': { files: BRIEF_FILE, check: brief(['Three directions'], directions) },
  'direction.choose': { files: BRIEF_FILE, check: brief(['Recommended direction', 'Interaction patterns', 'Visual brief', 'Accessibility', 'Open questions'], recommended) },
  'ux.product': { files: ['root:PRODUCT.md'], check: product, when: (ctx) => !ctx.ownProduct },
  'ux.spec': { files: ['out:ux/UX-SPEC.md'], check: spec },
  'ux.map': { files: ['out:ux/ux-map.excalidraw'], check: map },
  tokens: { files: ['root:DESIGN.md', 'out:DESIGN.md'], check: design, also: tokensFile },
  'compose.inventory': { files: INVENTORY_FILE, check: inventory },
  'compose.find': { files: INVENTORY_FILE, check: inventoryColumn('candidates', 'no candidates; write up to 3, or the words of the two searches that found nothing') },
  'compose.decide': { files: INVENTORY_FILE, check: inventoryColumn('decision', 'no decision; write reuse, adapt or build') },
  architecture: { files: ['out:architecture.json'], check: architecture },
};

/** Writes a template into a file's text: a new file gets all of it, an existing one only the sections (## headings) it lacks. */
export function mergeTemplate(existing, lines) {
  if (lines[0]?.trim().startsWith('{')) return existing === null ? { text: `${lines.join('\n')}\n`, added: ['the file'] } : { text: existing, added: [] };
  const chunks = [];
  for (const line of lines) {
    const head = line.match(/^(#{1,2})\s+(.+)$/);
    if (head) chunks.push({ level: head[1].length, title: head[2].trim(), lines: [line] });
    else if (chunks.length) chunks.at(-1).lines.push(line);
    else chunks.push({ level: 0, title: null, lines: [line] });
  }
  if (existing === null || !existing.trim()) return { text: `${lines.join('\n')}\n`, added: chunks.filter((chunk) => chunk.title).map((chunk) => chunk.title) };
  const have = new Set(sections(existing).map((section) => section.key));
  const missing = chunks.filter((chunk) => chunk.level === 2 && !have.has(norm(chunk.title)));
  if (!missing.length) return { text: existing, added: [] };
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  return { text: `${existing.replace(/\s+$/, '')}${eol}${eol}${missing.map((chunk) => chunk.lines.join(eol)).join(eol)}${eol}`, added: missing.map((chunk) => chunk.title) };
}

// ---------------------------------------------------------------- reports of the steps closed with free evidence

const CHECK_LINE = /^\s*[-*]\s*\[([^\]]*)\]\s*(.*)$/;

/** The line of a report that holds `label`: its box ("", "x", "n/a") and the text after the label. */
function checkLine(text, label) {
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const found = matchLabel(line, label);
    if (found) return found;
  }
  return null;
}

/** The box ("", "x", "n/a") and the text after `label` when `line` is the report line of that check. */
function matchLabel(line, label) {
  const match = line.match(CHECK_LINE);
  if (match && match[2].startsWith(label) && (match[2].length === label.length || /^[\s—:-]/.test(match[2].slice(label.length)))) return { box: match[1].trim().toLowerCase(), rest: match[2].slice(label.length) };
  return null;
}

/** The report of one step as text, or `existing` plus only the checks it lacks (one line each: `- [ ] <check> — result: <…>`). */
export function mergeReport(existing, step, checks) {
  const line = (check) => `- [ ] ${check} — result: <…>`;
  if (existing === null || !existing.trim()) {
    const name = `${step[0].toUpperCase()}${step.slice(1).replace(/-/g, ' ')}`;
    return { text: [`# ${name} report`, 'Mark every line: [x] and the result after "result:", or [n/a] and the reason after "reason:".', ...checks.map(line), ''].join('\n'), added: checks };
  }
  const missing = checks.filter((check) => !checkLine(existing, check));
  if (!missing.length) return { text: existing, added: [] };
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  return { text: `${existing.replace(/\s+$/, '')}${eol}${missing.map(line).join(eol)}${eol}`, added: missing };
}

/** What stops a report from closing its step: a check missing, not done, without result or reason, or with a token left. */
export function reportProblems(text, checks) {
  const problems = [];
  for (const check of checks) {
    const found = checkLine(text, check);
    if (!found) problems.push(`check "${check}" is missing from the report; add it back with the report command`);
    else if (found.box === '') problems.push(`check "${check}" is not done; mark it [x] with its result, or [n/a] with its reason`);
    else if (found.box === 'x' || found.box === 'n/a') {
      const [word, advice] = found.box === 'x' ? ['result', 'write its result after "result:"'] : ['reason', 'write why it does not apply after "reason:"'];
      const value = found.rest.match(new RegExp(`${word}\\s*:\\s*(.*)$`, 'i'))?.[1].trim() ?? '';
      if (tokensIn(value).length) problems.push(`check "${check}": the ${word} still has a template token (${tokensIn(value)[0]}); replace it with the real ${word}`);
      else if (!value) problems.push(`check "${check}": ${advice}`);
    } else problems.push(`check "${check}" has the box [${found.box}]; use [ ], [x] or [n/a]`);
  }
  return problems;
}

// ---------------------------------------------------------------- the design audit (tools/audit-design.mjs --report)

/** The data of design-audit.json (it has `counts.high|medium|low`), or null when the text is not a design audit. */
export function parseDesignAudit(text) {
  try {
    const data = JSON.parse(text);
    return ['high', 'medium', 'low'].every((key) => Number.isInteger(data?.counts?.[key])) ? data : null;
  } catch {
    return null;
  }
}

const auditResult = (audit) => `${audit.counts.high} high, ${audit.counts.medium} medium, ${audit.counts.low} low`;

/**
 * Fills the line of `check` from the audit: its counts, and [x] only when no finding is high.
 * A line the reader already filled by hand is never touched; one this function wrote is rewritten by the next audit.
 */
export function prefillAudit(text, check, audit) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const rows = text.split(eol).map((row) => {
    const found = matchLabel(row, check);
    if (!found || !(found.box === '' || /result:\s*\d+ high, \d+ medium, \d+ low/.test(found.rest))) return row;
    const high = audit.counts.high > 0;
    return `- [${high ? ' ' : 'x'}] ${check} — result: ${auditResult(audit)}${high ? ' — fix the high findings, run the audit again, then this report command' : ''}`;
  });
  return rows.join(eol);
}
