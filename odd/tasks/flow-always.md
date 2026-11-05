# flow-always

Objective: every agent working in a repository that has the kit reads one short global index and always follows the design flow for frontend and design work; `init` and `update` keep the agent instruction documents pointing at it.
Branch: `feat/flow-always` (from `feat/pieces`) · Delivery: the user asked to push everything to `main` when finished (L1); fast-forward, never force · Runner: `node --test` (`npm test`), full check `npm run verify` (it rewrites the date in `catalog/explorer.html`; restore that file when nothing else changed).

## Specs

- **S1 — Global index, always read.** "quiero crear una especie de índice global para que la gente siempre use esta herramienta, que esté obligado a usar siempre esta herramienta." "quiero que optimices y mejores el flujo para que lo pueda leer siempre el agente activo en el repositorio donde se encuentra esta herramienta."
  Acceptance: new short `ai-frontend-guide-kit/INDEX.md`, the single entry point an agent reads first: when it applies, the mandatory first command, the routes, the step order, the tool for each job (including `pieces find`) and where each guide is. A test keeps it under 80 lines and fails when it omits a route from `flow list` or a tool from `tools/`. `flow status` names it.
- **S2 — Always this flow, never skipped.** "Quiero que lo uses siempre, que siga siempre este flujo cuando hable de frontend, cuando sea crear diseño, que use este flujo." "para que use y esté más obligado a usar esta herramienta siempre y que nunca se lo salta."
  Acceptance: the routing block states in imperative wording that any frontend, UI, UX, design or component request starts by reading the index and running `flow status`, before any file is read or edited, and that the flow is not skipped, including for small changes (route `iterate`). The block is short and names no optional path around the flow.
- **S3 — `init` and `update` change the guiding documents.** "Cuando, por ejemplo, haga un init o un update, quiero que cambie partes de documentos que guían a la gente, en este caso de Cloud o Agents o cualquier agente"
  Acceptance: `install.mjs` accepts `init` and `update` as commands (running with neither keeps today's behavior). Both refresh the marked block, never touching content outside the markers, keeping each file's line endings, and idempotently (a second run reports `unchanged`). Targets: always `AGENTS.md` and `CLAUDE.md` (created when missing, because Claude Code does not read `AGENTS.md`); `.claude/CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursorrules`, `.windsurfrules` only when already present. `.cursor/rules/ai-frontend-guide-kit.mdc` is written only when `.cursor/` exists, with `alwaysApply: true`. The block sits at the top of a file that does not have it yet (below a leading title or frontmatter); an existing block is refreshed in place.
- **S4 — Close two gaps found before delivery (assumption: part of "nunca se lo salta").** Parent's correction of its own report on `feat/pieces`.
  Acceptance: (a) `pieces.mjs` keeps `index.db` and its `-wal`/`-shm` files out of git by writing `ai-frontend-output/pieces/.gitignore`; the project's own `.gitignore` is not touched. (b) `flow done compose|iterate` also refuses while a registered piece's real file changed since its last recorded version, naming the piece and the `pieces version` command.

## Tasks

| ID | Specs | Route | Status | Evidence |
|----|-------|-------|--------|----------|
| T1 | S1, S2, S3, S4 — index, routing block, `init`/`update` targets, gaps, tests, docs | delegated (resolutor, context backstop) | pending | |
| T2 | Independent check of the installer change (Risk item 5) | delegated (analista) | pending | |
| T3 | L1 delivery: fast-forward `main` and push | inline | pending | |

## Log

- **L1 (2026-11-05, original request):** "Pues quiero mejorar el flujo, es decir, quiero crear una especie de índice global para que la gente siempre use esta herramienta, que esté obligado a usar siempre esta herramienta. Quiero que lo uses siempre, que siga siempre este flujo cuando hable de frontend, cuando sea crear diseño, que use este flujo. Entonces quiero que optimices y mejores el flujo para que lo pueda leer siempre el agente activo en el repositorio donde se encuentra esta herramienta. Entonces tiene que hacer modificaciones. Cuando, por ejemplo, haga un init o un update, quiero que cambie partes de documentos que guían a la gente, en este caso de Cloud o Agents o cualquier agente, para que use y esté más obligado a usar esta herramienta siempre y que nunca se lo salta. Entonces quiero esos cambios para guiar. Cuando termines, quiero que lo subas todo a main."
- **L2 (scope):** "la gente" is read as "el agente" (dictation). "Todo" is read as `feat/pieces` plus this branch. `docs/explainer-update` stays out because it was listed as a separate decision. The parent's question about items 3 (old `build` decisions) and 4 (PascalCase piece names) was not answered, so both stay as they are and are reported as open.
- **L3 (limit):** instruction documents guide an agent but cannot force it. Only the flow and memory refusals are enforced by code. Report this at close.
