/**
 * The one way every kit tool names a command in what it prints (usage, refusals, hints, "Next:" lines):
 * `node ai-frontend-guide-kit/tools/<tool> ...`, the path of the kit relative to the project root,
 * absolute only when the kit is outside the project, with forward slashes, quoted when it has spaces.
 * The project root defaults to the current folder.
 */
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KIT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The kit folder as written in a command: relative to `root`, or absolute when it lies outside it. */
export function kitPath(root = process.cwd()) {
  const rel = relative(resolve(root), KIT_DIR).replace(/\\/g, '/');
  return rel && !rel.startsWith('..') && !isAbsolute(rel) ? rel : KIT_DIR.replace(/\\/g, '/');
}

export const quotePath = (path) => (/\s/.test(path) ? `"${path}"` : path);

/** The path of one tool, e.g. `ai-frontend-guide-kit/tools/find.mjs`. */
export const toolPath = (tool, root) => quotePath(`${kitPath(root)}/tools/${tool}`);

/** A full command: `node <kit>/tools/<tool> <args>`. */
export const runTool = (tool, args = '', root, runner = 'node') => `${runner} ${toolPath(tool, root)}${args ? ` ${args}` : ''}`;

/** A path inside the kit, e.g. `ai-frontend-guide-kit/guides/FLOWS.md`. */
export const kitFile = (path, root) => `${kitPath(root)}/${path}`;
