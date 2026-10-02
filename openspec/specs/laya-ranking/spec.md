# laya-ranking Specification

## Purpose
Integra el motor de decisión local Laya en el kit para ordenar los candidatos del catálogo según su encaje con la necesidad declarada, usando probabilidades calibradas, sin servidor y sin sacar datos del PC de desarrollo.

## Requirements

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

El script SHALL aplicar los filtros del dataset de forma determinista ANTES de invocar a Laya, y SHALL limitar los candidatos enviados al modelo (por defecto 8, máximo 12). Con `--dataset components` (por defecto) SHALL filtrar por categoría, entry type, stack, licencia, uso comercial, fuente y texto sobre el catálogo de componentes; con `--dataset experience` SHALL filtrar por `kind` (arquetipo, filosofía, estilo, tipo de página, pregunta, modelo de navegación) y por fase (`--phase`) sobre `experience/experience-manifest.json`. Laya NO SHALL decidir hechos como licencias, compatibilidad, disponibilidad ni la idoneidad final; esos datos provienen siempre del catálogo o del manifest y la decisión es del usuario.

#### Scenario: Filtro comercial

- **WHEN** se ejecuta con `--dataset components` y el filtro de uso comercial
- **THEN** ninguna entrada con `commercial_use: false` llega al modelo ni aparece en la salida

#### Scenario: Filtro por tipo de experiencia

- **WHEN** se ejecuta con `--dataset experience --kind archetype`
- **THEN** solo compiten las entradas de arquetipo del manifest de experiencia, con su perfil textual (nombre, descripción y caso de uso)

#### Scenario: Preguntas elegibles

- **WHEN** se ejecuta con `--dataset experience --kind question --phase <n>`
- **THEN** solo compiten las preguntas de esa fase y el pre-filtro respeta el orden determinista por fase e id

#### Scenario: Sin candidatos

- **WHEN** el pre-filtro no encuentra candidatos
- **THEN** el script termina indicando ampliar filtros y no invoca a Laya

### Requirement: Typed questions

La consulta SHALL construirse con preguntas tipadas de Laya y una plantilla de instrucciones por tarea (`--task`): `fit` (encaje por candidato y mejor opción global, catálogo de componentes), `direction` (encaje por arquetipo/filosofía/estilo y mejor dirección para el estado del proyecto), `next-question` (valor informativo de cada pregunta elegible y mejor pregunta siguiente) y `options` (encaje de cada opción de una pregunta y mejor opción para una respuesta ambigua). El estado SHALL componerse con la necesidad declarada más la dirección de experiencia opcional (`--direction <id>`, resuelta desde `experience/experience-manifest.json` e inyectada como perfil de la dirección antes del contexto del proyecto) más el contexto opcional (`--context`/`--context-file`, p. ej. el brief en curso). Si el id de dirección no existe, el script SHALL avisar y continuar sin bloquear. Cada tarea SHALL mantener una pregunta `noul` por candidato y una `choice` global con las mismas opciones. El payload SHALL poder previsualizarse sin ejecutar el modelo (`--dry-run`).

#### Scenario: Previsualización

- **WHEN** se ejecuta el modo de previsualización
- **THEN** el script imprime la tarea, el estado, las preguntas y la lista de candidatos sin importar Laya

#### Scenario: Tarea de dirección

- **WHEN** se ejecuta `--dataset experience --kind philosophy --task direction` con el brief como contexto
- **THEN** el payload incluye una `noul` por filosofía y una `choice` de mejor dirección

#### Scenario: Tarea de pregunta siguiente

- **WHEN** se ejecuta `--dataset experience --kind question --task next-question`
- **THEN** el payload pregunta por el valor informativo de cada pregunta elegible y por la pregunta que debería formularse a continuación

#### Scenario: Preguntas construidas

- **WHEN** hay candidatos tras el pre-filtro
- **THEN** el payload incluye una `noul` por candidato con su perfil y una `choice` con las mismas opciones

#### Scenario: Contexto de dirección

- **WHEN** se ejecuta con `--direction <id>` (p. ej. al rankear componentes) y el id existe en el manifest
- **THEN** el estado incluye el perfil de la dirección antes del contexto del proyecto, y el dry-run muestra el id usado

#### Scenario: Dirección desconocida

- **WHEN** el `--direction <id>` no existe en `experience/experience-manifest.json`
- **THEN** el script avisa, continúa con la necesidad y el contexto, y no bloquea el ranking

### Requirement: Calibrated output

La salida SHALL ordenar los candidatos por la probabilidad de encaje devuelta por el modelo, mostrar la probabilidad y la señal de la pregunta `choice`, marcar los casos de baja confianza como inciertos, e incluir la tarea y el `kind`/dataset usados. Con `--dataset components` SHALL fusionar los hechos del catálogo (licencia, comando de instalación, enlaces); con `--dataset experience` SHALL fusionar los campos de la entrada del manifest (descripción, `use_case`, riesgos, `not_for`, `navigation_model`). SHALL existir una salida JSON para consumo por agentes.

#### Scenario: Ranking legible

- **WHEN** el modelo responde
- **THEN** el script imprime una tabla ordenada por probabilidad con la tarea, el dataset y los datos de cada candidato

#### Scenario: Salida JSON

- **WHEN** se solicita salida JSON
- **THEN** el script emite un objeto con la necesidad, la tarea, el dataset, los candidatos rankeados, las probabilidades y los metadatos de routing del modelo

#### Scenario: Baja confianza

- **WHEN** la probabilidad del mejor candidato es baja
- **THEN** la salida lo marca como incierto y sugiere comparar alternativas, ampliar el pre-filtro o volver al fallback determinista

### Requirement: Fallback

El script NO SHALL bloquear el flujo: ante ausencia de Python/Laya o error en la ejecución, SHALL indicar el fallback determinista y salir con error explicado. El fallback SHALL ser `find`/`get` para componentes y el orden del árbol de preguntas más la tabla heurística de direcciones para experiencia.

#### Scenario: Laya no disponible

- **WHEN** el agente ejecuta el script sin tener Laya instalado
- **THEN** el script explica cómo instalarlo y recuerda los fallbacks (`find`/`get`; árbol de preguntas y heurísticas de dirección)

#### Scenario: Experiencia sin motor

- **WHEN** se pide un ranking de experiencia sin Laya
- **THEN** el script remite al árbol determinista de `QUESTION-BANK.md` y a las tablas de arquetipos/filosofías/estilos, sin bloquear la fase

### Requirement: Registration in the kit

La capa de conciencia (`AGENTS.md`), la guía de experiencia (`guides/01-EXPERIENCE-DIRECTION.md`) y la guía de búsqueda (`guides/05-FIND.md`) SHALL documentar el chequeo, la instalación y el uso del ranking Laya para sus tres usos —preguntas adaptativas, dirección (arquetipos/filosofías/estilos) y componentes—, junto con el aviso de que el modelo opina sobre encaje semántico, que los hechos provienen del catálogo o del manifest y que las probabilidades son relativas entre candidatos. El uso de componentes SHALL documentar `--direction <id>` como contexto recomendado (la dirección elegida del `EXPERIENCE-BRIEF.md`) y el consentimiento por sesión ya establecido en la fase de dirección.

#### Scenario: Agente nuevo en el repo

- **WHEN** un agente lee `AGENTS.md`
- **THEN** encuentra el paso Laya con los comandos exactos para preguntas, dirección y componentes, y sabe cuándo caer al fallback determinista

#### Scenario: Guía de experiencia

- **WHEN** un agente sigue `guides/01-EXPERIENCE-DIRECTION.md`
- **THEN** la guía le indica usar `--task next-question` en las rondas y `--task direction` antes de proponer las tres direcciones, con el brief como contexto

#### Scenario: Componentes con dirección

- **WHEN** el agente rankea componentes tras el shortlist de `find`
- **THEN** la guía `05-FIND.md` le indica pasar `--direction <id>` y el brief como contexto, adoptar el orden como shortlist y mantener los hechos y licencias en `get`

### Requirement: Consent before use

El uso de Laya SHALL ser opcional y explícito: el agente SHALL pedir permiso al usuario **una vez por proyecto o sesión**, registrar el consentimiento (o su revocación) en `ai-frontend-output/ux/EXPERIENCE-BRIEF.md` y usar la bandera `--confirmed` en cada llamada posterior mientras el consentimiento siga vigente; si el usuario lo revoca, el agente SHALL volver al fallback determinista. El script SHALL exigir `--confirmed` para cargar el modelo y, sin ella, SHALL explicar el paso de consentimiento y terminar sin ejecutar el ranking.

#### Scenario: Sin confirmación

- **WHEN** se ejecuta el ranking sin la bandera de confirmación
- **THEN** el script no importa Laya, indica que debe pedirse permiso al usuario y muestra el comando a repetir con `--confirmed`

#### Scenario: Consentimiento de sesión

- **WHEN** el usuario autorizó el uso de Laya al inicio de la fase y el agente registró `laya_consent` en el brief
- **THEN** las llamadas siguientes usan `--confirmed` sin volver a preguntar, y una revocación del usuario elimina el registro

#### Scenario: Con confirmación

- **WHEN** el usuario ha dado su permiso y el agente repite con `--confirmed`
- **THEN** el ranking se ejecuta con normalidad y se mantienen las reglas de hechos vs opinión

#### Scenario: Regla en la documentación

- **WHEN** un agente lee `AGENTS.md` o `guides/05-FIND.md`
- **THEN** encuentra la regla de pedir consentimiento antes de usar Laya y sabe que `find`/`get` son la vía por defecto sin Laya

#### Scenario: Comandos sin modelo

- **WHEN** se ejecutan `--check`, `--install` o `--dry-run`
- **THEN** no se requiere la confirmación porque no ejecutan el modelo
