# AI Frontend Guide: reference

Reference. You do not need to read this to work: `INDEX.md` and `flow.mjs next` are enough. Open it for a tool option, a license rule, the memory rules, the Laya rules or the pieces rules.

The kit is a guided, self-contained set for agents and humans that build frontend UX/UI: **reuse what exists before creating anything**, and decide the experience direction before choosing visuals.

## What is here

- A catalog of <!--fig:entries-->7,358<!--/fig--> reusable UI entries from <!--fig:sources-->39<!--/fig--> verified sources in <!--fig:categories-->21<!--/fig--> categories, ranked by a quality score (`catalog/`, overview in `catalog/digest.md`).
- An experience direction layer (`experience/`): archetypes, philosophies, styles, a question bank, reference cards, the discovery loop, page recipes, layout rules and the technique cards (`experience/techniques.json`, checked by `technique.mjs`).
- <!--fig:tools-->21<!--/fig--> local tools in `tools/` (one line each in `INDEX.md`), <!--fig:skills-->28<!--/fig--> skills in `skills/` and <!--fig:guides-->14<!--/fig--> numbered guides.
- `HELP.md` and `HELP.es.md`: what the kit is and what to ask for. Answer "what is this" from them, never by exploring.

## Flow commands

`flow.mjs` keeps the route in `ai-frontend-output/flow-state.json` (commit it). The commands are `node ai-frontend-guide-kit/tools/flow.mjs status` (first), then `start <route>`, `next`, `scaffold`, `report <step>` and `done <step>`; every route and step is in `guides/FLOWS.md`. Close each step with `flow.mjs done <step>`: it refuses a skipped step, a missing artifact, empty sections or `<…>` left. Large steps close part by part (`done direction.questions`). The phases are entry points, not a pipeline: never run a phase the user did not ask for.

## Token layers

| Layer | What | Cost |
|---|---|---|
| 1 · Guide | only the guide of the current step (`guides/`) | about 120 lines |
| 2 · Knowledge | `experience/*.md`, `experience/references/INDEX.md`, on demand | per topic |
| 3 · Overview | `catalog/digest.md`, once, before choosing what to query | about 2.5k tokens |
| 3 · Query | `find.mjs`, `get.mjs`, `scout.mjs <url>`, `ui-map.mjs impact|have`, `pieces.mjs find` | under 1 KB each |
| 3 · Map | `ai-frontend-output/UI-MAP.md` instead of exploring the repo | one page |
| 4 · Detail | `catalog/sources/<source>.json` or the official docs | only when needed |

Never load all `catalog/sources/*.json`, never read `install-guides.md` end to end (jump to the section of the source), never paste `experience-manifest.json` (query it).

## Catalog

```bash
node ai-frontend-guide-kit/tools/find.mjs "<need>"          # best match first; big free sources first (ReUI, shadcn/ui, Shadcn Space)
node ai-frontend-guide-kit/tools/find.mjs --category hero --stack react --commercial --limit 8
node ai-frontend-guide-kit/tools/get.mjs <id>                # license, dependencies, install command
```

Present 2–3 combinations with their rationale and the facts from `get` before closing a selection. Web-discovered components stay `provisional` until their license is verified on the origin page (`experience/DISCOVERY-LOOP.md`, phase B).

## Frontend map

`ui-map.mjs` keeps `ui-map.json`, `UI-MAP.md` and `ui-history.jsonl` in `ai-frontend-output/` and never edits source. Run `node ai-frontend-guide-kit/tools/ui-map.mjs check` as the gate. Commands: `build`, `impact <role|component>` (owner, users, routes, strays, unresolved imports: change every one it lists), `have "<name>"` (also resolves type aliases: `modal` finds a `Dialog`), `types`, `docs [--profile ...]`, `check [--profile ...]`. `check` lists every finding and exits 1 when one blocks: profile `sprint` blocks nothing, `standard` (default) blocks unresolved imports and missing documents, `long-term` blocks all. Unresolved imports are never assumed fine. The folder structure is a separate decision (`guides/12-ARCHITECTURE.md`): `map` is the default; FSD only when the user asks, through the `frontend-refactor` skill.

## Pieces

`pieces.mjs` registers the project's own components where its architecture keeps them; the kit stores only metadata, history and an index (`ai-frontend-output/pieces/`), never component code.

- Before creating a component run `pieces.mjs find "<need>"`: own piece, variant, piece of another registered project (`adopt` copies the file in), the catalog, and only then a new piece (`add` refuses otherwise unless `--new --reason "..."`).
- A polish request ("more spacing") means editing the file and then `pieces.mjs version <name>`, or a new variant, never a new piece.
- Without waiting to be asked: `use` when a piece goes in, `version` after an edit, `like` or `dislike` when the user reacts, `note` for any remark.
- Origin: `get.mjs <id> --landed <path>` registers a catalog component (`catalog:<id>`); an internet one uses `add ... --origin internet:<url>`. `--relation` is `chosen`, `modified` or `copied`. `pieces.mjs personality set <key> <value>` keeps the project's taste.
- `memory.mjs add --decision build` needs a prior `pieces.mjs find`; `flow.mjs done compose|iterate` needs every build registered and every registered piece recorded after its last edit. A global index at `~/.ai-frontend-guide-kit/` (override: `AI_FRONTEND_PIECES` or `--global`) holds only references to registered projects.

## Selection memory

`ai-frontend-output/` lives next to the kit and survives refreshes: never store memory inside `ai-frontend-guide-kit/`.

- Check `memory.mjs combo list` before searching; reuse a saved combination when it fits.
- Record every decision with `memory.mjs add` right after choosing; references and directions can use `--ref "reference:<slug>"` or `--ref "direction:<id>"` without `--id`.
- `SUMMARY.md` is the generated summary of styles and components. `combo save <name>` and `combo apply <name>` reuse a set.
- UI libraries: `memory.mjs lib sync` imports what `context.mjs` detects; `lib add <name> --status using|research` records one by hand. Prefer a library the project already uses before adding another; for one to research, use its own documentation.

## UX rules

- No UX in the repo: design from scratch with the `userflow` dispatcher (load 1–4 `flow-*` skills, never from memory). UX exists: **ask the user once**, Summarize (as-is plus audit, no changes) or Radical redesign (baseline, ideal, diff). Never redesign silently; redesign is UX-only and `PRODUCT.md` stays.
- BMAD or spec-driven repos (`Framework:` in `REPO-CONTEXT.md`): `guides/ADAPTERS.md`. A BMAD PRD is the business anchor (cite `--ref "story:<id>"`); OpenSpec specs are the behavioral truth (`--ref "spec:<capability>"`).
- Gate: no UI step until `EXPERIENCE-BRIEF.md` has the chosen direction and `UX-SPEC.md` lists screens with empty, loading and error states, and `ux-map.excalidraw` matches both.
- Polish: design measures come from `audit-design.mjs --report`, never from your own review; the `polish` step cannot close with a high finding. Agentation (`guides/11-VISUAL-FEEDBACK.md`) is a human round on request, never required.

## Laya (local decision engine, only after the user agrees)

Laya ranks questions, directions and components with calibrated probabilities, on this PC, no server. `python ai-frontend-guide-kit/tools/laya_select.py --check` says if it is ready; `--install` downloads about 0.1–1.7 GB once.

- Consent once per session: record `laya_consent` in `EXPERIENCE-BRIEF.md`, then pass `--confirmed` per call. Never run the model without it; a revocation returns to the deterministic path.
- Facts (licenses, compatibility, install commands) always come from the catalog; Laya only scores semantic fit. Probabilities are relative between candidates; a low top score means compare or broaden filters.
- The pre-filter is deterministic and mandatory: non-commercial entries never reach the model for a commercial project.
- Without Python or Laya, continue with the question tree, the tables in `experience/` and `find.mjs`/`get.mjs`. Never block the workflow on Laya.

## License discipline

- `license_type: non-commercial`: do not use in commercial work without permission.
- `license_type: unknown`: verify on the component page before production.
- `commercial_use: conditional`: read `limits` in the `get` output first.
- The kit never ships third-party component code; it stores metadata and links. Pictures from external skills keep their own licenses and credits.
