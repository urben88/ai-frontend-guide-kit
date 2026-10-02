# ai-frontend-guide-kit — README

Self-contained guided kit for building frontend UX/UI with a reuse-first workflow. Copy this folder into any frontend repository and point your AI agent to `AGENTS.md`.

## Copy into a project

1. Copy the whole `ai-frontend-guide-kit/` folder to the target repository root (keep the folder intact).
2. Tell the agent: *"Read `ai-frontend-guide-kit/AGENTS.md` and follow its workflow."*
3. Optional: add a pointer in the project's own `AGENTS.md`:

```markdown
## Frontend UI
Before creating UI components, follow `ai-frontend-guide-kit/AGENTS.md` (reuse-first workflow).
```

Prefer the installer (`npm i -D github:urben88/ai-frontend-guide-kit` + `npx ai-frontend-guide-kit`): it copies this folder, creates `ai-frontend-output/`, patches `AGENTS.md`, installs the 18 skills of the repo cleanly into `.agents/skills/` (plus `.claude/skills/` when a `.claude/` folder exists), installs the 3 external design skills via their CLI (`--no-design-skills` to skip) and configures Playwright MCP for detected harnesses (`--no-mcp` to skip).

Requirements: none for reading the guides or catalog. The query tools need Node.js ≥ 18; no npm packages are required.

## Structure

```
ai-frontend-guide-kit/
├── AGENTS.md              # awareness layer: scope, golden rule, navigation
├── README.md              # this file (copy + integration instructions)
├── guides/                # 00-START-HERE (router: intake + 3 phases) … 09-ITERATE (small changes)
├── catalog/
│   ├── component-manifest.json   # light index (sources, counts, paths)
│   ├── component-manifest.md     # readable index
│   ├── taxonomy.md               # category definitions + source mappings
│   ├── install-guides.md         # install/code retrieval per source
│   ├── schema.json               # entry schema
│   └── sources/*.json            # 16 source files (2,470 entries)
└── tools/
    ├── context.mjs        # repo context for the UX phase (REPO-CONTEXT.md)
    ├── find.mjs           # filtered catalog search (short output)
    ├── get.mjs            # full decision card for one entry
    ├── memory.mjs         # selection memory: history, summary, combinations
    └── laya_select.py     # local Laya ranking (optional accelerator; Python >= 3.10)
```

## UX flows first (`ai-frontend-output/ux/`)

The kit ships **16 vendored UX skills** (MIT, from `jpoindexter/ux-flow-skills`): the `userflow` dispatcher plus 15 `flow-*` skills (auth, onboarding, checkout, paywall, settings, navigation, app shell, tables, search, forms, errors, empty states, permissions, sharing, AI chat). Guide `01-UX-FLOWS` runs before any UI work:

- `node tools/context.mjs` → `REPO-CONTEXT.md` (includes whether the repo already has UX).
- **No UX** → design from scratch with `userflow` → `UX-SPEC.md` + `flow-report.html`.
- **UX exists** → ask the user: *Summarize* (as-is + audit) or *Radical redesign* (baseline + ideal UX + diff, UX only). Never redesign silently.

The UI inventory and `memory.mjs --screen/--block` derive from `UX-SPEC.md`.

## Total polish phase (`frontend-polish` + Playwright MCP)

The kit workflow ends with phase 3, run by the sibling `frontend-polish` skill: external audits when installed (`impeccable`, taste-skill, emilkowalski), an interactive Playwright MCP loop (a11y snapshot, states hover/focus/loading/empty/error, console, keyboard, reduced motion, responsive) and the `@playwright/test` regression of `08-VERIFY`. Without those tools, it falls back to the distilled checklist of `07-PHILOSOPHY`. Browse installs once with `npx playwright install chromium`.

## Selection memory (`ai-frontend-output/`)

Created next to the kit by the installer and **preserved on refreshes**: append-only history (`selections.jsonl`), named reusable combinations (`combinations.json`) and a generated styles/components summary (`SUMMARY.md`).

```bash
node tools/memory.mjs combo list          # check saved combinations before searching
node tools/memory.mjs add --screen landing --block hero --need "..." --decision reuse --id <entry-id> --style gradient,dark
node tools/memory.mjs combo save saas-landing-v1 --note "..."
node tools/memory.mjs combo apply saas-landing-v1
```

## Laya (optional local ranking)

`tools/laya_select.py` ranks candidates with calibrated probabilities, running entirely on this PC:

```bash
python tools/laya_select.py --check     # environment status
python tools/laya_select.py --install   # pip install -U laya (first run downloads checkpoints)
# after asking the user for consent:
python tools/laya_select.py --need "pricing table with monthly toggle" --category pricing --commercial --confirmed
```

**Ask before using it:** Laya is optional and never runs by default; ranking requires `--confirmed` as proof of the user's consent (without it the script exits with code 3 and does not load the model). Facts (licenses, install commands) always come from the catalog; Laya only scores semantic fit. Without Python/Laya the kit works the same through `find`/`get`.

## Updating the kit

The catalog is generated in the factory repo (`PilaresAplicaciones/Diseño`):

```bash
node tools/refresh.mjs <source_id>   # refresh one source
node tools/build-index.mjs           # rebuild the light index
node tools/build-kit.mjs             # re-sync catalog into ai-frontend-guide-kit/
node tools/validate.mjs              # schema + consistency check
```

Copy the updated folder again into projects when the catalog changes. Each entry records `verified_at` so agents know the data's age.

## Rules of engagement

- Reuse or adapt before creating (see `guides/05-REUSE.md`).
- Polish before closing a screen: `frontend-polish` + `guides/08-VERIFY.md`, never ship an unverified draft.
- Respect `license_type` / `commercial_use` / `limits` (see `AGENTS.md`).
- Keep high-impact animations to 1–2 per view (see `guides/07-PHILOSOPHY.md`).
- Do not paste third-party component source into this kit — the catalog stores metadata and links only; the vendored UX skills keep their own MIT license (see `skills/UX-SKILLS-LICENSE` in the repository).
