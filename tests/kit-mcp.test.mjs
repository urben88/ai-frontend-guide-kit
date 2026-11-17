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
  'board_detect', 'board_plan', 'board_scaffold', 'board_list', 'board_check',
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

// ---------------------------------------------------------------- the board tools (storybook-board S3, T4)

const withStorybook = (dir) => writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'app', devDependencies: { storybook: '10.6.7', react: '19.0.0', typescript: '5.6.0' } }));

test('kit-mcp: board_detect, board_plan, board_scaffold, board_list and board_check return what the CLI returns', async () => {
  const dir = project();
  const mirror = project();
  for (const where of [dir, mirror]) withStorybook(where);
  const same = (result, expected, label) => {
    const joined = [expected.stdout.trimEnd(), expected.stderr.trimEnd()].filter(Boolean).join('\n');
    const shown = expected.status === 0 ? expected.stdout : joined;
    const hide = (value, where) => value.trimEnd().split(where.replace(/\\/g, '/')).join('<P>').split(where).join('<P>');
    assert.equal(hide(text(result), dir), hide(shown, mirror), label);
    assert.equal(result.isError, expected.status !== 0, label);
  };
  await withServer(async (server) => {
    same(await server.call('board_detect', {}), cli('board.mjs', ['detect', '--dir', mirror]), 'detect');
    same(await server.call('board_detect', { json: true }), cli('board.mjs', ['detect', '--json', '--dir', mirror]), 'detect --json');
    const noMap = await server.call('board_plan', {});
    assert.equal(noMap.isError, true, 'plan without ui-map.json is an error, like the exit code');
    assert.match(text(noMap), /ui-map\.mjs/);
    same(await server.call('board_list', {}), cli('board.mjs', ['list', '--dir', mirror]), 'list before any board');

    const scaffold = await server.call('board_scaffold', { page: 'login', version: 'v1-sidebar' });
    assert.equal(scaffold.isError, false, text(scaffold));
    same(scaffold, cli('board.mjs', ['scaffold', 'login', '--version', 'v1-sidebar', '--dir', mirror]), 'scaffold');
    assert.equal(readFileSync(join(dir, 'src', 'board', 'Login.board.stories.tsx'), 'utf8'), readFileSync(join(mirror, 'src', 'board', 'Login.board.stories.tsx'), 'utf8'));
    const again = await server.call('board_scaffold', { page: 'login', version: 'v1-sidebar' });
    assert.equal(again.isError, true, 'an existing version is never overwritten: the refusal is an MCP error');
    assert.match(text(again), /already has the version v1-sidebar/);

    same(await server.call('board_list', { json: true }), cli('board.mjs', ['list', '--json', '--dir', mirror]), 'list --json');
    same(await server.call('board_check', {}), cli('board.mjs', ['check', '--dir', mirror]), 'check');
    writeFileSync(join(dir, 'src', 'board', 'Bad.board.stories.tsx'), "import { create } from 'zustand';\nexport const V1 = {};\n");
    writeFileSync(join(mirror, 'src', 'board', 'Bad.board.stories.tsx'), "import { create } from 'zustand';\nexport const V1 = {};\n");
    const check = await server.call('board_check', { json: true });
    assert.equal(check.isError, true, 'a finding is an error, like the exit code');
    same(check, cli('board.mjs', ['check', '--json', '--dir', mirror]), 'check --json with a finding');
  }, ['--dir', dir]);
});

test('kit-mcp: the board tools check their input, and flow_done can record the no to Storybook', async () => {
  const dir = project();
  await withServer(async (server) => {
    const cases = [
      ['board_scaffold', { page: 'login' }, /version is required/],
      ['board_scaffold', { version: 'v1-sidebar' }, /page is required/],
      ['board_scaffold', { page: 'login', version: 'V1 Sidebar' }, /wrong format/],
      ['board_scaffold', { page: '', version: 'v1-sidebar' }, /must not be empty/],
      ['board_scaffold', { page: '--dir', version: 'v1-sidebar' }, /wrong format|read as an option/],
      ['board_scaffold', { page: 'login', version: 'v1-sidebar', force: true }, /not an accepted argument/],
      ['board_detect', { install: true }, /not an accepted argument/],
      ['board_check', { json: 'yes' }, /json must be a boolean/],
      ['flow_done', { step: 'board', declined: true }, /needs --reason/],
      ['flow_done', { step: 'board', reason: 'no' }, /goes with --declined/],
      ['flow_done', { step: 'board', declined: 'yes', reason: 'no' }, /declined must be a boolean/],
    ];
    for (const [name, args, pattern] of cases) {
      const result = await server.call(name, args);
      assert.equal(result.isError, true, `${name} ${JSON.stringify(args)}`);
      assert.match(text(result), pattern, `${name} ${JSON.stringify(args)}`);
    }
    assert.equal((await server.call('flow_start', { route: 'new' })).isError, false);
    const state = join(dir, 'ai-frontend-output', 'flow-state.json');
    const data = JSON.parse(readFileSync(state, 'utf8'));
    data.steps.forEach((step) => { step.status = step.id === 'board' || step.id === 'polish' ? 'pending' : 'done'; });
    writeFileSync(state, JSON.stringify(data));
    const refused = await server.call('flow_done', { step: 'board' });
    assert.equal(refused.isError, true, 'no Storybook and no answer: refused');
    assert.match(text(refused), /Storybook is not installed/);
    const declined = await server.call('flow_done', { step: 'board', declined: true, reason: 'the user does not want it' });
    assert.equal(declined.isError, false, text(declined));
    const step = JSON.parse(readFileSync(state, 'utf8')).steps.find((s) => s.id === 'board');
    assert.equal(step.declined, true);
    assert.equal(step.reason, 'the user does not want it');
  }, ['--dir', dir]);
});

test('kit-mcp: board_scaffold takes an optional kind (component or page) and writes the same story as the CLI (S7)', async () => {
  const dir = project();
  const mirror = project();
  for (const where of [dir, mirror]) withStorybook(where);
  await withServer(async (server) => {
    const component = await server.call('board_scaffold', { page: 'Button', version: 'default', kind: 'component' });
    assert.equal(component.isError, false, text(component));
    const expected = cli('board.mjs', ['scaffold', 'Button', '--version', 'default', '--kind', 'component', '--dir', mirror]);
    const hide = (value, where) => value.split(where.replace(/\\/g, '/')).join('<P>').split(where).join('<P>');
    assert.equal(hide(text(component), dir), hide(expected.stdout, mirror));
    const file = join('src', 'board', 'components', 'Button.board.stories.tsx');
    assert.equal(readFileSync(join(dir, file), 'utf8'), readFileSync(join(mirror, file), 'utf8'));
    assert.match(readFileSync(join(dir, file), 'utf8'), /Board\/Components\/Button/);
    const page = await server.call('board_scaffold', { page: 'Button', version: 'v1-plain', kind: 'page' });
    assert.equal(page.isError, false, text(page));
    assert.match(readFileSync(join(dir, 'src', 'board', 'Button.board.stories.tsx'), 'utf8'), /Board\/Pages\/Button/);
    const list = JSON.parse(text(await server.call('board_list', { json: true })));
    assert.deepEqual(list.boards.map((b) => b.kind).sort(), ['component', 'page']);
    const bad = await server.call('board_scaffold', { page: 'Button', version: 'default', kind: 'widget' });
    assert.equal(bad.isError, true);
    assert.match(text(bad), /one of: page, component/);
  }, ['--dir', dir]);
});

test('kit-mcp: flow_done passes the answer of the user and the tools they picked; a decision part is refused without the answer (guided-flow S2, S3)', async () => {
  const dir = project();
  const out = join(dir, 'ai-frontend-output');
  mkdirSync(join(out, 'ux'), { recursive: true });
  writeFileSync(join(out, 'ux', 'EXPERIENCE-BRIEF.md'), '# Experience brief\n## Context\nBakery for neighbours.\n## Goal\nA first order.\n');
  const stateFile = join(out, 'flow-state.json');
  writeFileSync(stateFile, JSON.stringify({ route: 'direction', gates: 1, started_at: '2026-11-17T00:00:00.000Z', complete: false, steps: [{ id: 'intake', status: 'done' }, { id: 'direction', status: 'pending' }] }));
  await withServer(async (server) => {
    const next = JSON.parse(text(await server.call('flow_next', {})));
    assert.ok(next.decision.what, 'flow_next carries the decision');
    assert.ok(next.tools.length >= 1, 'and the tool menu');
    const refused = await server.call('flow_done', { step: 'direction.questions' });
    assert.equal(refused.isError, true);
    assert.match(text(refused), /is the user's decision/);
    for (const [args, pattern] of [[{ step: 'direction.questions', answer: '' }, /must not be empty/], [{ step: 'direction.questions', answer: 5 }, /answer must be a string/], [{ step: 'direction.questions', tools: 'hammer', answer: 'x' }, /unknown tool "hammer"/], [{ step: 'direction.questions', tools: ['recipe'] }, /tools must be a string/]]) {
      const result = await server.call('flow_done', args);
      assert.equal(result.isError, true, JSON.stringify(args));
      assert.match(text(result), pattern, JSON.stringify(args));
    }
    const done = await server.call('flow_done', { step: 'direction.questions', answer: 'A bakery site; the action is the first order', tools: 'recipe,technique' });
    assert.equal(done.isError, false, text(done));
    assert.match(text(done), /Summary for the user — direction\.questions/);
    const entry = JSON.parse(readFileSync(stateFile, 'utf8')).steps[1].answers[0];
    assert.equal(entry.answer, 'A bakery site; the action is the first order');
    assert.deepEqual(entry.tools, ['recipe', 'technique']);
  }, ['--dir', dir]);
});

test('kit-mcp: flow_report without a step writes the whole route to FLOW-REPORT.md, and with a step still writes its checklist (guided-flow S4)', async () => {
  const dir = project();
  await withServer(async (server) => {
    assert.equal((await server.call('flow_start', { route: 'architecture' })).isError, false);
    const whole = await server.call('flow_report', {});
    assert.equal(whole.isError, false, text(whole));
    assert.match(text(whole), /^# Flow report/);
    assert.match(readFileSync(join(dir, 'ai-frontend-output', 'FLOW-REPORT.md'), 'utf8'), /## 1\. intake — in progress/);
    const step = await server.call('flow_report', { step: 'polish' });
    assert.equal(step.isError, false, text(step));
    assert.match(text(step), /polish-report\.md/);
  }, ['--dir', dir]);
});
