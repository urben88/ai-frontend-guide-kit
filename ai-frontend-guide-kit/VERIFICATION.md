# Kit verification (2026-10-02)

Evidence recorded by the factory repo (`PilaresAplicaciones/Diseño`) when this kit was generated.

## Catalog

- 16 source files, 2,470 entries, unique IDs, index consistent — `node tools/validate.mjs` → OK.
- Link check: 10 URLs sampled, 0 broken, 1 blocked (Uiverse returns 403 to non-browser clients — documented in `catalog/install-guides.md`).
- Light index size: **7,773 bytes** (budget ≤ 10 KB).

## Token budget

| Layer | Asset | Measured | Budget |
|---|---|---|---|
| 0 · Awareness | `AGENTS.md` | 56 lines | ~1 page |
| 1 · Guides | `guides/*.md` | 28–63 lines each | ≤ 120 lines |
| 2 · Query | `find.mjs` example output | 945 bytes | < 1 KB |
| 2 · Query | `get.mjs` example output | 715 bytes | < 2 KB |
| Index | `catalog/component-manifest.json` | 7.6 KB | ≤ 10 KB |

## Sandbox build (Next.js + Tailwind v4)

Fresh `create-next-app` (Next.js 16.3.8, Tailwind v4, `--src-dir`) with shadcn/ui init, then:

- `npx shadcn@latest add "https://magicui.design/r/marquee.json"` (Magic UI) ✔
- `npx motion-primitives@latest add text-effect` (installed to project root — moved to `src/components/motion-primitives/` for the `@/*` alias) ✔
- `npm i -D daisyui@latest` + `@plugin "daisyui";` (daisyUI 5.7.47 detected) ✔
- Page importing all four sources → `npm run build` compiled, type-checked and pre-rendered successfully ✔

## Clean copy test

`ai-frontend-guide-kit/` was copied to an empty directory and used from there: `find.mjs` and `get.mjs` resolved the catalog with relative paths and returned results; guides are plain Markdown. No build step, no npm install, no network required to query the catalog. ✔

## License checks (practical)

- Aceternity: free registry item → HTTP 200; premium item → HTTP 401 (excluded by the extractor). ✔
- 21st.dev: registry URL without API key → HTTP 403; the documented free quota (2 copies/installs per day) applies with an API key. ✔
- Agents Kit: repository `LICENSE.md` is a Non-Commercial License; 40 entries are flagged `commercial_use: false` in the catalog. ✔

## Refresh behavior

`node tools/refresh.mjs aicss` rewrote only `sources/aicss.json` plus the index files (verified by file hashes and modification times); the other 15 source files were untouched. Regeneration is deterministic (same input → identical bytes). ✔

## Laya integration (2026-10-02)

- `python tools/laya_select.py --check` → exit 0: Python 3.14.6, pip OK, laya 0.3.20 installed, Hugging Face cache present (~1.45 GB after first real run). ✔
- `--dry-run` with the need *"marketing hero section with animated gradient background for a SaaS landing page"* (`--category hero --commercial --top 5`) preselected 5 relevant candidates and printed the exact payload: one `noul` fit question per candidate plus one `choice` best-overall. No model import. ✔
- Real run (same need): model `english`, 5 candidates, **111.5 s** first run (includes checkpoint fetch); top result `floatui-hero-hero-section-with-gradient-background` with P(fit)=0.74, and the same candidate won the `choice` question. Lower fits went to generic heroes (Tailblocks A 0.49, DevTool Landing 0.48), matching intuition. Exit 0. ✔
- Laya emitted a runtime warning that some checkpoint temperatures are out of range and were clamped, so confidence values on those entries are uncalibrated; the script treats probabilities as **relative** rankings and shows the disclaimer. ✔
- `--install` path: verified logic (`python -m pip install -U laya` + import check); on this PC `laya` was already installed, so the command is documented rather than re-executed. ✔
- Installer `node install.mjs`: full run into a temp project installed the 16 design skills (impeccable 1 + taste-skill 1 + emilkowalski 14) into `.agents/skills/`, copied the kit, created the `AGENTS.md` pointer and ran the Laya check. Re-running refreshed the kit and skipped the existing pointer (idempotent). Windows note: `npx` needs `shell: true` in `spawnSync` (npx.cmd resolution), fixed in `install.mjs`. ✔
- `--no-skills` offline path verified: kit + pointer + Laya check only. ✔
- Clean copy test of the updated kit: `find.mjs`, `laya_select.py --check --json` and `--dry-run` ran from a copied folder in an empty directory (script-relative paths). ✔

## Laya consent gate (2026-10-02)

- Ranking without `--confirmed` → exit **3**, prints the consent instruction (ask the user, then repeat with `--confirmed`) and does **not** import Laya. ✔
- `--check` and `--dry-run` still exit **0** without consent (they do not execute the model). ✔
- Ranking with `--confirmed` (same test need as before) → exit **0**, model `english`, 5 candidates, **9.4 s** with the checkpoint cached; top result unchanged (`floatui-hero-hero-section-with-gradient-background`, P(fit)=0.76, also the `choice` pick). ✔
- Rule documented in `AGENTS.md` (first Laya rule), `guides/04-FIND.md`, both `README.md` files and the installer's closing message; the flag is also documented in the script docstring with its exit codes. ✔

## Selection memory (2026-10-02)

- `memory.mjs add` recorded a real decision enriched from the catalog (Float UI hero → license `custom`, commercial `conditional`, install command copied from the entry) plus a `build` decision without id; an unknown id exited 1 with a clear message pointing to `find.mjs`. ✔
- `SUMMARY.md` regenerated on every mutation with totals, latest decision per screen/block, style counts, sources used, saved combinations and recent decisions. ✔
- Combinations: `combo save saas-landing-v1 --note …` stored both decisions with aggregated styles; `combo list` printed one line per combination; `combo show` listed entries with install commands re-read from the catalog; `combo apply` appended the decisions to the history with the "from combination …" note. ✔
- Installer provisioning: first install created `ai-frontend-output/` with its README; after recording a decision, a second install reported "ai-frontend-output/ found: preserved" and the history was intact. ✔
- Docs and skill updated: `AGENTS.md`, `guides/00`, `guides/04` (check combinations first), `guides/05` (record every decision), `SKILL.md` generic skill, kit and root READMEs. ✔

## UX flow layer (2026-10-02)

- 16 UX skills vendored from `jpoindexter/ux-flow-skills` at commit `fc7f4a4b91` (MIT license copied verbatim; every SKILL.md validated: frontmatter `name` matches the directory and `description` present). `sync-ux-skills.mjs --check` reports "up to date". ✔
- `tools/sync-ux-skills.mjs` re-vendors from the pinned source, aborts if the origin license is not MIT, removes upstream-deleted skills and refreshes `UX-SKILLS-ORIGIN.md` + `UX-SKILLS-LICENSE`. ✔
- `tools/context.mjs` on a real Next.js repo: detected Next.js + Tailwind v4 + motion/shadcn/daisyui, 1 route, 4 docs, `ux_present=true` and the summarize-vs-redesign suggestion; on an empty repo: `ux_present=false` → from scratch. Output ≤ ~150 lines in `ai-frontend-output/ux/REPO-CONTEXT.md`. ✔
- Guide `01-UX-FLOWS.md` replaces `01-ANCHOR.md`: four paths (A from scratch, B as-is summary, C radical redesign with mandatory baseline + diff, UX-only respecting PRODUCT.md, D spot audit) and the gate that blocks the UI phase without `UX-SPEC.md` (screens + empty/loading/error states + flows). ✔

## Framework adapters (BMAD / spec-driven)

- Detection verified: a simulated BMAD repo (`.bmad-core/`, `docs/prd.md`, 2 story files) → `framework: bmad` with evidence; this repository (`openspec/`) → `framework: spec-driven`. Feature detection is tolerant and does not false-positive on a plain product repo. ✔
- `guides/ADAPTERS.md` documents the artifact mapping (PRD/brief as anchor, UX docs as the as-is state, stories → screens, OpenSpec specs as the behavioral contract) and the no-duplicate-sources rule; it is linked from `AGENTS.md`, `SKILL.md`, `00-START-HERE` and `01-UX-FLOWS`. ✔
- `memory.mjs add --ref "story:3.2"` stores the trace and `SUMMARY.md` shows it in the new Ref column (verified with a real record). ✔
