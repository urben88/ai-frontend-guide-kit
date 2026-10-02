> **Estado (2026-10-02):** este documento fue la especificación inicial. El sistema ya está implementado:
> - Catálogo generado: `manifest/` (`component-manifest.json`, `component-manifest.md`, `taxonomy.md`, `install-guides.md`, `schema.json`, `sources/*.json`).
> - Carpeta guiada copiable: `ai-frontend-guide-kit/` (AGENTS.md + 9 guías + catálogo + herramientas `find`/`get`).
> - Pipeline: `tools/` (`extract/`, `build-index.mjs`, `build-kit.mjs`, `validate.mjs`, `refresh.mjs`).
> La sección 4 de abajo conserva el prompt de orquestación, ya alineado con las rutas reales.

Para que un modelo de IA seleccione, combine y diseñe de forma autónoma con estas librerías, necesita un **catálogo estructurado de componentes (Component Manifest)** en lugar del código completo de toda la web, lo cual saturaría su ventana de contexto.

---

## 1. Resumen de herramientas y su rol en la arquitectura

| Herramienta | Rol en el diseño | Dependencias clave | Modelo de coste |
| --- | --- | --- | --- |
| **DaisyUI** | Sistema base semántico (botones, modales, temas rápidos) | Tailwind CSS puro | 100% Gratis / Open Source |
| **Preline UI** | Estructura empresarial (layouts, tablas, forms, dashboards) | Tailwind CSS + Vanilla JS | Base gratis / Templates Pro |
| **Aceternity / Magic UI** | Efectos de alto impacto (Hero visual, bento grids, fondos animados) | Tailwind + React + Framer Motion | 100% Gratis |
| **Uiverse.io** | Micro-interacciones (loaders, botones dinámicos, toggles) | CSS / Tailwind / HTML | 100% Gratis |
| **21st.dev** | Directorio de referencia y generación de prompts de componentes | Compatible con shadcn/ui | 100% Gratis |

---

## 2. Ficha de extracción: qué datos raspar o indexar

Para alimentar a la IA, el catálogo se materializa en dos capas: un índice ligero (`manifest/component-manifest.json`) y fichas por fuente (`manifest/sources/*.json`). La información indispensable que se extrae de cada sitio web es:

* **Identificador y Nombre:** Nombre normalizado (ej. `animated-beam`, `stats-card`, `glowing-button`).
* **Categoría funcional:** `Navigation`, `Hero`, `Data Display`, `Feedback`, `Forms`, `Micro-interaction`.
* **Estilo visual / Mood:** Etiquetas semánticas como `Minimalist`, `SaaS/Corporate`, `Cyberpunk/Dark`, `Playful`, `Glassmorphism`.
* **Stack y Dependencias:** Librerías requeridas (ej. `framer-motion`, `lucide-react`, `tailwind-merge`).
* **Nivel de personalización:** Parámetros configurables (colores vía Tailwind, velocidad de animación, slots de contenido).
* **Enlace o Snippet de referencia:** URL directa a la documentación del componente o prompt nativo (en el caso de 21st.dev).

---

## 3. Formato del catálogo para la IA (Component Manifest)

La forma más eficiente en consumo de tokens es el esquema real de dos capas implementado en `manifest/`: un índice ligero con fuentes, conteos y rutas (≤ ~10 KB) y fichas por fuente. Cada entrada del schema (`manifest/schema.json`) responde a tres preguntas: **qué es** (`description`, `use_case`, `decision_hints`, `search_tags`), **dónde está** (`source`, `docs_url`, `registry_url`) y **cómo se implementa** (`install_method`, `install_command`, `manual_steps`, `dependencies`), además de sus restricciones (`license_type`, `commercial_use`, `free`, `limits`).

Ejemplo de entrada del catálogo real:

```json
{
  "id": "magicui-micro-interactions-marquee",
  "name": "Magic UI Marquee",
  "source": "Magic UI",
  "entry_type": "component",
  "category": "micro-interactions",
  "description": "An infinite scrolling component that can be used to display text, images, or videos.",
  "use_case": "Add tactile feedback to interactive elements.",
  "search_tags": ["magicui", "marquee", "micro-interactions"],
  "docs_url": "https://magicui.design/docs/components/marquee",
  "registry_url": "https://magicui.design/r/marquee.json",
  "stack": ["react", "tailwind", "motion"],
  "dependencies": ["motion", "next-themes"],
  "install_method": "shadcn-cli",
  "install_command": "npx shadcn@latest add @magicui/marquee",
  "license_type": "MIT",
  "commercial_use": true,
  "free": true,
  "verified_at": "2026-10-02"
}
```

---

## 4. Prompt de contexto para orquestación creativa

Una vez generado el índice, utiliza esta estructura como directiva para tu herramienta de IA (Cursor, v0 o ChatGPT). En proyectos reales, la vía recomendada es copiar `ai-frontend-guide-kit/` al repo y seguir sus guías 00–08; este prompt resume la directiva:

> **Rol:** Eres un Diseñador y Desarrollador Frontend Senior especializado en Tailwind CSS.
> **Contexto:** Tienes acceso a nuestro catálogo de componentes: índice ligero `component-manifest.json` (16 fuentes, ~2.470 entradas, 20 categorías) y fichas `sources/*.json`; consúltalo con `tools/find.mjs` y `tools/get.mjs` del kit. Fuentes: DaisyUI, Preline, Aceternity, Magic UI, Uiverse, 21st.dev, shadcn/ui, coss ui/Origin, Float UI, Hover.dev, Tailblocks, HyperUI, Motion Primitives, Agents Kit, aicss.dev y Design Systems Repo.
> **Reglas de selección:**
> 1. **Reutiliza antes de crear**: consulta el catálogo para cada bloque del inventario (`guides/04-INVENTORY.md` y `05-FIND.md`) y decide reutilizar → adaptar → crear, registrando la justificación (`guides/06-REUSE.md`).
> 2. Para layouts y elementos funcionales (formularios, navbars, tablas), elige **Preline**, **DaisyUI** o **shadcn/ui**.
> 3. Limita **Aceternity UI / Magic UI / Motion Primitives** a un máximo de 1 o 2 efectos de alto impacto por vista, según `guides/08-PHILOSOPHY.md`.
> 4. Usa **Uiverse / Hover.dev** para micro-detalles (botón CTA, loader, toggle) y **aicss.dev / Agents Kit** solo para superficies de agente/IA.
> 5. Verifica siempre `license_type` y `commercial_use`: hay fuentes no comerciales (Agents Kit original), propietarias (Aceternity, Hover) y con licencia variable (21st.dev).
> 6. Ante cada requerimiento de pantalla, primero lista qué componentes has elegido y justifica por qué combinan armónicamente antes de escribir código; luego verifica con `guides/09-VERIFY.md`.

El pipeline de mantenimiento del catálogo vive en `tools/`: extracción (`tools/extract/`), índice (`build-index.mjs`), empaquetado del kit (`build-kit.mjs`), validación (`validate.mjs`) y refresco por fuente (`refresh.mjs`).