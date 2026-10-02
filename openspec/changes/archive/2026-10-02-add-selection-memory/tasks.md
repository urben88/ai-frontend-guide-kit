# Tasks

## 1. Herramienta de memoria

- [x] 1.1 Crear `ai-frontend-guide-kit/tools/memory.mjs` con `add` (enriquecido desde el catálogo, error claro si el id no existe, soporte `build`), `list` (compacto + `--json`) y `summary` (regenera `SUMMARY.md`); verificar con una decisión real y una inválida
- [x] 1.2 Implementar combinaciones (`combo save|list|show|apply`) con relectura del catálogo y notas “from combination”; verificar guardar, mostrar y aplicar una combinación
- [x] 1.3 Verificar que el historial es append-only, que `SUMMARY.md` se regenera tras cada mutación y que el directorio se resuelve con `--dir`/`AI_FRONTEND_OUTPUT`/hermano del kit

## 2. Instalador

- [x] 2.1 Crear `ai-frontend-output/` con README y estructuras iniciales si no existe, preservarla en refrescos, añadir la línea de memoria al bloque de `AGENTS.md` y a la salida final; verificar con doble instalación en un directorio temporal (el historial sobrevive)

## 3. Documentación y skill

- [x] 3.1 Actualizar `guides/04-FIND.md` (consultar combinaciones primero), `guides/05-REUSE.md` (registro obligatorio), `guides/00-START-HERE.md`, `AGENTS.md` y `skills/ai-frontend-guide/SKILL.md` con los comandos de memoria; verificar coherencia con el script
- [x] 3.2 Actualizar `README.md` del kit, `README.md` raíz y `VERIFICATION.md` (evidencia de la herramienta); verificar que la documentación referencia `ai-frontend-output/`

## 4. Empaquetado y validación

- [x] 4.1 Añadir `tools/memory.mjs` a los activos requeridos de `tools/build-kit.mjs`, reempaquetar y ejecutar `validate.mjs` + `openspec validate`; verificar todo en verde
- [x] 4.2 Commit, push y prueba `npx github:urben88/ai-frontend-guide-kit --no-skills` en un proyecto limpio; verificar kit + `ai-frontend-output/` + memoria funcional
