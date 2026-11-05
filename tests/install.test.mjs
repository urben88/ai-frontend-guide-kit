import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// flow-always S2 and S3: the installer commands init and update keep the agent instruction documents pointing at the kit.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const START = '<!-- ai-frontend-guide-kit:start -->';
const END = '<!-- ai-frontend-guide-kit:end -->';

const project = () => mkdtempSync(join(tmpdir(), 'kit-always-'));
const run = (target, ...command) => spawnSync(process.execPath, [join(ROOT, 'install.mjs'), ...command, '--target', target, '--no-skills', '--no-mcp'], { encoding: 'utf8' });
const read = (target, rel) => readFileSync(join(target, rel), 'utf8');
const put = (target, rel, text) => {
  mkdirSync(dirname(join(target, rel)), { recursive: true });
  writeFileSync(join(target, rel), text);
};
const blockOf = (text) => text.slice(text.indexOf(START), text.indexOf(END) + END.length);
const withoutBlock = (text) => text.slice(0, text.indexOf(START)) + text.slice(text.indexOf(END) + END.length);
const count = (text, needle) => text.split(needle).length - 1;

for (const command of ['init', 'update']) {
  test(`${command} writes the block into AGENTS.md and CLAUDE.md (created) and touches no optional agent file`, () => {
    const target = project();
    const result = run(target, command);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /AGENTS\.md: kit routing block created/);
    assert.match(result.stdout, /CLAUDE\.md: kit routing block created/);
    for (const file of ['AGENTS.md', 'CLAUDE.md']) {
      const text = read(target, file);
      assert.equal(count(text, START), 1, file);
      assert.equal(count(text, END), 1, file);
      assert.ok(text.includes('ai-frontend-guide-kit/INDEX.md'), `${file} points at the index`);
    }
    for (const file of ['GEMINI.md', '.github/copilot-instructions.md', '.cursorrules', '.windsurfrules', '.claude/CLAUDE.md', '.cursor']) {
      assert.equal(existsSync(join(target, file)), false, `${file} is not created`);
    }
  });
}

test('a second run reports unchanged and rewrites nothing, with init, update and no command alike', () => {
  const target = project();
  assert.equal(run(target, 'init').status, 0);
  const before = { agents: read(target, 'AGENTS.md'), claude: read(target, 'CLAUDE.md') };
  for (const command of [['init'], ['update'], []]) {
    const again = run(target, ...command);
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /AGENTS\.md: kit routing block unchanged/);
    assert.match(again.stdout, /CLAUDE\.md: kit routing block unchanged/);
    assert.equal(read(target, 'AGENTS.md'), before.agents);
    assert.equal(read(target, 'CLAUDE.md'), before.claude);
  }
});

test('running with no command still installs and now covers CLAUDE.md too', () => {
  const target = project();
  const result = run(target);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(existsSync(join(target, 'ai-frontend-guide-kit', 'INDEX.md')), 'the index is copied with the kit');
  assert.equal(count(read(target, 'AGENTS.md'), START), 1);
  assert.equal(count(read(target, 'CLAUDE.md'), START), 1);
});

test('an existing CLAUDE.md keeps its text and CRLF endings outside the block, and the block goes below the title', () => {
  const target = project();
  const original = '# My project\r\n\r\nAlways answer in Spanish.\r\n\r\n## Rules\r\n- run the tests\r\n';
  put(target, 'CLAUDE.md', original);
  assert.equal(run(target, 'init').status, 0);
  const text = read(target, 'CLAUDE.md');
  assert.equal(count(text.replace(/\r\n/g, ''), '\n'), 0, 'no bare LF in a CRLF file');
  assert.ok(text.startsWith('# My project\r\n'), 'the title stays first');
  assert.ok(text.indexOf(START) < text.indexOf('Always answer in Spanish.'), 'the block sits at the top, below the title');
  const rest = withoutBlock(text).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  assert.equal(rest.replace(/\n+/g, '\n'), original.replace(/\r\n/g, '\n').replace(/\n+/g, '\n'), 'everything outside the markers is intact');
  const second = run(target, 'update');
  assert.match(second.stdout, /CLAUDE\.md: kit routing block unchanged/);
  assert.equal(read(target, 'CLAUDE.md'), text);
});

test('the block goes below a leading frontmatter and title, or to the first line when there are none', () => {
  const target = project();
  put(target, 'CLAUDE.md', '---\nname: mine\n---\n# Title\n\nbody\n');
  put(target, 'AGENTS.md', 'plain text first\n\nmore\n');
  assert.equal(run(target, 'init').status, 0);
  const claude = read(target, 'CLAUDE.md');
  assert.ok(claude.startsWith('---\nname: mine\n---\n# Title\n'), claude.slice(0, 60));
  assert.ok(claude.indexOf(START) > claude.indexOf('# Title') && claude.indexOf(START) < claude.indexOf('body'));
  const agents = read(target, 'AGENTS.md');
  assert.ok(agents.startsWith(START), 'no title: the block is the first line');
  assert.ok(agents.endsWith('plain text first\n\nmore\n'), 'the user text follows intact');
});

test('an existing block is refreshed in place and nothing around it moves', () => {
  const target = project();
  put(target, 'CLAUDE.md', `# T\n\nbefore\n\n${START}\nstale text\n${END}\n\nafter\n`);
  assert.equal(run(target, 'update').status, 0);
  const text = read(target, 'CLAUDE.md');
  assert.ok(!text.includes('stale text'));
  assert.equal(count(text, START), 1);
  assert.ok(text.startsWith('# T\n\nbefore\n\n<!--'), 'text before the block did not move');
  assert.ok(text.endsWith(`${END}\n\nafter\n`), 'text after the block did not move');
});

test('optional agent files are refreshed only when they already exist', () => {
  const target = project();
  const files = ['.claude/CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md', '.cursorrules', '.windsurfrules'];
  for (const file of files) put(target, file, `# ${file}\n\nuser text of ${file}\n`);
  assert.equal(run(target, 'init').status, 0);
  for (const file of files) {
    const text = read(target, file);
    assert.equal(count(text, START), 1, file);
    assert.ok(text.includes(`user text of ${file}`), `${file} keeps the user text`);
    assert.ok(text.startsWith(`# ${file}\n`), `${file} keeps its title first`);
  }
  assert.equal(existsSync(join(target, '.cursor')), false);
});

test('.cursor/rules gets an always-applied rule only when .cursor/ exists, and refreshes it idempotently', () => {
  const target = project();
  mkdirSync(join(target, '.cursor'), { recursive: true });
  assert.equal(run(target, 'init').status, 0);
  const rule = read(target, '.cursor/rules/ai-frontend-guide-kit.mdc');
  assert.ok(rule.startsWith('---\n'), 'frontmatter first');
  assert.match(rule.split('---')[1], /alwaysApply: true/);
  assert.equal(count(rule, START), 1);
  const again = run(target, 'update');
  assert.match(again.stdout, /ai-frontend-guide-kit\.mdc: kit routing block unchanged/);
  assert.equal(read(target, '.cursor/rules/ai-frontend-guide-kit.mdc'), rule);

  const bare = project();
  assert.equal(run(bare, 'init').status, 0);
  assert.equal(existsSync(join(bare, '.cursor')), false);
});

test('the block is short, imperative and names the index, the first command and the iterate route (S2)', () => {
  const target = project();
  assert.equal(run(target, 'init').status, 0);
  const block = blockOf(read(target, 'AGENTS.md'));
  const lines = block.split('\n').length;
  assert.ok(lines <= 30, `the block has ${lines} lines`);
  assert.match(block, /Mandatory/);
  assert.ok(block.includes('ai-frontend-guide-kit/INDEX.md'));
  assert.ok(block.includes('flow.mjs status'));
  assert.ok(block.includes('iterate'), 'small changes use the iterate route');
  assert.match(block, /before any file is read or edited/);
  assert.match(block, /never skipped/i);
  assert.ok(!/optional/i.test(block), 'no optional path around the flow');
});
