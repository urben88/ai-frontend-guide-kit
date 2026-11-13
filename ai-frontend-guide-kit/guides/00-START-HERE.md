# 00 — Start Here (router, reference)

Reference. You do not need to read this to work: `INDEX.md` and `flow.mjs next` are enough. This guide explains the router: why the flow exists, the phases and where each external design skill runs.

The flow exists so you **reuse before you create**, and so every design decision is deliberate instead of generic.

## Intake (always first)

1. **Where are we?** `node ai-frontend-guide-kit/tools/flow.mjs status`. If a route is active, continue at its step: `node ai-frontend-guide-kit/tools/flow.mjs next` prints the whole instruction of the current micro-step and the command that closes it.
2. **What are we doing?** Ask the user: new frontend, direction only, small change, custom addition, polish only, UX only or redesign. Every route and step: `guides/FLOWS.md`. Backend or logic only is not this kit.
3. **Declare the route** with `node ai-frontend-guide-kit/tools/flow.mjs start <route>`, then close each step with `flow.mjs done <step>`. It refuses a skipped step or a missing artifact: produce the artifact instead of working around it.

The phases are **entry points, not a fixed pipeline**: enter where the request points and never run a phase the user did not ask for. A small new project may compress phases 1 to 3, but never builds before checking memory and the catalog.

## The three phases

| Phase | Guides | You produce |
|---|---|---|
| **1 · UX and theory** | `01-EXPERIENCE-DIRECTION` (+ `ADAPTERS` for BMAD or spec-driven repos), `02-UX-FLOWS`, `03-TOKENS` | `EXPERIENCE-BRIEF.md`, context, `PRODUCT.md`, `UX-SPEC.md`, `flow-report.html`, `ux-map.excalidraw`, `design-tokens.json`, `DESIGN.md` |
| **2 · Composition** | `04-INVENTORY`, `05-FIND`, `06-REUSE`, `07-ADAPT` (+ `08-PHILOSOPHY`) | inventory, shortlist, reuse, adapt or build decisions, install, adapted components |
| **3 · Total polish** | `frontend-polish` skill, `08-PHILOSOPHY`, `09-VERIFY` | design audit without high findings, external audits, Playwright MCP loop, E2E and visual regression green |

Other entries: `10-ITERATE` (small change or custom component, no UX phase), `11-VISUAL-FEEDBACK` (point in the browser, React), `12-ARCHITECTURE` (folder map by default; FSD only when asked, through `frontend-refactor`). A visual redesign of an existing screen is agreed with the user, then `design-taste-frontend` redesign mode, then phase 3.

## External design skills by step

The kit flow comes first. Some of these skills describe themselves as covering almost any UI request; that does not make them the entry point. Load each only at its step. `flow.mjs next` names only the ones this project has installed; without them the distilled rules of `08-PHILOSOPHY.md` apply.

| Step | Skill | Use it for | Limits |
|---|---|---|---|
| Phase 1, guide `01` steps 1–3, landing or marketing pages only | `landing-page-design` | Intake topics (offer, audience, objections, proof), page outline, layout type, conversion copy | Merge its questions into the kit's rounds. The brief and `DESIGN.md` override its visual rules and its Tailwind, Framer Motion and icon defaults. |
| Phase 1, guide `01` step 5 | `hallmark` or `design-taste-frontend` | Raw material for the three directions | They only propose themes here and build nothing; the three directions must still differ in structure. |
| Phase 2, guide `06`, new page or section with decision `build` | `hallmark` | Building what the catalog could not provide | Only after `05-FIND` for that block. Keep the blocks already reused. A root `DESIGN.md` locks its design system. |
| Phase 2, guide `06`, app screen with decision `build`, or an agreed visual redesign | `design-taste-frontend` | Building or redesigning inside the project's stack | Same limits. Keep brand values. Needs Node 22+ and Chrome, Edge or Chromium. |
| Phases 2–3 | `emilkowalski` | Interactions and animation review | Keep the effect budget of `08-PHILOSOPHY.md`. |
| Phase 3, through `frontend-polish` | `impeccable` | Critique, audit, polish and the `detect` check | `bolder` and `quieter` change the direction: run them only when the user asks. |
| Phase 3, through `frontend-polish` | `hallmark` | Second-opinion audit of pages and sites | Report only: do not let it rebuild the screen. |
| Phase 3, through `frontend-polish`, on a screen it built | `design-taste-frontend` | Its lint and browser inspection | No new build or redesign here. |

Rules for all of them:

- Record what they build: `memory.mjs add ... --decision build --notes "skill:<name>"`.
- If a skill contradicts `PRODUCT.md`, `DESIGN.md`, the brief or the license rules, the kit's files win.
- If a skill wants to create `PRODUCT.md` or `DESIGN.md` (for example `/impeccable init`), point it to the kit's existing files; never overwrite them.
- Pictures they bring in keep their own licenses: keep the credits they ask for.

## Token discipline

- Read only the guide of the current step. Load `experience/` documents on demand; never paste the whole manifest.
- Read `REPO-CONTEXT.md` and `UI-MAP.md` instead of exploring the repo; `ui-map.mjs have` before creating, `ui-map.mjs impact` before changing, `ui-map.mjs check` as the gate. Query with `find.mjs` and `get.mjs`; open `catalog/sources/*.json` only when the tools are insufficient.
- Write each step's output to a file so later steps do not re-read everything.

## Done when

- Phase 1: `EXPERIENCE-BRIEF.md` has the chosen direction; `UX-SPEC.md` lists screens, flows and empty, loading and error states; `ux-map.excalidraw` matches both.
- Phase 2: every UI need maps to a catalog entry, an adaptation or a justified custom build, and licenses fit the project.
- Phase 3 closes green (`frontend-polish` + `09-VERIFY`).
