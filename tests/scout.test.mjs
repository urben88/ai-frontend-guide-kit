import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = join(ROOT, 'ai-frontend-guide-kit', 'tools', 'scout.mjs');

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.AI_FRONTEND_OUTPUT;
  delete env.AI_FRONTEND_PROJECT;
  return env;
};
const scout = (...args) => new Promise((resolve) => {
  const child = spawn(process.execPath, [TOOL, ...args], { env: cleanEnv() });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('close', (status) => resolve({ status, stdout, stderr }));
});

const PAGE = `<!doctype html><html><head><title>Glow UI — free animated components</title></head><body>
<nav><a href="/docs/components/marquee">Marquee</a><a href="/docs/components/orbit-ring">Orbit ring</a>
<a href="/docs/components/marquee">Marquee again</a><a href="/pricing">Pricing</a><a href="/blog/post">Blog</a></nav>
<pre>npx shadcn@latest add https://glow.dev/r/marquee.json</pre>
<p>Released under the MIT License. Pro templates available.</p></body></html>`;

const withServer = async (fn) => {
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(PAGE);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
};

test('a URL of a catalog source says so and points to find.mjs, without fetching', async () => {
  const run = await scout('https://ui.shadcn.com/docs/components/button');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /In the catalog: `shadcn`/);
  assert.match(run.stdout, /node tools\/find\.mjs --source shadcn/);
});

test('a shared host matches a source only under its path', async () => {
  const run = await scout('https://github.com/someone/else');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Not in the catalog/);
});

test('--fetch on an unknown site lists its components, install method and license hints compactly', async () => {
  await withServer(async (base) => {
    const run = await scout(`${base}/docs/components`, '--fetch');
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /Not in the catalog/);
    assert.match(run.stdout, /Title: Glow UI — free animated components/);
    assert.match(run.stdout, /Components \(2\): marquee, orbit-ring/);
    assert.match(run.stdout, /Install: npx shadcn@latest add https:\/\/glow\.dev\/r\/marquee\.json/);
    assert.match(run.stdout, /License hints: MIT/);
    assert.match(run.stdout, /Paid hints: pricing, pro/);
    assert.ok(Buffer.byteLength(run.stdout) < 2000, 'the report stays small');
  });
});

test('--record stores the site as a library to research for the project', async () => {
  await withServer(async (base) => {
    const dir = mkdtempSync(join(tmpdir(), 'scout-'));
    const run = await scout(`${base}/docs/components`, '--fetch', '--record', '--dir', dir);
    assert.equal(run.status, 0, run.stderr);
    const libs = JSON.parse(readFileSync(join(dir, 'ai-frontend-output', 'libraries.json'), 'utf8')).libraries;
    assert.equal(libs.length, 1);
    assert.equal(libs[0].name, new URL(base).host);
    assert.equal(libs[0].status, 'research');
    assert.match(libs[0].notes, /2 components/);
    assert.match(libs[0].notes, /npx shadcn@latest add/);
  });
});

test('a catalog source recorded with --record is stored as in use with its source', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'scout-'));
  const run = await scout('https://magicui.design/docs/components/marquee', '--record', '--dir', dir);
  assert.equal(run.status, 0, run.stderr);
  const libs = JSON.parse(readFileSync(join(dir, 'ai-frontend-output', 'libraries.json'), 'utf8')).libraries;
  assert.deepEqual([libs[0].name, libs[0].status, libs[0].source], ['magicui.design', 'using', 'magicui']);
});

test('an invalid URL exits 2 and a failed fetch exits 1, recording nothing', async () => {
  const bad = await scout('not a url');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /not a valid http\(s\) URL/);
  const dir = mkdtempSync(join(tmpdir(), 'scout-'));
  const down = await scout('http://127.0.0.1:9/', '--fetch', '--record', '--dir', dir);
  assert.equal(down.status, 1);
  assert.match(down.stderr, /could not fetch/);
  assert.equal(existsSync(join(dir, 'ai-frontend-output', 'libraries.json')), false);
});
