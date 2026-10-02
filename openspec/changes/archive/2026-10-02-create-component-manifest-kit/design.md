# Design

## Context

Este repo (`Diseño`) es la fábrica del sistema: contiene los dos documentos origen (`componentes_reutilizables.md` y `flujo_operativo_creaci_n_de_frontend_con_skills_figma_mcp_y_playwright.md`) y no tiene código de aplicación. La investigación de las 16 fuentes ya está hecha y verificada (fechas, endpoints, licencias y volúmenes de esta conversación); el diseño parte de ese reconocimiento, no lo repite. Ver `proposal.md` para la motivación.

Restricciones que condicionan el diseño:

- El entorno es Windows + PowerShell 5.1 con Node.js 24 y npm 11; los scripts deben ser multiplataforma y sin dependencias nativas.
- Los proyectos destino son apps React/Next.js + Tailwind v4 (flujo operativo), aunque varias fuentes son HTML/vanilla y el kit debe cubrirlas sin acoplarse a React.
- El kit se copia y pega: debe ser autocontenido, sin build en destino, y sin transportar código de terceros (licencias lo prohíben en varias fuentes).
- El consumo de tokens del agente destino es el criterio central: el catálogo completo (~3.100 entradas, ~2–3 MB) nunca debe cargarse entero en contexto.

## Goals / Non-Goals

**Goals:**

- Pipeline reproducible que genere `manifest/` desde 16 fuentes con adaptadores por canal de extracción.
- Catálogo en dos capas: índice ligero + fichas por fuente, con metadatos de decisión (qué es, dónde, cómo, restricciones).
- Carpeta guiada `ai-frontend-guide/` autocontenida (EN) con flujo reuse-first de UX/UI, filosofía destilada y herramientas `find`/`get` de consulta mínima.
- Contrato de datos estable para que el futuro MCP reutilice índice, fichas y semántica de consulta sin cambios de esquema.

**Non-Goals:**

- Implementar el servidor MCP y la recomendación con modelo local (cambio futuro `add-component-mcp-server`).
- Inventariar completo Uiverse y 21st.dev (se curan top 30 por categoría).
- Vendorizar código de componentes o publicar paquetes npm propios.
- Sustituir las skills (`impeccable`, `taste-skill`, `emilkowalski`): el kit destila sus reglas para proyectos que no las tengan instaladas.

## Decisions

### D1. Catálogo en dos capas (índice ligero + fichas por fuente)

`manifest/component-manifest.json` contiene solo fuentes, conteos, categorías, licencias agregadas y rutas; `manifest/sources/<source>.json` contiene las entradas completas. El agente lee el índice (KB) y carga una ficha solo cuando filtra candidatos.

- Alternativa descartada: un único JSON maestro (~3.100 entradas) — satura contexto y ralentiza lecturas.
- Alternativa descartada: SQLite/base local — añade fricción de copia y binarios al kit.

### D2. Schema normalizado con metadatos de decisión

Cada entrada sigue `manifest/schema.json` con: `id`, `name`, `source`, `entry_type` (`component | block | design-system`), `category` (taxonomía normalizada), `description`, `use_case`, `decision_hints`, `search_tags`, `docs_url`, `registry_url`, `stack`, `dependencies`, `install_method` (`npm | shadcn-cli | copy-paste | cdn | reference`), `install_command`, `manual_steps`, `license_type` (`MIT | Apache-2.0 | proprietary | custom | non-commercial | unknown`), `commercial_use` (`true | false | conditional`), `free`, `limits`, `verified_at`.

- IDs: `{source-id}-{category}-{slug}` (p. ej. `magicui-hero-marquee`); prefijo de fuente para evitar colisiones.
- Alternativa descartada: reutilizar el JSON de ejemplo del doc origen — insuficiente para decidir (sin dónde/cómo/licencia).

### D3. Extracción híbrida con adaptadores por canal

Cuatro familias de adaptador, elegidas por fuente según el reconocimiento:

| Canal | Fuentes | Método |
|---|---|---|
| `registry-json` | Magic UI (`/r/registry.json`), Aceternity (`/registry.json`, filtrar 401), shadcn/ui (`/r/index.json`), coss ui (`/ui/r/registry.json` + legado `/origin/r/*.json`), Motion Primitives (`/c/registry.json`) | Script Node: descarga, filtra premium, mapea a schema |
| `docs-structured` | DaisyUI (`llms.txt` + sitemap), Preline (sitemap), Agents Kit (`llms.txt` + JSON por ítem), aicss.dev (`llms.txt` + GitHub raw, respetando robots), Design Systems Repo (endpoint CMS no documentado, frecuencia mínima y caché) | Script + revisión puntual |
| `github-raw` | Tailblocks (tree API + `src/blocks/index.js`), HyperUI (raw `public/examples/**` desde GitHub, no desde el sitio), Float UI (`componentsNames.ts` + `componentsDB/`) | Script Node |
| `agent-research` | Uiverse (403 → navegador Playwright o mirror `uiverse-io/galaxy`), 21st.dev (sitemap + `.md`, sin scraping; API key opcional), Hover.dev (páginas de categoría HTML) | Subagentes de investigación con evidencia por entrada |

- Regla de ToS: 21st.dev solo por canales sancionados (sitemap, markdown público, OpenAPI); aicss.dev evita `/r/` para bots nombrados; DSR sin redistribuir el dataset (solo metadatos con atribución).
- Alternativa descartada: scraper único genérico — frágil ante 403/Cloudflare y páginas sin datos estructurados.

### D4. Granularidad curada

- Indexado completo: fuentes de ≤ ~200 entradas (DaisyUI 68, Magic UI 157, Aceternity ~116 gratis, shadcn 63, coss 53, Motion Primitives 33, Tailblocks 63, Float UI 192, aicss 13 gratis, Agents Kit 224, DSR 26).
- Curado top N/Categoría (N=30 por defecto, configurable): Uiverse (10 categorías), 21st.dev (~40 categorías), HyperUI (~8/categoría por volumen), Origin legado (~604 variantes: base por categoría).
- Cada ficha de fuente documenta la URL para ampliar el inventario manualmente.

### D5. Estructura de artefactos y empaquetado

```
Diseño/
├── manifest/                    # fuente de verdad del catálogo
│   ├── schema.json
│   ├── component-manifest.json  # índice ligero
│   ├── component-manifest.md    # guía legible (humano/agente)
│   ├── taxonomy.md              # taxonomía normalizada + mapa por fuente
│   ├── install-guides.md        # instalación/obtención de código por fuente
│   └── sources/*.json           # 16 fichas
├── tools/                       # no se copia al destino
│   ├── extract/                 # un script por familia/canal
│   ├── validate.mjs
│   ├── refresh.mjs
│   └── build-kit.mjs            # empaqueta manifest + guías → ai-frontend-guide/
└── ai-frontend-guide/           # carpeta guiada copiable (autocontenida)
    ├── AGENTS.md                # capa 0: conciencia + reuse-first
    ├── README.md                # cómo copiarla e integrarla
    ├── guides/                  # 00…08 (EN, ≤ ~120 líneas c/u)
    ├── catalog/                 # copia empaquetada
    │   ├── component-manifest.json · taxonomy.md · install-guides.md
    │   └── sources/*.json
    └── tools/                   # find.mjs · get.mjs (sin dependencias)
```

- `tools/build-kit.mjs` regenera `catalog/` desde `manifest/`: una sola fuente de verdad, cero duplicación manual.
- Alternativa descartada: editar a mano el kit — se desincroniza.

### D6. Capa de ahorro de tokens

| Capa | Artefacto | Presupuesto |
|---|---|---|
| 0 · Conciencia | `AGENTS.md` | ≤ ~1 página: "hay 16 fuentes / ~X categorías / ~3.100 entradas; consulta antes de crear" |
| 1 · Guía | una guía 00–08 según el paso | ≤ ~120 líneas con checklists y árboles de decisión |
| 2 · Consulta | `tools/find.mjs`, `tools/get.mjs` | Salida < ~1 KB (`find`) y ~1–2 KB (`get`) |
| 3 · Detalle | `catalog/sources/<source>.json` o URL oficial | Solo bajo demanda |

`find` filtra por `--category --stack --license --commercial --free --source --text` y devuelve `id | name | source | una línea`; `get <id>` devuelve la ficha completa con `install_command`, dependencias y licencia. Sin dependencias npm; Node ≥ 20.

- Alternativa descartada: solo JSON + grep — más tokens y sin lógica de filtrado por licencia/stack.

### D7. Guías del flujo estandarizado (reuse-first)

Nueve guías breves en inglés, alineadas con el flujo operativo existente más el paso de reutilización que faltaba:

`00-START-HERE` (mapa + reuse-first) · `01-ANCHOR` (PRODUCT.md: audiencia, conversión, flujos, pantallas) · `02-TOKENS` (Figma MCP o fallback desde PRODUCT.md) · `03-INVENTORY` (pantalla → componentes por taxonomía) · `04-FIND` (catálogo + `find`) · `05-REUSE` (árbol reutilizar/adaptar/crear + licencias + `get` + instalación) · `06-ADAPT` (tokens/tema, sin reescribir) · `07-PHILOSOPHY` (taste + emilkowalski + impeccable destilados, máx. 1–2 efectos/vista) · `08-VERIFY` (Playwright E2E + regresión visual, bucle `/impeccable polish`).

- El árbol de decisión es normativo: consultar catálogo → si hay candidato con licencia/stack compatibles, reutilizar o adaptar; crear solo con justificación registrada.
- Alternativa descartada: mantener solo el documento largo — no guía la reflexión paso a paso ni controla tokens.

### D8. Licencias y no redistribución

- El kit solo contiene metadatos, guías y enlaces; nunca código de terceros.
- Banderas conservadoras: Agents Kit original → `non-commercial`; Float UI → `custom` (no OSI); Aceternity/Hover → `proprietary`; 21st.dev por entrada (`MIT` frecuente, `unknown` posible); aicss Pro no se indexa (solo los 13 gratis).
- Los planes gratuitos con cuota (21st.dev, 2 copias/día) se documentan en `install-guides.md`.

### D9. Idioma

Artefactos OpenSpec en español (prosa) con identificadores técnicos en inglés; contenido del catálogo y guías del kit en inglés (portabilidad y consistencia con los datos).

### D10. Contrato forward-compatible con el MCP

El futuro `add-component-mcp-server` expondrá `list`/`find`/`get` leyendo los mismos archivos y con la misma semántica de filtros que `find.mjs`/`get.mjs`. No se diseña ahora su transporte ni el modelo de recomendación, solo se congela el contrato de datos.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Deriva de fuentes (precios, endpoints, componentes nuevos) | Campo `verified_at` por entrada + `tools/refresh.mjs` por fuente; el índice muestra la fecha |
| Uiverse responde 403 desde servidores | Navegador Playwright como vía primaria; mirror `uiverse-io/galaxy` (posiblemente desactualizado) como respaldo, indicándolo en la ficha |
| ToS de 21st.dev prohíben scraping | Solo sitemap, `.md` públicos y OpenAPI con key; curado top 30/categoría |
| Licencias ambiguas (Agents Kit por colección, 21st.dev por entrada) | Valores `non-commercial`/`unknown` + advertencia en `05-REUSE`; nunca asumir MIT |
| Endpoint CMS no documentado de Design Systems Repo | Pull único de baja frecuencia, caché local, atribución y sin redistribución del dataset |
| Catálogo desactualizado respecto a las webs | Scripts de refresco + índice regenerable; `build-kit` garantiza coherencia kit↔manifest |
| Consumo de tokens si el agente ignora las capas | `AGENTS.md` declara la regla explícita y `find`/`get` ofrecen la vía barata; las guías evitan pedir "lee todos los JSON" |
| Colisiones de nombres entre fuentes | IDs con prefijo de fuente y validación de unicidad en `validate.mjs` |
| Windows/PowerShell | Todo en Node.js sin dependencias nativas; rutas relativas |

## Migration Plan

- No hay migración: el repo no tiene código de aplicación ni specs previas. Los únicos cambios sobre archivos existentes son cabeceras de referencia en `componentes_reutilizables.md` y `flujo_operativo...md`.
- Orden de construcción: schema/taxonomía → extracción por fuente → generación (índice, `.md`, install-guides) → validación → empaquetado del kit → integración documental.
- Rollback: eliminar `manifest/`, `tools/` y `ai-frontend-guide/` y revertir las cabeceras de los dos documentos; el kit copiado en cualquier proyecto se elimina borrando su carpeta.
