# Help — what this kit is and what you can ask for

Plain-language guide to the AI Frontend Guide kit. Read this instead of exploring the folders. Spanish: `HELP.es.md`.

## What this is

A guided kit that an AI agent (or a human) uses to build and change frontend UI without inventing what already exists: **reuse before creating**. It ships a catalog of reusable components, an experience-direction layer, a workflow of three on-demand phases, and local tools that answer with one page instead of a full repository read.

It is not a component library and not a framework: it never copies third-party code, it stores metadata, links and decisions.

## What runs always and what runs only when you ask

| | What happens | Where it writes |
|---|---|---|
| **Always on** | The installer scans the project and keeps a map of the frontend: components, who uses them, routes, visual roles, strays and unresolved imports. Every later `build` records components added or removed. | `ai-frontend-output/` only |
| **Always on** | Every design decision is recorded and reusable across sessions and projects. | `ai-frontend-output/selections.jsonl`, `combinations.json` |
| **Only when you ask** | The three-phase design workflow (experience direction → composition → polish) and the audits inside it. | the files of each step |
| **Only when you ask** | Architecture work: Feature-Sliced Design (FSD) structure, refactoring, or adapting an existing repo to it. Never imposed, never silent, never on a project that did not ask. | `ai-frontend-output/architecture.json` + the change you approved |

The map never edits, moves or renames project source. Existing violations of the separation philosophy are recorded, not changed.

## The three phases (entry points, not a pipeline)

| Phase | You produce |
|---|---|
| **1 · UX and theory** | `EXPERIENCE-BRIEF.md` (archetype, philosophy, journey, IA, three directions, visual brief), `PRODUCT.md`, `UX-SPEC.md`, `flow-report.html`, `ux-map.excalidraw`, `DESIGN.md` + theme |
| **2 · Composition** | component inventory, shortlist, a `reuse` / `adapt` / `build` decision per block, install, adapted components |
| **3 · Total polish** | external audits, Playwright MCP loop green, E2E + visual regression green |

Enter at the phase the request points to. A small change never repeats the UX phase (`guides/10-ITERATE.md`).

## Tools

Run them from the project root. Every tool prints one screen, not a dump.

| Tool | Answers |
|---|---|
| `tools/context.mjs` | What is this repository? Stack, routes/screens, docs, previous UX artifacts → `ai-frontend-output/ux/REPO-CONTEXT.md` |
| `tools/ui-map.mjs` | `build` writes the map; `impact <role|component>` lists owner, users, routes, strays and unresolved imports; `have <name>` answers whether a component already exists, with type aliases, close matches and catalog candidates; `types` reports coverage of the canonical component types, unclassified components and possible duplicates; `docs` lists the documents the profile needs and which are missing; `check` lists every finding (unresolved imports, duplicate types, strays, ownerless roles, missing documents) and exits 1 when the profile treats one as blocking (`sprint` nothing, `standard` unresolved + missing documents, `long-term` all) |
| `tools/find.mjs` | Which catalog entries fit a category, stack, text or commercial use |
| `tools/get.mjs` | The full record of one entry: what it is, when to use it, install, license limits |
| `tools/flow.mjs` | `status` says whether the kit is installed, the active route and step, and what the project has recorded; `start <route>` declares the route; `next` prints the current step with its guide, skill and output; `done <step>` refuses a skipped step or a missing artifact (steps without a file need `--evidence`); `reset` drops the route. State: `ai-frontend-output/flow-state.json`, committed with the project |
| `tools/memory.mjs` | `add`, `list`, `summary`, `combo save\|list\|show\|apply` — the reusable decision history |
| `tools/excalidraw-mcp.mjs` | Local, offline Excalidraw MCP server for the screen/navigation map |
| `tools/laya_select.py` | Optional local decision engine: ranks questions, directions and components (`--check`, `--install`) |
| `tools/audit-a11y.mjs` | WCAG 2.x A/AA check of one or more URLs through axe-core + Playwright |
| `tools/audit-perf.mjs` | Lighthouse Core Web Vitals budget: LCP, CLS, TBT |
| `tools/audit-honesty.mjs` | Static scan for deceptive-pattern tells in UI copy and markup (flags to review, never proof of intent) |
| `install.mjs` | Copies the kit into a project, adds the routing block, creates the memory folder, runs the first map scan, optionally installs skills and MCP servers |

## Skills

Skills are optional accelerators. The kit's files always win over a skill's default opinion.

| Skill | When it runs |
|---|---|
| `ai-frontend-guide` | The router every design, UI or UX request goes through |
| `frontend-polish` | Phase 3: external audits + Playwright MCP loop + regression |
| `frontend-refactor` | Only on explicit request: maps folders to FSD roles and refactors one slice at a time, checking `ui-map build` and `check` after each one |
| `ux-map` | The screen/navigation map in `ai-frontend-output/ux/ux-map.excalidraw` |
| `userflow` | Dispatcher for the UX flow skills; also `userflow audit` for one surface |
| `flow-onboarding` | First-run, activation and setup patterns |
| `flow-auth` | Sign-up, sign-in, recovery, verification |
| `flow-app-shell` | Navigation frame, sidebars, headers, responsive shell |
| `flow-tables` | Data tables, filters, sorting, bulk actions, density |
| `flow-forms` | Form layout, validation, multi-step input |
| `flow-search` | Search entry, results, filters, no-results handling |
| `flow-navigation` | Menus, tabs, breadcrumbs, deep hierarchy |
| `flow-settings` | Account, preferences, organization settings |
| `flow-checkout` | Cart, payment, order confirmation |
| `flow-paywall` | Trial limits, upgrade prompts, pricing gates |
| `flow-permissions` | Roles, access requests, denied states |
| `flow-sharing` | Invites, links, collaboration, public views |
| `flow-empty-states` | First-run empty, cleared empty, no-permission empty |
| `flow-errors` | Error states, recovery paths, boundary screens |
| `flow-ai-chat` | Conversational UI: prompt box, streaming, citations |

## What you can ask for

- "Build me a landing page for X" → direction, then composition, then polish.
- "Change the loading states of these screens" → `ui-map impact loading` first, then change every owner, user and stray it lists.
- "Do we already have a data table?" → `ui-map have "data table"`, then decide reuse, adapt or build.
- "Why does this screen look generic?" → `frontend-polish` audit, then the fixes it names.
- "Document the UX we already have" → summarize path of `guides/02-UX-FLOWS.md`, no redesign.
- "Check accessibility and performance of this page" → `audit-a11y` and `audit-perf`.
- "Give me the context of this repository in one page" → `context.mjs` plus `UI-MAP.md`.
- "Explain this tool to a colleague" → this file.

## Ready-to-copy prompts

```
Read ai-frontend-guide-kit/HELP.md and tell me what this kit can do for my project, in plain language, without changing any file.
```

```
Run the kit intake: read ai-frontend-guide-kit/AGENTS.md, run tools/context.mjs and read UI-MAP.md, then declare the route in one line before touching any code.
```

```
I want to change the loading and empty states of the dashboard. Run tools/ui-map.mjs impact loading and impact empty, show me every owner, user and stray, and only then propose the change.
```

```
I need a pricing table with a monthly/annual toggle. First run tools/memory.mjs combo list, then tools/ui-map.mjs have "pricing table", then tools/find.mjs --category pricing, and show me 2-3 combinations with their license facts before building anything.
```

```
Review this screen like the polish phase: use the frontend-polish skill, run the advertised audits, the Playwright MCP loop and tools/audit-a11y.mjs, and list what fails before changing code.
```

```
Do not restructure anything. Only document what exists: summarize the UX of this repository from REPO-CONTEXT.md and UI-MAP.md, with an anti-pattern audit and no code changes.
```

```
At the end of this task, explain what this kit is and what I can ask of it, in one screen, using ai-frontend-guide-kit/HELP.md as the source.
```

## Where things are written

- `ai-frontend-output/` — the memory folder: `ui-map.json`, `UI-MAP.md`, `ui-history.jsonl`, `selections.jsonl`, `combinations.json`, `SUMMARY.md`, `ux/`. It lives next to the kit and survives kit refreshes. Commit it with the project: it is history, not build output.
- The project's own files — only when a phase produces a deliverable you approved (`DESIGN.md`, components, fixes).
- Nothing else. The kit never writes inside `ai-frontend-guide-kit/` and never edits project source during a scan.

## Limits (stated, not hidden)

- Components defined in plain `.ts`/`.js` without JSX are not detected by the map.
- `tsconfig.json` aliases are read; inherited `extends` chains are not followed.
- Visual roles come from name and folder signals: an unusual name gets no role, and a role may have several owners — the tool reports it instead of choosing.
- License facts come from the catalog and can drift from the origin page; verify before production.
- Laya is optional and local: without Python the deterministic question tree and heuristics still work.
- The honesty scan is heuristic: it flags patterns to review, it does not prove intent.
