# Design

## Context

El kit tiene tres fases (`00`–`10` tras el renumerado) y ya resolvió: catálogo reuse-first, flujos UX vendorizados, tokens, memoria de selección, mapa visual Excalidraw local y Laya para rankear componentes con consentimiento. Falta la decisión **previa** a los flujos: qué experiencia se construye (arquetipo), con qué filosofía, con qué referencias y cómo evitar el resultado genérico. Laya hoy solo lee `catalog/sources/*.json` (componentes) y construye siempre las mismas dos preguntas tipadas.

Restricciones reales: guías ≤ ~120 líneas; carga on-demand para no quemar contexto; sin dependencias npm en el kit; Laya es local y opcional (Python); las referencias se extraen, nunca se clonan.

## Goals / Non-Goals

**Goals:**

- Una fase `01-EXPERIENCE-DIRECTION` que convierte un brief vago en `EXPERIENCE-BRIEF.md` accionable: arquetipo, filosofía, journey, IA, 3 direcciones y brief visual.
- Preguntas adaptativas reales: cada respuesta habilita/descarta las siguientes; Laya ayuda a elegir la próxima pregunta y las direcciones, con probabilidades relativas y explicación.
- Laya como motor de decisión multi-dataset (componentes + experiencia) sin romper el flujo actual ni sus reglas (consentimiento, hechos vs opinión, fallback).
- Banco de ideas guardadas y reutilizables a partir de las fuentes del usuario, ampliable on-demand.
- Mapa Excalidraw coherente con la dirección elegida (plantillas por modelo de navegación, no una rejilla SaaS fija).

**Non-Goals:**

- NO convertir a Laya en fuente de verdad: sigue siendo opinión semántica; hechos (licencias, instalación) vienen del catálogo y la decisión final es del usuario.
- NO clonar webs ni guardar capturas masivas de galerías (derechos + infinito): se guardan fuentes, método, patrones y fichas representativas.
- NO añadir dependencias npm ni servicios: extracción con Playwright MCP ya configurado o webfetch del agente.
- NO romper el flujo de tres fases: la dirección vive dentro de la Fase 1 (UX & teoría) como su primer paso.

## Decisions

### D1. Capa `experience/` + guía nueva + renumerado

La decisión de experiencia necesita más contenido del que cabe en una guía (árbol de preguntas, arquetipos, filosofías, estilos, protocolo de fichas). Se separa en `experience/*.md` (lectura on-demand) + `experience-manifest.json` (datos para Laya) + `references/` (ideas guardadas), y la guía `01-EXPERIENCE-DIRECTION.md` queda como flujo corto con gate. El renumerado (`01-UX-FLOWS`→`02`… `09-ITERATE`→`10`) mantiene el orden mental sin duplicar números.

Alternativa descartada: meter todo en `01-UX-FLOWS` (guía > 300 líneas, rompe el presupuesto de tokens y mezcla dirección con flujos).

### D2. Manifest en formato de entradas del catálogo

`experience-manifest.json` usa la misma forma de entrada que `catalog/sources/*.json` (`id`, `name`, `description`, `use_case`, `search_tags`, `source`, `license_type`) más campos propios (`kind`, `phase`, `depends_on`, `unlocks`, `options`, `navigation_model`, `map_template`, `areas`, `risks`, `not_for`). Así Laya lo consume sin transformación de esquema y el validador puede comprobarlo.

### D3. Laya genérico por dataset/tarea

`laya_select.py` gana `--dataset components|experience` (default `components`, retrocompatible), `--kind` y `--task fit|direction|next-question|options`. La construcción de preguntas se parametriza por tarea:

- `fit` (componentes): comportamiento actual.
- `direction`: una `noul` por arquetipo/filosofía/estilo candidato + `choice` de mejor dirección.
- `next-question`: una `noul` por pregunta elegible del árbol + `choice` de pregunta siguiente.
- `options`: una `noul` por opción de una pregunta + `choice` de mejor opción (para respuestas ambiguas).

Se conserva: pre-filtro determinista, cap 8–12, `--dry-run`, `--json`, códigos de salida, disclaimer de hechos vs opinión y fallback `find`/`get`.

### D4. Preguntas adaptativas por rondas

El árbol vive en `experience-manifest.json` (`kind: question`) y se documenta en `QUESTION-BANK.md`. El agente: (1) carga `REPO-CONTEXT.md` y el estado (`EXPERIENCE-BRIEF.md` en curso), (2) calcula preguntas elegibles (dependencias satisfechas, no respondidas, no deducibles del contexto), (3) si hay más de 3 elegibles y el usuario aceptó Laya, rankea con `--task next-question`; si no, usa el orden de fases, (4) pregunta 1 con 2–4 opciones + "otra", (5) registra la respuesta y repite por rondas de 3–5. Nada de formularios enormes.

### D5. Consentimiento de Laya por sesión

Se pasa de “preguntar antes de cada ranking” a **una vez por proyecto/sesión**: el agente pide permiso, lo registra en `EXPERIENCE-BRIEF.md` (campo `laya_consent: granted revocable`) y usa `--confirmed` en cada llamada. `--check`, `--install` y `--dry-run` siguen sin requerirlo. El usuario puede revocarlo en cualquier momento (se borra el registro y se vuelve al fallback determinista).

### D6. Mapa Excalidraw dirigido por dirección

La receta de la skill `ux-map` pasa de una rejilla fija (pública/auth/app/estados) a plantillas por `navigation_model` del brief:

| navigation_model | Plantilla | Layout |
|---|---|---|
| single-page-anchors | `one-page` | columna vertical; nodos = secciones con ancla; CTA final |
| linear/wizard | `flow` | pasos L→R; diamantes en ramas; dashed en saltos |
| hub | `hub` | inicio + clústeres por área; hub central |
| catalog | `catalog` | ciclo descubrir→comparar→elegir→comprar con retornos |
| console | `console` | módulos/paneles por área |
| tree | `tree` | home → secciones por profundidad |

Las áreas/colores salen de la IA del brief (paleta preset rotativa, no semántica fija), las filas siguen las etapas del journey si existen, y se añade una leyenda `Dirección · Navegación · P(fit)` (cuando Laya puntuó). `UX-SPEC.md` sigue siendo la fuente de nombres; el brief manda en estructura.

### D7. Fichas de referencia con esquema y extracción curada + on-demand

Cada ficha `experience/references/reference-<slug>.md` responde al esquema del protocolo (contexto, experiencia, IA, interacción, dirección visual, racional, adaptación, lecciones) y se indexa con peso (evidencia UX / producto real / inspiración visual / agentes). Las metodológicas se extraen completas; de las galerías se guardan método + representantes; una URL concreta se extrae on-demand (Playwright MCP o fetch del agente) y nunca se copia identidad visual: solo patrones, estructura y lecciones.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Renumerado masivo de referencias | Cambio mecánico con grep de `0N-` y verificación final; specs deltas cubren las principales; `build-kit`/`validate` y grep cierran |
| Laya puede sobre-preguntar o preguntar mal | Máximo por rondas, opción "otra", ranking con baja confianza marcado, fallback por árbol y el usuario siempre puede saltar |
| Las probabilidades de Laya son semánticas, no verdad | Disclaimer fijo, umbral de baja confianza, hechos desde catálogo/manifest y decisión final del usuario |
| Manifest y docs pueden divergir | `kind`/ids validados en `build-kit.mjs`; `experience-manifest.json` es la fuente para Laya y los docs apuntan a él |
| Galerías infinitas / copyright | Alcance curado + on-demand; solo patrones y lecciones, nunca assets ni HTML copiado |
| Mapa direction-aware demasiado complejo | Plantillas cerradas (6) y fallback manual ya existente; el gate solo compara nombres con `UX-SPEC` y plantilla/áreas con el brief |

## Migration Plan

- Aditivo: el kit agrega `experience/`, la guía 01 y renombra las guías existentes; los proyectos con `ai-frontend-output/` conservan su historia. Los cambios son de docs/flujo y del script Laya (retrocompatible).
- Orden: 1) change + assets, 2) renumerado y guía nueva, 3) Laya genérico, 4) `ux-map` v2, 5) integración y verificación, 6) archivo.
- Rollback: revertir el change; el renumerado se deshace con `git mv` inverso y el script Laya conserva el modo `components` por defecto.
