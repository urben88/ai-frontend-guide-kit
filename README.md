# AI Frontend Guide Kit

Reusable-first UI component catalog and guided workflow for AI agents building frontends. This repository is both the **factory** (extraction pipeline + catalog) and the **distributable kit** you copy into any frontend project.

- **Catalog:** 16 verified sources, 2,470 reusable entries, 20 categories, per-entry licenses and install commands.
- **Guided kit (`ai-frontend-guide-kit/`):** `AGENTS.md` + 9 short guides (00–08) + `find`/`get` query tools. Self-contained, no build, no npm dependencies.
- **Generic agent skill:** `skills/ai-frontend-guide/SKILL.md` teaches Codex/OpenAI, Claude Code, OpenCode and other agents how to use the kit. Install it standalone with `npx skills add urben88/ai-frontend-guide-kit --skill ai-frontend-guide`.
- **UX flow layer:** 16 vendored UX skills (MIT, from `jpoindexter/ux-flow-skills`): `userflow` + 15 `flow-*` (auth, onboarding, checkout, paywall, settings, navigation, tables, forms, errors, empty states, AI chat…). They analyze the repo and produce a proven `UX-SPEC.md` + `flow-report.html` before any UI work; existing UX can be summarized as-is or radically redesigned (UX only).
- **Selection memory:** `ai-frontend-output/` (per project) keeps an append-only history of decisions, a generated styles/components summary and named reusable combinations via `memory.mjs`.
- **Local Laya ranking (optional):** `laya_select.py` ranks catalog candidates with calibrated probabilities, running entirely on the development PC.

## Install as a dependency (recommended)

```bash
npm i -D github:urben88/ai-frontend-guide-kit          # or pin a version: #v1.1.0
npx ai-frontend-guide-kit                              # setup (explicit, idempotent)
```

Optionally add a script to re-run it after updating the dependency: `"kit": "ai-frontend-guide-kit"` → `npm run kit`.

- Installs skills **cleanly into `.agents/skills/`** (17: workflow + 16 UX flows) — no `skills-lock.json`, no symlink sprawl.
- If the project has a `.claude/` folder, the skills are also linked into `.claude/skills/` (junction/symlink, copy fallback).
- `--design-skills` additionally installs impeccable/taste-skill/emilkowalski via the skills CLI (needs network).
- `--skills-mode cli` keeps the previous full CLI flow (lockfile + multi-agent links).
- npm registry publish is planned; for now use the GitHub ref (commit `main` or a version tag). There is **no `postinstall`**: `npm install` alone never mutates the project.

## One-shot (no dependency)

```bash
npx github:urben88/ai-frontend-guide-kit

# variants
npx github:urben88/ai-frontend-guide-kit --no-skills          # kit + docs only
npx github:urben88/ai-frontend-guide-kit --with-laya          # also install/update Laya
npx github:urben88/ai-frontend-guide-kit --target ../my-app   # install into another folder
npx github:urben88/ai-frontend-guide-kit --design-skills      # + external design skills via CLI

# offline / no git: build the package once and reuse the tarball
npm pack                                   # -> ai-frontend-guide-kit-1.1.0.tgz (~0.3 MB, includes skills)
npx ./ai-frontend-guide-kit-1.1.0.tgz      # run it in the destination project
```

The installer:

1. Copies `ai-frontend-guide-kit/` into the target project (and removes the legacy `ai-frontend-guide/` folder if present).
2. Adds a pointer block to the project's `AGENTS.md`.
3. Creates `ai-frontend-output/` (selection memory) if missing — it is never removed on refresh.
4. Copies the 17 kit skills (workflow + 16 UX flows) into `.agents/skills/`; links them into `.claude/skills/` when a `.claude/` folder exists; `--design-skills` adds the three external design skills via the skills CLI; `--skills-mode cli` uses the full CLI flow.
5. Checks Python/Laya and prints the exact next step (use `--with-laya` to install Laya in the same command).

Then tell your agent: *"Read `ai-frontend-guide-kit/AGENTS.md` and follow its workflow."*

## Selection memory (`ai-frontend-output/`)

After every component decision the agent records it, so each project keeps an auditable history and reusable combinations:

```bash
node ai-frontend-guide-kit/tools/memory.mjs combo list       # check saved combinations before searching
node ai-frontend-guide-kit/tools/memory.mjs add --screen landing --block hero --need "..." \
  --decision reuse --id <entry-id> --style gradient,dark
node ai-frontend-guide-kit/tools/memory.mjs combo save saas-landing-v1 --note "landing SaaS minimalista"
node ai-frontend-guide-kit/tools/memory.mjs combo show saas-landing-v1   # entries + install commands
node ai-frontend-guide-kit/tools/memory.mjs combo apply saas-landing-v1  # reuse in another project
```

The folder contains `selections.jsonl` (append-only history), `combinations.json` (named reusable sets) and `SUMMARY.md` (generated summary of styles and components extracted). It lives outside the kit so refreshes never touch it; reuse combinations across projects by copying `combinations.json` or pointing `AI_FRONTEND_OUTPUT` to a shared folder.

## Laya (local decision engine)

Laya is a fast, non-autoregressive decision model with calibrated probabilities. Here it ranks component candidates by semantic fit; licenses and install commands always come from the catalog.

```bash
python ai-frontend-guide-kit/tools/laya_select.py --check       # status (exit 0 = ready)
python ai-frontend-guide-kit/tools/laya_select.py --install     # pip install -U laya (first run downloads checkpoints)
python ai-frontend-guide-kit/tools/laya_select.py --need "..." --dry-run   # preview the payload, no model
# after asking the user for consent:
python ai-frontend-guide-kit/tools/laya_select.py --need "pricing table with monthly/anual toggle" --category pricing --commercial --confirmed
```

Laya is optional and the agent must ask before using it: ranking requires `--confirmed` as proof of consent (without it the script exits with code 3 and loads nothing). Everything runs locally: no server, no external APIs beyond the one-time Hugging Face checkpoint download. Without Python/Laya the kit still works via `node ai-frontend-guide-kit/tools/find.mjs` + `get.mjs`.

## Repository layout

```
├── ai-frontend-guide-kit/        # the distributable kit (copy this)
│   ├── AGENTS.md · README.md · VERIFICATION.md
│   ├── guides/00..08         # reuse-first UX/UI workflow (01 = UX flows)
│   ├── catalog/              # index + taxonomy + install-guides + 16 sources
│   └── tools/                # context · find · get · memory · laya_select
├── skills/                   # ai-frontend-guide + 16 vendored UX flow skills (MIT)
├── manifest/                 # catalog source of truth (generated)
├── tools/                    # extraction/refresh/build/validate pipeline
├── openspec/                 # change specs (OpenSpec)
└── install.mjs               # one-command installer (bin)
```

## Maintainer commands

```bash
node tools/refresh.mjs <source_id>   # refresh one source (or "all")
node tools/build-index.mjs           # rebuild the light index
node tools/build-kit.mjs             # re-sync catalog into ai-frontend-guide-kit/
node tools/sync-ux-skills.mjs        # re-vendor the 16 UX skills (MIT); --check for updates
node tools/validate.mjs              # schema + ID + index checks
node tools/validate.mjs --urls 10    # sample links
npm run validate                     # same as above
```

## Licensing

- The tooling and documentation in this repository follow their own licenses; check `openspec/` history for decisions.
- Catalog entries inherit the license of their source (`license_type`, `commercial_use`, `limits` fields). Non-commercial entries (e.g. original Agents Kit families) are flagged and must not be used in commercial work.
- The kit stores metadata and links only — never third-party component code.
