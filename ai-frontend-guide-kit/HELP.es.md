# Ayuda — qué es este kit y qué le podés pedir

Explicación en lenguaje simple del kit AI Frontend Guide. Leé esto en vez de recorrer las carpetas. English: `HELP.md`.

## Qué es

Un kit guiado que un agente de IA (o una persona) usa para construir y cambiar interfaz sin inventar lo que ya existe: **reutilizar antes de crear**. Trae un catálogo de componentes reutilizables, una capa de dirección de experiencia, un flujo de tres fases a demanda y herramientas locales que responden en una página en lugar de leer todo el repositorio.

No es una librería de componentes ni un framework: nunca copia código de terceros, guarda metadatos, enlaces y decisiones.

## Qué corre siempre y qué corre solo cuando lo pedís

| | Qué pasa | Dónde escribe |
|---|---|---|
| **Siempre** | El instalador escanea el proyecto y mantiene un mapa del frontend: componentes, quién los usa, rutas, rol visual, strays e imports sin resolver. Cada `build` posterior anota qué componentes se agregaron o se fueron. | solo en `ai-frontend-output/` |
| **Siempre** | `node install.mjs init` (o `update`) pone un bloque corto en `AGENTS.md`, `CLAUDE.md` y los demás documentos de agente que tenga el proyecto, para que todo agente lea `INDEX.md` y ejecute el flujo antes de cualquier trabajo de frontend o diseño. Nunca se salta un paso. | esos documentos, solo entre las marcas del kit |
| **Siempre** | Cada decisión de diseño queda registrada y es reutilizable entre sesiones y proyectos. | `ai-frontend-output/selections.jsonl`, `combinations.json` |
| **Solo cuando lo pedís** | El flujo de tres fases (dirección de experiencia → composición → pulido) y las auditorías que incluye. | los archivos de cada paso |
| **Solo cuando lo pedís** | Trabajo de arquitectura: estructura FSD, refactor o adaptación de un repo existente. Nunca impuesto, nunca silencioso, nunca en un proyecto que no lo pidió. | `ai-frontend-output/architecture.json` + el cambio que aprobaste |

El mapa nunca edita, mueve ni renombra el código del proyecto. Las violaciones existentes de la filosofía de separación se registran, no se cambian.

## Las tres fases (puntos de entrada, no una tubería)

| Fase | Qué producís |
|---|---|
| **1 · UX y teoría** | `EXPERIENCE-BRIEF.md` (arquetipo, filosofía, recorrido, IA, tres direcciones, brief visual), `PRODUCT.md`, `UX-SPEC.md`, `flow-report.html`, `ux-map.excalidraw`, `design-tokens.json`, `DESIGN.md` + tema |
| **2 · Composición** | inventario de componentes, preselección, una decisión `reuse` / `adapt` / `build` por bloque, instalación, componentes adaptados |
| **3 · Pulido total** | auditorías externas, loop de Playwright MCP en verde, E2E + regresión visual en verde |

Entrás por la fase que indica el pedido. Un cambio chico nunca repite la fase de UX (`guides/10-ITERATE.md`).

## Herramientas

Se corren desde la raíz del proyecto. Cada una imprime una pantalla, no un volcado.

| Herramienta | Qué responde |
|---|---|
| `tools/context.mjs` | ¿Qué es este repositorio? Stack, rutas/pantallas, documentos, artefactos de UX previos y sus librerías de UI (cubiertas por el catálogo, compatibles o por investigar en su propia documentación) → `ai-frontend-output/ux/REPO-CONTEXT.md` |
| `tools/ui-map.mjs` | `build` escribe el mapa; `impact <rol|componente>` lista dueño, usuarios, rutas, strays e imports sin resolver; `have <nombre>` responde si el componente ya existe, con alias de tipo, coincidencias cercanas y candidatos del catálogo; `types` informa cobertura de los tipos canónicos, componentes sin clasificar y posibles duplicados; `docs` lista los documentos que pide el perfil y cuáles faltan; `check` lista todos los hallazgos (imports sin resolver, tipos duplicados, strays, roles sin dueño, documentos que faltan) y sale con 1 cuando el perfil considera bloqueante alguno (`sprint` ninguno, `standard` imports sin resolver + documentos faltantes, `long-term` todos) |
| `catalog/digest.md` | El panorama del catálogo: las 5 mejores entradas por categoría, una línea cada una, para leer una vez antes de buscar |
| `tools/scout.mjs` | Dada la URL de una web de componentes: ¿ya es una fuente del catálogo? Con `--fetch`, un informe corto de esa página (componentes, comandos de instalación, pistas de licencia y de pago); con `--record`, la guarda en las librerías del proyecto |
| `tools/pieces.mjs` | Registro de los componentes reutilizables del propio proyecto (de micro a grande) con versiones, variantes, uso, opiniones y procedencia. El kit nunca copia código de componentes: una pieza es un archivo en la carpeta de componentes del proyecto, y el kit guarda solo metadatos, historial e índice (`ai-frontend-output/pieces/`). `find` busca tus piezas, luego variantes, luego piezas de tus otros proyectos registrados (`adopt` copia el archivo), luego el catálogo, y solo después permite una pieza nueva; `get.mjs <id> --landed <ruta>` registra un componente del catálogo con su origen; cada pieza guarda origen (generated, catalog, internet, project) y relación (chosen, modified, copied). Índice SQLite FTS5 con hashes SHA-256 si está disponible (si no, lee los registros). Comandos: `find`, `add`, `adopt`, `version`, `use`, `like`, `dislike`, `note`, `show`, `list`, `index`, `personality` |
| `tools/tokens.mjs` | Tokens de diseño como datos: `design-tokens.json` (formato W3C) junto a `DESIGN.md`. Tú eliges pocos valores (colores, fuentes, radio, densidad, escala tipográfica, movimiento) y `init` calcula el resto: rampas tonales, colores semánticos con texto que pasa 4,5:1, escala tipográfica, espaciado, movimiento. `check` mide cada par de contraste, `css` imprime el tema de Tailwind v4, `doc` escribe las tablas de tokens de `DESIGN.md`, `contrast <fg> <bg>` responde AA |
| `tools/recipe.mjs` | Recetas de página: para cada tipo de página (landing, precios, artículo, checkout, panel, tabla, ajustes, 404 ...) las secciones en orden, el trabajo de cada una, las palabras para buscar en el catálogo y el layout a usar. `suggest` indica la receta de cada pantalla del UX spec, `inventory --write` escribe `INVENTORY.md` a partir de ellas para que el modelo revise filas en vez de escribir la tabla desde cero, `show <id>` y `list` leen una, `check` valida los datos. Los números (contenedor, rejilla, padding de sección, tamaños de texto) están en `experience/LAYOUT-RULES.md` |
| `tools/svg.mjs` | Formas y comprobaciones de SVG, sin dependencias. `gen <tipo>` crea formas deterministas a partir de `design-tokens.json` y una semilla (blob, wave, grid, dots, pattern, rings, noise-lines, gradient-mesh, arrow, squiggle, badge, frame, underline, icon-base), `check` da una lista numerada de arreglos (viewBox, paleta, trazos, tamaño, accesibilidad, scripts), `optimize` limpia un archivo y `sprite` crea una hoja de `<symbol>` |
| `tools/scene.mjs` | 3D como instrucciones, solo cuando se elige 3D. `init` escribe el esqueleto de `SCENE-SPEC.md` (propósito, cámara, luz, materiales por nombre de token, movimiento, presupuesto de rendimiento, alternativa, salida), `check` lista arreglos numerados (token desconocido, presupuesto ausente, sin alternativa, sin línea de movimiento reducido), `prompt` imprime un prompt para una herramienta 3D externa y `code` un punto de partida en Three.js con el presupuesto, el póster de reserva y `prefers-reduced-motion`, ambos hechos desde la especificación |
| `tools/board.mjs` | Tablero de diseño en Storybook, hecho con los componentes del propio proyecto. `detect` dice si Storybook está y imprime el comando exacto de instalación (nunca instala: el agente pregunta antes al usuario), `plan` propone los tableros desde `ui-map.json`, `scaffold <página> --version <nombre>` escribe una story por versión de layout, `list` muestra tableros y versiones y `check` avisa de stores, routers o llamadas a API en un tablero |
| `tools/find.mjs` | Qué entradas del catálogo encajan por categoría, stack, texto o uso comercial |
| `tools/get.mjs` | La ficha completa de una entrada: qué es, cuándo usarla, instalación, límites de licencia |
| `tools/flow.mjs` | `list` muestra todas las rutas y pasos (el texto de `guides/FLOWS.md`); `status` dice si el kit está instalado, la ruta y el paso activos y lo que el proyecto tiene registrado; `start <ruta>` declara la ruta; `next` imprime la instrucción completa del micro-paso actual (objetivo, comandos exactos, plantilla, criterio de terminado; textos en `tools/flow-steps.mjs`), ya resuelta según lo que el proyecto tiene instalado; `scaffold [<paso>[.<parte>]]` escribe la plantilla de un micro-paso en su archivo (sin cambiar lo que ya hay); `done <paso>` rechaza un paso saltado, un artefacto que falta o un archivo con secciones vacías, con un marcador `<…>` o con ids que no existen (las comprobaciones están en `tools/flow-gates.mjs`), y los pasos grandes se cierran parte por parte (`done direction.questions`); `report <paso>` escribe la lista que `polish`, `iterate`, `redesign` y `visual-feedback` necesitan además de `--evidence`; `reset` quita la ruta. Estado: `ai-frontend-output/flow-state.json`, que se versiona con el proyecto |
| `tools/memory.mjs` | `add`, `list`, `summary`, `combo save\|list\|show\|apply` — el historial reutilizable de decisiones; `lib add\|list\|sync` guarda las librerías de UI que usa el proyecto y las que hay que investigar (`sync` importa lo que detecta `context.mjs`) |
| `tools/excalidraw-mcp.mjs` | Servidor MCP local de Excalidraw, offline, para el mapa de pantallas y navegación |
| `tools/kit-mcp.mjs` | Servidor MCP local sin dependencias (opcional): 17 herramientas tipadas (`flow_*`, `find`, `get`, `technique_*`, `recipe_*`, `tokens_check`, `audit_design`, `svg_*`, `scene_check`) que ejecutan los mismos comandos que la CLI y revisan los datos antes; la CLI sigue siendo la base |
| `tools/kit-path.mjs` | Ayuda interna: escribe la única forma de comando que imprime cada herramienta (`node ai-frontend-guide-kit/tools/<herramienta> ...`, la ruta del kit relativa a la raíz del proyecto) |
| `tools/laya_select.py` | Motor de decisión local opcional: ordena preguntas, direcciones y componentes (`--check`, `--install`) |
| `tools/audit-a11y.mjs` | Chequeo WCAG 2.x A/AA de una o más URLs con axe-core + Playwright |
| `tools/audit-perf.mjs` | Presupuesto de Core Web Vitals con Lighthouse: LCP, CLS, TBT |
| `tools/audit-design.mjs` | Auditoría de diseño: lista numerada de arreglos para colores, tamaños y espaciados fuera de `design-tokens.json`, valores arbitrarios, tamaños de texto, movimiento, foco y encabezados, y (con `--url` y Playwright) desborde a 360/768/1280, contraste, tamaño de los objetivos táctiles, largo de línea y solapes; `--report` alimenta la puerta de `polish` |
| `tools/audit-honesty.mjs` | Escaneo estático de patrones engañosos en textos y marcado de la interfaz: escasez y urgencia falsas, cuentas atrás, "personas viendo esto", cancelación difícil, suscripciones que nunca dicen cancelar, botones de rechazo diminutos, comisiones, casillas premarcadas, diálogos sin cierre, feeds infinitos (marca para revisar, nunca prueba de intención) |
| `tools/technique.mjs` | El repertorio de técnicas en `experience/techniques.json`: <!--fig:techniques-->133<!--/fig--> fichas cortas (cuándo usar, cuándo no, pasos, comprobación, coste, alternativa, direcciones de estilo) de layout, tipografía, color, movimiento, imagen, 3D, SVG, interacción, contenido, dirección y psicología; las de tipo external dan el prompt para una herramienta fuera del kit. `find "<need>"` y `get <id>` responden en menos de 1 KB, `digest` escribe la lista de una página `experience/TECHNIQUES.md`, `check` valida el archivo |
| `install.mjs` | Copia el kit al proyecto, agrega el bloque de ruteo, crea la carpeta de memoria, corre el primer escaneo y opcionalmente instala skills y servidores MCP |

## Skills

Las skills son aceleradores opcionales. Los archivos del kit siempre ganan sobre la opinión por defecto de una skill.

| Skill | Cuándo corre |
|---|---|
| `ai-frontend-guide` | El router por el que pasa todo pedido de diseño, UI o UX; es corta y abre un solo archivo de `steps/` en el paso en que está el flujo |
| `frontend-polish` | Fase 3: auditorías externas + loop de Playwright MCP + regresión |
| `frontend-refactor` | Solo si lo pedís explícitamente: mapea las carpetas a los roles de FSD y refactoriza una slice por vez, corriendo `ui-map build` y `check` después de cada una |
| `svg-craft` | Iconos, ilustraciones, divisores y patrones: se generan con `svg.mjs gen` o se dibujan en una rejilla de 24, y luego `check` y `optimize` |
| `scene-3d` | Escenas 3D: primero se escribe y se comprueba `SCENE-SPEC.md`, luego código Three.js o un prompt para una herramienta 3D externa, ambos hechos desde la especificación |
| `storybook-board` | Tablero de diseño: stories de Storybook que componen los componentes presentacionales reales con datos de ejemplo, una story por versión de layout; siempre pregunta antes de instalar Storybook |
| `technique-layout` | composición de página: rejillas, hero, ritmo, móvil; loaded only at its step, with `technique.mjs find --area layout` |
| `technique-type` | fuentes, escala, titulares, texto sobre imagen; loaded only at its step, with `technique.mjs find --area type` |
| `technique-color` | paleta, acentos, degradados, modo oscuro real; loaded only at its step, with `technique.mjs find --area color` |
| `technique-motion` | animación con propósito y alternativa sin movimiento; loaded only at its step, with `technique.mjs find --area motion` |
| `technique-imagery` | dirección de arte, marcadores, prompts para herramientas de imagen; loaded only at its step, with `technique.mjs find --area imagery` |
| `technique-3d` | escena en texto primero, alternativa 2D, presupuesto; loaded only at its step, with `technique.mjs find --area 3d` |
| `technique-psychology` | atención, elección, formularios, pruebas, urgencia honesta; loaded only at its step, with `technique.mjs find --area psychology` |
| `ux-map` | El mapa de pantallas y navegación en `ai-frontend-output/ux/ux-map.excalidraw` |
| `userflow` | Dispatcher de las skills de flujo; también `userflow audit` para una pantalla |
| `flow-onboarding` | Primera vez, activación y configuración inicial |
| `flow-auth` | Registro, ingreso, recuperación, verificación |
| `flow-app-shell` | Marco de navegación, barras laterales, cabeceras, shell responsive |
| `flow-tables` | Tablas de datos, filtros, orden, acciones masivas, densidad |
| `flow-forms` | Formularios, validación, carga en varios pasos |
| `flow-search` | Entrada de búsqueda, resultados, filtros, sin resultados |
| `flow-navigation` | Menús, pestañas, migas de pan, jerarquías profundas |
| `flow-settings` | Cuenta, preferencias, configuración de organización |
| `flow-checkout` | Carrito, pago, confirmación de pedido |
| `flow-paywall` | Límites de prueba, avisos de mejora, precios bloqueados |
| `flow-permissions` | Roles, pedidos de acceso, estados denegados |
| `flow-sharing` | Invitaciones, enlaces, colaboración, vistas públicas |
| `flow-empty-states` | Vacío de primera vez, vacío por resultado, vacío por permisos |
| `flow-errors` | Estados de error, caminos de recuperación, pantallas de borde |
| `flow-ai-chat` | Interfaz conversacional: caja de prompt, streaming, citas |

## Qué le podés pedir

- "Armame una landing para X" → dirección, después composición, después pulido.
- "Cambiá los estados de carga de estas pantallas" → primero `ui-map impact loading`, después cambiar cada dueño, usuario y stray que liste.
- "¿Ya tenemos una tabla de datos?" → `ui-map have "data table"`, y decidir reutilizar, adaptar o construir.
- "¿Por qué esta pantalla se ve genérica?" → auditoría de `frontend-polish` y los arreglos que nombre.
- "Documentá la UX que ya existe" → camino resumen de `guides/02-UX-FLOWS.md`, sin rediseño.
- "Revisá accesibilidad y performance de esta página" → `audit-a11y` y `audit-perf`.
- "¿El layout y los espaciados son consistentes?" → `audit-design` (con `--url <página>` para los chequeos renderizados).
- "Dame el contexto de este repositorio en una página" → `context.mjs` más `UI-MAP.md`.
- "Explicale esta herramienta a un colega" → este archivo.

## Prompts listos para copiar

```
Leé ai-frontend-guide-kit/HELP.es.md y contame qué puede hacer este kit por mi proyecto, en lenguaje simple y sin tocar ningún archivo.
```

```
Haz el intake del kit: lee ai-frontend-guide-kit/INDEX.md, ejecuta node ai-frontend-guide-kit/tools/flow.mjs status, sigue flow.mjs next al pie de la letra y declárame la ruta en una línea antes de tocar código.
```

```
Quiero cambiar los estados de carga y de vacío del dashboard. Corré tools/ui-map.mjs impact loading y impact empty, mostrame todos los dueños, usuarios y strays, y solo entonces proponeme el cambio.
```

```
Necesito una tabla de precios con toggle mensual/anual. Primero corré tools/memory.mjs combo list, después tools/ui-map.mjs have "pricing table", después tools/find.mjs --category pricing, y mostrame 2-3 combinaciones con sus datos de licencia antes de construir nada.
```

```
Revisá esta pantalla como la fase de pulido: usá la skill frontend-polish, corré las auditorías que indica, el loop de Playwright MCP y tools/audit-a11y.mjs, y listá lo que falla antes de cambiar código.
```

```
No reestructures nada. Solo documentá lo que existe: resumí la UX de este repositorio desde REPO-CONTEXT.md y UI-MAP.md, con auditoría de antipatrones y sin cambios de código.
```

```
Al final de esta tarea, explicame qué es este kit y qué le puedo pedir, en una pantalla, usando ai-frontend-guide-kit/HELP.es.md como fuente.
```

## Usar las herramientas como herramientas MCP (opcional)

Un agente que habla MCP puede llamar a las herramientas del kit como herramientas tipadas en vez de escribir comandos: un argumento incorrecto vuelve como error, no como caída. El instalador no lo registra; lo agregás vos. Cada herramienta ejecuta el mismo comando `node ai-frontend-guide-kit/tools/<herramienta>.mjs` y devuelve su texto; un comando que falla vuelve como error con su salida. El proyecto es `--dir <proyecto>`, si no `AI_FRONTEND_PROJECT`, si no la carpeta que contiene el kit.

Claude Code, `.mcp.json`:

```json
{ "mcpServers": { "ai-frontend-kit": { "command": "node", "args": ["ai-frontend-guide-kit/tools/kit-mcp.mjs"] } } }
```

OpenCode, `opencode.json`:

```json
{ "mcp": { "ai-frontend-kit": { "type": "local", "command": ["node", "ai-frontend-guide-kit/tools/kit-mcp.mjs"], "enabled": true } } }
```

## Dónde se escribe todo

- `ai-frontend-output/` — la carpeta de memoria: `ui-map.json`, `UI-MAP.md`, `ui-history.jsonl`, `selections.jsonl`, `combinations.json`, `SUMMARY.md`, `ux/`. Vive al lado del kit y sobrevive a los refrescos. Commiteala con el proyecto: es historia, no salida de build.
- Los archivos del proyecto — solo cuando una fase produce un entregable que aprobaste (`DESIGN.md`, componentes, arreglos).
- Nada más. El kit nunca escribe dentro de `ai-frontend-guide-kit/` y nunca edita el código del proyecto durante un escaneo.

## Límites (declarados, no escondidos)

- Los componentes definidos en `.ts`/`.js` planos sin JSX no los detecta el mapa.
- Los alias de `tsconfig.json` se leen; las cadenas heredadas por `extends` no se siguen.
- El rol visual sale de señales de nombre y carpeta: un nombre raro queda sin rol, y un rol puede tener varios dueños — la herramienta lo informa en vez de elegir.
- Los datos de licencia vienen del catálogo y pueden diferir de la página de origen; verificalos antes de producción.
- Laya es opcional y local: sin Python siguen funcionando el árbol de preguntas determinista y las heurísticas.
- El escaneo de honestidad es heurístico: marca patrones para revisar, no prueba intención.
