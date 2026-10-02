# Spec Delta

## ADDED Requirements

### Requirement: Discovery loop integration

La capa de conciencia (`AGENTS.md`) y la skill genérica (`SKILL.md`) SHALL documentar el loop de descubrimiento (`experience/DISCOVERY-LOOP.md`): idea deck y ronda de navegación en la guía 01 antes de las tres direcciones, y combinaciones de componentes y candidatos web verificados en la guía 05. La guía 00 SHALL reflejar el loop en su tabla de herramientas y sus casuísticas. `experience/DISCOVERY-LOOP.md` SHALL ser un activo requerido del build del kit (`tools/build-kit.mjs`). El loop SHALL respetar la disciplina de tokens (escribir a archivos y no volcar el catálogo) y NO SHALL introducir dependencias nuevas.

#### Scenario: Documentación enlazada

- **WHEN** un agente lee `AGENTS.md` o `SKILL.md`
- **THEN** encuentra el loop de descubrimiento con sus dos fases y la ruta a `experience/DISCOVERY-LOOP.md`

#### Scenario: Activo requerido del build

- **WHEN** se ejecuta `node tools/build-kit.mjs`
- **THEN** el build falla si `experience/DISCOVERY-LOOP.md` no existe en el kit

#### Scenario: Guía 01 con descubrimiento

- **WHEN** el agente sigue `guides/01-EXPERIENCE-DIRECTION.md`
- **THEN** encuentra el paso de descubrimiento de referencias entre el journey/IA y las tres direcciones, con su salida en `EXPERIENCE-BRIEF.md`

#### Scenario: Guía 00 actualizada

- **WHEN** un agente lee el router `guides/00-START-HERE.md`
- **THEN** la tabla de herramientas y las casuísticas mencionan el descubrimiento de referencias y combinaciones

### Requirement: Component combination proposals

En el paso de búsqueda (guía 05), el agente SHALL presentar combinaciones de componentes (2–3 conjuntos con un propósito, p. ej. nav + hero + fondo) antes de cerrar la selección, cada una con el racional del encaje (densidad, presupuesto de motion, personalidad), los ids del catálogo y sus hechos (licencia, comando de instalación) tomados de `get`, y SHALL pedir la reacción del usuario (elegir o intercambiar piezas) iterando variantes. Para componentes fuera del catálogo, el agente SHALL buscar en internet y NO SHALL proponerlos como usables sin verificar su licencia en la página de origen; los candidatos web SHALL marcarse como provisionales hasta confirmarla y NO SHALL añadirse automáticamente al catálogo. Las elecciones SHALL registrarse en la memoria y la combinación aceptada SHALL poder guardarse con `combo save`.

#### Scenario: Combinaciones razonadas

- **WHEN** existen candidatos en el catálogo para los bloques de una pantalla
- **THEN** el agente presenta 2–3 combinaciones con su racional y los hechos de `get`, y pide al usuario elegir o intercambiar antes de decidir

#### Scenario: Candidato web sin licencia verificada

- **WHEN** un componente descubierto en internet no está en el catálogo
- **THEN** el agente lo marca como provisional, verifica su licencia en la página de origen antes de proponerlo como usable y no lo añade al catálogo

#### Scenario: Elección registrada

- **WHEN** el usuario acepta o modifica una combinación
- **THEN** cada decisión queda en memoria y la combinación final puede guardarse con `combo save`
