# Tasks

## 1. Script

- [x] 1.1 `tools/laya_select.py`: añadir `--direction <id>`; resolver la entrada en `experience-manifest.json` (`profile_text`) y componer el estado como `need` + `Chosen experience direction` + `Project context`; fail-soft con aviso si el id no existe; mostrarlo en el dry-run y en el encabezado de salida; actualizar docstring/help
- [x] 1.2 Pruebas: dry-run de componentes con dirección (el estado contiene el perfil y el dry-run JSON expone el id), dry-run sin dirección (regresión) y corrida real de componentes con dirección (`--confirmed`)

## 2. Documentación

- [x] 2.1 `guides/05-FIND.md`: convertir el bloque Laya en el paso recomendado tras `find`/`get`, con `--direction <id> --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md` y la regla de consentimiento por sesión; sin Laya se mantiene la tabla heurística
- [x] 2.2 `AGENTS.md`, `skills/ai-frontend-guide/SKILL.md`, `ai-frontend-guide-kit/README.md` y `README.md`: ejemplos de componentes con `--direction` y la explicación de que la dirección entra como contexto del ranking

## 3. Verificación y cierre

- [x] 3.1 `node tools/build-kit.mjs` + `node tools/validate.mjs` + `openspec validate add-laya-component-direction --strict`
- [x] 3.2 Registrar los resultados en `VERIFICATION.md` (dry-run/real con dirección, regresión) y archivar el change
