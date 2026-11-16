#!/usr/bin/env node
/**
 * Static scan for deceptive-pattern tells in UI source (no dependencies).
 * Heuristic: it flags things to review, it does not prove intent.
 *
 * Usage: node ai-frontend-guide-kit/tools/audit-honesty.mjs [dir ...] [--strict] [--json]
 * Default dirs: src app pages components public index.html (those that exist).
 * --strict exits 1 when any "high" finding exists.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXT = new Set(['.html', '.htm', '.tsx', '.jsx', '.vue', '.svelte', '.astro', '.mdx']);
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'ai-frontend-guide-kit', 'ai-frontend-output']);

export const RULES = [
  { id: 'fake-scarcity', severity: 'high', pattern: /\bonly\s+\d+\s+(left|remaining|spots?|seats?)\b/i, why: 'Scarcity claim; must be backed by real inventory data.' },
  { id: 'urgency-copy', severity: 'medium', pattern: /\b(hurry|last chance|offer ends (in|soon)|limited[- ]time|act now|don'?t miss out)\b/i, why: 'Urgency copy; remove unless the deadline is real and shown.' },
  { id: 'confirmshaming', severity: 'high', pattern: /\bno thanks,?\s*i\s*(don'?t|do not|hate|prefer|like|would rather|already)\b|\bi'?ll pay full price\b/i, why: 'Decline option worded to shame the user.' },
  { id: 'prechecked-extra', severity: 'high', pattern: /<input[^>]*type=["']checkbox["'][^>]*\b(defaultChecked|checked)\b/i, why: 'Pre-checked checkbox; paid or data-sharing options must be opt-in.' },
  { id: 'placeholder-proof', severity: 'high', pattern: /\b(lorem ipsum|john doe|jane doe|acme (corp|inc))\b/i, why: 'Placeholder text/testimonials must not ship as social proof.' },
  { id: 'unverified-metric', severity: 'medium', pattern: /\btrusted by\s+\d[\d,.]*\+?|\b\d[\d,.]*\+?\s+(happy )?(customers|users|teams)\b/i, why: 'Metric claim; verify it is real and sourced.' },
  {
    id: 'consent-asymmetry',
    severity: 'high',
    file: (text) => /accept( all)?( cookies)?/i.test(text) && !/(reject|decline|deny|refuse|necessary only|essential only|manage)/i.test(text),
    pattern: /accept( all)?( cookies)?/i,
    why: 'Accept without an equally visible reject/manage option.',
  },
  // The anti-manipulation rules of the applied-psychology list (experience/references/reference-deceptive-patterns.md) that source text can show.
  { id: 'countdown-timer', severity: 'medium', pattern: /\bcount-?down\b|\b(ends|expires|left|remaining)\b[^\n]{0,30}\b\d{1,2}:\d{2}:\d{2}\b|\b\d{1,2}:\d{2}:\d{2}\b[^\n]{0,30}\b(left|remaining|to go)\b/i, why: 'Countdown; it must run to a real deadline the user can verify, and reset never.' },
  { id: 'fomo-activity', severity: 'medium', pattern: /\b\d+\s+(people|others|users|shoppers|customers|visitors)\s+(are\s+|have\s+)?(viewing|looking|watching|buying|bought|booked)\b|\b(selling|going) fast\b|\balmost (sold out|gone)\b|\bin high demand\b|\b(bought|sold|booked)\b[^\n]{0,24}\bin the last (hour|day|\d+ (hours|minutes))\b/i, why: 'Activity or demand claim (FOMO); show it only when it is real, live data.' },
  { id: 'hard-cancel', severity: 'medium', pattern: /\b(to cancel|cancellations?)\b[^\n.]{0,40}\b(call|phone|e-?mail|write to|contact (us|support|sales))\b|\bcall (us )?to cancel\b/i, why: 'Cancelling needs a call or a message; offer cancellation where the user signed up, in one click.' },
  {
    id: 'subscription-no-cancel',
    severity: 'medium',
    file: (text) => !/cancel/i.test(text),
    pattern: /\b(free trial|subscription|billed (monthly|annually|yearly)|per (month|year))\b|\/(mo|month|yr|year)\b/i,
    why: 'Recurring charge or trial with no mention of cancelling in this file; say how and where to cancel.',
  },
  { id: 'tiny-decline', severity: 'medium', pattern: /^(?=.*\b(reject|decline|deny|no,? thanks|not now|maybe later)\b)(?=.*(\btext-xs\b|\btext-\[(?:8|9|10|11)px\]|font-size:\s*(?:8|9|10|11)px|fontSize:\s*['"]?(?:8|9|10|11)(?:px)?\b|\bopacity-(?:10|20|30|40|50)\b|\btext-(?:gray|slate|zinc|neutral)-[34]00\b))/i, why: 'Decline option styled small or faded next to the accept option; give both equal weight.' },
  { id: 'hidden-fee', severity: 'medium', pattern: /(?<!\bno )(?<!\bzero )(?<!\bwithout )\b(booking|service|processing|convenience|handling|admin(istration)?) fees?\b/i, why: 'A fee on top of the price; show the total from the first price the user sees.' },
  { id: 'prechecked-component', severity: 'high', pattern: /<(Checkbox|Switch|Toggle)\b[^>]*(\bdefaultChecked\b(?!\s*=\s*\{\s*false)|\bchecked\b(?:\s*=\s*\{\s*true\s*\})?(?=[\s/>]))/, why: 'Checkbox, switch or toggle that starts on; consent and paid or data-sharing options must be opt-in.' },
  {
    id: 'modal-no-close',
    severity: 'high',
    file: (text) => !/close|dismiss|onOpenChange|onClose|&times;|×|✕|cerrar/i.test(text),
    pattern: /role=["']dialog["']|aria-modal|<dialog\b|<(Modal|Popup|Drawer|Dialog)\b/,
    why: 'Dialog or popup with no way to close it in this file; it must close with a button, Esc and a click outside.',
  },
  {
    id: 'infinite-scroll',
    severity: 'medium',
    file: (text) => !/load more|show more|ver más|pagination|\bnext page\b/i.test(text),
    pattern: /infinite[- ]?scroll|useInfiniteQuery/i,
    why: 'Endless feed with no load-more button or paging; give it an end, a count or a way out.',
  },
];

function walk(path, out) {
  if (!existsSync(path)) return;
  const stat = statSync(path);
  if (stat.isFile()) {
    if (EXT.has(extname(path))) out.push(path);
    return;
  }
  for (const name of readdirSync(path)) {
    if (!SKIP.has(name)) walk(join(path, name), out);
  }
}

export function scanText(text, file = '<text>') {
  const findings = [];
  const lines = text.split('\n');
  for (const rule of RULES) {
    if (rule.file && !rule.file(text)) continue;
    lines.forEach((line, index) => {
      if (rule.pattern.test(line)) findings.push({ file, line: index + 1, rule: rule.id, severity: rule.severity, why: rule.why, text: line.trim().slice(0, 100) });
    });
  }
  return findings;
}

function main() {
  const argv = process.argv.slice(2);
  const dirs = argv.filter((a) => !a.startsWith('--'));
  const targets = dirs.length ? dirs : ['src', 'app', 'pages', 'components', 'public', 'index.html'];
  const files = [];
  for (const target of targets) walk(target, files);
  const findings = files.flatMap((file) => scanText(readFileSync(file, 'utf8'), file));

  if (argv.includes('--json')) console.log(JSON.stringify({ scanned: files.length, findings }, null, 2));
  else {
    console.log(`audit-honesty: scanned ${files.length} files, ${findings.length} findings`);
    for (const f of findings) console.log(`  [${f.severity}] ${f.file}:${f.line} ${f.rule} - ${f.why}\n      ${f.text}`);
    if (findings.length) console.log('Review each: see experience/references/reference-deceptive-patterns.md');
  }
  if (argv.includes('--strict') && findings.some((f) => f.severity === 'high')) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
