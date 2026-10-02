# Spec Delta

## ADDED Requirements

### Requirement: Selection memory integration
La integración del kit SHALL documentar el sistema de memoria en la capa de conciencia (`AGENTS.md`), en la skill genérica (`SKILL.md`) y en las guías: comprobar combinaciones guardadas antes de buscar (`04-FIND`) y registrar cada decisión con la herramienta de memoria (`05-REUSE`).

#### Scenario: Agente lee la capa de conciencia
- **WHEN** un agente lee `AGENTS.md` o `SKILL.md`
- **THEN** encuentra los comandos de memoria (`add`, `list`, `summary`, `combo …`) y la regla de registrar cada decisión

#### Scenario: Flujo de búsqueda con memoria
- **WHEN** el agente llega al paso de búsqueda
- **THEN** la guía le indica comprobar `memory.mjs combo list` antes de consultar el catálogo

## MODIFIED Requirements

### Requirement: Self-contained guided folder
El kit SHALL ser una carpeta autocontenida (`ai-frontend-guide-kit/`) copiable sin compilación ni instalación, y SHALL funcionar con rutas relativas dentro del repo destino. Sus herramientas de memoria SHALL escribir en `ai-frontend-output/` (fuera de la carpeta del kit) para sobrevivir al refresco.

#### Scenario: Copia a un proyecto
- **WHEN** el usuario copia la carpeta al repo destino
- **THEN** las guías, el catálogo y las herramientas funcionan sin pasos de build ni dependencias adicionales (salvo Node para `find`/`get`/`memory`)

#### Scenario: Memoria fuera del kit
- **WHEN** el kit se refresca a una versión nueva
- **THEN** el historial y las combinaciones del proyecto permanecen en `ai-frontend-output/`
