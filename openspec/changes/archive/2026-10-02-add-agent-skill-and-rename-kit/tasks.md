# Tasks

## 1. Renombrado del kit

- [x] 1.1 Renombrar `ai-frontend-guide/` â†’ `ai-frontend-guide-kit/` con `git mv` y actualizar todas las referencias en `install.mjs`, `tools/build-kit.mjs`, `package.json`, `README.md`, `componentes_reutilizables.md`, `flujo_operativo_...md` y mensajes de herramientas del kit; verificar con bÃºsqueda que no quedan referencias obsoletas (excluyendo cambios archivados y el nombre de la skill)
- [x] 1.2 Verificar `node tools/build-kit.mjs` y `node tools/validate.mjs` con la ruta nueva (coherencia catÃ¡logoâ†”manifest y activos requeridos)

## 2. Skill genÃ©rica

- [x] 2.1 Crear `skills/ai-frontend-guide/SKILL.md` (frontmatter `name`/`description`, flujo reuse-first, guÃ­as 00â€“08, `find`/`get`, consentimiento Laya con `--confirmed`, licencias) sin duplicar el contenido de las guÃ­as; verificar que apunta a `ai-frontend-guide-kit/AGENTS.md`
- [x] 2.2 AÃ±adir la skill propia a la lista `SKILLS` del instalador (cuarta instalaciÃ³n, fallo no fatal) e incluir la limpieza de la carpeta legada `ai-frontend-guide/`; verificar en una instalaciÃ³n temporal que aparece `ai-frontend-guide-kit/`, que la carpeta legada se elimina y que el puntero de `AGENTS.md` usa la ruta nueva

## 3. DocumentaciÃ³n y validaciÃ³n

- [x] 3.1 Actualizar README raÃ­z (comando `npx skills add` de la skill propia, layout con el nombre nuevo) y README del kit; verificar que la documentaciÃ³n referencia `github.com/urben88/ai-frontend-guide-kit`
- [x] 3.2 Ejecutar validaciones (`build-kit`, `validate.mjs`, `openspec validate`), commit y push; probar `npx github:urben88/ai-frontend-guide-kit` en un proyecto temporal y confirmar kit renombrado + skills (incluida la propia)

