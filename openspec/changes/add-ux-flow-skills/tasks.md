# Tasks

## 1. Vendorizado de skills UX

- [ ] 1.1 Crear `tools/sync-ux-skills.mjs` (descarga por commit pinneado, valida licencia MIT y frontmatter, escribe `skills/<name>` plano, registra origen, `--check`) y ejecutarlo; verificar 16 skills + `report-template.html` + `UX-SKILLS-LICENSE` + `UX-SKILLS-ORIGIN.md`
- [ ] 1.2 Ejecutar `sync-ux-skills.mjs --check` dos veces; verificar que reporta "up to date" sin modificar archivos

## 2. Contexto y fase UX

- [ ] 2.1 Crear `ai-frontend-guide-kit/tools/context.mjs` (stack, rutas, docs, specs, `ux_present`, ≤ ~150 líneas, `--json`) y probarlo sobre un repo real; verificar `REPO-CONTEXT.md` y la detección de UX
- [ ] 2.2 Crear `guides/01-UX-FLOWS.md` (4 caminos A/B/C/D, modos con elección explícita, baseline+diff en rediseño, gate hacia UI) y eliminar `guides/01-ANCHOR.md`; verificar coherencia de referencias

## 3. Integración documental

- [ ] 3.1 Actualizar `00-START-HERE.md` (mapa con fase UX y 4 caminos), `03-INVENTORY.md` (inventario desde `UX-SPEC.md`), `05-REUSE.md` (screen/block = UX-SPEC), `AGENTS.md` y `SKILL.md` (UX-first, modos, contexto); verificar que un agente puede seguir el flujo solo con esos textos
- [ ] 3.2 Actualizar READMEs (kit y raíz), `VERIFICATION.md` y los mensajes de `install.mjs`; verificar que documentan las 17 skills y la carpeta `ai-frontend-output/ux/`

## 4. Instalador y empaquetado

- [ ] 4.1 Cambiar la entrada de skills del repo a instalación completa (17) y añadir los activos nuevos a `tools/build-kit.mjs` (kit y repo); verificar `build-kit` en verde y fallo si falta una skill UX
- [ ] 4.2 Ejecutar `build-kit`, `validate.mjs` y `openspec validate "add-ux-flow-skills"`; verificar todo en verde

## 5. Adaptación BMAD / spec-driven

- [ ] 5.1 Añadir detección de framework a `tools/context.mjs` (BMAD: PRD/brief/arquitectura/UX docs/stories/carpetas; specs: `openspec/`) con evidencia y sección de adaptación en `REPO-CONTEXT.md`; verificar con un repo BMAD simulado y con este repositorio (openspec)
- [ ] 5.2 Crear `guides/ADAPTERS.md` (mapa de artefactos BMAD, reglas spec-driven, comandos) y enlazarlo desde `AGENTS.md`, `SKILL.md`, `00-START-HERE` y `01-UX-FLOWS`; verificar que la información es accesible desde la skill
- [ ] 5.3 Añadir `--ref` a `memory.mjs add` (spec/story) y mostrarlo en `SUMMARY.md`; verificar con un registro real y `list`

## 6. Validación final

- [ ] 6.1 Commit, push y prueba `npx github:urben88/ai-frontend-guide-kit` en un proyecto limpio; verificar 17 skills del repo instaladas (incluida `userflow` y las `flow-*`) junto a las de diseño
- [ ] 6.2 Archivar el cambio (`openspec archive`), validar `--all`/`--archived` y push final
