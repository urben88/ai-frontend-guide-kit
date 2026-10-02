# kit-distribution Specification

## MODIFIED Requirements

### Requirement: Kit completeness check

El empaquetado del kit (`tools/build-kit.mjs`) SHALL verificar la presencia de `tools/laya_select.py` y de los activos de la capa de experiencia (`experience/EXPERIENCE-DIRECTION.md`, `experience/experience-manifest.json` y `guides/01-EXPERIENCE-DIRECTION.md`) entre los activos requeridos, y SHALL seguir garantizando coherencia catálogo↔manifest.

#### Scenario: Build del kit

- **WHEN** se ejecuta el empaquetado
- **THEN** falla si falta el script de Laya o algún activo de `experience/`, y reporta la coherencia del catálogo con el manifest

#### Scenario: Manifest de experiencia inválido

- **WHEN** `experience-manifest.json` no parsea o tiene IDs duplicados
- **THEN** el empaquetado falla con el error correspondiente antes de distribuir el kit

### Requirement: UX skills distribution

El instalador SHALL instalar las 19 skills de este repositorio (workflow `ai-frontend-guide`, 16 UX vendorizadas, `frontend-polish` y `ux-map`) y, por defecto, las tres skills de diseño externas; SHALL permitir omitir las externas con `--no-design-skills` y todas con `--no-skills`. El empaquetado (`tools/build-kit.mjs`) SHALL verificar la presencia de las skills vendorizadas, de `frontend-polish`, de `ux-map` y de sus archivos de origen/licencia en el repositorio.

#### Scenario: Instalación completa

- **WHEN** se ejecuta el instalador sin `--no-skills`
- **THEN** quedan instaladas las 19 skills del kit y las tres externas (salvo `--no-design-skills`)

#### Scenario: Empaquetado verificado

- **WHEN** se ejecuta el empaquetado
- **THEN** falla si faltan `skills/userflow/SKILL.md`, alguna `flow-*`, `skills/frontend-polish/SKILL.md`, `skills/ux-map/SKILL.md` o `skills/UX-SKILLS-ORIGIN.md`, y reporta coherencia del catálogo

#### Scenario: Salida final con UX

- **WHEN** el instalador imprime los siguientes pasos
- **THEN** el primer paso es la dirección de experiencia (guía `01-EXPERIENCE-DIRECTION` → `EXPERIENCE-BRIEF.md`), seguido de la fase UX (`tools/context.mjs` + guía `02-UX-FLOWS`), y se mencionan las tres fases, el mapa visual con el MCP Excalidraw y el MCP Playwright
