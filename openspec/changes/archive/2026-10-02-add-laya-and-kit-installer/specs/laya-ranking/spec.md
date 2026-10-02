# Spec Delta

## Purpose

Integra el motor de decisión local Laya en el kit para ordenar los candidatos del catálogo según su encaje con la necesidad declarada, usando probabilidades calibradas, sin servidor y sin sacar datos del PC de desarrollo.

## ADDED Requirements

### Requirement: Local execution
El ranking SHALL ejecutarse íntegramente en el PC de desarrollo; NO SHALL requerir servidor propio ni enviar la necesidad, el catálogo o los resultados a servicios externos (solo la descarga inicial de checkpoints desde Hugging Face).

#### Scenario: Ejecución local
- **WHEN** el agente ejecuta el script de ranking con una necesidad
- **THEN** el modelo se carga en la máquina local y la salida se genera sin llamadas a APIs de terceros distintas de la descarga de pesos

### Requirement: Environment check
El script SHALL ofrecer un modo de chequeo que reporte versión de Python, disponibilidad de pip, presencia de `laya`, checkpoints cacheados y el siguiente paso concreto, con códigos de salida distinguibles (0 = listo, 1 = falta algo).

#### Scenario: Entorno listo
- **WHEN** Python ≥ 3.10, pip y `laya` están disponibles
- **THEN** el chequeo informa que el ranking está listo y muestra el comando de uso

#### Scenario: Falta Laya
- **WHEN** `laya` no está instalado
- **THEN** el chequeo muestra el comando exacto de instalación (`python -m pip install -U laya`) y advierte de la descarga inicial de checkpoints

### Requirement: Guided install
El script SHALL poder instalar o actualizar Laya invocando `python -m pip install -U laya` con el intérprete actual, y SHALL informar del tamaño de la primera descarga de checkpoints antes de usarla.

#### Scenario: Instalación guiada
- **WHEN** el usuario ejecuta el modo de instalación
- **THEN** el script instala Laya con el intérprete en curso y verifica la importación al terminar

### Requirement: Deterministic pre-filter
El script SHALL aplicar los filtros del catálogo (categoría, stack, licencia, uso comercial, fuente, texto) de forma determinista ANTES de invocar a Laya, y SHALL limitar los candidatos enviados al modelo (por defecto 8, máximo 12). Laya NO SHALL decidir hechos como licencias, compatibilidad o disponibilidad; esos datos provienen siempre del catálogo.

#### Scenario: Filtro comercial
- **WHEN** se ejecuta con el filtro de uso comercial
- **THEN** ninguna entrada con `commercial_use: false` llega al modelo ni aparece en la salida

#### Scenario: Sin candidatos
- **WHEN** el pre-filtro no encuentra candidatos
- **THEN** el script termina indicando ampliar filtros y no invoca a Laya

### Requirement: Typed questions
La consulta SHALL construirse con preguntas tipadas de Laya: una pregunta `noul` de encaje por candidato y una pregunta `choice` de mejor opción global, con el estado compuesto por la necesidad y el contexto opcional. El payload SHALL poder previsualizarse sin ejecutar el modelo (`--dry-run`).

#### Scenario: Previsualización
- **WHEN** se ejecuta el modo de previsualización
- **THEN** el script imprime el estado, las preguntas y la lista de candidatos sin importar Laya

#### Scenario: Preguntas construidas
- **WHEN** hay candidatos tras el pre-filtro
- **THEN** el payload incluye una pregunta `noul` por candidato con su perfil y una `choice` con las mismas opciones

### Requirement: Calibrated output
La salida SHALL ordenar los candidatos por la probabilidad de encaje devuelta por el modelo, mostrar la probabilidad y la señal de la pregunta `choice`, marcar los casos de baja confianza como inciertos, y fusionar los hechos del catálogo (licencia, comando de instalación, enlaces). SHALL existir una salida JSON para consumo por agentes.

#### Scenario: Ranking legible
- **WHEN** el modelo responde
- **THEN** el script imprime una tabla ordenada por probabilidad con licencia y comando de instalación por candidato

#### Scenario: Salida JSON
- **WHEN** se solicita salida JSON
- **THEN** el script emite un objeto con necesidad, candidatos rankeados, probabilidades y metadatos de routing del modelo

#### Scenario: Baja confianza
- **WHEN** la probabilidad del mejor candidato es baja
- **THEN** la salida lo marca como incierto y sugiere revisar alternativas o ampliar el pre-filtro

### Requirement: Fallback
El script NO SHALL bloquear el flujo: ante ausencia de Python/Laya o error en la ejecución, SHALL indicar el fallback determinista (`find`/`get`) y salir con error explicado.

#### Scenario: Laya no disponible
- **WHEN** el agente ejecuta el ranking sin tener Laya instalado
- **THEN** el script explica cómo instalarlo y recuerda que `find`/`get` siguen funcionando como vía determinista

### Requirement: Registration in the kit
La capa de conciencia (`AGENTS.md`) y la guía de búsqueda (`guides/04-FIND.md`) SHALL documentar el chequeo, la instalación y el uso del ranking Laya, junto con el aviso de que el modelo opina sobre encaje semántico y que los hechos provienen del catálogo.

#### Scenario: Agente nuevo en el repo
- **WHEN** un agente lee `AGENTS.md`
- **THEN** encuentra el paso Laya con los comandos exactos y sabe cuándo usarlo y cuándo caer a `find`/`get`
