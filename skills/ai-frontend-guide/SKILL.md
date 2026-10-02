---
name: ai-frontend-guide
description: Reuse-first UI workflow for frontend projects. Use when designing or building any UI/UX (pages, sections, components, forms, animations, landing pages, dashboards) in a project that contains the ai-frontend-guide-kit folder. Consult the local component catalog before writing custom code, follow the guided flow in three on-demand phases (UX/theory, composition, total polish), and optionally rank candidates with the local Laya decision engine after asking the user. Covers catalog discovery, reuse/adapt/build decisions, installation, licensing, playbook for small changes/custom additions, and verification with Playwright MCP.
---

# AI Frontend Guide

Reusable-first UI workflow for AI agents. The point: **search what already exists before creating anything from scratch.**

## What you have

When this kit is installed, the project contains:

- `ai-frontend-guide-kit/AGENTS.md` — awareness layer (read this first).
- `ai-frontend-guide-kit/guides/00…09` — the guided workflow (router + three phases + iteration).
- `ai-frontend-guide-kit/catalog/` — 2,470 reusable entries from 16 verified sources (licenses, install commands, links), plus a light index.
- `ai-frontend-guide-kit/tools/` — `find.mjs`, `get.mjs` and `laya_select.py`.
- Sibling skills (when installed): `frontend-polish` (total polish phase) and the three external design skills (`impeccable`, `design-taste-frontend`, `emilkowalski`).

If the folder is missing, install it with:

```bash
npx github:urben88/ai-frontend-guide-kit
```

## Route first (intake)

Ask the user what they want before touching code and declare the route: new frontend (phases 1→2→3), small change or custom addition (`09-ITERATE.md`), polish only (phase 3), UX only (`01-UX-FLOWS.md`). The phases are entry points, not a fixed pipeline.

## Start here

1. Read `ai-frontend-guide-kit/AGENTS.md`.
2. Follow the phase that matches the route — read **only the guide for the current phase/step**:

| Phase | Guide | Output |
|---|---|---|
| 0 · Intake | `00-START-HERE.md` | route declared + phase map |
| 1 · UX & theory | `01-UX-FLOWS.md`, `02-TOKENS.md` | context + `PRODUCT.md` + `UX-SPEC.md` + `flow-report.html` + `DESIGN.md` |
| 2 · Composition | `03-INVENTORY.md` … `06-ADAPT.md` | inventory, shortlist, reuse/adapt/build + install, adapted components |
| 3 · Total polish | `frontend-polish` skill + `07-PHILOSOPHY.md`, `08-VERIFY.md` | audits + Playwright MCP loop + E2E/visual checks green |
| Iterate | `09-ITERATE.md` | small changes and custom additions |

## UX first (proven flows)

Run the UX phase before any UI work. It uses the bundled UX flow skills (`userflow` + 15 `flow-*`: auth, onboarding, checkout, paywall, settings, navigation, tables, forms, errors, empty states, AI chat…).

```bash
node ai-frontend-guide-kit/tools/context.mjs   # → ai-frontend-output/ux/REPO-CONTEXT.md (incl. ux_present)
```

Then follow `ai-frontend-guide-kit/guides/01-UX-FLOWS.md`:

- No UX in the repo → design from scratch with `userflow` (load 1–4 flow skills, never from memory) → `UX-SPEC.md` + `flow-report.html`.
- UX exists → **ask the user once**: Summarize (as-is + audit, no changes) or Radical redesign (baseline → ideal UX → diff). Never redesign silently; redesign is UX-only (`PRODUCT.md` stays).
- Single surface → `/userflow audit …` (findings only).

**BMAD / spec-driven repos:** `context.mjs` detects them (`Framework:` in `REPO-CONTEXT.md`). Read `ai-frontend-guide-kit/guides/ADAPTERS.md`: with a BMAD PRD use it as the business anchor (no duplicate `PRODUCT.md`) and cite stories with `--ref "story:<id>"`; with OpenSpec, specs are the behavioral source of truth and decisions cite `--ref "spec:<capability>"`.

The UI inventory and memory `--screen/--block` names come from `UX-SPEC.md`.

## Total polish (phase 3)

Before closing a screen, run the sibling skill `frontend-polish` when installed: external audits (`impeccable`, taste-skill, emilkowalski) if available, the Playwright MCP loop (states, console, accessibility, keyboard, reduced motion, responsive) and the closing `@playwright/test` regression of `08-VERIFY`. Fallback without tools: the distilled checklist of `07-PHILOSOPHY`.

## Query the catalog (do this before writing components)

```bash
node ai-frontend-guide-kit/tools/find.mjs --category hero --stack react --commercial
node ai-frontend-guide-kit/tools/find.mjs --text marquee --limit 8
node ai-frontend-guide-kit/tools/get.mjs <entry-id>   # license, deps, install command
```

Rules:

- **Reuse → adapt → build.** Create custom only when nothing fits or the license blocks you.
- Licenses are facts: check `license_type` / `commercial_use` in `get` before using anything.
  Never use `non-commercial` entries in commercial work; verify `unknown` ones on their page.
- Keep high-impact animations to 1–2 per view.

## Selection memory (`ai-frontend-output/`)

Keep a reusable history of decisions and combinations (the folder survives kit refreshes):

```bash
node ai-frontend-guide-kit/tools/memory.mjs combo list     # check saved combinations BEFORE searching
node ai-frontend-guide-kit/tools/memory.mjs add --screen <screen> --block <block> --need "..." \
  --decision reuse|adapt|build --id <entry-id> [--style a,b] [--notes "..."]
node ai-frontend-guide-kit/tools/memory.mjs combo save <name> --note "..."   # snapshot for reuse
node ai-frontend-guide-kit/tools/memory.mjs combo show <name>                # entries + install commands
node ai-frontend-guide-kit/tools/memory.mjs combo apply <name>               # reuse in this project
```

Rules: check combinations before searching; record **every** decision right after choosing (facts come from the catalog); `ai-frontend-output/SUMMARY.md` is the generated styles/components summary.

## Laya (optional local ranking — ask the user first)

`laya_select.py` ranks candidates with calibrated probabilities, running entirely on this PC.
**It is opt-in:** ask the user for permission before every ranking.

```bash
python ai-frontend-guide-kit/tools/laya_select.py --check      # ready? (exit 0)
python ai-frontend-guide-kit/tools/laya_select.py --need "…" --dry-run   # preview, no model
# only after the user confirms:
python ai-frontend-guide-kit/tools/laya_select.py --need "…" --category <category> --commercial --confirmed
```

Without `--confirmed` it exits with code 3 and does not load the model. If Python/Laya is unavailable, continue with `find`/`get` — the workflow never depends on Laya. Laya scores semantic fit only; licenses and install commands always come from the catalog.

## Do not

- Do not read the whole catalog into context: use `find`/`get` and quote only shortlisted entries.
- Do not copy third-party component source into the kit.
- Do not strip license notices from copied components.
