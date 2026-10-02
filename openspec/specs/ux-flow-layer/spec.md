# ux-flow-layer Specification

## Purpose
Integra en el kit una capa UX basada en flujos probados (ux-flow-skills, MIT): analiza el contexto del repositorio, genera una especificación UX completa con anti-patrones auditados, y ofrece modos explícitos —resumir lo existente o rediseño radical (solo UX)— para que el inventario de UI y la memoria de componentes partan de una estructura validada.

## Requirements

### Requirement: Vendored UX skills
El repositorio SHALL incluir las 16 skills UX de `jpoindexter/ux-flow-skills` (`userflow` + 15 `flow-*`) y su `report-template.html` en `skills/<name>/`, sin modificar su contenido, junto con la licencia MIT del origen y un archivo de origen con el commit pinneado. SHALL existir un script de sincronización (`tools/sync-ux-skills.mjs`) que re-descargue la versión más reciente, verifique la licencia y el frontmatter (`name`, `description`) de cada skill, y permita comprobar diferencias con `--check`.

#### Scenario: Vendorizado verificado
- **WHEN** se ejecuta el script de sincronización
- **THEN** las 16 skills quedan en `skills/` con frontmatter válido, la licencia MIT y el origen (repo + commit + fecha) registrados

#### Scenario: Diferencia con el origen
- **WHEN** se ejecuta `sync-ux-skills.mjs --check` y el origen tiene un commit nuevo
- **THEN** el script lo reporta sin modificar archivos y sin salir con error

### Requirement: Repository context analysis
La herramienta `tools/context.mjs` SHALL analizar el repositorio destino (stack desde el manifiesto de paquetes, rutas/pantallas, documentación, specs de OpenSpec, artefactos UX previos) y SHALL escribir un resumen compacto en `ai-frontend-output/ux/REPO-CONTEXT.md` que incluya `ux_present` (si hay UX existente) y su evidencia.

#### Scenario: Repo con UX
- **WHEN** el repositorio tiene rutas/páginas o documentos de producto/UX existentes
- **THEN** el contexto reporta `ux_present: true` con la evidencia (rutas encontradas, documentos detectados)

#### Scenario: Repo sin UX
- **WHEN** el repositorio no tiene pantallas ni documentos de UX
- **THEN** el contexto reporta `ux_present: false` y el flujo usa el camino "UX desde cero"

#### Scenario: Salida compacta
- **WHEN** el agente necesita contexto
- **THEN** lee `REPO-CONTEXT.md` (≤ ~150 líneas) en lugar de explorar el repo completo

### Requirement: UX flow phase
La guía `01-UX-FLOWS.md` SHALL conducir la fase UX antes de cualquier trabajo de UI: invocar el dispatcher `userflow` (cargando las skills seleccionadas, máximo 4, nunca de memoria), aplicar sus anti-patrones y producir en `ai-frontend-output/ux/` una `UX-SPEC.md` (pantallas, bloques por pantalla, flujos numerados con acciones primarias y ramas, estados empty/loading/error) y un `flow-report.html`. NO SHALL permitirse pasar a la fase de UI sin `UX-SPEC.md` con pantallas y estados.

#### Scenario: Fase completa
- **WHEN** el agente ejecuta la guía 01
- **THEN** quedan `REPO-CONTEXT.md`, `UX-SPEC.md` y `flow-report.html` en `ai-frontend-output/ux/`, con los anti-patrones verificados

#### Scenario: Gate hacia UI
- **WHEN** no existe `UX-SPEC.md` o le faltan pantallas/estados
- **THEN** la guía bloquea el paso a tokens/inventario

### Requirement: Existing UX handling
Cuando `REPO-CONTEXT.md` reporte `ux_present: true`, la guía SHALL exigir una elección explícita del usuario entre **resumir** y **rediseñar**, y el agente NO SHALL rediseñar en silencio. El modo resumen SHALL documentar el UX actual sin proponer cambios (con auditoría de anti-patrones PASS/WARN/FAIL). El modo rediseño SHALL capturar primero `UX-BASELINE.md`, diseñar el UX ideal con los flujos probados y documentar el impacto en `UX-DIFF.md`; el rediseño SHALL ser solo de UX, respetando objetivo, audiencia y conversión de `PRODUCT.md`.

#### Scenario: Resumen as-is
- **WHEN** el usuario elige resumir
- **THEN** `UX-SPEC.md` describe el estado actual con su auditoría y no incluye cambios propuestos

#### Scenario: Rediseño con baseline
- **WHEN** el usuario elige rediseño radical
- **THEN** existen `UX-BASELINE.md` (lo que había), `UX-SPEC.md` (UX ideal) y `UX-DIFF.md` (pantallas/flujos añadidos, eliminados y reestructurados)

#### Scenario: Límite del rediseño
- **WHEN** el rediseño propone cambios de producto (audiencia, conversión, alcance)
- **THEN** quedan fuera de alcance y se marcan como preguntas abiertas, manteniendo `PRODUCT.md`

### Requirement: UX outputs and handoff
Las salidas UX SHALL vivir en `ai-frontend-output/ux/` (preservadas en refrescos del kit) y SHALL alimentar la fase de UI: el inventario (`03-INVENTORY`) y los identificadores `--screen/--block` de la memoria SHALL derivarse de `UX-SPEC.md`, de modo que las combinaciones guarden coherencia entre UX y componentes.

#### Scenario: Inventario desde UX
- **WHEN** el agente construye el inventario de componentes
- **THEN** cada fila corresponde a una pantalla/bloque definidos en `UX-SPEC.md`, incluyendo sus estados

#### Scenario: Memoria coherente
- **WHEN** se registra una decisión con `memory.mjs add`
- **THEN** `--screen` y `--block` son los definidos en `UX-SPEC.md`

### Requirement: Framework adaptation (BMAD / spec-driven)
La herramienta de contexto SHALL detectar si el repositorio sigue BMAD (PRD, brief, arquitectura, documentos UX, stories, carpetas BMAD) y/o un flujo basado en specs (`openspec/`), y SHALL reportar el framework detectado con su evidencia. El kit SHALL documentar en `guides/ADAPTERS.md` cómo adaptarse a cada uno: con BMAD, el PRD/brief es el ancla de negocio y los documentos UX existentes son el estado as-is, sin crear fuentes de verdad duplicadas; con specs, los specs son la fuente de verdad del comportamiento. La memoria SHALL aceptar una referencia (`--ref`) para trazar decisiones a specs o stories, y el resumen SHALL mostrarla.

#### Scenario: Detección BMAD
- **WHEN** el repositorio contiene PRD/brief/arquitectura, documentos UX o stories
- **THEN** el contexto reporta framework BMAD con la evidencia y la guía indica anclar desde el PRD/brief existente

#### Scenario: Detección spec-driven
- **WHEN** el repositorio contiene `openspec/` con specs
- **THEN** el contexto reporta flujo basado en specs y la guía exige referenciar las capacidades y no contradecir los specs

#### Scenario: Trazabilidad
- **WHEN** se registra una decisión con `--ref "spec:<capability>"` o `--ref "story:<id>"`
- **THEN** el registro guarda la referencia y el resumen la muestra junto a la decisión

#### Scenario: Sin duplicar fuentes de verdad
- **WHEN** existe PRD de BMAD
- **THEN** `PRODUCT.md` es opcional y, si se crea, apunta al PRD en lugar de reescribir audiencia/conversión
