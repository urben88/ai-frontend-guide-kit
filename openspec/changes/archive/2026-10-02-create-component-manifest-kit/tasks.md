# Tasks

## 1. Schema y taxonomía

- [x] 1.1 Crear `manifest/schema.json` (JSON Schema 2020-12) con todos los campos de la decisión D2 y fixtures válidos/inválidos; verificar que la validación distingue ambos casos
- [x] 1.2 Crear `manifest/taxonomy.md` con las categorías canónicas y el mapa categoría-por-fuente → taxonomía; verificar que cada fuente de D3 tiene mapa explícito
- [x] 1.3 Implementar `tools/validate.mjs` (sin dependencias) para validar fichas, índice y unicidad de IDs; verificar que pasa con los fixtures válidos y falla con los inválidos

## 2. Extracción por canal

- [x] 2.1 Extraer fuentes `github-raw` (Tailblocks, HyperUI, Float UI) con script Node y emitir `sources/tailblocks.json`, `sources/hyperui.json`, `sources/floatui.json`; verificar conteos esperados (63, ~336 curados, 192) y urls de evidencia
- [x] 2.2 Extraer fuentes `registry-json` (Magic UI, Aceternity, shadcn/ui, coss ui + Origin legado, Motion Primitives); verificar que Aceternity descarta ítems premium (HTTP 401) y que cada JSON valida contra el schema
- [x] 2.3 Extraer DaisyUI desde `llms.txt` + sitemap (68 entradas) y Preline desde sitemap (páginas con variantes anidadas); verificar que ambas fichas validan y documentan su URL de ampliación
- [x] 2.4 Extraer Agents Kit desde `llms.txt` + JSON por ítem (224 entradas) con bandera de licencia por colección (MIT/Apache portado vs `non-commercial` original); verificar que las originales quedan `commercial_use: false`
- [x] 2.5 Extraer aicss.dev desde `llms.txt` + GitHub raw (solo 13 gratis, `MIT`); verificar que el Pro no se indexa y que los 13 validan
- [x] 2.6 Extraer Design Systems Repo (26 design systems) con fetch único al endpoint CMS, caché local y atribución; verificar que cada entrada queda `entry_type: design-system` y sin código redistribuido
- [x] 2.7 Extraer Uiverse (navegador Playwright o mirror `uiverse-io/galaxy`) con top 30 por categoría; verificar la vía usada se registra en la ficha y las entradas validan
- [x] 2.8 Extraer 21st.dev vía sitemap + `.md` públicos (top 30/categoría, licencia por entrada o `unknown`); verificar que no se usa scraping y las entradas validan
- [x] 2.9 Extraer Hover.dev (solo los 58 gratuitos) desde sus páginas de categoría; verificar que los 95 Pro no aparecen y las entradas validan

## 3. Generación y validación del catálogo

- [x] 3.1 Redactar `manifest/install-guides.md` por fuente con prerequisitos, comandos exactos, copia manual, dependencias, compatibilidad Tailwind y límites gratuitos; verificar que las 16 fuentes tienen sección y que los comandos coinciden con las docs oficiales
- [x] 3.2 Generar `manifest/component-manifest.json` (índice ligero ≤ ~10 KB) y `manifest/component-manifest.md`; verificar conteos por fuente/categoría y presupuesto de tamaño
- [x] 3.3 Ejecutar `tools/validate.mjs` sobre todo el catálogo y un link-check por muestreo (≥ 10 URLs); verificar cero errores de schema y cero enlaces roto en la muestra
- [x] 3.4 Implementar `tools/refresh.mjs` por fuente; verificar que refrescar una fuente actualiza solo su JSON + índice y conserva el schema

## 4. Validación en sandbox

- [x] 4.1 Crear sandbox Next.js + Tailwind v4 en el directorio temporal e instalar 4 componentes muestra (shadcn/ui, Magic UI, DaisyUI y Motion Primitives) siguiendo `install-guides.md`; verificar que `npm run build` compila
- [x] 4.2 Verificar en la práctica los límites documentados: cuota de 21st.dev (2 copias/día), 401 de Aceternity premium y bandera no comercial de Agents Kit; registrar hallazgos en `install-guides.md`

## 5. Carpeta guiada `ai-frontend-guide/`

- [x] 5.1 Implementar `tools/build-kit.mjs` para empaquetar catálogo + guías + herramientas en `ai-frontend-guide/`; verificar idempotencia y coherencia con `manifest/`
- [x] 5.2 Escribir `ai-frontend-guide/AGENTS.md` (capa de conciencia: alcance real del catálogo + regla reuse-first + navegación) y `README.md` (copia e integración); verificar que `AGENTS.md` cabe en ~1 página y declara los conteos reales
- [x] 5.3 Escribir guías 00–04 (`START-HERE`, `ANCHOR`, `TOKENS` con fallback sin Figma, `INVENTORY`, `FIND`); verificar que cada una es ≤ ~120 líneas y usa checklists/árboles
- [x] 5.4 Escribir guías 05–08 (`REUSE` con árbol reutilizar/adaptar/crear y licencias, `ADAPT`, `PHILOSOPHY` destilada, `VERIFY` con Playwright); verificar que el árbol cubre los 3 caminos y cita las reglas de las 3 skills
- [x] 5.5 Implementar `ai-frontend-guide/tools/find.mjs` y `get.mjs` (sin dependencias); verificar filtros (`--category --stack --license --commercial --free --source --text`) y que `find` < ~1 KB y `get` < ~2 KB
- [x] 5.6 Verificar presupuesto de tokens de todas las capas (AGENTS ≤ 1 página, guías ≤ 120 líneas, índice ≤ 10 KB, find/get en rango); registrar la medición en el propio kit
- [x] 5.7 Prueba de copia limpia: copiar `ai-frontend-guide/` a un directorio vacío y ejecutar `find`/`get` + lectura de guías sin build; verificar funcionamiento con rutas relativas

## 6. Integración documental

- [x] 6.1 Actualizar `componentes_reutilizables.md`: cabecera de puntero al sistema y sección 4 con las rutas reales del manifest/kit; verificar que no quedan referencias a `ui-catalog.json`
- [x] 6.2 Actualizar `flujo_operativo_creaci_n_de_frontend_con_skills_figma_mcp_y_playwright.md`: insertar el paso reuse-first (catálogo/kit) entre tokens y desarrollo, y referencia a las guías 00–08; verificar coherencia con las guías del kit
- [x] 6.3 Dry-run final del flujo: recorrer las guías 00–08 con el kit copiado en el sandbox y comprobar que cada paso produce su artefacto (PRODUCT.md, tokens, inventario, selección, instalación, verificación)
