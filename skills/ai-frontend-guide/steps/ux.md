# Step: ux

Design the screens and flows from the business, before any UI. `flow.mjs next` prints each part; these are the judgment notes.

## Judgment notes

- No UX in the repo: design from scratch with the `userflow` skill. Load 1 to 4 `flow-*` skills for the patterns that fit (auth, onboarding, checkout, paywall, settings, navigation, tables, forms, errors, empty states, AI chat), never from memory.
- UX already exists: ask the user once, "Summarize" (as-is documentation plus an anti-pattern audit, no changes) or "Radical redesign" (baseline, ideal UX, diff). Never redesign silently. A redesign is UX only and `PRODUCT.md` stays.
- One surface only: `/userflow audit <surface>`, findings only.
- Every screen and section cites the business item it serves (a goal, an objection or a proof). A screen that serves none is removed or justified.
- Every screen lists its empty, loading and error states; a screen with only the happy path is not done.
- BMAD or spec-driven repo (`Framework:` in `REPO-CONTEXT.md`): `guides/ADAPTERS.md`. A BMAD PRD is the business anchor (cite `--ref "story:<id>"`); OpenSpec specs are the behavior truth (`--ref "spec:<capability>"`).
- Screen map: skill `ux-map` with the local Excalidraw MCP. The template follows the brief's `navigation_model`; a redesign saves `ux-map-baseline.excalidraw` first and updates the map step by step, never regenerates it blind. When the MCP is not connected the flow tells you the manual fallback.

## Common mistakes

- Writing `UX-SPEC.md` screens that do not match the names in the map, the inventory or the memory `--screen` values: they all come from `UX-SPEC.md`.
- Treating the map as decoration: it must match the brief and the spec.
