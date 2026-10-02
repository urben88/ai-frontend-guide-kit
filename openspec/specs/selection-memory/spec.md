# selection-memory Specification

## Purpose
Mantiene un historial persistente de las decisiones de componentes (qué se eligió, por qué, con qué licencia y cómo se instala), genera un resumen de estilos y componentes extraídos, y permite guardar y reutilizar combinaciones completas entre pantallas y proyectos.

## Requirements

### Requirement: Persistent decision history
El sistema SHALL registrar cada decisión en un historial append-only (`selections.jsonl`, un JSON por línea) almacenado en `ai-frontend-output/`, fuera de la carpeta del kit, de modo que sobreviva al refresco del kit por parte del instalador.

#### Scenario: Registro de una decisión
- **WHEN** el agente registra una decisión con `memory.mjs add`
- **THEN** se añade una línea al historial con fecha, proyecto, pantalla, bloque, necesidad, decisión, entrada del catálogo, licencia, comando de instalación, estilos y notas

#### Scenario: Refresco del kit
- **WHEN** el instalador refresca `ai-frontend-guide-kit/`
- **THEN** el contenido de `ai-frontend-output/` permanece intacto

### Requirement: Catalog-enriched records
Cuando la decisión incluye un `entry_id`, el registro SHALL enriquecerse con los hechos del catálogo (nombre, fuente, categoría, licencia, uso comercial, comando de instalación) y el comando SHALL fallar con un error claro si el id no existe. Los hechos NO SHALL escribirse a mano.

#### Scenario: Entrada válida
- **WHEN** se registra una decisión con un `entry_id` existente
- **THEN** el registro incluye licencia y comando de instalación tomados del catálogo

#### Scenario: Entrada inexistente
- **WHEN** el `entry_id` no existe en el catálogo
- **THEN** el comando falla y sugiere usar `find.mjs` para obtener un id válido

#### Scenario: Decisión de construcción propia
- **WHEN** la decisión es `build` (sin entrada del catálogo)
- **THEN** el registro acepta `--name` y una justificación, y queda marcado como componente propio

### Requirement: Generated summary
El sistema SHALL regenerar `SUMMARY.md` tras cada mutación con: totales de decisiones, tabla por pantalla/bloque con la elección, conteo de estilos, fuentes más usadas y decisiones recientes. El resumen SHALL ser legible por humanos y agentes.

#### Scenario: Resumen actualizado
- **WHEN** se añade una decisión o se guarda una combinación
- **THEN** `SUMMARY.md` refleja los totales, estilos y componentes actualizados

### Requirement: Named combinations
El sistema SHALL permitir guardar combinaciones nombradas (`combo save`), listarlas (`combo list`), mostrarlas con comandos de instalación (`combo show`) y aplicarlas a un proyecto (`combo apply`), que añade sus decisiones al historial actual. Las combinaciones SHALL poder reutilizarse entre proyectos copiando `combinations.json` o apuntando la memoria a un directorio compartido.

#### Scenario: Guardar combinación
- **WHEN** se guarda una combinación con nombre
- **THEN** queda almacenada con la fecha, las decisiones por pantalla/bloque y sus estilos agregados

#### Scenario: Mostrar combinación
- **WHEN** se muestra una combinación guardada
- **THEN** la salida incluye cada entrada con licencia y comando de instalación, lista para reutilizar

#### Scenario: Aplicar combinación
- **WHEN** se aplica una combinación a un proyecto
- **THEN** sus decisiones se añaden al historial local como “desde combinación <nombre>” y el resumen se regenera

### Requirement: Token-efficient queries
Las consultas de memoria (`list`, `combo list`, `combo show`) SHALL emitir salidas breves y SHALL ofrecer `--json` para consumo por agentes, sin requerir cargar el historial completo en contexto.

#### Scenario: Listado reciente
- **WHEN** el agente ejecuta `memory.mjs list`
- **THEN** recibe las últimas decisiones en formato compacto (fecha, pantalla, bloque, entrada)

#### Scenario: Salida JSON
- **WHEN** se solicita `--json`
- **THEN** la salida es un objeto estructurado reutilizable por la skill

### Requirement: Reuse integration
La guía de búsqueda SHALL indicar consultar las combinaciones guardadas antes de buscar en el catálogo, y la guía de decisión SHALL exigir registrar cada decisión con la herramienta de memoria. `AGENTS.md` y la skill genérica SHALL documentar los comandos de memoria y la regla de registro.

#### Scenario: Proyecto nuevo con combinaciones
- **WHEN** el agente empieza el inventario de un proyecto y existen combinaciones guardadas
- **THEN** la guía le indica listarlas y usar `combo show` antes de buscar desde cero

#### Scenario: Decisión registrada
- **WHEN** el agente decide reutilizar, adaptar o construir un componente
- **THEN** la guía exige registrarlo con `memory.mjs add` antes de continuar con el siguiente bloque
