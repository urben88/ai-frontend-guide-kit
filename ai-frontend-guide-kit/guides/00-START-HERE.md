# 00 — Start Here (router)

You are about to build or change frontend UX/UI. This workflow exists so you **reuse before you create**, and so every design decision is deliberate instead of generic.

## Intake (always first)

Before touching code, ask the user what they want and route explicitly:

0. **Where are we?** Run `node tools/flow.mjs status`. If a route is active, continue at its current step (`node tools/flow.mjs next`) instead of starting over.
1. **What are we doing?** New frontend · direction only · small change · custom addition · polish only · UX only/redesign. Every route and its steps: `guides/FLOWS.md`.
2. **What exists?** Run `node tools/context.mjs` and read `ai-frontend-output/ux/REPO-CONTEXT.md` (stack, screens, `ux_present`, UI libraries), and read `ai-frontend-output/UI-MAP.md` (components, roles, routes), instead of exploring the repo. Record the libraries with `node tools/memory.mjs lib sync`; for a library under "To research", use its own documentation for components and install steps.
3. **Declare the route** in one line (e.g. *"Route: phase 2 only — adapt the hero, then polish"*) and record it with `node tools/flow.mjs start <route>` before reading any guide. Close each step with `node tools/flow.mjs done <step>`; it refuses a skipped step or a missing artifact, so produce the artifact instead of working around it.

The phases are **entry points, not a fixed pipeline**: enter where the request points and never run a phase the user did not ask for.

## The three phases

| Phase | Guides | You produce |
|---|---|---|
| **1 · UX & theory** | `01-EXPERIENCE-DIRECTION` (+ `ADAPTERS` if BMAD/spec-driven), `02-UX-FLOWS`, `03-TOKENS` | `EXPERIENCE-BRIEF.md` + context + `PRODUCT.md` + `UX-SPEC.md` + `flow-report.html` + `ux-map.excalidraw` + `DESIGN.md`/theme |
| **2 · Composition** | `04-INVENTORY`, `05-FIND`, `06-REUSE`, `07-ADAPT` (+ `08-PHILOSOPHY` while composing) | component inventory, candidate shortlist, reuse/adapt/build decisions + install, adapted components |
| **3 · Total polish** | `frontend-polish` skill + `08-PHILOSOPHY` + `09-VERIFY` | external audits, Playwright MCP loop green, E2E + visual regression green |

Phase 1 starts with the **experience direction** (`01`): adaptive questions guided by Laya → archetype, philosophy, journey, IA, three creative directions and a visual brief in `EXPERIENCE-BRIEF.md`. During `01` run the **discovery loop** (`experience/DISCOVERY-LOOP.md`): example sites with their structure, the user's likes and screenshots (saved in `ai-frontend-output/ux/references/`). Then `02-UX-FLOWS` has **four paths** depending on the repository: no UX → design from scratch; existing UX → **ask the user once** to summarize (as-is + audit) or radically redesign (UX only); or a spot audit of one surface. Never redesign silently. If the repo runs **BMAD or a spec-driven flow**, read `ADAPTERS.md` first (the PRD becomes the anchor; specs are the behavioral source of truth).

## Casuistics (minimum path)

| Request | Route |
|---|---|
| New frontend / major build | Phase 1 → 2 → 3 |
| Direction only (no UI) | `01-EXPERIENCE-DIRECTION.md` (includes the discovery loop) |
| Small change to an existing UI | `10-ITERATE.md` (do not repeat the UX phase) |
| Custom component / new feature | `10-ITERATE.md`: combinations → `find`/`get` → build with `08` → polish |
| Polish only / visual QA | Phase 3: `frontend-polish` + `09-VERIFY` |
| Specific visual tweaks the user wants to point at in the browser (React) | `11-VISUAL-FEEDBACK.md` (Agentation) |
| UX only / redesign | Phase 1 (`02-UX-FLOWS`); no UI work |
| Architecture: folder map, or FSD structure (only when asked) | `12-ARCHITECTURE.md`: `map` is the default and changes nothing; `fsd-new` / `fsd-refactor` run only on explicit request, then the `frontend-refactor` skill |
| Visual redesign of an existing screen (keep flows, content and wiring) | Agree it with the user, then `design-taste-frontend` redesign mode → phase 3 |
| Backend/logic only | Not this kit — skip it |

A small new project may compress **1 → 2 → 3** (tokens and philosophy can merge), but never build before checking memory + catalog.

## Tools by phase

| Tool / skill | 1 · UX | 2 · Compose | 3 · Polish |
|---|---|---|---|
| `experience/` + Laya tasks (`next-question`, `direction`) | yes | — | — |
| `experience/DISCOVERY-LOOP.md` + web search | example sites, likes, screenshots | component combinations | — |
| `userflow` + `flow-*` skills | yes | — | optional flow audit |
| `ux-map` skill + local Excalidraw MCP | direction-aware screen/navigation map | — | flow audit visual |
| Catalog + `find`/`get` + selection memory + Laya (`fit`) | — | yes | — |
| `ui-map` (`impact`, `have`, `types`, `docs`, `check`; map always on) | — | `have` before searching or creating; `types` for the component vocabulary | `impact` to locate and to confirm no stray remains; `docs` to check the context documents; `check` for the profile gate |
| `landing-page-design` (if installed, landing pages only) | intake, page outline, copy | — | — |
| `hallmark` (if installed) | raw material for the directions | only when the decision is `build` | report-only audit |
| `design-taste-frontend` (if installed) | raw material for the directions | only when the decision is `build`, or an agreed visual redesign | its checks, on a screen it built |
| `emilkowalski` skills (if installed) | — | interactions | review/improve animations |
| `impeccable` (if installed) | — | — | critique, audit, polish, `detect` |
| Playwright MCP | reference discovery + extraction | render a block in isolation | visual/BUILD loop |
| `@playwright/test` (guide 09) | — | — | regression gate |
| Agentation MCP (guide 11, React, optional) | — | point-and-change on a rendered block | final human round |

Architecture is not a phase. `guides/12-ARCHITECTURE.md` decides where code goes: `map` records folder roles and never moves anything, and FSD (`fsd-new`, `fsd-refactor`) is applied only when the user asks, through the `frontend-refactor` skill, one slice at a time with `ui-map build` and `check` after each one. The separation philosophy of `08-PHILOSOPHY.md` applies either way.

## External design skills by step

The kit flow comes first. Some of these skills describe themselves as covering almost any UI request, and that does not make them the entry point: load each one only at its step. If one is not installed, use the distilled rules of `08-PHILOSOPHY.md` and say so.

| Step | Skill | Use it for | Limits |
|---|---|---|---|
| Phase 1, guide `01` steps 1–3, landing or marketing pages only | `landing-page-design` | Intake topics (offer, audience, objections, proof), page outline, layout type, conversion copy | Merge its questions into the kit's rounds and skip what is already known. The brief and `DESIGN.md` override its visual rules and its Tailwind, Framer Motion and icon defaults. |
| Phase 1, guide `01` step 5 (optional) | `hallmark` or `design-taste-frontend` | Raw material for the three directions | They only propose themes here and build nothing; the three directions must still differ in structure. |
| Phase 2, guide `06`, new page or section with decision `build` | `hallmark` | Building what the catalog could not provide | Only after `05-FIND` for that block. Keep the blocks already reused. A root `DESIGN.md` locks its design system. |
| Phase 2, guide `06`, app screen with decision `build`, or an agreed visual redesign | `design-taste-frontend` | Building or redesigning inside the project's stack | Same limits. Keep brand values. Needs Node 22+ and Chrome, Edge or Chromium. |
| Phases 2–3 | `emilkowalski` | Interactions and animation review | Keep the effect budget of `08-PHILOSOPHY.md`. |
| Phase 3, through `frontend-polish` | `impeccable` | Critique, audit, polish and the `detect` check | `bolder` and `quieter` change the direction: run them only when the user asks. |
| Phase 3, through `frontend-polish` | `hallmark` | Second-opinion audit of pages and sites | Report only: name it to trigger the audit, and do not let it rebuild the screen. |
| Phase 3, through `frontend-polish`, only on a screen it built | `design-taste-frontend` | Its lint and browser inspection | No new build or redesign here. |

Rules for all of them:

- Record what they build as usual: `memory.mjs add ... --decision build --notes "skill:<name>"`.
- If a skill's advice contradicts `PRODUCT.md`, `DESIGN.md`, the brief or the license rules, the kit's files win.
- If a skill wants to create `PRODUCT.md` or `DESIGN.md` (for example `/impeccable init`), point it to the kit's existing files; never overwrite them.
- Pictures they bring in keep their own licenses: keep the credits they ask for.

## Token discipline (mandatory)

- Read `AGENTS.md` once. Then read **only the guide for the current phase/step**.
- Start with `node tools/context.mjs` and read the compact `REPO-CONTEXT.md`.
- Query with `node tools/find.mjs …` and `node tools/get.mjs <id>`. Do not open `catalog/sources/*.json` unless the tools are insufficient.
- Load `experience/` docs on demand; never paste the whole manifest into the conversation.
- Write each step's output to a file (`EXPERIENCE-BRIEF.md`, `PRODUCT.md`, `UX-SPEC.md`, `DESIGN.md`, inventory table…) so later steps don't re-read everything.

## Done when

- `EXPERIENCE-BRIEF.md` exists with archetype, philosophy, journey, IA and a chosen direction (phase 1).
- `UX-SPEC.md` exists with screens, flows and empty/loading/error states (phase 1).
- `ux-map.excalidraw` matches `UX-SPEC.md` (names) and `EXPERIENCE-BRIEF.md` (template/areas/legend) (phase 1).
- Every UI need maps to a catalog entry, an adaptation, or a justified custom build (phase 2).
- Licenses are compatible with the project (commercial/non-commercial).
- Phase 3 closes green (`frontend-polish` + `09-VERIFY`).

Start with the intake, then open the guide of the chosen entry phase.
