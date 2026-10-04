#!/usr/bin/env node
/**
 * Builds a single-file, offline catalog explorer (search, filters, quality sort, preview links, copy-install)
 * at ai-frontend-guide-kit/catalog/explorer.html. Run by build-kit.
 *
 * Usage: node tools/build-explorer.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SOURCES_DIR, TODAY } from './extract/lib.mjs';

const rows = [];
for (const file of readdirSync(SOURCES_DIR).filter((f) => f.endsWith('.json')).sort()) {
  const doc = JSON.parse(readFileSync(join(SOURCES_DIR, file), 'utf8'));
  for (const e of doc.entries) {
    rows.push([e.id, e.name, e.source, e.category, e.license_type, e.quality ?? 0, e.docs_url, e.entry_type, (e.stack ?? []).join(','), e.install_command ?? '', e.description]);
  }
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Catalog Explorer</title>
<style>
:root{--bg:#fafaf9;--fg:#1c1917;--muted:#57534e;--line:#e7e5e4;--card:#fff;--accent:#0f766e;--chip:#f5f5f4}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--fg:#f5f5f4;--muted:#a8a29e;--line:#292524;--card:#1c1917;--accent:#2dd4bf;--chip:#292524}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
header{padding:20px 16px 8px;max-width:1100px;margin:auto}h1{margin:0;font-size:22px}p.sub{margin:4px 0 0;color:var(--muted)}
.bar{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 16px}
.bar div{max-width:1100px;margin:auto;display:flex;flex-wrap:wrap;gap:8px}
input,select{background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:8px 10px;font:inherit}
input[type=search]{flex:1 1 240px}
main{max-width:1100px;margin:auto;padding:12px 16px 48px}
.count{color:var(--muted);margin:8px 0}
.item{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:8px 0}
.item h2{margin:0;font-size:16px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.q{font-size:12px;color:var(--accent);border:1px solid var(--accent);border-radius:999px;padding:0 8px}
.meta{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.chip{background:var(--chip);border-radius:6px;padding:1px 8px;font-size:12px;color:var(--muted)}
.item p{margin:4px 0;color:var(--muted)}
.actions{display:flex;gap:12px;margin-top:6px;align-items:center;flex-wrap:wrap}
a{color:var(--accent)}button{background:none;border:1px solid var(--line);color:var(--fg);border-radius:6px;padding:3px 10px;cursor:pointer;font:inherit}
code{font-size:12px;background:var(--chip);padding:2px 6px;border-radius:6px;word-break:break-all}
</style>
</head>
<body>
<header><h1>Catalog Explorer</h1><p class="sub">${rows.length} entries from ${new Set(rows.map((r) => r[2])).size} sources · generated ${TODAY} · offline</p></header>
<div class="bar"><div>
<input id="q" type="search" placeholder="Search name, tags, description…" aria-label="Search">
<select id="cat" aria-label="Category"><option value="">All categories</option></select>
<select id="src" aria-label="Source"><option value="">All sources</option></select>
<select id="lic" aria-label="License"><option value="">Any license</option><option value="MIT">MIT</option><option value="Apache-2.0">Apache-2.0</option><option value="custom">custom</option><option value="proprietary">proprietary</option><option value="unknown">unknown</option></select>
<select id="stack" aria-label="Stack"><option value="">Any stack</option><option>react</option><option>vue</option><option>svelte</option><option>html</option><option>tailwind</option></select>
<select id="min" aria-label="Minimum quality"><option value="0">Any quality</option><option value="60">Quality 60+</option><option value="75">Quality 75+</option><option value="85">Quality 85+</option></select>
</div></div>
<main><div class="count" id="count"></div><div id="list"></div></main>
<script>
const D=${JSON.stringify(rows).replace(/</g, '\\u003c')};
const $=(i)=>document.getElementById(i);
const uniq=(i)=>[...new Set(D.map((r)=>r[i]))].sort();
for(const c of uniq(3))$('cat').add(new Option(c,c));
for(const s of uniq(2))$('src').add(new Option(s,s));
const esc=(t)=>String(t).replace(/[&<>"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function render(){
  const q=$('q').value.toLowerCase().split(/\\s+/).filter(Boolean),cat=$('cat').value,src=$('src').value,lic=$('lic').value,stack=$('stack').value,min=+$('min').value;
  const out=D.filter((r)=>r[7]!=='icon'&&(!cat||r[3]===cat)&&(!src||r[2]===src)&&(!lic||r[4]===lic)&&(!stack||r[8].split(',').includes(stack))&&r[5]>=min&&q.every((t)=>(r[1]+' '+r[3]+' '+r[2]+' '+r[10]).toLowerCase().includes(t))).sort((a,b)=>b[5]-a[5]);
  $('count').textContent=out.length+' matches (showing '+Math.min(out.length,100)+')';
  $('list').innerHTML=out.slice(0,100).map((r,i)=>'<div class="item"><h2>'+esc(r[1])+' <span class="q">q'+r[5]+'</span></h2><div class="meta"><span class="chip">'+esc(r[2])+'</span><span class="chip">'+esc(r[3])+'</span><span class="chip">'+esc(r[4])+'</span><span class="chip">'+esc(r[8])+'</span></div><p>'+esc(r[10])+'</p><div class="actions"><a href="'+esc(r[6])+'" target="_blank" rel="noopener">Preview ↗</a>'+(r[9]?'<code>'+esc(r[9])+'</code><button data-i="'+i+'">Copy</button>':'')+'</div></div>').join('');
  $('list').onclick=(e)=>{const b=e.target.closest('button');if(b){navigator.clipboard?.writeText(out[+b.dataset.i][9]);b.textContent='Copied';}};
}
for(const i of ['q','cat','src','lic','stack','min'])$(i).addEventListener('input',render);
render();
</script>
</body>
</html>
`;
writeFileSync(join(ROOT, 'ai-frontend-guide-kit', 'catalog', 'explorer.html'), html, 'utf8');
console.log(`explorer: ${rows.length} entries -> ai-frontend-guide-kit/catalog/explorer.html (${(html.length / 1024).toFixed(0)} KB)`);
