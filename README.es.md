# 🎨 AI Frontend Guide Kit

🌐 [English](README.md) · **Español**

**Catálogo de UI "reutilizar primero" + flujo guiado para agentes de IA que construyen frontends.**
Este repositorio es a la vez la 🏭 **fábrica** (pipeline de extracción + catálogo) y el 📦 **kit distribuible** que se copia a cualquier proyecto frontend.

## 🎬 Presentación — 55 segundos

<p align="center">
  <a href="media/explainer/video/ai-frontend-guide-kit-es.mp4">
    <img src="media/explainer/video/teaser.gif" alt="AI Frontend Guide Kit — explainer dibujado a mano" width="840">
  </a>
</p>

▶️ [Español](media/explainer/video/ai-frontend-guide-kit-es.mp4) · [English](media/explainer/video/ai-frontend-guide-kit-en.mp4) · 🖋 [Guion](media/explainer/guion.md) · 🎛 [Código de la animación](media/explainer/index.html)

## ✨ Qué incluye

| | Qué | Detalle |
|---|---|---|
| 📚 | **Catálogo** | 25 fuentes verificadas · 3.731 entradas reutilizables · 20 categorías · puntuación de calidad, licencia e instalación por entrada · React, Vue y Svelte · `explorer.html` sin conexión |
| 🧭 | **Kit guiado** (`ai-frontend-guide-kit/`) | `AGENTS.md` + router + flujo de 3 fases en 10 guías cortas (00–10) + herramientas `find`/`get`. Autocontenido: sin build ni dependencias npm |
| 🧠 | **Skills para agentes** | `ai-frontend-guide` (flujo), `frontend-polish` (fase 3), `ux-map` (mapa visual de pantallas) y 16 skills UX incluidas (`userflow` + 15 `flow-*`, MIT) |
| 💾 | **Memoria de selección** | `ai-frontend-output/`: historial de decisiones (solo añade), resumen de estilos/componentes y combinaciones reutilizables |
| 🛡️ | **Auditorías** | `audit-honesty` (patrones engañosos), `audit-a11y` (axe + WCAG 2.2), `audit-perf` (Lighthouse frente a Core Web Vitals) en `ai-frontend-guide-kit/tools/` |
| 🔒 | **Laya (opcional)** | Motor de decisión local que ordena candidatos del catálogo con probabilidades calibradas; todo se ejecuta en tu PC |

## 🔄 El flujo de tres fases

| Fase | Qué ocurre | Resultado |
|---|---|---|
| **1 · 🧠 UX y teoría** | Dirección de experiencia (`experience/` + Laya para preguntas y dirección), bucle de descubrimiento interactivo (sitios de ejemplo, "me gusta", capturas, combinaciones de componentes), flujos probados (`userflow` + `flow-*`) y tokens de diseño | `EXPERIENCE-BRIEF.md` · `PRODUCT.md` · `UX-SPEC.md` · `flow-report.html` · `ux-map.excalidraw` · `DESIGN.md` + tema |
| **2 · 🧩 Composición** | Inventario → búsqueda en el catálogo → decisión reutilizar/adaptar/construir → instalación | Componentes adaptados a tus tokens |
| **3 · ✨ Pulido total** | Auditorías externas (`impeccable`, taste-skill, emilkowalski) + bucle con Playwright MCP + regresión con `@playwright/test` + auditorías de accesibilidad, rendimiento y honestidad | Una pantalla lista para publicar |

> 🔀 Las fases son **puntos de entrada, no una tubería rígida**: el agente pregunta qué quieres (frontend nuevo, cambio pequeño, adición a medida, solo pulido, solo UX) y entra justo donde encaja.

## 🚀 Inicio rápido

### Opción A · como dependencia (recomendada)

```bash
npm i -D github:urben88/ai-frontend-guide-kit    # fija versión si quieres: #v1.2.0
npx ai-frontend-guide-kit                        # instalación explícita e idempotente
```

Opcional: añade `"kit": "ai-frontend-guide-kit"` a tus scripts y ejecuta `npm run kit` tras actualizar. **No hay `postinstall`**: un `npm install` normal nunca modifica tu proyecto.

### Opción B · una sola vez (sin dependencia)

```bash
npx github:urben88/ai-frontend-guide-kit
```

### 🎛️ Opciones

| Opción | Efecto |
|---|---|
| `--no-skills` | solo kit y documentación, sin skills |
| `--no-design-skills` | omite las 3 skills externas (impeccable/taste-skill/emilkowalski) |
| `--no-mcp` | omite la configuración de los MCP Playwright y Excalidraw |
| `--with-laya` | instala/actualiza también Laya |
| `--target <dir>` | instala en otra carpeta |
| `--skills-mode cli` | flujo CLI completo anterior (lockfile + enlaces multi-agente) |

### 📦 Sin conexión / sin git

```bash
npm pack                                  # genera el .tgz (incluye skills)
npx ./ai-frontend-guide-kit-<versión>.tgz # ejecútalo en el proyecto de destino
```

Después dile a tu agente:

> *"Lee `ai-frontend-guide-kit/AGENTS.md` y sigue su flujo."*

## 🔎 Buscar componentes

```bash
node ai-frontend-guide-kit/tools/find.mjs --text "pricing toggle" --stack react --licensed --min-quality 70
node ai-frontend-guide-kit/tools/find.mjs --category forms --stack vue            # incluye ports a Vue / Svelte
node ai-frontend-guide-kit/tools/find.mjs --source reactaria --category forms       # primitivas accesibles
```

Los resultados se ordenan por **calidad** (claridad de licencia, esfuerzo de instalación, peso de dependencias, mantenimiento de la fuente) o por relevancia ponderada del texto. Las entradas casi idénticas entre fuentes se colapsan (`--all` las muestra) y los iconos se ocultan salvo que los pidas. Abre `ai-frontend-guide-kit/catalog/explorer.html` para un catálogo filtrable sin conexión, con enlaces de vista previa y botones para copiar el comando de instalación.

## 🛠️ Qué hace el instalador

1. 📁 Copia `ai-frontend-guide-kit/` al proyecto de destino (elimina el antiguo `ai-frontend-guide/` si existe).
2. 📌 Añade el puntero de entrada al `AGENTS.md` del proyecto (preguntar primero y luego recorrer las tres fases).
3. 💾 Crea `ai-frontend-output/` (memoria de selección) si falta; nunca se borra en las actualizaciones.
4. 🧩 Instala las **19 skills de este repo** en `.agents/skills/` (limpio: sin lockfile ni enlaces por todas partes) y, por defecto, las **16 skills de diseño externas** mediante su CLI. Si el proyecto tiene `.claude/`, enlaza las 19 en `.claude/skills/`.
5. 🎭 Configura los servidores **Playwright + Excalidraw MCP** según el entorno detectado (`.mcp.json` para Claude Code, `opencode.json` para OpenCode) y crea la plantilla `ai-frontend-output/ux/ux-map.excalidraw`; si no, imprime los comandos exactos. Navegador una vez: `npx playwright install chromium`.
6. 🐍 Comprueba Python/Laya e imprime el siguiente paso exacto.

> 💡 Las skills externas necesitan red; si fallan, la instalación continúa y el kit sigue funcionando con `find`/`get`.

## 💾 Memoria de selección (`ai-frontend-output/`)

Cada decisión de componente queda registrada: cada proyecto conserva un historial auditable y combinaciones reutilizables.

```bash
node ai-frontend-guide-kit/tools/memory.mjs combo list       # revisa combinaciones guardadas antes de buscar
node ai-frontend-guide-kit/tools/memory.mjs add --screen landing --block hero --need "..." \
  --decision reuse --id <id-de-entrada> --style gradient,dark
node ai-frontend-guide-kit/tools/memory.mjs combo save saas-landing-v1 --note "landing SaaS minimalista"
node ai-frontend-guide-kit/tools/memory.mjs combo show saas-landing-v1   # entradas + comandos de instalación
node ai-frontend-guide-kit/tools/memory.mjs combo apply saas-landing-v1  # reutilízala en otro proyecto
```

La carpeta contiene `selections.jsonl` (historial), `combinations.json` (conjuntos con nombre) y `SUMMARY.md` (resumen generado). Vive fuera del kit, así que las actualizaciones no la tocan; comparte combinaciones entre proyectos copiando `combinations.json` o apuntando `AI_FRONTEND_OUTPUT` a una carpeta común.

## 🛡️ Auditorías (fase 3)

```bash
node ai-frontend-guide-kit/tools/audit-honesty.mjs src --strict      # escaneo estático de patrones engañosos
node ai-frontend-guide-kit/tools/audit-a11y.mjs http://localhost:3000 # axe-core con WCAG 2.2 (requiere @axe-core/playwright)
node ai-frontend-guide-kit/tools/audit-perf.mjs http://localhost:3000 # Lighthouse: LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms
```

Las comprobaciones automáticas cubren aproximadamente un tercio de los problemas de accesibilidad; la guía `09-VERIFY.md` indica qué revisar a mano (foco visible, tamaño de objetivo, arrastre, autenticación).

## 🔒 Laya (motor de decisión local, opcional)

Laya es un modelo de decisión rápido y no autorregresivo, con probabilidades calibradas. Aquí ordena la **siguiente pregunta adaptativa**, la **dirección de experiencia** (arquetipos/filosofías/estilos) y los **candidatos de componentes**; licencias, comandos de instalación y campos del manifest siempre salen del catálogo.

```bash
python ai-frontend-guide-kit/tools/laya_select.py --check       # estado (exit 0 = listo)
python ai-frontend-guide-kit/tools/laya_select.py --install     # pip install -U laya (la primera vez descarga checkpoints)
python ai-frontend-guide-kit/tools/laya_select.py --need "..." --dry-run   # vista previa del payload, sin modelo
```

⚠️ El agente **debe preguntar antes de usarlo**: el consentimiento es una vez por proyecto/sesión (se registra en `EXPERIENCE-BRIEF.md`) y `--confirmed` es obligatorio en cada llamada como prueba (sin él, el script sale con código 3 y no carga nada). Todo se ejecuta en local. Sin Python/Laya el kit sigue funcionando con el árbol de preguntas y `find.mjs` + `get.mjs`.

## 📂 Estructura del repositorio

```
├── ai-frontend-guide-kit/        # 📦 el kit distribuible (copia esto)
│   ├── AGENTS.md · README.md · VERIFICATION.md
│   ├── guides/00..10         # dirección de experiencia + flujo UX/UI "reutilizar primero"
│   ├── experience/           # arquetipos, filosofías, estilos, banco de preguntas, bucle de descubrimiento, fichas de referencia + experience-manifest.json
│   ├── catalog/              # índice + taxonomía + guías de instalación + 25 fuentes + explorer.html + license-report.md
│   └── tools/                # context · find · get · memory · laya_select · excalidraw-mcp · audit-honesty · audit-a11y · audit-perf
├── skills/                   # ai-frontend-guide + frontend-polish + 16 skills UX incluidas (MIT)
├── manifest/                 # fuente de verdad del catálogo (generado)
├── media/explainer/          # 🎬 explainer dibujado a mano (ES/EN, GIF, póster)
├── tools/                    # pipeline de extracción/refresco/build/validación/calidad/licencias
├── tests/                    # suite node:test (find/get/install/memory/auditorías/walkthrough)
├── examples/walkthrough/     # las tres fases en un proyecto pequeño (también prueba de regresión)
├── .github/workflows/        # CI, PR mensual de refresco, comprobación mensual de enlaces
├── openspec/                 # especificaciones de cambios (OpenSpec)
└── install.mjs               # instalador de un comando (bin)
```

## 🧑‍🔧 Comandos de mantenimiento

```bash
node tools/refresh.mjs <source_id>   # refresca una fuente (o "all")
node tools/build-index.mjs           # reconstruye el índice ligero y las puntuaciones de calidad
node tools/build-kit.mjs             # sincroniza el catálogo en ai-frontend-guide-kit/ y genera explorer.html
node tools/sync-ux-skills.mjs        # vuelve a incluir las 16 skills UX (MIT); --check para ver novedades
node tools/validate.mjs              # comprobaciones de esquema, IDs e índice
node tools/validate.mjs --urls 100   # comprobación estratificada de enlaces (falla si >10 % rotos)
node tools/check-licenses.mjs        # compara licencias declaradas con el LICENSE de cada repo (--apply mejora "unknown")
node tools/audit-categories.mjs      # auditoría de categorías (--strict para CI)
npm test                             # suite de pruebas
npm run verify                       # validate + build-kit + tests
```

La integración continua (`.github/workflows/ci.yml`) ejecuta validación, auditoría de categorías, reconstrucción y pruebas en cada push; `refresh.yml` abre un PR mensual con el diff de todas las fuentes y `links.yml` revisa enlaces cada mes.

## ⚖️ Licencias

- 🧾 Las herramientas y la documentación de este repositorio siguen sus propias licencias; consulta el historial de `openspec/` para las decisiones.
- 📜 Cada entrada del catálogo hereda la licencia de su fuente (`license_type`, `commercial_use`, `limits`). Las entradas no comerciales (p. ej. las familias originales de Agents Kit) están marcadas y no deben usarse en trabajo comercial. `manifest/license-report.md` cruza lo declarado con el LICENSE real de cada repo.
- 🚫 El kit guarda solo metadatos y enlaces; nunca código de componentes de terceros.
