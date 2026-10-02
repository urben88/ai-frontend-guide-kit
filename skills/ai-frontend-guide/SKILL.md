---
name: ai-frontend-guide
description: Reuse-first UI workflow for frontend projects. Use when designing or building any UI/UX (pages, sections, components, forms, animations, landing pages, dashboards) in a project that contains the ai-frontend-guide-kit folder. Consult the local component catalog before writing custom code, follow the 9-step guided flow, and optionally rank candidates with the local Laya decision engine after asking the user. Covers catalog discovery, reuse/adapt/build decisions, installation, licensing and verification.
---

# AI Frontend Guide

Reusable-first UI workflow for AI agents. The point: **search what already exists before creating anything from scratch.**

## What you have

When this kit is installed, the project contains:

- `ai-frontend-guide-kit/AGENTS.md` — awareness layer (read this first).
- `ai-frontend-guide-kit/guides/00…08` — the 9-step UX/UI workflow.
- `ai-frontend-guide-kit/catalog/` — 2,470 reusable entries from 16 verified sources (licenses, install commands, links), plus a light index.
- `ai-frontend-guide-kit/tools/` — `find.mjs`, `get.mjs` and `laya_select.py`.

If the folder is missing, install it with:

```bash
npx github:urben88/ai-frontend-guide-kit
```

## Start here

1. Read `ai-frontend-guide-kit/AGENTS.md`.
2. Follow the guides in order — read **only the guide for the current step**:

| Step | Guide | Output |
|---|---|---|
| 1 | `01-UX-FLOWS.md` | context + `PRODUCT.md` + `UX-SPEC.md` + `flow-report.html` (4 paths) |
| 2 | `02-TOKENS.md` | `DESIGN.md` + theme (Figma MCP or fallback) |
| 3 | `03-INVENTORY.md` | components needed per screen (no libraries yet) |
| 4 | `04-FIND.md` | candidate shortlist from the catalog |
| 5 | `05-REUSE.md` | reuse / adapt / build decision + install + memory record |
| 6 | `06-ADAPT.md` | adapted components with your tokens |
| 7 | `07-PHILOSOPHY.md` | hierarchy, springs, anti-generic rules |
| 8 | `08-VERIFY.md` | Playwright checks green |

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
