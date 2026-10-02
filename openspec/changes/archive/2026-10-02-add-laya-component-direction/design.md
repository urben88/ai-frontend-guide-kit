# Design

## Context

`laya_select.py` compone hoy el estado como `need` + `context` opcional y construye preguntas tipadas por tarea. El ranking de componentes vive en `05-FIND.md` como paso opcional y no recibe la dirección del `EXPERIENCE-BRIEF.md`, aunque la guía 01 ya la produce y el manifest la expone. El consentimiento es por sesión desde el cambio anterior.

## Goals / Non-Goals

**Goals:**

- Que el ranking de componentes considere la dirección elegida (arquetipo/filosofía/estilo) sin cambiar la interfaz de filtros ni el contrato de salida.
- Hacer de `find` + `get` + Laya con dirección el camino recomendado de la fase de composición.
- Mantener retrocompatibilidad y fallback.

**Non-Goals:**

- NO convertir la dirección en un filtro duro (seguiría ocultando candidatos válidos adaptables).
- NO añadir un segundo modelo ni cambiar las preguntas tipadas (`noul`/`choice`).
- NO obligar a usar Laya: sin consentimiento o sin Python, `find`/`get` siguen siendo suficientes.

## Decisions

### D1. `--direction <id>` como enriquecimiento del estado

La bandera resuelve la entrada por `id` en `experience/experience-manifest.json` y compone el estado en tres bloques: necesidad declarada → `Chosen experience direction:` (perfil textual de la entrada) → `Project context:` (`--context`/`--context-file`). Ventajas: reutiliza el mismo payload tipado, funciona para cualquier tarea (`fit`, `direction`, `next-question`, `options`) y no altera el pre-filtro determinista. Alternativa descartada: concatenar la dirección a mano en `--need` (frágil y fácil de olvidar); alternativa descartada: filtrar categorías por `patterns` del arquetipo (demasiado rígido).

### D2. Fail-soft

Si el id no existe, el script imprime un aviso y continúa con la necesidad/contexto; nunca bloquea el flujo (filosofía del kit). El id recomendado es el de la dirección elegida registrada en `EXPERIENCE-BRIEF.md` (`direction:<id>`).

### D3. Componentes con dirección en la guía 05

Tras el shortlist de `find` y los `get`, el paso recomendado pasa a ser:

```bash
python tools/laya_select.py --need "..." --category <cat> --commercial \
  --direction <id> --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md --confirmed
```

Se adopta su orden como shortlist final (los hechos siguen viniendo de `get`), manteniendo el consentimiento por sesión de la guía 01. Sin Laya, se conserva la tabla y los heurísticos de selección.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Estado más largo (dirección + brief) | El perfil de la entrada es corto (nombre/descripción/use_case); `--context-file` ya estaba previsto |
| Id equivocado | Fail-soft con aviso y el brief registra el id elegido |
| Sobreajuste a la dirección | Laya solo ordena candidatos; los hechos y la decisión final siguen en `get` y el usuario |

## Migration Plan

- Aditivo y retrocompatible; sin cambios de esquema ni de exit codes.
- Rollback: eliminar la bandera y las referencias en docs.
