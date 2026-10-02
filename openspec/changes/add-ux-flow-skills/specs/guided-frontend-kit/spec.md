# Spec Delta

## MODIFIED Requirements

### Requirement: Guided workflow steps
El kit SHALL incluir guías breves (≤ ~120 líneas cada una) numeradas que conduzcan el flujo completo: fase UX (contexto, flujos probados con `userflow`, UX-SPEC y modos resumir/rediseñar), anclaje de negocio, tokens de diseño, inventario de componentes, búsqueda en catálogo, decisión reutilizar/adaptar/crear, instalación, adaptación, filosofía y verificación.

#### Scenario: Flujo completo
- **WHEN** el agente sigue las guías en orden
- **THEN** produce primero la UX-SPEC (pantallas, flujos y estados), luego el inventario de componentes, selecciona candidatos del catálogo, los instala o adapta y verifica con Playwright

#### Scenario: Sin Figma
- **WHEN** el proyecto no dispone de Figma MCP
- **THEN** la guía de tokens ofrece el fallback de derivar tokens desde `PRODUCT.md` y la filosofía del kit

## ADDED Requirements

### Requirement: UX phase integration
La capa de conciencia (`AGENTS.md`) y la skill genérica (`SKILL.md`) SHALL documentar la fase UX como primer paso del flujo, los cuatro caminos (sin UX, resumen, rediseño, auditoría), el comando de contexto (`tools/context.mjs`) y la regla de no rediseñar sin elección explícita del usuario. El mapa de la guía 00 SHALL reflejar el reemplazo de `01-ANCHOR` por `01-UX-FLOWS`.

#### Scenario: Agente entra al repo con UX
- **WHEN** un agente lee `AGENTS.md` o `SKILL.md` en un proyecto con UX existente
- **THEN** sabe que debe analizar el contexto, preguntar el modo (resumir o rediseñar) y registrar los resultados en `ai-frontend-output/ux/`

#### Scenario: Mapa actualizado
- **WHEN** un agente sigue la guía `00-START-HERE.md`
- **THEN** encuentra la fase UX como paso 1 y los cuatro caminos con sus salidas
