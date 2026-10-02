# Spec Delta

## MODIFIED Requirements

### Requirement: Self-contained guided folder
El kit SHALL ser una carpeta autocontenida (`ai-frontend-guide-kit/`) copiable sin compilación ni instalación, y SHALL funcionar con rutas relativas dentro del repo destino.

#### Scenario: Copia a un proyecto
- **WHEN** el usuario copia la carpeta al repo destino
- **THEN** las guías, el catálogo y las herramientas funcionan sin pasos de build ni dependencias adicionales (salvo Node para `find`/`get`)

## ADDED Requirements

### Requirement: Generic agent skill
El repositorio SHALL incluir una skill genérica en formato agent-skills (`skills/ai-frontend-guide/SKILL.md`, con frontmatter `name` y `description`) que enseñe a usar la herramienta: principio reuse-first, orden de las guías 00–08, herramientas `find`/`get`, consentimiento previo de Laya (`--confirmed`) y reglas de licencia. La skill SHALL ser instalable con `npx skills add <repo> --skill ai-frontend-guide` y NO SHALL duplicar el contenido completo del kit: SHALL apuntar a `AGENTS.md` y a las guías.

#### Scenario: Instalación de la skill
- **WHEN** un agente o usuario ejecuta `npx skills add urben88/ai-frontend-guide-kit --skill ai-frontend-guide`
- **THEN** la skill queda instalada para los agentes detectados y el agente conoce el flujo y las herramientas del kit

#### Scenario: Uso desde la skill
- **WHEN** un agente lee `SKILL.md`
- **THEN** sabe que debe leer `ai-frontend-guide-kit/AGENTS.md`, seguir las guías en orden y no ejecutar Laya sin `--confirmed`

#### Scenario: Sin duplicación
- **WHEN** el kit evoluciona
- **THEN** la skill sigue siendo un puntero breve (no una copia de las guías) y no requiere actualización de contenido salvo cambios de flujo
