# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Experience knowledge layer

El kit SHALL incluir una capa de conocimiento de dirección de experiencia en `ai-frontend-guide-kit/experience/`: `EXPERIENCE-DIRECTION.md` (manifiesto y proceso), `QUESTION-BANK.md` (árbol de preguntas), `SITE-ARCHETYPES.md`, `UX-PHILOSOPHIES.md`, `STYLE-DIRECTIONS.md`, `REFERENCE-PROTOCOL.md`, `DISCOVERY-LOOP.md` (protocolo del descubrimiento interactivo) y `experience-manifest.json`. El manifest SHALL ser legible por Laya usando la misma forma de entrada que el catálogo (`id`, `name`, `description`, `use_case`, `search_tags`, `source`, `license_type`) más campos propios (`kind`, `phase`, `depends_on`, `unlocks`, `options`, `navigation_model`, `map_template`, `areas`, `risks`, `not_for`), con IDs únicos y los `kind` `archetype`, `philosophy`, `style`, `page-type`, `question` y `navigation-model`. La capa SHALL ser autocontenida, offline y cargarse on-demand (nunca entera en contexto si no hace falta).

#### Scenario: Capa instalada

- **WHEN** el kit se copia a un proyecto
- **THEN** `experience/` viaja con el kit y el manifest parsea con IDs únicos y los campos consumibles por Laya

#### Scenario: Carga on-demand

- **WHEN** el agente necesita una dirección, una pregunta o un estilo
- **THEN** lee solo el documento o bloque necesario, no toda la capa

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
