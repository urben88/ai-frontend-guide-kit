#!/usr/bin/env node
/**
 * Component Manifest validator (no external dependencies).
 *
 * Usage:
 *   node tools/validate.mjs                 Validate manifest/sources/*.json + index consistency + unique IDs
 *   node tools/validate.mjs --fixtures      Self-test: valid fixture must pass, invalid fixture must fail
 *   node tools/validate.mjs --urls [n]      Sample n (default 10) docs_url values and report HTTP status
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MANIFEST_DIR = join(ROOT, 'manifest');
const SOURCES_DIR = join(MANIFEST_DIR, 'sources');
const INDEX_PATH = join(MANIFEST_DIR, 'component-manifest.json');
const SCHEMA_PATH = join(MANIFEST_DIR, 'schema.json');
const FIXTURES_DIR = join(__dirname, 'fixtures');

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function resolveRef(ref, rootSchema) {
  if (!ref.startsWith('#/')) throw new Error(`Unsupported $ref: ${ref}`);
  return ref
    .slice(2)
    .split('/')
    .reduce((node, key) => (node == null ? node : node[key.replace(/~1/g, '/').replace(/~0/g, '~')]), rootSchema);
}

function validateNode(data, schema, rootSchema, path) {
  const errors = [];
  if (schema.$ref) return validateNode(data, resolveRef(schema.$ref, rootSchema), rootSchema, path);

  if (schema.const !== undefined && JSON.stringify(data) !== JSON.stringify(schema.const)) {
    errors.push(`${path}: expected const ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.some((option) => JSON.stringify(option) === JSON.stringify(data))) {
    errors.push(`${path}: value ${JSON.stringify(data)} is not in the allowed enum`);
  }

  if (schema.type) {
    const actual = typeOf(data);
    const ok = schema.type === actual || (schema.type === 'integer' && actual === 'number' && Number.isInteger(data));
    if (!ok) {
      errors.push(`${path}: expected type ${schema.type}, got ${actual}`);
      return errors;
    }
  }

  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${path}: shorter than minLength ${schema.minLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
      errors.push(`${path}: does not match pattern ${schema.pattern}`);
    }
    if (schema.format === 'uri' && !/^https?:\/\/\S+$/.test(data)) {
      errors.push(`${path}: not a valid http(s) URI`);
    }
    if (schema.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      errors.push(`${path}: not a valid date (YYYY-MM-DD)`);
    }
  }

  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${path}: fewer than minItems ${schema.minItems}`);
    }
    if (schema.items) {
      data.forEach((item, index) => errors.push(...validateNode(item, schema.items, rootSchema, `${path}[${index}]`)));
    }
  }

  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    for (const required of schema.required ?? []) {
      if (!(required in data)) errors.push(`${path}: missing required property "${required}"`);
    }
    const properties = schema.properties ?? {};
    for (const [key, value] of Object.entries(data)) {
      if (properties[key]) {
        errors.push(...validateNode(value, properties[key], rootSchema, `${path}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}: unexpected property "${key}"`);
      }
    }
  }
  return errors;
}

function loadJSON(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function listSourceFiles() {
  if (!existsSync(SOURCES_DIR)) return [];
  return readdirSync(SOURCES_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => join(SOURCES_DIR, name));
}

function validateAllSources(schema) {
  const errors = [];
  const files = listSourceFiles();
  if (files.length === 0) {
    console.error('No source files found in manifest/sources/. Run the extraction scripts first.');
    return { errors: ['manifest/sources: no source files'], total: 0 };
  }

  const seenIds = new Map();
  let totalEntries = 0;
  const perSource = new Map();

  for (const file of files) {
    const data = loadJSON(file);
    const fileErrors = validateNode(data, schema, schema, `${file.slice(ROOT.length + 1)}`);
    errors.push(...fileErrors);
    let count = 0;
    for (const entry of data.entries ?? []) {
      count += 1;
      if (seenIds.has(entry.id)) {
        errors.push(`duplicate entry id "${entry.id}" in ${file} (already used in ${seenIds.get(entry.id)})`);
      } else {
        seenIds.set(entry.id, file);
      }
    }
    totalEntries += count;
    perSource.set(data.source_id, { count, file });
  }

  if (existsSync(INDEX_PATH)) {
    const index = loadJSON(INDEX_PATH);
    if (index.totals?.entries !== totalEntries) {
      errors.push(`index totals.entries=${index.totals?.entries} does not match actual ${totalEntries}`);
    }
    if (index.totals?.sources !== perSource.size) {
      errors.push(`index totals.sources=${index.totals?.sources} does not match actual ${perSource.size}`);
    }
    const indexed = new Set();
    for (const source of index.sources ?? []) {
      indexed.add(source.source_id);
      const actual = perSource.get(source.source_id);
      if (!actual) {
        errors.push(`index lists source "${source.source_id}" but no source file exists`);
      } else if (source.entry_count !== actual.count) {
        errors.push(`index entry_count for "${source.source_id}" is ${source.entry_count} but file has ${actual.count}`);
      }
    }
    for (const [sourceId] of perSource) {
      if (!indexed.has(sourceId)) errors.push(`source "${sourceId}" is not listed in the index`);
    }
  }

  return { errors, total: totalEntries, sources: perSource.size };
}

function runFixtures(schema) {
  const validFile = join(FIXTURES_DIR, 'valid-source.json');
  const invalidFile = join(FIXTURES_DIR, 'invalid-source.json');
  const problems = [];

  if (!existsSync(validFile) || !existsSync(invalidFile)) {
    console.error('Fixtures missing in tools/fixtures/.');
    return 1;
  }

  const validErrors = validateNode(loadJSON(validFile), schema, schema, 'valid-source');
  if (validErrors.length > 0) {
    problems.push(`valid fixture unexpectedly failed:\n  - ${validErrors.join('\n  - ')}`);
  }

  const invalidErrors = validateNode(loadJSON(invalidFile), schema, schema, 'invalid-source');
  if (invalidErrors.length === 0) {
    problems.push('invalid fixture unexpectedly passed validation');
  }

  if (problems.length > 0) {
    console.error('Fixtures self-test FAILED:');
    for (const problem of problems) console.error(`- ${problem}`);
    return 1;
  }
  console.log(`Fixtures self-test OK (valid passed, invalid failed with ${invalidErrors.length} error(s)).`);
  return 0;
}

async function checkUrls(sampleSize) {
  const urls = [];
  for (const file of listSourceFiles()) {
    const data = loadJSON(file);
    for (const entry of data.entries ?? []) {
      if (entry.docs_url) urls.push({ source: data.source_id, id: entry.id, url: entry.docs_url });
    }
  }
  if (urls.length === 0) {
    console.error('No docs_url values found to sample.');
    return 1;
  }
  const step = Math.max(1, Math.floor(urls.length / sampleSize));
  const sample = urls.filter((_, index) => index % step === 0).slice(0, sampleSize);
  let broken = 0;
  let blocked = 0;

  for (const item of sample) {
    try {
      let response = await fetch(item.url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (response.status === 405 || response.status === 501) {
        response = await fetch(item.url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      }
      if (response.status === 403 || response.status === 429) {
        blocked += 1;
        console.log(`BLOCKED ${response.status} ${item.url}`);
      } else if (response.status >= 400) {
        broken += 1;
        console.log(`BROKEN  ${response.status} ${item.url}`);
      } else {
        console.log(`OK      ${response.status} ${item.url}`);
      }
    } catch (error) {
      broken += 1;
      console.log(`BROKEN  network error ${item.url} (${error.message})`);
    }
  }
  console.log(`\nLink check: ${sample.length} sampled, ${broken} broken, ${blocked} blocked (403/429 may be bot protection).`);
  return broken === 0 ? 0 : 1;
}

async function main() {
  const args = process.argv.slice(2);
  if (!existsSync(SCHEMA_PATH)) {
    console.error(`Schema not found at ${SCHEMA_PATH}`);
    process.exit(1);
  }
  const schema = loadJSON(SCHEMA_PATH);

  if (args.includes('--fixtures')) {
    process.exit(runFixtures(schema));
  }

  if (args.includes('--urls')) {
    const index = args.indexOf('--urls');
    const size = Number.parseInt(args[index + 1], 10);
    process.exit(await checkUrls(Number.isFinite(size) && size > 0 ? size : 10));
  }

  const { errors, total, sources } = validateAllSources(schema);
  if (errors.length > 0) {
    console.error(`Validation FAILED with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Validation OK: ${sources} source files, ${total} entries, unique IDs, index consistent.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
