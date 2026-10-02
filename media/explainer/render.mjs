import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i === -1 ? def : process.argv[i + 1];
}

async function loadPlaywright() {
  const unwrap = (m) => (m && m.chromium ? m : (m && m.default && m.default.chromium ? m.default : null));
  try {
    const m = unwrap(await import('playwright'));
    if (m) return m;
  } catch {}
  if (process.env.PLAYWRIGHT_PATH) {
    const m = unwrap(await import(pathToFileURL(path.join(process.env.PLAYWRIGHT_PATH, 'index.js')).href).catch(() => null));
    if (m) return m;
  }
  console.error(
    'Playwright not found. Install it (\n  npm i -D playwright   # or use an existing install\n)' +
    '\nor point PLAYWRIGHT_PATH to a playwright package folder.'
  );
  process.exit(1);
}

const { chromium } = await loadPlaywright();
const lang = arg('lang', 'es');
const fps = parseInt(arg('fps', '30'), 10);
const from = parseFloat(arg('from', '0'));
const to = parseFloat(arg('to', '0'));
const exe = arg('exe', process.env.PLAYWRIGHT_EXE || '');
const out = path.resolve(arg('out', path.join(os.tmpdir(), 'explainer-' + lang)));
fs.mkdirSync(out, { recursive: true });

const indexUrl = pathToFileURL(path.resolve(import.meta.dirname, 'index.html')).href;
const url = indexUrl + '?render=1&lang=' + lang;

const browser = await chromium.launch({ headless: true, executablePath: exe || undefined });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', null, { timeout: 30000 });
const total = await page.evaluate('window.TOTAL_DURATION');

const first = Math.round(from * fps);
const last = Math.round((to > 0 ? to : total) * fps);
for (let i = first; i < last; i++) {
  await page.evaluate('window.renderAt(' + (i / fps) + ')');
  await page.screenshot({ path: path.join(out, 'f-' + String(i).padStart(5, '0') + '.png') });
  if (i % 60 === 0) console.log(lang + ': frame ' + i + '/' + last);
}
await browser.close();
console.log('DONE ' + lang + ': frames ' + first + '..' + last + ' -> ' + out);
console.log('Encode:  ffmpeg -framerate ' + fps + ' -i "' + path.join(out, 'f-%05d.png') + '" -c:v libx264 -crf 19 -pix_fmt yuv420p -movflags +faststart out.mp4');
