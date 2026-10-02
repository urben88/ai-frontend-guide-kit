# Spec Delta

## MODIFIED Requirements

### Requirement: Catalog-enriched records

Cuando la decisión incluye un `entry_id`, el registro SHALL enriquecerse con los hechos del catálogo (nombre, fuente, categoría, licencia, uso comercial, comando de instalación) y el comando SHALL fallar con un error claro si el id no existe. Los hechos NO SHALL escribirse a mano. Cuando la decisión no tiene `entry_id` pero incluye `--ref` (p. ej. `reference:<slug>` o `direction:<id>`), el registro SHALL ser válido sin `--id`, usando la referencia como nombre y omitiendo el enriquecimiento del catálogo. Fuera de esos casos, `--id` SHALL seguir siendo obligatorio salvo `--decision build`.

#### Scenario: Entrada válida

- **WHEN** se registra una decisión con un `entry_id` existente
- **THEN** el registro incluye licencia y comando de instalación tomados del catálogo

#### Scenario: Entrada inexistente

- **WHEN** el `entry_id` no existe en el catálogo
- **THEN** el comando falla y sugiere usar `find.mjs` para obtener un id válido

#### Scenario: Decisión de construcción propia

- **WHEN** la decisión es `build` (sin entrada del catálogo)
- **THEN** el registro acepta `--name` y una justificación, y queda marcado como componente propio

#### Scenario: Nota de referencia o dirección

- **WHEN** se registra una decisión solo con `--ref` y sin `--id`
- **THEN** el registro se añade usando la referencia como nombre, sin enriquecimiento del catálogo, y el resumen se regenera
