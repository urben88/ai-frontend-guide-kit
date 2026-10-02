# Tasks

## 1. Empaquetado

- [x] 1.1 Actualizar `package.json` (`files` += `skills`, versión `1.1.0`) y verificar con `npm pack --dry-run` que el tarball incluye `install.mjs`, `ai-frontend-guide-kit/`, `skills/` y `README.md`

## 2. Instalador

- [x] 2.1 Implementar `--skills-mode copy|cli` (default copy), `--design-skills` y el enlace automático a `.claude/skills` (junction/symlink con fallback a copia), actualizando help y mensajes; verificar copia limpia, idempotencia y respeto de skills ajenas
- [x] 2.2 Verificar el enlace a Claude: proyecto temporal con `.claude/` → 17 entradas en `.claude/skills` (enlace o copia) y `.claude` intacto; proyecto sin `.claude/` → no se crea
- [x] 2.3 Regresión del modo CLI (`--skills-mode cli`) y de `--no-skills`; verificar que el comportamiento anterior sigue funcionando

## 3. Instalación como dependencia

- [x] 3.1 Probar `npm i -D file:<tarball>` en un proyecto temporal y ejecutar `npx ai-frontend-guide-kit`; verificar kit + output + puntero + 17 skills en `.agents/skills` y segunda ejecución idempotente
- [x] 3.2 Regresión de `npx github:urben88/ai-frontend-guide-kit` (modo copy por defecto) en un proyecto limpio

## 4. Documentación y cierre

- [x] 4.1 Actualizar README raíz (sección "Install as a dependency" con `github:` y nota de npm diferido), README del kit y `VERIFICATION.md`; verificar coherencia con la ayuda del instalador
- [x] 4.2 `build-kit` + `validate` + `openspec validate`, commit, push, archivar el cambio y push final
