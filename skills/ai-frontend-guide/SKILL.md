---
name: ai-frontend-guide
description: Reuse-first UI workflow and the entry point for ANY design conversation in a project that contains the ai-frontend-guide-kit folder. Use whenever the user talks about design, redesign, restyle, UI, UX, look and feel, theme, colors, typography, fonts, spacing, layout, screens, pages, landing pages, dashboards, components, forms, animations or polish ("diseño", "rediseñar", "estilo", "aspecto", "tema", "colores", "tipografía", "fuentes", "espaciado", "maquetación", "pantalla", "página", "componente", "formulario", "animación", "pulir"), before other design skills (landing-page-design, hallmark, design-taste-frontend, emilkowalski and impeccable run only at the step the flow names, never as the entry point). The flow tool prints each step; this skill only says which file to open at which step.
---

# AI Frontend Guide

Search what already exists before creating anything, and choose the experience direction before choosing visuals. The tool drives the work: you do not plan the route, `flow.mjs` does.

## First command, before any file is read or edited

```bash
node ai-frontend-guide-kit/tools/flow.mjs status
```

No route yet: ask the user what they want, then `node ai-frontend-guide-kit/tools/flow.mjs start <route>` (`new`, `direction`, `ux`, `iterate`, `polish`, `redesign`, `visual-feedback`, `architecture`; a one-line change is `iterate`). Every route and step is in `ai-frontend-guide-kit/guides/FLOWS.md`.

## The loop

1. `node ai-frontend-guide-kit/tools/flow.mjs next` prints the whole instruction of one micro-step: goal, exact commands, template, done criteria.
2. Do exactly what it prints. If a file is needed, `flow.mjs scaffold` writes its template. Show the user the tool menu it lists and ask which to use; record the pick with `--tools <ids>`.
   If it ends with **STOP**, the choice is the user's: show the options, wait, and never answer for them. Close that part with `--answer "<their words>"`.
3. Close it with the command it prints (`flow.mjs done <step>`). It refuses a skipped step, an empty file, a `<…>` left in a file or an unregistered piece: fix what it lists, never work around it.
4. Back to 1 until `next` says the route is complete. Each `done` prints a summary: show it to the user. `flow.mjs report` writes the whole route to `ai-frontend-output/FLOW-REPORT.md`.

Open the step file below only when you are at that step. Do not read the others.

## Step to file

| Step (`flow.mjs next` names it) | Open |
|---|---|
| `intake` | `steps/intake.md` |
| `direction` | `steps/direction.md` |
| `ux` | `steps/ux.md` |
| `tokens` | `steps/tokens.md` |
| `compose` | `steps/compose.md` |
| `board` | `steps/board.md` |
| `iterate` | `steps/iterate.md` |
| `redesign` | `steps/redesign.md` |
| `polish` | `steps/polish.md` |
| `visual-feedback` | `steps/visual-feedback.md` |
| `architecture` | `steps/architecture.md` |

The path is relative to this skill's folder. Each file holds what the instruction cannot carry: judgment notes and common mistakes.

## Always on

- **Catalog first:** before writing any component, section, form or animation run `node ai-frontend-guide-kit/tools/find.mjs "<need>"`, then `get.mjs <id>`. Reuse, then adapt, then build; build only after a search found nothing that fits, and say why.
- **Memory:** record every decision with `memory.mjs add` and every piece with `pieces.mjs`; never keep them only in chat. `ai-frontend-output/UI-MAP.md` replaces exploring the repo: `ui-map.mjs have <name>` before creating, `ui-map.mjs impact <role|component>` before changing UI, `ui-map.mjs check` as the gate.
- **Licenses are facts:** read `license_type` and `commercial_use` in `get` output; never use `non-commercial` entries in commercial work.
- **External design skills** (`landing-page-design`, `hallmark`, `design-taste-frontend`, `emilkowalski`, `impeccable`) never start the work; each runs only at the step `flow.mjs next` names.
- **Questions about the kit:** answer from `ai-frontend-guide-kit/HELP.md` (Spanish: `HELP.es.md`), never by exploring.
- **Reference only:** `ai-frontend-guide-kit/INDEX.md` is the one-page entry; `AGENTS.md` and `guides/` are reference, not needed to work.

## If the folder is missing

```bash
npx github:urben88/ai-frontend-guide-kit
```

## Do not

- Do not read the whole catalog or `experience-manifest.json`: use `find`, `get` and the index cards.
- Do not copy third-party component source into the kit or strip license notices from copied components.
