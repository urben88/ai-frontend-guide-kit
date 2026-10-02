# experience-direction Specification

## Purpose
Define, antes de cualquier flujo o decisión visual, qué experiencia se construye: una capa de conocimiento autocontenida (`experience/`) con preguntas adaptativas, arquetipos, filosofías, estilos, banco de ideas extraídas de referencias y un manifest legible por Laya, que produce `EXPERIENCE-BRIEF.md` con tres direcciones creativas y la dirección elegida como gate de la fase de flujos y tokens.

## Requirements

### Requirement: Experience knowledge layer

El kit SHALL incluir una capa de conocimiento de dirección de experiencia en `ai-frontend-guide-kit/experience/`: `EXPERIENCE-DIRECTION.md` (manifiesto y proceso), `QUESTION-BANK.md` (árbol de preguntas), `SITE-ARCHETYPES.md`, `UX-PHILOSOPHIES.md`, `STYLE-DIRECTIONS.md`, `REFERENCE-PROTOCOL.md`, `DISCOVERY-LOOP.md` (protocolo del descubrimiento interactivo) y `experience-manifest.json`. El manifest SHALL ser legible por Laya usando la misma forma de entrada que el catálogo (`id`, `name`, `description`, `use_case`, `search_tags`, `source`, `license_type`) más campos propios (`kind`, `phase`, `depends_on`, `unlocks`, `options`, `navigation_model`, `map_template`, `areas`, `risks`, `not_for`), con IDs únicos y los `kind` `archetype`, `philosophy`, `style`, `page-type`, `question` y `navigation-model`. La capa SHALL ser autocontenida, offline y cargarse on-demand (nunca entera en contexto si no hace falta).

#### Scenario: Capa instalada

- **WHEN** el kit se copia a un proyecto
- **THEN** `experience/` viaja con el kit y el manifest parsea con IDs únicos y los campos consumibles por Laya

#### Scenario: Carga on-demand

- **WHEN** el agente necesita una dirección, una pregunta o un estilo
- **THEN** lee solo el documento o bloque necesario, no toda la capa

### Requirement: Experience direction phase

La guía `01-EXPERIENCE-DIRECTION.md` SHALL conducir, antes de la fase de flujos, un flujo que produzca `ai-frontend-output/ux/EXPERIENCE-BRIEF.md` con: contexto y usuario, objetivo y acción de éxito, arquetipo de experiencia, filosofía, journey, arquitectura de información, tres direcciones (segura, diferenciada y experimental) con ventajas/riesgos, dirección recomendada, patrones de interacción y brief visual. NO SHALL permitirse pasar a `02-UX-FLOWS.md` sin `EXPERIENCE-BRIEF.md` con arquetipo y dirección elegida.

#### Scenario: Fase completa

- **WHEN** el agente ejecuta la guía 01
- **THEN** existe `EXPERIENCE-BRIEF.md` con arquetipo, filosofía, journey, IA y las tres direcciones, y la dirección elegida queda registrada

#### Scenario: Gate hacia los flujos

- **WHEN** no existe `EXPERIENCE-BRIEF.md` o le faltan arquetipo o dirección
- **THEN** la guía bloquea el paso a `02-UX-FLOWS.md`

#### Scenario: Brief visual

- **WHEN** la dirección queda elegida
- **THEN** el brief incluye una sección visual (estilo, paleta, tipografía, composición, motion y anti-genérico a evitar) que `03-TOKENS.md` consume para derivar tokens

### Requirement: Adaptive question flow

La fase SHALL preguntar de forma adaptativa usando el árbol de `QUESTION-BANK.md` y las entradas `kind: question` del manifest (`phase`, `depends_on`, `unlocks`, `options`): el agente SHALL calcular las preguntas elegibles según lo ya respondido y el contexto del repositorio, NO SHALL preguntar lo que ya puede deducir, SHALL preguntar en rondas de 3–5 (nunca un formulario único), SHALL ofrecer 2–4 opciones más la opción de respuesta libre y SHALL registrar cada respuesta en el estado del brief para habilitar las siguientes preguntas.

#### Scenario: Preguntas encadenadas

- **WHEN** el usuario responde una pregunta
- **THEN** el agente actualiza el estado y la siguiente ronda usa las preguntas cuyas dependencias se cumplieron y descarta las que la respuesta invalidó

#### Scenario: Contexto ya disponible

- **WHEN** una pregunta puede responderse con `REPO-CONTEXT.md`, `PRODUCT.md` o respuestas previas
- **THEN** el agente la deduce y no la formula

#### Scenario: Respuesta ambigua

- **WHEN** la respuesta del usuario es libre y no encaja en las opciones
- **THEN** el agente puede rankear las opciones conocidas con la tarea `options` de Laya (si el usuario dio consentimiento) o pedir una aclaración breve

### Requirement: Curated reference bank

El protocolo `REFERENCE-PROTOCOL.md` SHALL definir el banco de ideas: fichas en `experience/references/reference-<slug>.md` con esquema fijo (tipo de fuente, contexto, experiencia, arquitectura de información, interacción, dirección visual, racional, adaptación y lecciones) e índice ponderado `references/INDEX.md` (evidencia UX, producto real, inspiración visual, agentes). Las fuentes metodológicas SHALL extraerse completas y las galerías SHALL guardarse como método más representantes; una URL concreta SHALL poder extraerse on-demand con Playwright MCP usando el mismo esquema. Las fichas SHALL guardar patrones, estructura y lecciones, y NO SHALL copiar identidad visual, assets ni código de las fuentes. El banco curado del kit (`experience/references/`) SHALL ser evidencia de método y viajar con el kit; las referencias de proyecto elegidas durante el descubrimiento, con sus capturas y notas, SHALL guardarse en `ai-frontend-output/ux/references/` (fuera del kit, sobrevive al refresco) usando el mismo esquema de ficha y nombres de captura estables.

#### Scenario: Ficha guardada

- **WHEN** se extrae una referencia
- **THEN** queda una ficha con el esquema completo, su peso en el índice y etiquetas por arquetipo/filosofía/estilo/patrón

#### Scenario: Extracción on-demand

- **WHEN** el usuario aporta una URL nueva
- **THEN** el agente la analiza con Playwright MCP (estructura, navegación, patrones, estados) y escribe la ficha sin bloquear la fase si la web no es accesible

#### Scenario: Uso ético

- **WHEN** una ficha se usa para una dirección
- **THEN** se citan patrones y lecciones y nunca se replica la identidad visual ni el contenido de la fuente

#### Scenario: Banco de proyecto separado

- **WHEN** el usuario elige una referencia durante el descubrimiento
- **THEN** su ficha y sus capturas se escriben en `ai-frontend-output/ux/references/` sin modificar el banco curado del kit

### Requirement: Creative diversity guardrails

La fase SHALL generar tres direcciones que difieran en arquetipo, recorrido, modelo de navegación, composición o narrativa, y NO SHALL considerarse válidas tres variantes que solo cambien color o tipografía. Cada dirección SHALL explicar por qué encaja, qué se descarta y sus riesgos. El agente SHALL aplicar los tests de propósito (una frase honesta de por qué la técnica sirve a este producto) y de convergencia (la misma técnica repetida sin motivo) y SHALL contrastar la lista anti-genérica de `STYLE-DIRECTIONS.md` (gradiente morado-azul por defecto, tres tarjetas idénticas, eyebrow en mayúsculas, meta con puntos medios, labels mono, flecha en botones, testimonios inventados) antes de recomendar.

#### Scenario: Tres direcciones distintas

- **WHEN** el agente propone las direcciones
- **THEN** cada una cambia al menos un eje estructural (arquetipo, navegación, recorrido, composición o narrativa) y no solo el estilo visual

#### Scenario: Test anti-genérico

- **WHEN** una dirección contiene un patrón de la lista anti-genérica
- **THEN** el agente justifica por qué ese caso concreto lo merece o lo sustituye

#### Scenario: No repetición

- **WHEN** el proyecto registra direcciones previas en `ai-frontend-output/` o combinaciones guardadas
- **THEN** el agente las consulta para no repetir la misma dirección sin motivo

### Requirement: Direction fallback

La fase NO SHALL bloquearse por falta de Laya o Python: sin motor, el agente SHALL usar el orden de fases del árbol de preguntas, la tabla heurística de direcciones de `UX-PHILOSOPHIES.md`/`SITE-ARCHETYPES.md` y las fichas del banco como evidencia, dejando constancia de que no hubo ranking probabilístico.

#### Scenario: Sin Laya

- **WHEN** Laya no está disponible o el usuario no da consentimiento
- **THEN** las preguntas siguen el árbol determinista y las direcciones se eligen con la tabla heurística y las fichas, sin bloquear la fase

### Requirement: Interactive reference discovery

La fase de dirección SHALL ofrecer un loop de descubrimiento interactivo (`experience/DISCOVERY-LOOP.md`) antes de proponer las tres direcciones: el agente SHALL sembrar búsquedas a partir del arquetipo, sector y audiencia; SHALL presentar un *idea deck* de 3–5 webs de ejemplo con enlace, peso (evidencia/producto/inspiración), modelo de navegación y lectura estructural (orden de secciones, qué destaca, qué evitar); SHALL preguntar cuál gusta más y qué se destaca tras navegarlas; SHALL aceptar capturas aportadas por el usuario y poder capturarlas con Playwright MCP; y SHALL destilar los gustos en `EXPERIENCE-BRIEF.md` (con las referencias citadas como `[ref: <slug>]`) y en la memoria de selección. Las rondas SHALL ser acotadas (2–3 sugerencias nuevas por ronda, parando al converger) y el loop NO SHALL bloquear la fase sin búsqueda web o Playwright: se usará el registro de fuentes de `references/INDEX.md`, URLs del usuario o las fichas existentes, dejando constancia de la limitación. La inspiración visual NO SHALL usarse como evidencia de usabilidad.

#### Scenario: Idea deck

- **WHEN** el agente inicia una ronda de descubrimiento con el arquetipo y el contexto ya definidos
- **THEN** presenta 3–5 webs enlazadas, cada una con su peso, modelo de navegación, lectura estructural y un motivo de observación sugerido

#### Scenario: Ronda de navegación

- **WHEN** el usuario navega una o más de las webs propuestas
- **THEN** el agente pregunta cuál prefiere y qué destaca de cada una, y registra las respuestas como gustos/no gustos en el estado del brief

#### Scenario: Capturas

- **WHEN** el usuario aporta una captura o el agente captura una sección con Playwright MCP
- **THEN** la captura se guarda en `ai-frontend-output/ux/references/` junto a la ficha de su referencia y se analiza en términos de patrón y estructura, nunca de identidad visual o contenido copiable

#### Scenario: Persistencia de la elección

- **WHEN** el usuario elige o destaca una referencia
- **THEN** queda una ficha con el esquema del protocolo, una cita `[ref: <slug>]` en `EXPERIENCE-BRIEF.md` y un registro de memoria con `--ref "reference:<slug>"`

#### Scenario: Fallback sin herramientas

- **WHEN** la búsqueda web o Playwright MCP no están disponibles
- **THEN** el agente usa el registro de galerías de `references/INDEX.md`, las URLs que aporte el usuario o las fichas existentes, y deja constancia de la limitación sin bloquear la fase

#### Scenario: Uso ético en el loop

- **WHEN** una web de ejemplo influye en una dirección
- **THEN** el agente cita el patrón y la lección con atribución y NO replica identidad visual, assets, copy ni código de la fuente
