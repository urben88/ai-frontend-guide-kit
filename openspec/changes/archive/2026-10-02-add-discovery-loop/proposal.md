# Proposal

## Why

Hoy la capa de dirección de experiencia sabe extraer una URL concreta, pero no acompaña al usuario a **elegir**: no propone webs de ejemplo buscadas en internet, no pregunta qué le gusta de cada una navegando, no recoge capturas y no convierte esos gustos en decisiones guardadas. Lo mismo ocurre al elegir componentes: `find`/`get` devuelven candidatos, pero nadie presenta **combinaciones razonadas** ni incorpora hallazgos de fuera del catálogo con verificación de licencia. Sin ese diálogo, la persona que elige descubre poco y las decisiones se pierden.

## What Changes

- Nuevo protocolo `ai-frontend-guide-kit/experience/DISCOVERY-LOOP.md`: loop de descubrimiento en dos fases reutilizables.
  - **Fase A — estructura**: sembrar búsquedas (web search nativo del agente), presentar un *idea deck* de 3–5 webs con enlace, peso (evidencia/producto/inspiración), modelo de navegación y lectura estructural; preguntar cuál gusta más y qué se destaca tras navegar (Playwright MCP o el propio usuario); recoger capturas; destilar gustos en el brief y en fichas.
  - **Fase B — componentes**: presentar combinaciones (no enlaces sueltos) con racional de encaje y hechos del catálogo; buscar en web componentes no catalogados verificando licencia antes de proponerlos (provisionales hasta confirmar); iterar variantes con el usuario y guardar la combinación aceptada.
- Capturas y referencias de proyecto se guardan en `ai-frontend-output/ux/references/` (sobreviven al refresco del kit); el banco curado del kit (`experience/references/`) queda como evidencia de método. `REFERENCE-PROTOCOL.md` separa ambos bancos y define el intake de capturas.
- Enganches: guía 01 (paso opcional de descubrimiento antes de las tres direcciones), guía 05 (presentación de combinaciones + candidatos web verificados), guía 00, `AGENTS.md` y skill genérica.
- `memory.mjs` acepta registros **solo-ref** (sin `--id`) para fijar referencias, gustos y direcciones; corrige el caso documentado `--decision adapt --ref "direction:<id>"`, que hoy falla.
- Regla ética existente extendida al loop: patrones y lecciones, nunca identidad visual, assets ni código 1:1.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `experience-direction`: nuevo requisito de descubrimiento interactivo de referencias (idea deck, ronda de navegación, capturas, persistencia y cita en el brief) y separación banco del kit / banco de proyecto en el requisito del banco de referencias.
- `guided-frontend-kit`: integración del loop en guías 00/01/05 y en `AGENTS.md`/skill; nuevo activo requerido en el build del kit; combinaciones de componentes y candidatos web verificados como parte del paso de búsqueda.
- `selection-memory`: los registros de memoria aceptan `--ref` sin `--id` (referencias, gustos y direcciones), manteniendo el enriquecimiento del catálogo cuando hay `entry_id`.

## Impact

- Nuevo: `ai-frontend-guide-kit/experience/DISCOVERY-LOOP.md`.
- Actualizados: `REFERENCE-PROTOCOL.md`, `guides/00-START-HERE.md`, `guides/01-EXPERIENCE-DIRECTION.md`, `guides/05-FIND.md`, `AGENTS.md` del kit, `skills/ai-frontend-guide/SKILL.md`, `tools/memory.mjs`, `tools/build-kit.mjs`, `package.json` (1.2.0 → 1.3.0), `README.md` del kit, `README.md` raíz, `VERIFICATION.md`.
- Sin cambios de catálogo, esquema ni instalador; sin dependencias nuevas (usa la búsqueda web nativa del agente y el Playwright MCP ya configurado).
