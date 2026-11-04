# 12 — Architecture (map first, FSD only on request)

An agent that changes a feature needs to know where a file goes and what it must not touch. This guide fixes the modes, the philosophy behind them, the framework adapters and the one artifact they write: `ai-frontend-output/architecture.json`.

Nothing here runs on its own. The installer picks no mode: `map` is the default and the only mode that happens without a request.

`node ai-frontend-guide-kit/tools/ui-map.mjs docs --profile standard|long-term` lists `ARCHITECTURE.md` as a required document. This guide decides the folder map; `ARCHITECTURE.md` records that decision for the project (`13-CONTEXT-DOCS.md`).

## The philosophy always applies, the folder structure does not

From `08-PHILOSOPHY.md` (Separation), for **new code**:

- One responsibility per file: a component, a hook or a service does one thing.
- One owner per visual role (loading, empty, error, layout…): reuse the owner, never write a second one.
- UI apart from logic: data fetching and state live outside presentational components.
- No duplicates: `node ai-frontend-guide-kit/tools/ui-map.mjs have "<name>"` before creating anything.
- Order of preference: reuse > extend or compose > adapt > create.

These five rules are **not optional and do not need FSD**. The FSD folder structure — layers, slices, segments — is **optional**: it is one way to enforce the rules, never a requirement to start. Existing violations are recorded by the map as strays, not rewritten.

## The three modes

| Mode | Applies when | What is written | What is never touched |
|---|---|---|---|
| `map` (default) | always: every install, every project, no request needed | `architecture.json` only | folders, file names, imports, config; no file moves, no new folders |
| `fsd-new` | a **new** project whose user asked for FSD **before** the first folder exists | `architecture.json` with the planned layers, then only the layer folders the project actually uses | anything outside the approved skeleton; no empty layers "for later" |
| `fsd-refactor` | an **existing** project, only after the user explicitly asks for the refactor | `architecture.json`, then one slice per approved step | any file outside the current slice; the framework's own routing folders; behaviour and tests |

- **Ask, do not assume.** `map` needs no consent because it changes nothing. `fsd-new` and `fsd-refactor` need an explicit request in the current conversation: "we will need it eventually" is not one, and a request to *review* the architecture is not a request to *restructure* it.
- **A new project is not an exception.** FSD is never the silent default of a greenfield repository, and it is never applied halfway.
- `experience/STACK-RECIPES.md` writes `fsd` as shorthand for `fsd-new` (new project) or `fsd-refactor` (existing one).
- `fsd-refactor` runs through the `frontend-refactor` skill: one slice at a time, a report between slices, the user's stop word respected.

## Layers (not all of them, ever)

| Layer | Owns | Typical content |
|---|---|---|
| `app` | global wiring: providers, styles, routing, entry | `app/layout.tsx`, `src/main.tsx`, global CSS |
| `pages` | one route or screen, composing the layers below | `orders/page.tsx`, screen-level layout |
| `widgets` | a self-contained block that several pages use | dashboard shell, orders table with its toolbar |
| `features` | a user action with its own state | add-to-cart, order filters, sign-in form |
| `entities` | one business object, its model and its UI | order, product, user: types, API, card |
| `shared` | nothing about this product: the base everything may use | UI kit, icons, api client, hooks, config |

- A project uses the layers it needs. A small app may be `shared` + `pages` only; a marketing site may need none of them.
- **Naming rule:** the kit's own vocabulary — visual roles (loading, empty, error, layout) and component types (`catalog/component-types.json`) — **never renames a layer**. Layers stay `app`, `pages`, `widgets`, `features`, `entities`, `shared`; roles describe a component's job *inside* a layer. There is no `loading/` layer, and `shared` is never relabelled "common" in the map.
- Imports go one way: a layer imports only from the layers below it, and slices never import each other sideways.

## Framework adapters

Adapters change **where the framework's own folders stay**, never the meaning of the layers.

| Framework | What the adapter changes | Source |
|---|---|---|
| Next.js | `_app` and `_pages` live **inside** `src`; Next's own folders (`app/`, `pages/`, `public/`, `next.config.*`) stay at the root and are not FSD layers | https://feature-sliced.design/docs/guides/tech/with-nextjs |
| Nuxt | the `dir.pages` setting is kept in `nuxt.config`; routes are read from `src/app/routes` | https://feature-sliced.design/docs/guides/tech/with-nuxtjs |
| SvelteKit | `routes` stays at the root unless the project configures otherwise; when it moves, it sits at `src/app/routes` | `feature-sliced/documentation` → `with-sveltekit` |
| Astro | read Astro's official guide in the FSD documentation **before** deciding: its integration is documented there and this kit does not guess its folder contract | `feature-sliced/documentation` → `with-astro` |

**No official guide → a kit proposal, never canonical.** For React Router, Vite and Angular the FSD documentation publishes no adapter, so any mapping here is this kit's suggestion: say so out loud, keep the framework's routing where the framework expects it, and let the user decide.

Official references: https://feature-sliced.design/docs/get-started/overview and https://feature-sliced.design/docs/guides/migration/from-custom (the migration order the `frontend-refactor` skill follows). Steiger is the official linter for FSD, **in beta**: `npx steiger <src>` is a second opinion after a refactor, never a gate.

## `ai-frontend-output/architecture.json`

The only artifact these modes write. It maps folders that exist (or, in `fsd-new`, folders that are planned) to FSD roles; it **never renames or moves anything by itself**.

```json
{
  "version": 1,
  "mode": "fsd-refactor",
  "framework": "Next.js 14 (app router)",
  "layers": {
    "app": ["src/app/layout.tsx", "src/app/providers.tsx"],
    "pages": ["src/app/(dashboard)/orders/page.tsx"],
    "widgets": ["src/components/orders-table", "src/components/order-totals"],
    "features": ["src/components/order-filters"],
    "entities": ["src/lib/orders", "src/components/order-card"],
    "shared": ["src/components/ui", "src/lib/api", "src/hooks"]
  },
  "unmapped": ["public/img", "src/legacy/dashboard-v1"],
  "notes": "Mapping only. orders-table is the single owner of the table role; nothing was moved."
}
```

| Key | Type | Meaning |
|---|---|---|
| `version` | number | `1`. Bumped only if the shape changes |
| `mode` | `"map"` \| `"fsd-new"` \| `"fsd-refactor"` | the mode that produced the file |
| `framework` | string | detected stack, in the user's words ("Next.js 14 (app router)", "Nuxt 3") |
| `layers` | object of `layer → [folder]` | only layers the project uses; a folder appears in one layer |
| `unmapped` | array of strings | folders that could not be assigned — **recorded, not invented into a home** |
| `notes` | string | what was decided and what was deliberately left alone |

Rules: `map` writes this file and stops; `fsd-new` and `fsd-refactor` write it first and then act, and every later change keeps it true. A folder assigned to two layers is a mistake to report, not to resolve silently. If `architecture.json` and `ARCHITECTURE.md` disagree, one of them is stale — fix the document the project committed to.

## Done when

- `ai-frontend-output/architecture.json` exists, validates against the shape above, and its `mode` is the mode the user actually agreed to.
- In `map`: nothing in the project changed except that file.
- In `fsd-new`: the agreed layers exist, hold real code, and `architecture.json` matches the folders.
- In `fsd-refactor`: every approved slice is done, `node ai-frontend-guide-kit/tools/ui-map.mjs build` then `check` shows no new stray, duplicate type, ownerless role or unresolved import, and the report between slices was delivered.
- `ARCHITECTURE.md` describes the same map, in prose, in one screen.

## Limits (stated, not hidden)

- Steiger is beta: its rules change and a clean run is not a design review.
- A folder map is a starting point, not a proof: it says where code lives, not whether the boundary holds.
- The framework adapters summarize the official guides; when a guide changes, the guide wins.
- Astro's integration is documented in the FSD repository and was not verified here: read it before choosing, and never present a guess as the official contract.
- The kit proposes, the user approves. No mode restructures a project that did not ask for it.
