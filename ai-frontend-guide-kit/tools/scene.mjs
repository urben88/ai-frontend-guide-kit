#!/usr/bin/env node
/**
 * scene — the written spec of a 3D scene, and the instructions made from it. No dependencies, no network.
 * It never models or renders anything: the kit writes instructions (a spec, a prompt for an external 3D
 * tool, a small Three.js starter); the asset itself is made elsewhere.
 *
 *   init [--out file]   write the SCENE-SPEC.md skeleton (default ai-frontend-output/SCENE-SPEC.md)
 *   check <file>        numbered findings: sections, values, tokens of the materials, budget, fallback, reduced motion
 *   prompt <file>       the prompt for an external 3D tool, built from the spec (same spec, same bytes)
 *   code <file>         a Three.js starter that keeps the budget, the fallback and reduced motion (same spec, same bytes)
 *
 * Usage: node ai-frontend-guide-kit/tools/scene.mjs <command> ... [--dir <project>] [--out <file>] [--json] [--strict] [--force]
 * Exit: 0 done, 1 a high finding (or --strict and a medium one) or a refused file, 2 wrong usage.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTokens, parseHex } from './tokens.mjs';
import { runTool, toolPath } from './kit-path.mjs';

const SELF = fileURLToPath(import.meta.url);
const KIT_DIR = resolve(dirname(SELF), '..');
const TOKENS_FILE = 'design-tokens.json';
const DEFAULT_SPEC = 'ai-frontend-output/SCENE-SPEC.md';
const SEVERITIES = ['high', 'medium', 'low'];
/** Version of three that the starter names; checked against the npm registry on 2026-11-16. */
export const THREE_VERSION = '0.187.0';
/** A budget above these numbers is a medium finding: heavier than a page scene should be. */
const HEAVY = { triangles: 200000, textures: 8, 'draw-calls': 100, 'max-kb': 5120 };
const BUDGET_KEYS = ['triangles', 'textures', 'draw-calls', 'target-fps', 'max-kb'];
const SECTIONS = ['Purpose', 'Subject', 'Camera', 'Light', 'Materials', 'Motion', 'Interaction', 'Performance budget', 'Fallback', 'Accessibility', 'Output'];

class UsageError extends Error {}

const SKELETON = `# Scene spec

Write the scene here first. Replace every <...> with a value; then run the check command. Colors are names of design-tokens.json.

## Purpose
<one sentence: what the visitor should understand or feel from the scene, and which page goal it serves>

## Subject
- object: <one thing, for example a rounded cube, a phone, a terrain>
- style: <for example soft clay, low poly, glass, wireframe>

## Camera
- type: <perspective | orthographic>
- fov: <degrees, 25 to 60 (perspective only)>
- position: <x, y, z, for example 0, 1.2, 5>
- target: <x, y, z, for example 0, 0, 0>

## Light
- ambient: <for example intensity 0.5>
- key: <for example directional, intensity 2.5>
- key-position: <x, y, z, for example 3, 4, 5>

## Materials
- main: token=<color token name, for example primary>, roughness=<0 to 1>, metalness=<0 to 1>

## Motion
- idle: <for example slow rotation, 0.2 rad per second, or none>
- reduced-motion: <what the scene does under prefers-reduced-motion, for example one still frame>

## Interaction
- input: <none | drag | hover | scroll>

## Performance budget
- triangles: <number, a hero object: 20000 or less>
- textures: <number, 4 or less>
- draw-calls: <number, 30 or less>
- target-fps: <number, 60 on a phone from a few years ago: 30 is the floor>
- max-kb: <number, the whole asset, for example 400>

## Fallback
- image: <path of the static poster that shows without WebGL, for example public/scene-poster.webp>
- when: <for example no WebGL, data saver, not loaded yet>

## Accessibility
- label: <the text alternative of the scene, or "decorative">

## Output
- mode: <code | prompt>
`;

// ---------------------------------------------------------------- reading the spec

const PLACEHOLDER = /<[^<>\n]+>/;

/** `{ sections: Map(lower name -> { name, fields: [{ key, value }], body: [text] }) }` of a spec text. */
export function parseSpec(text) {
  const sections = new Map();
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = { name: heading[1], fields: [], body: [] };
      sections.set(heading[1].toLowerCase(), current);
      continue;
    }
    if (!current) continue;
    const field = /^\s*[-*]\s+([A-Za-z][\w -]*?)\s*:\s*(.*)$/.exec(line);
    if (field) current.fields.push({ key: field[1].toLowerCase().replace(/\s+/g, '-'), value: field[2].trim() });
    else if (line.trim()) current.body.push(line.trim());
  }
  return { sections };
}

const valueOf = (section, key) => section?.fields.find((field) => field.key === key)?.value;

/** The first number of a value; "20k" is 20000. NaN when there is none. */
function numberOf(value) {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*(k\b)?/i.exec(value ?? '');
  return match ? Number(match[1]) * (match[2] ? 1000 : 1) : NaN;
}

const vector = (value) => {
  const parts = String(value ?? '').split(',').map((part) => part.trim());
  return parts.length === 3 && parts.every((part) => /^-?\d+(\.\d+)?$/.test(part)) ? parts.map(Number) : null;
};

const pairs = (value) => Object.fromEntries([...String(value ?? '').matchAll(/([\w-]+)\s*=\s*([^,]+)/g)].map((m) => [m[1].toLowerCase(), m[2].trim()]));

// ---------------------------------------------------------------- the tokens

const tokenKey = (name) => String(name).trim().toLowerCase().replace(/^var\(|\)$/g, '').replace(/^--color-/, '').replace(/^color[.-]/, '').replace(/^ramp[.-]/, '').replace(/\./g, '-');

/** The colors of the project: `{ ok, colors: Map(normalized name -> #hex) }`, or `{ ok: false, note }`. */
function loadColors(root) {
  const file = resolve(root, TOKENS_FILE);
  if (!existsSync(file)) return { ok: false, note: `no ${TOKENS_FILE}: the material tokens were not checked (run ${runTool('tokens.mjs', 'init', root)})` };
  try {
    const loaded = loadTokens(file);
    if (loaded.errors.length) return { ok: false, note: `${TOKENS_FILE} has errors: the material tokens were not checked (run ${runTool('tokens.mjs', 'check', root)})` };
    const colors = new Map();
    for (const token of Object.values(loaded.tokens)) {
      const hex = token.type === 'color' && token.path.startsWith('color.') ? parseHex(String(token.value)) : null;
      if (hex) colors.set(tokenKey(token.path), hex);
    }
    return { ok: true, colors };
  } catch {
    return { ok: false, note: `${TOKENS_FILE} is not valid JSON: the material tokens were not checked (run ${runTool('tokens.mjs', 'check', root)})` };
  }
}

// ---------------------------------------------------------------- check

/** Every finding of one spec text, in section order. `palette` is the loadColors result. */
export function checkSpec(text, palette) {
  const { sections } = parseSpec(text);
  const out = [];
  const add = (id, severity, section, what, fix) => out.push({ id, severity, section, what, fix });
  const required = (section, key, id = 'field-missing', fix) => {
    const value = valueOf(section, key);
    const where = `${section.name} / ${key}`;
    if (value === undefined) add(id, 'high', section.name, `${where} is missing`, fix ?? `add the line "- ${key}: <value>" under ## ${section.name}`);
    else if (!value) add(id, 'high', section.name, `${where} is empty`, fix ?? `write a value after "${key}:"`);
    else if (PLACEHOLDER.test(value)) return null;
    else return value;
    return null;
  };

  for (const name of SECTIONS) {
    const section = sections.get(name.toLowerCase());
    if (!section) {
      add('section-missing', 'high', name, `the section "${name}" is missing`, `add "## ${name}" (the skeleton: ${runTool('scene.mjs', 'init')})`);
      continue;
    }
    for (const item of [...section.fields.map((field) => ({ where: field.key, value: field.value })), ...section.body.map((line) => ({ where: 'text', value: line }))]) {
      if (PLACEHOLDER.test(item.value)) add('placeholder', 'high', name, `${name} / ${item.where} still has a placeholder: ${item.value.match(PLACEHOLDER)[0]}`, 'replace the <...> with a real value');
    }
    if (name === 'Purpose') {
      const body = section.body.filter((line) => !PLACEHOLDER.test(line)).join(' ');
      if (!body && !section.body.some((line) => PLACEHOLDER.test(line))) add('purpose', 'high', name, 'the Purpose has no sentence', 'write one sentence: what the visitor should understand, and the page goal it serves');
      else if (body && body.length < 20) add('purpose', 'high', name, `the Purpose is too short ("${body}")`, 'write a full sentence about what the scene is for');
    } else if (name === 'Subject') required(section, 'object');
    else if (name === 'Camera') {
      const type = required(section, 'type');
      if (type && !/^(perspective|orthographic)$/i.test(type)) add('camera', 'high', name, `Camera / type "${type}" is not perspective or orthographic`, 'use perspective or orthographic');
      const position = required(section, 'position');
      if (position && !vector(position)) add('camera', 'high', name, `Camera / position "${position}" is not three numbers`, 'write "x, y, z", for example 0, 1.2, 5');
      const target = valueOf(section, 'target');
      if (target && !PLACEHOLDER.test(target) && !vector(target)) add('camera', 'high', name, `Camera / target "${target}" is not three numbers`, 'write "x, y, z", for example 0, 0, 0');
      if (/^perspective$/i.test(type ?? '')) {
        const fov = required(section, 'fov');
        if (fov && !(numberOf(fov) >= 10 && numberOf(fov) <= 120)) add('camera', 'high', name, `Camera / fov "${fov}" is not a number between 10 and 120`, 'use 25 to 60 degrees; wider bends the object');
      }
    } else if (name === 'Light') {
      required(section, 'ambient');
      required(section, 'key');
    } else if (name === 'Materials') {
      const items = section.fields.filter((field) => !PLACEHOLDER.test(field.value));
      if (!section.fields.length) add('material-token', 'high', name, 'no material is listed', 'add "- <name>: token=<color token>, roughness=0.4, metalness=0.1"');
      for (const item of items) {
        const given = pairs(item.value);
        if (!given.token) add('material-token', 'high', name, `material "${item.key}" has no token=...`, 'give it a color from the tokens: token=primary');
        else if (palette?.ok && !palette.colors.has(tokenKey(given.token))) {
          const known = [...palette.colors.keys()].slice(0, 10).join(', ');
          add('material-token', 'high', name, `material "${item.key}": "${given.token}" is not a color in ${TOKENS_FILE}`, `use one of: ${known}, ... (list: ${runTool('tokens.mjs', 'check')})`);
        }
        for (const key of ['roughness', 'metalness']) {
          if (given[key] !== undefined && !(numberOf(given[key]) >= 0 && numberOf(given[key]) <= 1)) add('material-value', 'medium', name, `material "${item.key}": ${key} "${given[key]}" is not between 0 and 1`, `write ${key}=0.5`);
        }
      }
    } else if (name === 'Motion') required(section, 'reduced-motion', 'reduced-motion', 'state what the scene does under prefers-reduced-motion, for example "one still frame, no rotation"');
    else if (name === 'Interaction') required(section, 'input');
    else if (name === 'Performance budget') {
      for (const key of BUDGET_KEYS) {
        const raw = required(section, key, 'budget', `write a number: "- ${key}: ${key === 'target-fps' ? 60 : 1000}"`);
        if (raw === null) continue;
        const value = numberOf(raw);
        if (!(value > 0)) add('budget', 'high', name, `Performance budget / ${key} "${raw}" is not a number`, 'write a number above 0');
        else if (HEAVY[key] && value > HEAVY[key]) add('budget-heavy', 'medium', name, `${key} ${value} is over ${HEAVY[key]}, heavy for a page scene`, 'lower it, or lighten the model; a scene is part of a page');
        else if (key === 'target-fps' && (value < 24 || value > 120)) add('budget-heavy', 'medium', name, `target-fps ${value} is outside 24 to 120`, 'use 30 as the floor and 60 as the target');
      }
    } else if (name === 'Fallback') required(section, 'image', 'fallback', 'give the path of the static poster shown without WebGL, for example public/scene-poster.webp');
    else if (name === 'Accessibility') required(section, 'label');
    else if (name === 'Output') {
      const mode = required(section, 'mode', 'output');
      if (mode && !/^(code|prompt)$/i.test(mode)) add('output', 'high', name, `Output / mode "${mode}" is not code or prompt`, 'write code (Three.js) or prompt (an external 3D tool)');
    }
  }
  return out;
}

function report(root, file, palette, strict, json) {
  const text = readFileSync(resolve(root, file), 'utf8');
  const list = checkSpec(text, palette);
  const order = (finding) => SEVERITIES.indexOf(finding.severity);
  const findings = list.map((f, index) => ({ f, index })).sort((a, b) => order(a.f) - order(b.f) || a.index - b.index).map(({ f }, index) => ({ n: index + 1, file, ...f }));
  const counts = Object.fromEntries(SEVERITIES.map((severity) => [severity, findings.filter((f) => f.severity === severity).length]));
  const skipped = palette.ok ? [] : [palette.note];
  const summary = `Summary: ${counts.high} high, ${counts.medium} medium, ${counts.low} low. ${skipped.length ? skipped.join('. ') : 'Nothing skipped.'}`;
  return { file, tokens: palette.ok, counts, skipped, findings, summary, failed: counts.high > 0 || (strict && counts.medium > 0) };
}

// ---------------------------------------------------------------- prompt for an external 3D tool

/** The values every output reads from a spec that has no high finding. */
function facts(text, palette) {
  const { sections } = parseSpec(text);
  const at = (name, key) => valueOf(sections.get(name.toLowerCase()), key) ?? '';
  const materials = (sections.get('materials')?.fields ?? []).map((field) => {
    const given = pairs(field.value);
    const hex = palette.ok ? palette.colors.get(tokenKey(given.token ?? '')) : undefined;
    return { name: field.key, token: given.token ?? '', hex: hex ?? '#808080', roughness: given.roughness ?? '0.5', metalness: given.metalness ?? '0' };
  });
  const budget = Object.fromEntries(BUDGET_KEYS.map((key) => [key, numberOf(at('Performance budget', key))]));
  return {
    purpose: (sections.get('purpose')?.body ?? []).join(' '),
    object: at('Subject', 'object'),
    style: at('Subject', 'style'),
    camera: { type: at('Camera', 'type').toLowerCase(), fov: numberOf(at('Camera', 'fov')), position: vector(at('Camera', 'position')) ?? [0, 0, 5], target: vector(at('Camera', 'target')) ?? [0, 0, 0] },
    ambient: at('Light', 'ambient'),
    key: at('Light', 'key'),
    keyPosition: vector(at('Light', 'key-position')) ?? [3, 4, 5],
    materials,
    idle: at('Motion', 'idle'),
    reduced: at('Motion', 'reduced-motion'),
    input: at('Interaction', 'input'),
    budget,
    poster: at('Fallback', 'image'),
    when: at('Fallback', 'when'),
    label: at('Accessibility', 'label'),
  };
}

const list = (vec) => vec.join(', ');

export function buildPrompt(text, palette) {
  const f = facts(text, palette);
  const lines = [
    'Create one 3D model for a website scene.',
    '',
    `Purpose: ${f.purpose}`,
    `Subject: ${f.object}${f.style ? `. Style: ${f.style}` : ''}.`,
    'Materials (PBR metallic-roughness, one material each):',
    ...f.materials.map((m) => `- ${m.name}: base color ${m.hex} (design token "${m.token}"), roughness ${m.roughness}, metalness ${m.metalness}`),
    `Reference view: ${f.camera.type} camera${f.camera.type === 'perspective' ? `, field of view ${f.camera.fov} degrees` : ''}, placed at ${list(f.camera.position)} looking at ${list(f.camera.target)}.`,
    `Preview lighting: ambient ${f.ambient}; key light ${f.key}${f.keyPosition ? ` from ${list(f.keyPosition)}` : ''}.`,
    ...(f.idle && !/^none$/i.test(f.idle) ? [`Motion intent (do not bake it into the model): ${f.idle}.`] : []),
    'Constraints:',
    `- At most ${f.budget.triangles} triangles, ${f.budget.textures} textures and ${f.budget['draw-calls']} draw calls, and the whole file under ${f.budget['max-kb']} KB.`,
    '- One file: glTF 2.0 binary (.glb). Y up, units in metres, origin at the center of the base, front facing +Z.',
    '- Textures at most 1024 px, power of two; no embedded lights or cameras.',
    '- No text, no logo, no background and no ground plane.',
    `Also deliver a still poster of the reference view on a transparent background, 1200 x 900 px (it is the static fallback: ${f.poster}).`,
    'If the tool cannot meet the budget, remove detail; never exceed the budget.',
  ];
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------- Three.js starter

const hex0x = (hex) => `0x${hex.slice(1).toLowerCase()}`;

export function buildCode(text, palette, file = 'SCENE-SPEC.md') {
  const f = facts(text, palette);
  const ortho = f.camera.type === 'orthographic';
  const rate = /rotat/i.test(f.idle) ? (/([\d.]+)\s*rad/.exec(f.idle)?.[1] ?? '0.2') : '0';
  const intensity = (value, fallback) => /intensity\s*([\d.]+)/i.exec(value)?.[1] ?? fallback;
  const ground = palette.ok ? '' : ' // no design-tokens.json: neutral grey, set the real color';
  const lines = [
    `// Generated by scene.mjs from ${file}. Same spec, same file.`,
    `// Install: npm install three@${THREE_VERSION} --save-exact   (the version is pinned: upgrade on purpose, not by accident)`,
    '// The page keeps <img> (the poster) inside the container: it is the fallback and it loads first.',
    '// Replace the placeholder geometry with the model of the scene (GLTFLoader from three/addons) and keep the rest.',
    `// Scene: ${f.object}. Purpose: ${f.purpose}`,
    '',
    `const POSTER = ${JSON.stringify(f.poster)};`,
    `const LABEL = ${JSON.stringify(f.label)};`,
    `const TARGET_FPS = ${f.budget['target-fps']};`,
    `const MAX_TRIANGLES = ${f.budget.triangles};`,
    'const MAX_PIXEL_RATIO = 2;',
    `const IDLE_SPIN = ${rate}; // radians per second; 0 when the spec has no rotation`,
    '',
    '/** Mounts the scene in `container`. Returns destroy(): call it when the component unmounts. */',
    'export async function mountScene(container) {',
    '  let poster = container.querySelector("img");',
    '  if (!poster) {',
    '    poster = document.createElement("img");',
    '    poster.src = POSTER;',
    '    poster.alt = LABEL === "decorative" ? "" : LABEL;',
    '    container.prepend(poster);',
    '  }',
    '  const probe = document.createElement("canvas");',
    '  if (!probe.getContext("webgl2")) return () => {}; // no WebGL: the poster stays',
    '  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;',
    '',
    "  const THREE = await import('three'); // lazy: the library is not in the first load",
    '  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });',
    '  let ratio = Math.min(window.devicePixelRatio, 2);',
    '  renderer.setPixelRatio(ratio);',
    '  renderer.domElement.setAttribute("aria-hidden", "true");',
    '  const scene = new THREE.Scene();',
    ortho ? '  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 100);' : `  const camera = new THREE.PerspectiveCamera(${f.camera.fov}, 1, 0.1, 100);`,
    `  camera.position.set(${list(f.camera.position)});`,
    `  camera.lookAt(${list(f.camera.target)});`,
    `  scene.add(new THREE.AmbientLight(0xffffff, ${intensity(f.ambient, '0.5')}));`,
    `  const key = new THREE.DirectionalLight(0xffffff, ${intensity(f.key, '2.5')});`,
    `  key.position.set(${list(f.keyPosition)});`,
    '  scene.add(key);',
    '',
    '  const materials = {',
    ...f.materials.map((m) => `    ${JSON.stringify(m.name)}: new THREE.MeshStandardMaterial({ color: ${m.hex === '#808080' ? '0x808080' : hex0x(m.hex)}, roughness: ${m.roughness}, metalness: ${m.metalness} }), // token ${m.token}${m.hex === '#808080' ? ground : ''}`),
    '  };',
    `  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), materials[${JSON.stringify(f.materials[0].name)}]); // placeholder shape`,
    '  scene.add(body);',
    '  let triangles = 0;',
    '  scene.traverse((node) => {',
    '    if (node.isMesh) triangles += (node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count) / 3;',
    '  });',
    '  if (triangles > MAX_TRIANGLES) console.warn(`scene: ${triangles} triangles is over the budget of ${MAX_TRIANGLES}`);',
    '',
    '  const resize = () => {',
    '    const { clientWidth: w, clientHeight: h } = container;',
    '    renderer.setSize(w, h, false);',
    ortho ? '    camera.left = (-2 * w) / h; camera.right = (2 * w) / h;' : '    camera.aspect = w / h;',
    '    camera.updateProjectionMatrix();',
    '    renderer.render(scene, camera);',
    '  };',
    '  container.appendChild(renderer.domElement);',
    '  window.addEventListener("resize", resize);',
    '  resize();',
    '  poster.hidden = true; // the first frame is on screen',
    '',
    '  let frame = 0;',
    '  let last = 0;',
    '  let slow = 0;',
    '  const tick = (now) => {',
    '    frame = requestAnimationFrame(tick);',
    '    const dt = last ? now - last : 1000 / TARGET_FPS;',
    '    last = now;',
    '    slow = slow * 0.9 + (dt > (1000 / TARGET_FPS) * 1.5 ? 1 : 0) * 0.1;',
    '    if (slow > 0.5 && ratio > 1) { // frame budget: spend fewer pixels before dropping frames',
    '      ratio = Math.max(1, ratio - 0.25);',
    '      renderer.setPixelRatio(ratio);',
    '      slow = 0;',
    '    }',
    '    body.rotation.y += (IDLE_SPIN * dt) / 1000;',
    '    renderer.render(scene, camera);',
    '  };',
    '  const start = () => { if (!frame && !reduce && IDLE_SPIN) frame = requestAnimationFrame(tick); };',
    '  const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };',
    '  // Reduced motion: the single frame above is the whole scene; no loop at all.',
    '  const watcher = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));',
    '  watcher.observe(container);',
    '',
    '  return function destroy() { // dispose on unmount: no leaked GPU memory',
    '    stop();',
    '    watcher.disconnect();',
    '    window.removeEventListener("resize", resize);',
    '    scene.traverse((node) => { if (node.isMesh) node.geometry.dispose(); });',
    '    Object.values(materials).forEach((material) => material.dispose());',
    '    renderer.dispose();',
    '    renderer.domElement.remove();',
    '    poster.hidden = false;',
    '  };',
    '}',
  ];
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------- command line

const USAGE = `scene — the written spec of a 3D scene, and the instructions made from it (no dependencies, no network)

Usage:
  node ${toolPath('scene.mjs')} init [--out <file>] [--force]
  node ${toolPath('scene.mjs')} check [<file>] [--strict] [--json]
  node ${toolPath('scene.mjs')} prompt [<file>] [--out <file>]
  node ${toolPath('scene.mjs')} code [<file>] [--out <file>]

  init    writes the SCENE-SPEC.md skeleton (default ${DEFAULT_SPEC}); refuses to overwrite without --force
  check   numbered findings with a fix: sections, values, material tokens, budget, fallback, reduced motion;
          exit 1 on a high finding, and with --strict on a medium one
  prompt  a prompt for an external 3D tool, from the spec; refuses a spec with a high finding
  code    a Three.js starter (budget, poster fallback, reduced motion, pixel ratio cap, dispose); refuses the same
  --dir   the project (default: AI_FRONTEND_PROJECT, then the folder that holds the kit); paths are relative to it
  --json  print the data instead of the text (check)
`;

const VALUE_OPTS = new Set(['dir', 'out']);
const BOOL_OPTS = new Set(['json', 'strict', 'force', 'help']);

function parseArgs(argv) {
  const flags = { _: [], opts: {}, bool: new Set() };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const eq = token.startsWith('--') ? token.indexOf('=') : -1;
    const name = (eq === -1 ? token : token.slice(0, eq)).replace(/^--/, '');
    if (token === '-h') flags.bool.add('help');
    else if (token.startsWith('--') && VALUE_OPTS.has(name)) {
      const value = eq === -1 ? argv[i + 1] : token.slice(eq + 1);
      if (value === undefined || (eq === -1 && value.startsWith('--'))) throw new UsageError(`option --${name} needs a value`);
      flags.opts[name] = value;
      if (eq === -1) i += 1;
    } else if (token.startsWith('--') && eq === -1 && BOOL_OPTS.has(name)) flags.bool.add(name);
    else if (token.startsWith('-') && token.length > 1) throw new UsageError(`unknown option "${token}"`);
    else flags._.push(token);
  }
  return flags;
}

const shown = (root, path) => {
  const rel = relative(root, path).replace(/\\/g, '/');
  return rel && !rel.startsWith('..') ? rel : path.replace(/\\/g, '/');
};

function writeFile(root, file, text) {
  const target = resolve(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
  return shown(root, target);
}

function specFile(flags, root) {
  const name = flags._[1] ?? DEFAULT_SPEC;
  if (!existsSync(resolve(root, name))) throw new UsageError(`${name} does not exist (write it with: ${runTool('scene.mjs', 'init', root)})`);
  return name;
}

function cmdInit(flags, root) {
  const file = flags.opts.out ?? DEFAULT_SPEC;
  const target = resolve(root, file);
  if (existsSync(target) && !flags.bool.has('force')) {
    console.error(`scene: ${file} already exists (add --force to replace it, or run ${runTool('scene.mjs', `check ${file}`, root)})`);
    process.exitCode = 1;
    return;
  }
  const written = writeFile(root, file, SKELETON);
  console.log(`scene: wrote ${written}. Fill every <...> (colors are names of ${TOKENS_FILE}), then run: ${runTool('scene.mjs', `check ${written}`, root)}`);
}

function cmdCheck(flags, root) {
  const file = specFile(flags, root);
  const result = report(root, file, loadColors(root), flags.bool.has('strict'), flags.bool.has('json'));
  if (flags.bool.has('json')) console.log(JSON.stringify({ file, tokens: result.tokens, counts: result.counts, skipped: result.skipped, findings: result.findings, summary: result.summary }, null, 2));
  else {
    console.log(`scene check: ${file}`);
    for (const f of result.findings) console.log(`${f.n}. [${f.severity}] ${f.id} — ${f.section} — ${f.what} → ${f.fix}`);
    console.log(result.summary);
    if (!result.failed) console.log(`Next: ${runTool('scene.mjs', `prompt ${file}`, root)} or ${runTool('scene.mjs', `code ${file}`, root)}`);
  }
  if (result.failed) process.exitCode = 1;
}

function cmdMake(flags, root, make) {
  const file = specFile(flags, root);
  const palette = loadColors(root);
  const result = report(root, file, palette, false, false);
  if (result.counts.high > 0) {
    console.error(`scene: ${file} has ${result.counts.high} high finding${result.counts.high === 1 ? '' : 's'}: fix them first. Run: ${runTool('scene.mjs', `check ${file}`, root)}`);
    process.exitCode = 1;
    return;
  }
  const output = make(readFileSync(resolve(root, file), 'utf8'), palette, file);
  if (flags.opts.out) console.log(`scene: wrote ${writeFile(root, flags.opts.out, output)}`);
  else process.stdout.write(output);
}

function main() {
  try {
    const flags = parseArgs(process.argv.slice(2));
    if (flags.bool.has('help')) return console.log(USAGE);
    const command = flags._[0];
    if (!command) throw new UsageError('give a command: init, check, prompt or code');
    const root = flags.opts.dir ? resolve(flags.opts.dir) : process.env.AI_FRONTEND_PROJECT ? resolve(process.env.AI_FRONTEND_PROJECT) : dirname(KIT_DIR);
    const commands = { init: cmdInit, check: cmdCheck, prompt: (f, r) => cmdMake(f, r, buildPrompt), code: (f, r) => cmdMake(f, r, buildCode) };
    if (!commands[command]) throw new UsageError(`unknown command "${command}"`);
    commands[command](flags, root);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`scene: ${error.message}\n\n${USAGE}`);
      process.exitCode = 2;
    } else throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) main();
