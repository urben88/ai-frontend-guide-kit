# Design

## Context

El kit vive en `ai-frontend-guide/` mientras el repositorio y el paquete npm se llaman `ai-frontend-guide-kit`. La distribución ya usa `npx skills add` (formato agent-skills genérico) para las tres skills de diseño, y el instalador ya escribe un puntero en `AGENTS.md`. Ver `proposal.md` para la motivación.

## Goals / Non-Goals

**Goals:**

- Que cualquier agente (Codex/OpenAI, Claude Code, OpenCode, etc.) aprenda a usar la herramienta con una skill genérica breve y con el puntero existente en `AGENTS.md`.
- Alinear el nombre de la carpeta del kit con el repo/paquete: `ai-frontend-guide-kit/`.
- Documentación apuntando al repositorio real.

**Non-Goals:**

- Reescribir el contenido de las guías dentro de la skill (es un puntero, no una copia).
- Publicar en npm (el flujo principal sigue siendo `npx github:`).

## Decisions

### D1. Renombrado con `git mv` y limpieza de la carpeta legada

`git mv ai-frontend-guide ai-frontend-guide-kit` conserva el historial. El instalador elimina `ai-frontend-guide/` en el destino si existe (fue creada por versiones anteriores del propio instalador) y avisa del reemplazo; nunca toca otros archivos.

- Alternativa descartada: mantener ambas carpetas — duplica el catálogo y desincroniza.

### D2. Skill genérica en `skills/ai-frontend-guide/SKILL.md`

Formato agent-skills: frontmatter `name: ai-frontend-guide` + `description` rica (cuándo usarla), cuerpo breve con: orden de las guías, comandos `find`/`get`, regla reuse-first, consentimiento de Laya (`--confirmed`) y reglas de licencia. Apunta a `ai-frontend-guide-kit/AGENTS.md` y a las guías; no duplica contenido.

- Alternativa descartada: empaquetar las 9 guías dentro de la skill — duplicación y deriva.
- La skill se instala con `npx skills add urben88/ai-frontend-guide-kit --skill ai-frontend-guide`; el instalador lo hace como cuarta instalación (fallo no fatal).

### D3. Instalador actualizado

`SKILLS` gana la entrada propia; `KIT_SOURCE`/`kitDest` usan el nombre nuevo; el bloque de `AGENTS.md` apunta a `ai-frontend-guide-kit/AGENTS.md`; se añade la limpieza de la carpeta legada.

### D4. Documentación y specs

README raíz, README del kit, `AGENTS.md`, VERIFICATION, `componentes_reutilizables.md` y `flujo_operativo_...md` se actualizan al nombre nuevo y al repo real. Los cambios OpenSpec archivados quedan intactos; los specs principales se actualizan al archivar este cambio (delta MODIFIED).

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Proyectos con la carpeta antigua quedan desactualizados | El instalador detecta y elimina `ai-frontend-guide/`, informando del reemplazo |
| La skill propia falla si el repo no está accesible | Igual que las otras skills: el instalador avisa y continúa; el puntero de `AGENTS.md` sigue funcionando |
| Doble aplicación del renombrado en sustituciones masivas | Sustituciones acotadas a archivos concretos + verificación por búsqueda tras el cambio |

## Migration Plan

- Renombrado + actualización de referencias + nuevo archivo de skill; sin migración de datos.
- Rollback: `git mv` inverso y revertir los commits.
