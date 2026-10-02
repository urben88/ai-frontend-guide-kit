# Design

## Context

- Ver `proposal.md` para la motivación. El kit ya tiene el banco de referencias con esquema de ficha (`REFERENCE-PROTOCOL.md`), extracción on-demand con Playwright MCP, catálogo local con `find`/`get`, memoria de selección (`memory.mjs`) y ranking opcional con Laya.
- Faltaba el diálogo de descubrimiento: proponer ejemplos, preguntar gustos, capturar y convertir todo en decisiones. El kit no tiene herramienta de búsqueda web y no debe ganar dependencias: el agente ya dispone de búsqueda web nativa y el instalador configura Playwright MCP.
- Restricción clave: el instalador reemplaza `ai-frontend-guide-kit/` en cada refresco; solo `ai-frontend-output/` sobrevive.
- Restricción de licencias: el catálogo es la fuente de hechos; cualquier candidato web debe verificarse antes de proponerse.

## Goals / Non-Goals

**Goals:**

- Un protocolo único (`DISCOVERY-LOOP.md`) reutilizable en fase de dirección (estructura) y fase de composición (componentes).
- Descubrimiento acotado y verificable: idea deck → ronda de navegación → capturas → destilado en brief/ficha/memoria.
- Persistencia fuera del kit y disciplina de hechos (catálogo para hechos, web para descubrimiento con verificación).

**Non-Goals:**

- No se añade búsqueda web propia, API keys ni dependencias nuevas.
- No se añaden candidatos web al catálogo automáticamente ni se extrae un pipeline nuevo.
- No se sustituye el banco curado del kit ni se duplican sus fichas en cada proyecto.

## Decisions

1. **Protocolo único con enganches, no dos flujos.** `experience/DISCOVERY-LOOP.md` define la mecánica común (sembrar → proponer → navegar → capturar → destilar → persistir) y cada fase la instancia: guía 01 para estructura, guía 05 para combinaciones de componentes. Alternativa descartada: duplicar la mecánica en cada guía (deriva y contradicciones).
2. **Búsqueda nativa del agente + Playwright MCP.** La búsqueda web es del harness; Playwright MCP (ya configurado por el instalador) navega, extrae estructura y captura. Alternativa descartada: `discover.mjs` con API externa (dependencia y claves por proyecto).
3. **Dos bancos de referencias.** El banco curado del kit (`experience/references/`, evidencia de método) no se toca en proyectos; las referencias elegidas, sus capturas y sus notas van a `ai-frontend-output/ux/references/` porque el refresco del kit borraría lo segundo. Alternativa descartada: escribir fichas de proyecto en el kit (se pierden al refrescar).
4. **Capturas: aceptar y re-capturar.** Si el usuario entrega un archivo/ruta, se copia a la carpeta de proyecto; si llega pegada en el chat sin ruta, se analiza visualmente y se registran conclusiones, re-capturando por URL con Playwright cuando exista. Nombres estables (`<slug>-<seccion>.png`) junto a la ficha.
5. **Combinaciones con hechos del catálogo y web como provisional.** Cada combo lleva racional de encaje + ids + datos de `get`; los hallazgos web se marcan `provisional` hasta verificar licencia en origen y nunca entran al catálogo sin pipeline.
6. **Memoria con registros solo-ref.** `memory.mjs add` acepta `--ref` sin `--id` (referencias, gustos y direcciones), arreglando de paso el ejemplo documentado `--decision adapt --ref "direction:<id>"` que hoy falla. El enriquecimiento desde catálogo se mantiene cuando hay `entry_id`.
7. **Rondas acotadas y no bloqueo.** Máximo 2–3 sugerencias nuevas por ronda, parar al converger; sin web/Playwright se usa el registro de `INDEX.md`, URLs del usuario o las fichas existentes, dejando constancia. Respeta la disciplina de tokens: los resultados se escriben a archivos, no se vuelca el catálogo.

## Risks / Trade-offs

- [La calidad de la búsqueda depende del harness del agente] → El protocolo define queries semilla por arquetipo/sector y un formato de idea deck; el fallback usa el registro de galerías y URLs del usuario.
- [Capturas pegadas sin ruta de archivo] → Se analizan y se persisten conclusiones; la captura binaria se re-obtiene con Playwright cuando hay URL.
- [Sesiones de descubrimiento que no terminan] → Rondas acotadas y criterio de parada al converger; el brief no espera más que a la dirección elegida.
- [Candidato web sin licencia clara] → Se marca provisional y no se propone como usable hasta verificar; el catálogo sigue siendo la única fuente de hechos publicada.
- [Cambio de comportamiento en `memory.mjs`] → Solo se relaja la validación cuando hay `--ref`; `reuse`/`adapt` con `--id` y `build` mantienen su comportamiento y errores actuales.
