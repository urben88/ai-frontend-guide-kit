# 00 — Start Here (router)

You are about to build or change frontend UX/UI. This workflow exists so you **reuse before you create**, and so every design decision is deliberate instead of generic.

## Intake (always first)

Before touching code, ask the user what they want and route explicitly:

1. **What are we doing?** New frontend · small change · custom addition · polish only · UX only/redesign.
2. **What exists?** Run `node tools/context.mjs` and read `ai-frontend-output/ux/REPO-CONTEXT.md` (stack, screens, `ux_present`) instead of exploring the repo.
3. **Declare the route** in one line (e.g. *"Route: phase 2 only — adapt the hero, then polish"*) before reading any guide.

The phases are **entry points, not a fixed pipeline**: enter where the request points and never run a phase the user did not ask for.

## The three phases

| Phase | Guides | You produce |
|---|---|---|
| **1 · UX & theory** | `01-UX-FLOWS` (+ `ADAPTERS` if BMAD/spec-driven), `02-TOKENS` | context + `PRODUCT.md` + `UX-SPEC.md` + `flow-report.html` + `DESIGN.md`/theme |
| **2 · Composition** | `03-INVENTORY`, `04-FIND`, `05-REUSE`, `06-ADAPT` (+ `07-PHILOSOPHY` while composing) | component inventory, candidate shortlist, reuse/adapt/build decisions + install, adapted components |
| **3 · Total polish** | `frontend-polish` skill + `07-PHILOSOPHY` + `08-VERIFY` | external audits, Playwright MCP loop green, E2E + visual regression green |

Phase 1 has **four paths** depending on the repository: no UX → design from scratch; existing UX → **ask the user once** to summarize (as-is + audit) or radically redesign (UX only); or a spot audit of one surface. Never redesign silently. If the repo runs **BMAD or a spec-driven flow**, read `ADAPTERS.md` first (the PRD becomes the anchor; specs are the behavioral source of truth).

## Casuistics (minimum path)

| Request | Route |
|---|---|
| New frontend / major build | Phase 1 → 2 → 3 |
| Small change to an existing UI | `09-ITERATE.md` (do not repeat the UX phase) |
| Custom component / new feature | `09-ITERATE.md`: combinations → `find`/`get` → build with `07` → polish |
| Polish only / visual QA | Phase 3: `frontend-polish` + `08-VERIFY` |
| UX only / redesign | Phase 1 (`01-UX-FLOWS`); no UI work |
| Backend/logic only | Not this kit — skip it |

A small new project may compress **1 → 2 → 3** (tokens and philosophy can merge), but never build before checking memory + catalog.

## Tools by phase

| Tool / skill | 1 · UX | 2 · Compose | 3 · Polish |
|---|---|---|---|
| `userflow` + `flow-*` skills | yes | — | optional flow audit |
| Catalog + `find`/`get` + selection memory | — | yes | — |
| `emilkowalski` skills (if installed) | — | interactions | review/improve animations |
| `impeccable` / taste-skill (if installed) | — | — | audit + polish |
| Playwright MCP | — | render a block in isolation | visual/BUILD loop |
| `@playwright/test` (guide 08) | — | — | regression gate |

Load an external skill only when its description matches what you are doing; if it is not installed, use the distilled rules of `07-PHILOSOPHY.md` and say so.

## Token discipline (mandatory)

- Read `AGENTS.md` once. Then read **only the guide for the current phase/step**.
- Start with `node tools/context.mjs` and read the compact `REPO-CONTEXT.md`.
- Query with `node tools/find.mjs …` and `node tools/get.mjs <id>`. Do not open `catalog/sources/*.json` unless the tools are insufficient.
- Never paste whole catalog files into the conversation; quote only the entries you shortlist.
- Write each step's output to a file (`PRODUCT.md`, `UX-SPEC.md`, `DESIGN.md`, inventory table…) so later steps don't re-read everything.

## Done when

- `UX-SPEC.md` exists with screens, flows and empty/loading/error states (phase 1).
- Every UI need maps to a catalog entry, an adaptation, or a justified custom build (phase 2).
- Licenses are compatible with the project (commercial/non-commercial).
- Phase 3 closes green (`frontend-polish` + `08-VERIFY`).

Start with the intake, then open the guide of the chosen entry phase.
