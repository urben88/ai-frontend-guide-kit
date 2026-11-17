---
name: storybook-board
description: "Use when the user wants to see, compare or redesign the project's screens without touching its logic, or asks for Storybook, a design board, a components board, layout versions or a Figma-like view of the real components. Triggers: \"storybook\", \"design board\", \"board de diseño\", \"versiones de layout\", \"ver las páginas por separado\", \"comparar diseños\". Storybook stories compose the project's own presentational components with mock data, one story per layout version; always ask the user before installing Storybook."
---

# Storybook board: compose the real components, one story per layout version

The tool is `ai-frontend-guide-kit/tools/board.mjs` (run it as `flow.mjs next` prints it). Guide: `guides/14-DESIGN-BOARD.md`. It never installs anything.

## Method (follow it in order)

1. `board.mjs detect`: is Storybook there, which framework, the story glob and the exact install command (version pinned in the tool).
2. Storybook missing: **ask the user** whether to install it, then stop and wait. Never install on your own. A "no" is recorded with its reason (`flow.mjs done board --declined --reason "<their words>"` when the flow step `board` is active); continue without the board. A "yes": run the command `detect` printed.
3. `ui-map.mjs build`, then `board.mjs plan`: pages and the components each one uses. Use those real components; never redraw them.
4. `board.mjs scaffold <page> --version <name>` (kebab-case: `v1-sidebar`, `v2-topbar`, `v3-compact`). It writes `src/board/<Page>.board.stories.tsx` (title `Board/Pages/<Page>`, export `V1Sidebar`). A new version goes into the same file; it never overwrites one. For the components board: `board.mjs scaffold <Component> --kind component --version <state>` (`default`, `disabled`, `loading`) writes `src/board/components/<Component>.board.stories.tsx` (title `Board/Components/<Component>`), one story per variant or state from mock props; `plan` lists the components, shared ones first.
5. Fill the story: import the presentational components, feed them mock data, change only layout and style. One story per layout version.
6. Compare with `board.mjs list`. The user looks at the versions in Storybook and comments with Agentation (`guides/11-VISUAL-FEEDBACK.md`); applying the chosen one to the real page is a separate step.
7. `board.mjs check` until it prints 0 findings.

## Rules

- Container-presentational: the container keeps the logic; the board renders the presentational part with mock props. A component that mixes both is split first or left out.
- No stores, router, API or fetch clients, or data-fetching hooks in a board. Logic, routes, stores and API calls of the real page never change.
- Relations between pages and components come from `ui-map`, not from Storybook.
- Change the pinned Storybook version only after `npm view storybook version`.

## Never

- Install Storybook without the user's answer, or ask again after a recorded "no" without a new reason.
- Overwrite an existing version, or edit real components to make a board work.
- Use real data, real routes or real calls in a story.
