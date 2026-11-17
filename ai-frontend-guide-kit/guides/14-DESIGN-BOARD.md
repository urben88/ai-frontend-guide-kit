# 14 — Design board (Storybook: see, compare and redesign without touching the logic)

A design board shows the project's own screens in isolation, with several layout versions side by side, so the user and the AI can compare, comment and improve the design without changing logic, routes, stores or API calls. It is built with [Storybook](https://storybook.js.org) stories inside the repo. The tool is `ai-frontend-guide-kit/tools/board.mjs`; the skill is `storybook-board`.

Optional for the user, but the kit always offers it: the route `new` has a `board` step that closes only with Storybook installed and a clean board, or with the user's recorded no. It never installs Storybook on its own.

## Two boards

- **Components board** (`Board/Components`): each presentational component alone, with its states.
- **Pages board** (`Board/Pages/<Page>`): a whole page composed from those components with mock data. Each layout version is its own story: `v1-sidebar`, `v2-topbar`, `v3-compact`.

Storybook shows stories, not relations and not comments. Relations (which page uses which component) come from `ui-map.mjs` (`impact`, `board.mjs plan`); comments on the running board come from Agentation (`11-VISUAL-FEEDBACK.md`).

## Ask first, then install

1. `node ai-frontend-guide-kit/tools/board.mjs detect` says if Storybook is present, the framework, the story glob and the exact install command.
2. If it is missing, **ask the user** whether to install it and stop until they answer. Never install on your own.
3. A "no" is a valid answer: close the flow step with `node ai-frontend-guide-kit/tools/flow.mjs done board --declined --reason "<the answer of the user>"`. The no and its reason stay in `flow-state.json`, and the flow goes on without the board.
4. A "yes": run the command `detect` printed (`npx storybook@<pinned version> init`; it detects React, Next.js, Vue, Svelte, Angular and others by itself and asks its own questions). The version is pinned in `board.mjs`; change it only after `npm view storybook version`.

## Write the boards from the project's real components

- Container-presentational: the container keeps the logic (store, router, API); the board renders only the presentational part with mock props. If a component mixes both, split it first (`12-ARCHITECTURE.md`) or leave it out of the board.
- `board.mjs plan` lists the page boards and the component boards (shared components first) from `ui-map.json` (build it first with `ui-map.mjs build`). Use those components; do not redraw them.
- `board.mjs scaffold <page> --version <name>` writes `src/board/<Page>.board.stories.tsx` (`.jsx` without TypeScript) with the rules, a mock-data section and one export per version. A new version goes into the same file; an existing version is never overwritten.
- `board.mjs scaffold <Component> --kind component --version <state>` writes `src/board/components/<Component>.board.stories.tsx` (title `Board/Components/<Component>`): one story per variant or state (`default`, `disabled`, `loading`) from mock props. Add each state with another `--version`; an existing one is never overwritten. Only presentational components go on this board.
- One story per layout version of a page. Names are kebab-case and say what changes (`v1-sidebar`, not `v1`).
- Mock data is made up and typed like the real props. No fetching, no stores, no router.

## Compare and edit versions

- `board.mjs list` shows each board, pages and components, and its versions.
- To try another layout, add a new version; do not edit the old one unless the user asks. Changing a version means changing layout and style only, never the logic, routes, stores or API calls.
- The user compares versions in Storybook and comments with Agentation; apply the chosen one to the real page as a separate, explicit step.

## Before closing

`node ai-frontend-guide-kit/tools/board.mjs check` must print 0 findings. It flags a board that imports a store (redux, zustand, pinia, mobx), a router (react-router, next/navigation, vue-router), an API or fetch client (axios, `fetch(`, files under `api/` or `services/`, also through an alias such as `@/api/client`, `~/stores/auth` or a `paths` alias of tsconfig/jsconfig) or a data-fetching hook (`@tanstack/react-query`, swr). Fix each by passing mock props instead. `list` and `plan` show what is left.
