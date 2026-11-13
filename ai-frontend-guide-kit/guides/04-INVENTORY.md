# 04 — Component inventory

Purpose: turn each screen into a list of **needed components by category**, before looking at any library. This is the reflection step that makes the catalog useful.

**Source of truth:** `ai-frontend-output/ux/UX-SPEC.md` (from guide 02), coherent with `EXPERIENCE-BRIEF.md`. Inventory rows derive from its screens/blocks — including the empty, loading and error states listed there. Do not invent screens outside the UX-SPEC.

## Start from the recipe

Do not write the table from nothing. Each kind of page has a recipe (`experience/page-recipes.json`): its sections in order, the job of each, the category and the catalog words to search, the layout (`experience/LAYOUT-RULES.md`). Run `node tools/recipe.mjs suggest` (the recipe of each screen of `UX-SPEC.md`), then `node tools/recipe.mjs inventory --write` (writes `INVENTORY.md`). Then review the rows: remove what this product does not need, add what is missing, fill `Serves` with the ids of `PRODUCT.md`. A screen with no recipe is described by hand with the method below. `recipe.mjs show <id>` prints one recipe.

## Method

For every screen in `PRODUCT.md`:

1. Sketch the blocks top to bottom (mentally or on paper).
2. Label each block with a canonical category from `catalog/taxonomy.md` (e.g. `hero`, `features`, `pricing`, `forms`, `feedback`…).
3. Mark interaction needs separately (e.g. "animated counter", "spring tooltip").
4. Do **not** name libraries or components yet — categories only.

## Inventory table (write it to `INVENTORY.md`)

| Screen | Block | Category | Priority | Notes | Candidates | Decision | Serves | Layout | Query |
|---|---|---|---|---|---|---|---|---|---|
| Landing | hero | hero | must | uses brand gradient | | | G1 | split | hero |
| Landing | plans | pricing | must | monthly/annual toggle | | | G1 | grid-3 | pricing plans |
| Landing | faq | faq | should | accordion behavior | | | O1, O2 | narrow-reading | faq |
| Dashboard | kpis | data-display | must | 4 metrics, count-up | | | G1 | grid-4 | kpi |
| Signup | form | forms | must | email + password, validation | | | G1 | narrow-form | signup |

`Candidates` and `Decision` stay empty until the next steps. `Serves` says which item of `PRODUCT.md` the block answers; `Layout` is a name from `LAYOUT-RULES.md`; `Query` is the first search words for `find.mjs`.

## Check what the project already has

In a project with code, run `node tools/ui-map.mjs have "<need>"` for each row before searching the catalog or creating anything: it says whether the component exists (path, usage), lists close matches and gives catalog candidates. Mark the row `reuse existing` when it exists. Then run `node tools/pieces.mjs find "<need>"`: your own pieces come first (a close one gets a new variant or version, not a copy), then pieces of your other projects (`pieces adopt` copies the file into this project), the catalog next, a new piece last. Components stay in the project's own folders; the kit stores no code. Record each piece you place with `pieces use`, and a catalog component that landed with `get.mjs <id> --landed <path>`.

## Reflection questions (answer before step 04)

- Which blocks are **structural** (layout, navigation) vs **expressive** (hero, effects)?
  - Structural → prioritize stability (fewer animations, plain markup).
  - Expressive → candidates for high-impact animated components.
- Where will the user spend most time? Those screens deserve the most polish.
- What must work without JavaScript? (forms, critical navigation)
- Which blocks repeat across screens? Those should be one reused component, not copies.

## Rules

- One row per need; if a block combines several categories, split it.
- Priority: `must` / `should` / `nice`. Only `must` and `should` proceed to search.
- Keep the table under ~30 rows for an MVP; merge micro-details into their parent block.

Next: `05-FIND.md` turns rows into catalog matches.
