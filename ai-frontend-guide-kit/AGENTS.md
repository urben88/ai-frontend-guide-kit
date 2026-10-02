# AI Frontend Guide

This folder is a **guided, self-contained kit** for agents (and humans) that build frontend UX/UI. Its purpose: **reuse what already exists before creating anything from scratch.**

## What you have here

- A catalog of **2,470 reusable UI entries** from **16 verified sources** (updated 2026-10-02), organized in 20 categories.
- Per-entry decision data: what it is, when to use it, where to find it, how to install it and its license constraints.
- A standardized reuse-first workflow in three on-demand phases (router in `guides/00`, guides 00–09).
- Two local query tools (`tools/find.mjs`, `tools/get.mjs`) that answer with minimal output.
- A generic agent skill (`skills/ai-frontend-guide/SKILL.md`) that teaches this workflow to Codex/OpenAI, Claude Code, OpenCode and other agent harnesses, plus a total-polish skill (`skills/frontend-polish/SKILL.md`).

## Golden rule

> **Before writing any component, form, section or animation from scratch: search this catalog.**

Only if nothing fits (or the license blocks you), build custom — and follow `guides/07-PHILOSOPHY.md`.

## How to use (token-efficient layers)

| Layer | Read / run | Cost |
|---|---|---|
| 0 · Awareness | this file | ~1 page |
| 1 · Guide | only the guide for the current phase/step (`guides/00` … `09`) | ≤ ~120 lines |
| 2 · Query | `node tools/find.mjs ...` and `node tools/get.mjs <id>` | < 1 KB each |
| 3 · Detail | `catalog/sources/<source>.json` or the official docs URL | only when needed |

Never load all `catalog/sources/*.json` files into context. Never read `install-guides.md` end-to-end — jump to the section of the chosen source.

## Route first (intake)

Before touching code, ask the user what they want and declare the route: new frontend (phases 1→2→3), small change or custom addition (`guides/09-ITERATE.md`), polish only (phase 3), UX only (`guides/01-UX-FLOWS.md`). **The phases are entry points, not a fixed pipeline** — never run a phase the user did not ask for.

## Workflow map (three phases)

| Phase | Guide | Output |
|---|---|---|
| 0 · Intake | `guides/00-START-HERE.md` | route declared + flow map |
| 1 · UX & theory | `guides/01-UX-FLOWS.md` | context + `PRODUCT.md` + `UX-SPEC.md` + `flow-report.html` (4 paths) |
| 1 · UX & theory | `guides/02-TOKENS.md` | `DESIGN.md` + Tailwind v4 theme (Figma MCP or fallback) |
| 2 · Composition | `guides/03-INVENTORY.md` … `guides/06-ADAPT.md` (+ `07` while composing) | inventory, shortlist, reuse/adapt/build + install, adapted components |
| 3 · Total polish | `frontend-polish` skill + `guides/07-PHILOSOPHY.md` + `guides/08-VERIFY.md` | external audits + Playwright MCP loop + E2E/visual checks green |
| Iterate | `guides/09-ITERATE.md` | small changes and custom additions without repeating the UX phase |

## Query examples

```bash
node tools/find.mjs --category hero --stack react --commercial
node tools/find.mjs --text marquee --limit 8
node tools/get.mjs magicui-micro-interactions-marquee
```

## Laya (local decision engine — optional accelerator)

Laya is a fast decision model with **calibrated probabilities** that runs entirely on this PC (no server). Use it to rank candidates when the choice between similar components is not obvious.

```bash
python tools/laya_select.py --check       # ready? (exit 0 = usable on this PC)
python tools/laya_select.py --install     # only if missing (first run downloads checkpoints, ~0.1-1.7 GB)
python tools/laya_select.py --need "..." --dry-run   # preview selection payload, no model needed
# after the user confirms:
python tools/laya_select.py --need "pricing table with monthly/anual toggle" --category pricing --commercial --confirmed
```

Rules:

- **Ask the user first.** Laya is optional and never runs by default: ask for consent before every ranking, then repeat the command with `--confirmed`. Without it the script exits with code 3 and does not load the model.
- **Facts vs opinion:** licenses, compatibility and install commands always come from the catalog (`get`); Laya only scores semantic fit.
- Treat probabilities as **relative** between candidates; if the top score is low the script says so — compare alternatives or broaden filters.
- If Python/Laya is unavailable, continue with `find`/`get`. Never block the workflow on Laya.
- Pre-filter is deterministic and mandatory: non-commercial entries never reach the model for commercial projects.

## UX phase first (`ai-frontend-output/ux/`)

Before any UI work, run the UX phase with the bundled UX flow skills (`userflow` + 15 `flow-*`, proven patterns for auth, onboarding, checkout, paywall, settings, navigation, tables, forms, errors, empty states, AI chat…):

```bash
node tools/context.mjs        # scans the repo → ai-frontend-output/ux/REPO-CONTEXT.md (incl. ux_present)
```

Then follow `guides/01-UX-FLOWS.md`:

- **No UX detected** → design from scratch with the `userflow` dispatcher (load 1–4 `flow-*` skills, never from memory) → `UX-SPEC.md` + `flow-report.html`.
- **UX exists** → **ask the user once**: *Summarize* (as-is documentation + anti-pattern audit, no changes) or *Radical redesign* (baseline → ideal UX → diff). Never redesign silently. Redesign is UX-only: `PRODUCT.md` stays.
- **Single surface** → spot audit via `/userflow audit …` (findings only).
- **BMAD / spec-driven repos** → read `guides/ADAPTERS.md`. Detection is automatic (`Framework:` in `REPO-CONTEXT.md`): with a BMAD PRD, use it as the business anchor and cite stories with `--ref "story:<id>"`; with OpenSpec, specs are the behavioral source of truth and decisions cite `--ref "spec:<capability>"`.

Gate: do not start the UI steps until `UX-SPEC.md` lists screens with empty/loading/error states and flows. The UI inventory and `memory.mjs --screen/--block` come from it.

## Total polish phase (`frontend-polish` + Playwright MCP)

Before closing any screen, run the `frontend-polish` skill: external audits when installed (impeccable, taste-skill, emilkowalski), the Playwright MCP loop (a11y snapshot, states, console, keyboard, reduced motion, responsive) and the `@playwright/test` regression of `guides/08-VERIFY.md`. The installer configures Playwright MCP for detected harnesses; the browser installs once with `npx playwright install chromium`. Fallback: the checklist in `guides/07-PHILOSOPHY.md`.

## Selection memory (`ai-frontend-output/`)

Every decision is recorded and reusable. The folder lives next to the kit and **survives kit refreshes** — never store memory inside `ai-frontend-guide-kit/`.

```bash
node tools/memory.mjs combo list        # check saved combinations BEFORE searching
node tools/memory.mjs add --screen landing --block hero --need "..." --decision reuse --id <entry-id> --style gradient,dark
node tools/memory.mjs list              # recent decisions
node tools/memory.mjs combo save saas-landing-v1 --note "..."   # snapshot for reuse
node tools/memory.mjs combo apply saas-landing-v1                # reuse in this project
```

Rules:

- Check `combo list` before searching the catalog; reuse existing combinations when they fit.
- Record every decision with `add` right after choosing (facts come from the catalog).
- `ai-frontend-output/SUMMARY.md` is the generated summary of styles and components extracted.

## License discipline

- `license_type: non-commercial` → **do not use in commercial work** (permission required).
- `license_type: unknown` → verify on the component page before production.
- `commercial_use: conditional` → read `limits` in `get` output first.
- This kit never ships third-party component code; it only stores metadata and links.
