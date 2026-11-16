import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { REQUIRED_KIT_FILES } from '../tools/build-kit.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KIT = join(ROOT, 'ai-frontend-guide-kit');
const SERVER = join(KIT, 'tools', 'kit-mcp.mjs');

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};

/** The CLI itself, for comparison. */
const cli = (tool, args) => spawnSync(process.execPath, [join(KIT, 'tools', tool), ...args], { encoding: 'utf8', env: cleanEnv() });

const project = () => mkdtempSync(join(tmpdir(), 'kit-mcp-'));

/** Start the server and talk JSON-RPC over stdio, one line per message. */
function connect(args = [], env = cleanEnv()) {
  const child = spawn(process.execPath, [SERVER, ...args], { stdio: ['pipe', 'pipe', 'pipe'], env });
  const waiting = [];
  const lines = [];
  let buffer = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      const index = waiting.findIndex((entry) => entry.id === message.id);
      if (index >= 0) waiting.splice(index, 1)[0].resolve(message);
      else lines.push(message);
    }
  });
  let closed = false;
  child.on('close', () => {
    closed = true;
    for (const entry of waiting.splice(0)) entry.resolve({ id: entry.id, error: { code: -1, message: 'server exited' } });
  });
  let nextId = 0;
  const request = (method, params) => new Promise((resolve) => {
    nextId += 1;
    if (closed) return resolve({ id: nextId, error: { code: -1, message: 'server exited' } });
    waiting.push({ id: nextId, resolve });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: nextId, method, params })}\n`);
  });
  const raw = (text) => new Promise((resolve) => {
    if (closed) return resolve({ id: null, error: { code: -1, message: 'server exited' } });
    waiting.push({ id: null, resolve });
    child.stdin.write(`${text}\n`);
  });
  const call = async (name, args2) => (await request('tools/call', { name, arguments: args2 })).result;
  const close = () => new Promise((resolve) => {
    if (closed) return resolve();
    child.on('close', resolve);
    child.stdin.end();
    child.kill();
  });
  return { child, request, raw, call, close, lines };
}

const withServer = async (fn, args, env) => {
  const server = connect(args, env);
  try {
    await server.request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
    await fn(server);
  } finally {
    await server.close();
  }
};

const text = (result) => result.content[0].text;

const EXPECTED = [
  'flow_status', 'flow_start', 'flow_next', 'flow_done', 'flow_scaffold', 'flow_report',
  'find', 'get', 'technique_find', 'technique_get', 'recipe_suggest', 'recipe_show',
  'tokens_check', 'audit_design', 'svg_gen', 'svg_check', 'scene_check',
];

test('kit-mcp: initialize answers with the protocol version, tools capability and server info', async () => {
  const server = connect();
  try {
    const answer = await server.request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '0' } });
    assert.equal(answer.jsonrpc, '2.0');
    assert.equal(answer.result.protocolVersion, '2024-11-05');
    assert.deepEqual(answer.result.capabilities, { tools: {} });
    assert.equal(answer.result.serverInfo.name, 'kit-mcp');
    assert.deepEqual((await server.request('ping')).result, {});
  } finally {
    await server.close();
  }
});

test('kit-mcp: tools/list returns every tool with a description and an object inputSchema', async () => {
  await withServer(async (server) => {
    const { tools } = (await server.request('tools/list')).result;
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [...EXPECTED].sort());
    for (const tool of tools) {
      assert.ok(tool.description && tool.description.length < 200, `${tool.name} has a short description`);
      assert.equal(tool.inputSchema.type, 'object', tool.name);
      assert.equal(tool.inputSchema.additionalProperties, false, tool.name);
      assert.ok(tool.inputSchema.properties, tool.name);
    }
  });
});

test('kit-mcp: catalog and technique tools return what the CLI prints', async () => {
  await withServer(async (server) => {
    const found = await server.call('find', { query: 'pricing card with toggle', limit: 5 });
    assert.equal(found.isError, false);
    assert.equal(text(found), cli('find.mjs', ['pricing card with toggle', '--limit', '5']).stdout);
    const id = text(found).split('\n').find((line) => line.includes('|') && !line.startsWith('#')).split('|')[0].trim();
    const got = await server.call('get', { id });
    assert.equal(text(got), cli('get.mjs', [id]).stdout);
    const missing = await server.call('get', { id: 'no-such-entry' });
    assert.equal(missing.isError, true);
    assert.match(text(missing), /not found/);

    const techniques = await server.call('technique_find', { query: 'sticky header', area: 'layout', limit: 3 });
    assert.equal(text(techniques), cli('technique.mjs', ['find', 'sticky header', '--area', 'layout', '--limit', '3']).stdout);
    const cardId = text(techniques).split('\n').find((line) => line.trim() && !line.startsWith('#')).trim().split(/\s+/)[0];
    const card = await server.call('technique_get', { id: cardId });
    assert.equal(card.isError, false, text(card));
    assert.equal(text(card), cli('technique.mjs', ['get', cardId]).stdout);
    assert.equal((await server.call('technique_get', { id: 'no-such-card' })).isError, true);
  });
});

test('kit-mcp: recipe, tokens, svg and scene tools on a scratch project match the CLI', async () => {
  const dir = project();
  assert.equal(cli('tokens.mjs', ['init', '--primary', '#2563eb', '--dir', dir]).status, 0);
  await withServer(async (server) => {
    const check = await server.call('tokens_check', {});
    assert.equal(check.isError, false, text(check));
    assert.equal(text(check), cli('tokens.mjs', ['check', '--dir', dir]).stdout);

    const show = await server.call('recipe_show', { id: 'marketing-landing' });
    const expected = cli('recipe.mjs', ['show', 'marketing-landing', '--dir', dir]);
    assert.equal(text(show), expected.stdout);
    assert.equal(show.isError, expected.status !== 0);

    const gen = await server.call('svg_gen', { kind: 'blob', seed: 7, size: '320x200', title: 'Soft blob' });
    assert.equal(gen.isError, false, text(gen));
    const genCli = cli('svg.mjs', ['gen', 'blob', '--seed', '7', '--size', '320x200', '--title', 'Soft blob', '--dir', dir]);
    assert.equal(text(gen), genCli.stdout);
    assert.match(text(gen), /^<svg/);
    writeFileSync(join(dir, 'blob.svg'), text(gen));
    const svgCheck = await server.call('svg_check', { files: ['blob.svg'], json: true });
    assert.equal(text(svgCheck), cli('svg.mjs', ['check', 'blob.svg', '--json', '--dir', dir]).stdout);

    assert.equal(cli('scene.mjs', ['init', '--dir', dir]).status, 0);
    const scene = await server.call('scene_check', { json: true });
    const sceneCli = cli('scene.mjs', ['check', '--json', '--dir', dir]);
    assert.equal(text(scene), [sceneCli.stdout.trimEnd(), sceneCli.stderr.trimEnd()].filter(Boolean).join('\n'), 'an error carries stdout and stderr');
    assert.equal(scene.isError, sceneCli.status !== 0, 'a spec with high findings is an error, like the exit code');
    assert.equal(scene.isError, true);
  }, ['--dir', dir]);
});

test('kit-mcp: flow tools follow the same route as the CLI and refuse like the CLI', async () => {
  const dir = project();
  const mirror = project();
  await withServer(async (server) => {
    const status = await server.call('flow_status', {});
    assert.equal(text(status), cli('flow.mjs', ['status', '--dir', mirror]).stdout.split(mirror).join(dir));

    const start = await server.call('flow_start', { route: 'direction' });
    assert.equal(start.isError, false, text(start));
    cli('flow.mjs', ['start', 'direction', '--dir', mirror]);

    const next = await server.call('flow_next', {});
    const data = JSON.parse(text(next));
    assert.equal(data.route, 'direction');
    assert.deepEqual(JSON.parse(text(next)), JSON.parse(cli('flow.mjs', ['next', '--json', '--dir', mirror]).stdout.split(mirror).join(dir).replace(/\\\\/g, '\\')));

    const scaffold = await server.call('flow_scaffold', {});
    assert.equal(scaffold.isError, false, text(scaffold));

    const done = await server.call('flow_done', { step: 'compose' });
    const doneCli = cli('flow.mjs', ['done', 'compose', '--dir', mirror]);
    assert.notEqual(doneCli.status, 0);
    assert.equal(done.isError, true, 'a refused step is an MCP error');
    assert.ok(text(done).includes((doneCli.stdout + doneCli.stderr).trim().split('\n')[0].split(mirror).join(dir)));

    const report = await server.call('flow_report', { step: 'polish' });
    assert.equal(report.isError, cli('flow.mjs', ['report', 'polish', '--dir', mirror]).status !== 0);
  }, ['--dir', dir]);
});

test('kit-mcp: audit_design reports the same findings as the CLI', async () => {
  const dir = project();
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'index.html'), '<main><h1 style="color:#123456;font-size:13px">Hi</h1></main>\n');
  assert.equal(cli('tokens.mjs', ['init', '--primary', '#2563eb', '--dir', dir]).status, 0);
  await withServer(async (server) => {
    const audit = await server.call('audit_design', { paths: ['src'], json: true });
    const auditCli = cli('audit-design.mjs', ['src', '--json', '--dir', dir]);
    const strip = (json) => json.replace(/"generated_at": "[^"]*"/, '"generated_at": "-"');
    assert.equal(strip(text(audit)), strip(auditCli.stdout));
    assert.equal(audit.isError, auditCli.status !== 0);
  }, ['--dir', dir]);
});

test('kit-mcp: AI_FRONTEND_PROJECT picks the project when --dir is absent', async () => {
  const dir = project();
  assert.equal(cli('tokens.mjs', ['init', '--primary', '#2563eb', '--dir', dir]).status, 0);
  await withServer(async (server) => {
    const check = await server.call('tokens_check', {});
    assert.equal(check.isError, false, text(check));
    assert.equal(text(check), cli('tokens.mjs', ['check', '--dir', dir]).stdout);
  }, [], { ...cleanEnv(), AI_FRONTEND_PROJECT: dir });
});

test('kit-mcp: input that breaks the schema is an MCP error and nothing runs', async () => {
  const dir = project();
  await withServer(async (server) => {
    const cases = [
      ['get', {}, /id is required/],
      ['flow_start', { route: 'sideways' }, /one of: new, direction/],
      ['flow_start', {}, /route is required/],
      ['find', { limit: 'ten' }, /limit must be an integer/],
      ['find', { limit: 0 }, /at least 1/],
      ['find', { commercial: 'yes' }, /commercial must be a boolean/],
      ['find', { colour: 'red' }, /not an accepted argument/],
      ['technique_find', { area: 'sound' }, /one of: layout/],
      ['svg_gen', { kind: 'blob', size: 'big' }, /wrong format/],
      ['svg_gen', { kind: 'spiral' }, /one of: blob/],
      ['svg_check', { files: [] }, /at least 1/],
      ['svg_check', { files: 'a.svg' }, /must be an array/],
      ['audit_design', { paths: [3] }, /paths\[0\] must be a string/],
      ['flow_done', { step: 'Bad Step' }, /wrong format/],
      ['find', { query: '--json' }, /read as an option/],
    ];
    for (const [name, args, pattern] of cases) {
      const result = await server.call(name, args);
      assert.equal(result.isError, true, `${name} ${JSON.stringify(args)}`);
      assert.match(text(result), pattern, `${name} ${JSON.stringify(args)}`);
    }
    assert.equal((await server.call('get', undefined)).isError, true);
  }, ['--dir', dir]);
});

test('kit-mcp: an unknown tool is a JSON-RPC error, an unknown method too, and the server keeps going', async () => {
  await withServer(async (server) => {
    const unknown = await server.request('tools/call', { name: 'delete_everything', arguments: {} });
    assert.equal(unknown.error.code, -32602);
    assert.match(unknown.error.message, /Unknown tool: delete_everything/);
    const method = await server.request('resources/list');
    assert.equal(method.error.code, -32601);
    assert.deepEqual((await server.request('ping')).result, {});
  });
});

test('kit-mcp: a malformed JSON line is a parse error and the server does not exit', async () => {
  await withServer(async (server) => {
    const parse = await server.raw('{"jsonrpc": "2.0", "id": 9, "method": ');
    assert.equal(parse.error.code, -32700);
    assert.equal(parse.id, null);
    const invalid = await server.raw('42');
    assert.equal(invalid.error.code, -32600);
    assert.equal(server.child.exitCode, null, 'still running');
    const list = await server.request('tools/list');
    assert.equal(list.result.tools.length, EXPECTED.length);
  });
});

test('kit-mcp: it is part of the kit and does not use a shell', () => {
  assert.ok(REQUIRED_KIT_FILES.includes('tools/kit-mcp.mjs'));
  const source = readFileSync(SERVER, 'utf8');
  assert.doesNotMatch(source, /\bexecSync\b|\bexec\(|shell:\s*true/);
});
