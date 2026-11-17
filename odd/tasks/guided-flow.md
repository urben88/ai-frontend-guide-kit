# guided-flow

Objective: the flow guides the human step by step: it stops at every decision that is the user's, offers the kit tools that fit each moment so the user picks, reports what was done after each step, and checks that the components chosen for reuse really land in the code.
Branch: `feat/storybook-board` (continues on it after its verification; the `board` step is part of the same flow). Delivery: ask-on-risk. Test runner: `node --test` (`npm run verify`).

## Specs

- **S1 — Guide me through a flow.** "no me guía por un flujo dicho que lo ha hecho pero no sé exactamente lo que ha hecho quiero que me guíe en un flujo". Evidence (L1): in `examples/solar-landing` the agent (Haiku) closed intake → compose in 12 minutes without asking the user, and wrote in `selections.jsonl` "El usuario no dio referencias; se decide con la re...", although `flow-steps.mjs:116` and `:256` tell it to ask and "Do not choose for them".
- **S2 — Mandatory decision points.** Approved proposal 1 (L2): in the steps that need the user's choice (direction, style, components), `flow next` ends with "STOP: show this to the user and wait"; `flow done` closes that part only with the user's literal answer, which is kept on record.
- **S3 — Choose tools at each moment.** "para poder usar y elegir x herramientas en cada momento de las que tiene de las que posee esta herramienta". Approved proposal 2 (L2): each step shows the kit tools that fit that moment and what each one gives, so the user chooses which to use.
- **S4 — Know what was done.** "no sé exactamente lo que ha hecho". Approved proposal 3 (L2): when a step closes, a summary for the user: what was done, with which tools, which files came out.
- **S5 — Real reuse.** "Parece que no ha reutilizado componentes ya hechos de dos páginas." Evidence (L1): 15 catalog components recorded as `adapt`, but the pages import only 2 catalog blocks directly (`faq-01`, `feature-02`); hero and pricing were recorded as `adapt` and the landing uses a hand-made `PanelHero`. Approved proposal 4 (L2): if a catalog component decided as reuse/adapt does not appear in the code, the step does not close.
- **S6 — Not basic.** "Yo creo un diseño bastante básico y simple, cosa que no quiero." Covered by S2 (the user chooses the direction and references) and S3 (techniques offered); `polish` was left pending in the test run.

## Tasks

Draft; each keeps existing commands working; projects with an old `flow-state.json` must not crash.

- [ ] T1 (S2) Decision points: mark the user-decision parts in the step table; `flow next` prints the STOP block; `flow done <step>` for those parts needs `--answer "<user's words>"` (kept in the state and in the step report). Risk: item 3. Route: delegated (context backstop).
- [ ] T2 (S3) Tool menu per step: each step lists the kit tools that fit it (command, what it gives, cost) and asks the user which to use; the choice is recorded with T1's mechanism. Route: delegated.
- [ ] T3 (S4) Step summary for the user: `flow done` prints "what was done / tools used / files written / next"; `flow report` gathers them for the whole route. Route: delegated.
- [ ] T4 (S5) Reuse check: the `compose` gate compares `selections.jsonl` reuse/adapt ids with the project's imports (`ui-map`), lists the missing ones and refuses to close until each is used or re-decided with a reason. Risk: item 3. Route: delegated.
- [ ] T5 Docs, skill steps, MCP (`flow_done` gains `answer`), counts, FLOWS.md. Route: delegated.

## Log

- L1 (2026-11-17, user): "además cuando he hecho la prueba con landing y placas solares hay un problema y es que no me guía por un flujo dicho que lo ha hecho pero no sé exactamente lo que ha hecho quiero que me guíe en un flujo para poder usar y elegir x herramientas en cada momento de las que tiene de las que posee esta herramienta eso de momento no lo ha podido hacer no me lo ha hecho Yo creo un diseño bastante básico y simple, cosa que no quiero. Parece que no ha reutilizado componentes ya hechos de dos páginas." Evidence gathered in `examples/solar-landing/ai-frontend-output/` (flow-state.json, selections.jsonl: 15 adapt, 10 build) and `src/pages` imports.
- L2 (2026-11-17, user): "si" to the four-point proposal (decision points, tool menu per step, summary per step, reuse check).
- Next: launch T1 after the storybook-board verification ends (it probes the same flow.mjs).
