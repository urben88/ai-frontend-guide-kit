# Tasks

## 1. Renombrado del kit

- [ ] 1.1 Renombrar `ai-frontend-guide/` → `ai-frontend-guide-kit/` con `git mv` y actualizar todas las referencias en `install.mjs`, `tools/build-kit.mjs`, `package.json`, `README.md`, `componentes_reutilizables.md`, `flujo_operativo_...md` y mensajes de herramientas del kit; verificar con búsqueda que no quedan referencias obsoletas (excluyendo cambios archivados y el nombre de la skill)
- [ ] 1.2 Verificar `node tools/build-kit.mjs` y `node tools/validate.mjs` con la ruta nueva (coherencia catálogo↔manifest y activos requeridos)

## 2. Skill genérica

- [ ] 2.1 Crear `skills/ai-frontend-guide/SKILL.md` (frontmatter `name`/`description`, flujo reuse-first, guías 00–08, `find`/`get`, consentimiento Laya con `--confirmed`, licencias) sin duplicar el contenido de las guías; verificar que apunta a `ai-frontend-guide-kit/AGENTS.md`
- [ ] 2.2 Añadir la skill propia a la lista `SKILLS` del instalador (cuarta instalación, fallo no fatal) e incluir la limpieza de la carpeta legada `ai-frontend-guide/`; verificar en una instalación temporal que aparece `ai-frontend-guide-kit/`, que la carpeta legada se elimina y que el puntero de `AGENTS.md` usa la ruta nueva

## 3. Documentación y validación

- [ ] 3.1 Actualizar README raíz (comando `npx skills add` de la skill propia, layout con el nombre nuevo) y README del kit; verificar que la documentación referencia `github.com/urben88/ai-frontend-guide-kit`
- [ ] 3.2 Ejecutar validaciones (`build-kit`, `validate.mjs`, `openspec validate`), commit y push; probar `npx github:urben88/ai-frontend-guide-kit` en un proyecto temporal y confirmar kit renombrado + skills (incluida la propia)
