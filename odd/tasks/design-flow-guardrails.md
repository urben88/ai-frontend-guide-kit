# design-flow-guardrails

Objective: in projects with the kit installed, every design conversation follows the step-by-step flow, chosen components and libraries are stored per project, and the agent can explain which flows and skills exist.
Branch: `feat/design-flow-guardrails` (to create from `main`) · Delivery: ask-on-risk · Runner: `node --test` (`npm test`), full check `npm run verify`.

## Specs

- **S1 — Flow always respected.** "Quiero que el flujo que siga sea siempre respetado. Siempre que hable de diseño con otra gente en un proyecto donde haya instalado esta herramienta, que siga el proceso paso a paso, que nunca se lo salte."
  Acceptance: a per-project flow state (`ai-frontend-output/flow-state.json`, committed with the project so other people share it) records the route and current step; a `flow.mjs` tool reports status/next step and refuses to mark a step done when its required artifact is missing or the previous step is not done. The routing block and `AGENTS.md` require running the status check first in every design conversation.
- **S2 — Store chosen components per project.** "quiero mejorar la hora de elegir los componentes y poder almacenarlos para ese proyecto. Es decir, los que haya elegido, pues los almacenes. Tengo historial de lo que estoy usando para que lo reutilice y sepa qué herramientas tiene que investigar."
  Acceptance: `memory.mjs` keeps chosen components (existing `selections.jsonl`) and also the libraries/tools in use and a "to research" list; `summary` shows both.
- **S3 — Analyze what the project already uses.** "si ha usado ciertos componentes, que el propio agente pueda analizar esos que tiene para usar más componentes que a lo mejor no puede extraer desde esta herramienta."
  Acceptance: `context.mjs` detects UI libraries from `package.json` and `components.json`, maps them to catalog sources, and lists libraries not covered by the catalog as "to research"; the guides tell the agent to use the libraries' own docs for those.
- **S4 — Real project awareness.** "Quiero que sea totalmente funcional y útil, que de verdad se enmarque en un proyecto si estoy usando esto o no."
  Acceptance: the status check states whether the kit is installed/active in the project and what has been recorded.
- **S5 — Flows always known and recommended.** "Además de que siempre tenga esos flujos de trabajo y que siempre lo recomiende. Siempre que pregunto, oye, ¿qué flujos existen? Pues saber que existen estos pasos y que me va a usar herramientas de diseño, skills correctas para cada paso que quiero y busco."
  Acceptance: one source (`guides/FLOWS.md`, also printed by `flow.mjs list`) lists every route and step with its skill/tool and output; linked from `AGENTS.md`, `00-START-HERE.md`, the skill and the routing block.

- **S6 — Compact component panorama.** "un manifiesto que tenga todos los componentes pero que no consuma mucho memoria, mucho contexto, que esté optimizado y que entonces el agente sepa todos los componentes globales y sus características y que pueda escoger el propio agente."
  Acceptance: a generated digest gives the agent an overview of the best components per category in a small, fixed token budget; `find`/`get` remain the detail layer.
- **S7 — Search component pages cheaply.** "que también tenga herramientas o skills a la hora de buscar componentes en estas páginas. Es decir, que le sea más sencillo y ocupe menos. Bueno, tengo el enlace de esta página, voy a ver qué componentes gratuitos puedo sacar de aquí y cómo se instala."
  Acceptance: given a URL, the agent reports whether it is in the catalog, which free components it offers and how to install them, with minimal context use, and records it for the project.

Assumption: enforcement is a checked state plus instructions; an agent cannot be technically blocked from editing files, so the guarantee is "the agent must check and the tool refuses invalid transitions".

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T1 | S1, S4 | inline | pending | — |
| T2 | S5 | inline | pending | — |
| T3 | S3 | inline | pending | — |
| T4 | S2 | inline | pending | — |
| T5 | S1–S5 docs (routing block, AGENTS.md, skill, READMEs, RESUMEN.md) | inline | pending | — |

| T6 | S6 | inline | pending | — |
| T7 | S7 | inline | pending | — |

T6: generated `catalog/digest.md` (top 5 per category, one line each, ~5k tokens) built by `build-kit`. T7: `scout` skill + tool: given a component-site URL, check if it is already a catalog source; otherwise list its free components and install method, and store it per project as "to research". T1: `kit/tools/flow.mjs` (`status`, `next`, `done <step>`, `list`, `start <route>`) + state file + tests. T2: `guides/FLOWS.md` + `flow.mjs list`. T3: library detection + catalog mapping in `context.mjs` + tests. T4: `memory.mjs` libraries / to-research + summary + tests. Risk: T5 touches the installer block (item 3/5) → own commit.

## Log

- **L1 (2026-10-30, user request verbatim):** "Quiero que el flujo que siga sea siempre respetado. Siempre que hable de diseño con otra gente en un proyecto donde haya instalado esta herramienta, que siga el proceso paso a paso, que nunca se lo salte. Porque si lo he instalado es para que cuando tome diseño use esta herramienta. Además, quiero mejorar la hora de elegir los componentes y poder almacenarlos para ese proyecto. Es decir, los que haya elegido, pues los almacenes. Tengo historial de lo que estoy usando para que lo reutilice y sepa qué herramientas tiene que investigar. Y si ha usado ciertos componentes, que el propio agente pueda analizar esos que tiene para usar más componentes que a lo mejor no puede extraer desde esta herramienta. Quiero que sea totalmente funcional y útil, que de verdad se enmarque en un proyecto si estoy usando esto o no. Además de que siempre tenga esos flujos de trabajo y que siempre lo recomiende. Siempre que pregunto, oye, ¿qué flujos existen? Pues saber que existen estos pasos y que me va a usar herramientas de diseño, skills correctas para cada paso que quiero y busco."
- **L2 (exploration):** gates are text only (`kit/AGENTS.md:105`, guides 01/02); no state file. `memory.mjs` stores `selections.jsonl`, `combinations.json`, `SUMMARY.md` but no libraries/to-research. `context.mjs:61-85` reads only `package.json` (~10 deps), no `components.json`, no catalog mapping, no tests. Flow→skill mapping is split between `00-START-HERE.md` and `skills/userflow/SKILL.md:33-42`.
- **L3:** Engram mirror `odd/design-flow-guardrails/tasks` PENDING — `mem_current_project` returned no project (Google Drive `.git` does not allow the identity binding file). Resync when available.
- **Prior uncommitted work on `main`** (from the same session, not part of this feature): `RESUMEN.md` + `tests/summary.test.mjs`, and the design-routing block in `install.mjs` (CRLF-safe, CLAUDE.md upsert) with docs/tests. Commit it before branching.
- **L4 (2026-10-30, user verbatim):** "¿Existe algún sistema para poder de alguna manera entender bien cuál es el componente que debe elegir? [...] lo que se le llama un manifiesto que tenga todos los componentes pero que no consuma mucho memoria, mucho contexto, que esté optimizado y que entonces el agente sepa todos los componentes globales y sus características y que pueda escoger el propio agente." Finding: `catalog/component-manifest.json` (15 KB) indexes sources/categories, not components; entries (6.1 MB) are reached via `find`/`get` (<1 KB each). → S6/T6.
- **L5 (2026-10-30, user verbatim):** "Además, Kirby también tenga herramientas o skills a la hora de buscar componentes en estas páginas. Es decir, que le sea más sencillo y ocupe menos. Bueno, tengo el enlace de esta página, voy a ver qué componentes gratuitos puedo sacar de aquí y cómo se instala." ("Kirby" read as a dictation error for "the AI/agent".) → S7/T7. Link not yet provided.
- **Next:** commit prior work, create branch, start T1 (RED tests first).
