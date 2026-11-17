# storybook-board

Objective: when the kit is installed in a project, it proposes (and, in a measured way, requires) Storybook as the project's visual design board, and gives the agent the knowledge, the flow steps and MCP tools to install, use and edit it under the kit's philosophy.
Branch: to create, `feat/storybook-board` (base to decide: `main` or on top of `feat/weak-model-design`). Delivery: ask-on-risk. Test runner: `node --test` (`npm run verify`).

## Specs

- **S1 — Installer proposes and requires Storybook.** "al instalar esta herramienta de AI Frontend Gide Kit proponga y obligue de cierta manera a instalar si no lo tiene esta herramienta de Storybook." Decided (L4): "quiero eso, que sepa como instalarlo y siempre pregunte si instalarlo". The kit knows how to install it and always asks the user before installing; it never installs on its own. The flow has a `board` step the agent cannot close without either Storybook in place with its composition stories, or the user's "no" recorded with its reason.
- **S2 — The kit knows Storybook.** "tiene los conocimientos de cómo manejar esta herramienta" / "tendrá los conocimientos para instalarlo, usarlo, modificarlo, editarlo y todo."
- **S3 — Controlled from the MCP.** "lo puede controlar desde su MCP porque va a tener entradas para ello".
- **S4 — Install instructions inside the repo.** "tendrá las instrucciones para instalarlo dentro del repositorio."
- **S5 — Based on the repo's own components.** "sabiendo la lógica porque ese repositorio va a tener los componentes, igual que explica esta herramienta".
- **S6 — Kit philosophy.** "tiene que estar todo relacionado con la filosofía de esta herramienta" / "Tener un control total, pero relacionado con un proyecto que siga la filosofía de la herramienta de AI Frontend Kit Kit."
- **S7 — Design board (from L1-L2).** Composition stories that combine the project's real components with mock data, to see pages (examples given: Login, Expedientes, Dashboard) in isolation with several layout versions, each one its own story (`v1-sidebar`, `v2-topbar`, `v3-compact`), to compare, comment and improve with AI "sin modificar la lógica, rutas, stores ni llamadas a API"; separate views for components and for laid-out pages; see "componentes por separado, páginas completas, relaciones entre ellos y la evolución del diseño global". Note: Storybook alone does not show relations nor take comments; relations come from `ui-map`, comments from Agentation or a kit flow.

## Tasks

Draft order; each task keeps the existing commands working. Storybook version: check with `npm view storybook version` at implementation time, never from memory.

- [ ] T1 (S2, S6, S7) Knowledge: guide `14-DESIGN-BOARD.md` + skill `storybook-board` (install per framework, composition stories with the project's real components and mock data, one story per layout version, the rule "no logic, routes, stores or API calls", how to edit and compare versions). Route: inline.
- [ ] T2 (S5, S7) Tool `tools/board.mjs`: `detect` (Storybook present?, framework, command to install), `plan` (pages and components from `ui-map`), `scaffold <page> --version <name>` (composition story skeleton), `list` (pages and versions), `check` (stories import no stores, router, API clients; numbered findings). Route: inline.
- [ ] T3 (S1) Flow step `board`: when Storybook is missing, the instruction tells the agent to ask the user and stop; `flow done board` needs either `board check` clean or `--declined --reason "..."` (kept on record). Risk: item 3 (changes `flow` steps of projects already installed). Route: inline.
- [ ] T4 (S3) `kit-mcp`: `board_detect`, `board_plan`, `board_scaffold`, `board_list`, `board_check`. Route: inline.
- [ ] T5 (S1, S4) Installer: detects Storybook and prints the proposal and the exact install command; never installs. Route: inline.
- [ ] T6 Docs and counts: HELP, README (en/es), RESUMEN, skill and tool counts in tests and figures. Route: inline.

## Log

- L1 (2026-11-17, user): asked for a free Figma-like board, based on the repo where the kit is installed, with a board of separate components and another of laid-out pages with layout versions, to redesign with an AI chat without touching the real structure and its logic. Answer: the kit has Excalidraw MCP + `ux-map` (UX map, not rendered components), `ui-map`/`pieces` (data), Agentation (comments on the running app); recommended Storybook + a kit board + Agentation.
- L2 (2026-11-17, user, pasted summary): "Design Board basado en Storybook dentro de tu repositorio ... Cada versión, por ejemplo `v1-sidebar`, `v2-topbar` o `v3-compact`, sería una story independiente que puedes comparar, comentar y mejorar con IA sin modificar la lógica, rutas, stores ni llamadas a API."
- L3 (2026-11-17, user): "No, lo que quiero es que yo al instalar esta herramienta de AI Frontend Gide Kit proponga y obligue de cierta manera a instalar si no lo tiene esta herramienta de Storybook. Por tanto, tiene los conocimientos de cómo manejar esta herramienta, lo puede controlar desde su MCP porque va a tener entradas para ello y tendrá las instrucciones para instalarlo dentro del repositorio. Entonces yo, como agente, digo que use, que quiero tener Storybook y lo instalaría en el repositorio y haría un... sabiendo la lógica porque ese repositorio va a tener los componentes, igual que explica esta herramienta, tiene que estar todo relacionado con la filosofía de esta herramienta, pues tendrá los conocimientos para instalarlo, usarlo, modificarlo, editarlo y todo. Tener un control total, pero relacionado con un proyecto que siga la filosofía de la herramienta de AI Frontend Kit Kit." Decided: a kit feature (generic), not built by hand in one app. Open question to the user: how strong "obligue" is.
- L4 (2026-11-17, user): "quiero eso, que sepa como instalarlo y siempre pregunte si instalarlo". S1 decided (mandatory flow step, always asks, never auto-installs). Tasks T1-T6 drafted. Engram mirror pending: the Engram server disconnected after the first save; resync this document when it is back. Next: create the branch and start T1 in a fresh session.
- Other pending outside this feature: `examples/solar-landing/` (kit installed, kit-mcp registered in its `.mcp.json`, not committed, 62 MB) waits for the user to run `claude --model haiku` there for T1 of `weak-model-design`.
