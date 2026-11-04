# 13 — Context documents

An agent that has to change a feature reads context documents, not the repository. This guide fixes **which documents exist, what goes in each one and which profile needs which**. Write them once and update them with every change that contradicts them.

```bash
node ai-frontend-guide-kit/tools/ui-map.mjs docs                      # the standard profile
node ai-frontend-guide-kit/tools/ui-map.mjs docs --profile sprint     # the smallest set
node ai-frontend-guide-kit/tools/ui-map.mjs docs --profile long-term  # the full set
```

`docs` prints each document of the profile, why it exists and whether it is **missing** in this project. It reads the filesystem only: it never writes a document and never edits one.

## Profiles (rigor, not rules)

The profile sets how much context a project owes its future readers. It is **not** a structural choice: no folder moves because of it.

| Profile | For | Documents |
|---|---|---|
| `sprint` | a fast or short-lived project: prototype, internal tool, experiment | `README.md`, `DESIGN.md` |
| `standard` (default) | the normal case: a project that will be changed by someone else | the two above + `PRODUCT.md`, `UX-SPEC.md`, `ARCHITECTURE.md`, the generated `ai-frontend-output/UI-MAP.md` |
| `long-term` | large, long-lived or critical: several people, several years | the standard set + `docs/DECISIONS.md`, `docs/CONTRIBUTING.md`, `docs/ACCESSIBILITY.md`, `docs/PERFORMANCE.md` |

Start at `standard`. Downgrade to `sprint` when a document would be fiction, and never upgrade quietly: a client or a long-lived product earns `long-term` by the damage a lost decision would cause.

## The documents

### `README.md` — orientation

Who reads it: a new agent or teammate on day one. Structure:

1. one paragraph: what the product is and who uses it;
2. how to run it (install, dev, build, test) — copy-pasteable, no prose;
3. the folder map in five lines;
4. where the other documents are (`DESIGN.md`, `UX-SPEC.md`, `ARCHITECTURE.md`, `ai-frontend-output/`);
5. known limits and the current state of the work.

Mistake to avoid: the README becomes a changelog. History belongs in commits and `docs/DECISIONS.md`.

### `DESIGN.md` — how the UI is built

Who reads it: any agent about to write UI. Structure: tokens (color, type scale, spacing, radius, shadows, motion), the component rules (when a new component is allowed), the anti-generic list, and the accessibility bar. Guide `03-TOKENS.md` produces the visual brief that fills it.

### `PRODUCT.md` — what the product answers to

Who reads it: anyone deciding scope. Structure: problem, users (with the jobs they hire the product for), scope and non-goals, success measures, and the constraints that cannot move. Guide `02-UX-FLOWS.md` writes it.

### `UX-SPEC.md` — screens, flows, states

Who reads it: anyone building or changing UI. Structure: one section per screen with its purpose, entry points, states (empty / loading / error / partial), primary action, and the flow it belongs to. Every state gets its own entry: a screen without states is an unfinished spec.

### `ARCHITECTURE.md` — where code goes

Who reads it: anyone adding a file. Structure: folder map with the role of each folder, module boundaries (what may import what), data flow, and the rule for choosing where a new piece lives. Guide `12-ARCHITECTURE.md` covers the modes and the folder map; this file records the decision for this project. Keep it short: a wrong map is worse than none.

### `ai-frontend-output/UI-MAP.md` — generated, never hand-written

Who reads it: everyone, before exploring the repository. Produced by `ui-map build` (the installer runs it). It lists components, who uses them, routes, visual roles, strays and unresolved imports. Regenerate it instead of editing it; `ui-map impact` and `ui-map have` are the query tools.

### `docs/DECISIONS.md` — the decision log

Who reads it: whoever asks "why is this like this?". One entry per durable decision, newest first:

```markdown
## 2026-11-04 — Reuse the shadcn table with an adapter
- Context: the dashboard needs sorting, filters and bulk actions.
- Options: reuse shadcn table · adapt Magic UI table · build from scratch.
- Decision: reuse, plus a thin adapter for our column definitions.
- Consequences: one table owner; a second table needs a decision entry.
```

A decision that changes later gets a **new** entry, never an edited old one.

### `docs/CONTRIBUTING.md` — the path for a new piece

Who reads it: a contributor adding a component, screen or dependency. Structure: the order of operations (map → `have` → catalog → adapt or build → polish), where each kind of file goes, naming, test requirement, and the review bar. It restates the golden rule for this project.

### `docs/ACCESSIBILITY.md` — the bar

Who reads it: anyone closing a screen. Structure: the target (for example WCAG 2.2 AA), the checks that run (`audit-a11y`), the known exceptions with their reason and owner, and the keyboard and screen-reader expectations.

### `docs/PERFORMANCE.md` — the budget

Who reads it: anyone adding weight. Structure: budgets (LCP, CLS, TBT, JS size), how they are measured (`audit-perf`), the current numbers with their date, and what is allowed to exceed them and why.

## How they connect

```text
PRODUCT.md ─→ UX-SPEC.md ─→ DESIGN.md ─→ ARCHITECTURE.md ─→ code
     │             │             │              │
     └─────────────┴─── DECISIONS.md (why) ─────┘
                    UI-MAP.md (what exists, generated)
```

- `PRODUCT.md` says why; `UX-SPEC.md` says what screens; `DESIGN.md` says how they look; `ARCHITECTURE.md` says where they live.
- `UI-MAP.md` is evidence: if it contradicts `ARCHITECTURE.md`, one of them is stale — fix the document, not the map output.
- `DECISIONS.md` is the only place where a past choice is explained; keep it append-only.

## Rules

- Only the `UI-MAP.md` is generated. Every other document is written by a person or an agent and reviewed like code.
- A document that nobody would read is worse than a missing one: use the profile to skip it deliberately, and say so.
- When a change contradicts a document, update the document in the same change. A stale context document is a bug that the next agent will follow.
- Stack-specific combinations of tools, documents and structure live in `experience/STACK-RECIPES.md`, each with its source, date and evidence level — never presented as best.
