# 00 — Start Here

You are about to build frontend UX/UI. This workflow exists so you **reuse before you create**, and so every design decision is deliberate instead of generic.

## The reuse-first principle

1. Search the catalog for existing components **before** writing anything.
2. If something fits: reuse it (install as-is) or adapt it (tokens, props).
3. Build custom only when nothing fits or its license blocks you — then follow the philosophy guide.

## Flow map

| # | Guide | You produce |
|---|---|---|
| 1 | `01-UX-FLOWS.md` | context + `PRODUCT.md` + `UX-SPEC.md` (proven flows, screens, states) + `flow-report.html` |
| 2 | `02-TOKENS.md` | `DESIGN.md` + Tailwind v4 theme (Figma MCP or fallback) |
| 3 | `03-INVENTORY.md` | Component inventory per screen (from the UX-SPEC; categories, not code) |
| 4 | `04-FIND.md` | Shortlist of catalog candidates per need |
| 5 | `05-REUSE.md` | Decision per need: reuse / adapt / build + install + memory record |
| 6 | `06-ADAPT.md` | Adapted components using your tokens |
| 7 | `07-PHILOSOPHY.md` | Hierarchy, springs and anti-generic rules applied |
| 8 | `08-VERIFY.md` | Playwright checks green + audit loop closed |

Guide 01 has **four paths** depending on the repository: no UX → design from scratch; existing UX → **ask the user** to summarize (as-is) or radically redesign (UX only); or a spot audit of one surface. See the guide for the mode rules — never redesign silently. If the repo runs **BMAD or a spec-driven flow**, read `guides/ADAPTERS.md` first (the PRD becomes the anchor; specs are the behavioral source of truth).

## Token discipline (mandatory)

- Read `AGENTS.md` once. Then read **only the guide for the current step**.
- Start UX with `node tools/context.mjs` and read the compact `REPO-CONTEXT.md` instead of exploring the repo.
- Query with `node tools/find.mjs …` and `node tools/get.mjs <id>`. Do not open `catalog/sources/*.json` unless the tools are insufficient.
- Never paste whole catalog files into the conversation; quote only the entries you shortlist.
- When you finish a step, write its output to a file (`PRODUCT.md`, `UX-SPEC.md`, `DESIGN.md`, inventory table…) so later steps don't re-read everything.

## Small projects

For a one-page site you may compress steps 2 (tokens) and 6–7 (adapt while applying philosophy). **Never skip steps 1 and 3–5**: proven flow patterns and knowing what exists is the point of this kit.

## Done when

- `UX-SPEC.md` exists with screens, flows and empty/loading/error states.
- Every UI need maps to a catalog entry, an adaptation, or a justified custom build.
- Licenses are compatible with the project (commercial/non-commercial).
- `08-VERIFY.md` checks pass.

Next: open `01-UX-FLOWS.md`.
