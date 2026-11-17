# Project instructions for Claude Code

<!-- ai-frontend-guide-kit:start -->
## Frontend, UI and design: always this flow (ai-frontend-guide-kit)
**Mandatory.** Any request about frontend, UI, UX, design, a screen, page, component, style or polish, however small,
starts like this, before any file is read or edited:
1. Read `ai-frontend-guide-kit/INDEX.md` (one page, enough to work).
2. Run `node ai-frontend-guide-kit/tools/flow.mjs status`. With no route, declare one with `flow.mjs start <route>` (a small change
   is `iterate`). Then follow `flow.mjs next` exactly and close each step with the command it prints (`flow.mjs done <step>`).
The flow is never skipped. Every route and step: `ai-frontend-guide-kit/guides/FLOWS.md`.
Catalog first, no exceptions: before writing ANY component, section, form or animation run
`node ai-frontend-guide-kit/tools/find.mjs "<need>"`, then `node ai-frontend-guide-kit/tools/get.mjs <id>`, and use what it finds
(ReUI, shadcn/ui and Shadcn Space come first). Build new code only after a search found nothing that fits, and say so with the reason.
Before creating or changing UI: `node ai-frontend-guide-kit/tools/ui-map.mjs have <name>` and `ui-map.mjs impact <role|component>`; read `ai-frontend-output/UI-MAP.md`, never explore the repo.
Design techniques (layout, type, color, motion, imagery, 3D, psychology): `node ai-frontend-guide-kit/tools/technique.mjs find "<need>"`, then `get <id>`; never invent a technique from memory.
External design skills (landing-page-design, hallmark, design-taste-frontend, emilkowalski, impeccable) never start the work; each runs only at the step `flow.mjs next` names.
Triggers: design, redesign, restyle, UI, UX, look and feel, theme, colors, typography, fonts, spacing, layout, screen, page,
landing, dashboard, component, form, animation, polish; diseño, rediseñar, estilo, aspecto, tema, colores, tipografía,
fuentes, espaciado, maquetación, pantalla, página, landing, componente, formulario, animación, pulir.
On "what is this", "qué puedo pedirle", "dame un resumen de esta herramienta": answer from `ai-frontend-guide-kit/HELP.md`
(Spanish: `HELP.es.md`); never explore the folders to explain the kit.
<!-- ai-frontend-guide-kit:end -->
