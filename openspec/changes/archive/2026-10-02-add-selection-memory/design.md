# Design

## Context

El instalador refresca el kit con `rm + cp`, así que cualquier memoria dentro de `ai-frontend-guide-kit/` se perdería. Las guías ya hablan de un “decision log” informal (05-REUSE) sin herramienta. Ver `proposal.md` para la motivación.

## Goals / Non-Goals

**Goals:**

- Historial persistente y consultable de decisiones, con resumen generado de estilos/componentes y combinaciones reutilizables.
- Cero dependencias, salidas breves para agentes y hechos siempre desde el catálogo.

**Non-Goals:**

- Base de datos o servicio: JSON/JL en disco.
- Sincronización automática entre proyectos: se reutiliza copiando `combinations.json` o apuntando `--dir`/`AI_FRONTEND_OUTPUT` a un directorio compartido (documentado).

## Decisions

### D1. `ai-frontend-output/` como carpeta de memoria del proyecto

Vive al lado del kit (raíz del proyecto), fuera del árbol que el instalador refresca. El instalador la crea con README si falta y nunca la borra. Nombre explícito para que quede claro que es datos del proyecto (recomendado commitear).

- Alternativa descartada: `ai-frontend-guide-kit/output/` — lo borra el refresco.
- Alternativa descartada: carpeta global del usuario — pierde el historial por proyecto.

### D2. Tres artefactos con roles separados

- `selections.jsonl`: historial append-only (nunca se reescribe; una decisión por línea).
- `combinations.json`: combinaciones nombradas (snapshots reutilizables).
- `SUMMARY.md`: resumen generado en cada mutación (totales, tabla por pantalla/bloque, estilos, fuentes, recientes).

### D3. `memory.mjs` sin dependencias

Resolución del directorio: `--dir` > `AI_FRONTEND_OUTPUT` > hermano del kit (`<kit>/../ai-frontend-output`). Comandos: `add`, `list`, `summary`, `combo save|list|show|apply`. `add` busca el `entry_id` en `catalog/sources/*.json` y copia los hechos (licencia, comercial, comando, fuente, categoría); id desconocido = error con sugerencia de `find.mjs`. Decisión `build` admite `--name` y no requiere id.

### D4. Semántica de combinaciones

`save` guarda la última decisión por pantalla/bloque (o todo el historial con `--all`) más los estilos agregados. `show` imprime cada entrada con su comando de instalación (releyendo el catálogo si la entrada aún existe; si no, usa el comando guardado). `apply` añade esas decisiones al historial local con nota “from combination <name>”. Reutilización entre proyectos: copiar `combinations.json` o usar un `--dir` compartido.

### D5. Eficiencia de tokens

`list` compacto (por defecto 15 filas), `combo list` en una línea por combinación, `--json` en todos los comandos de lectura. El resumen se regenera en disco, no se vuelca a la conversación salvo que el agente lo pida.

### D6. Integración documental

- `04-FIND`: comprobar `memory.mjs combo list` antes de buscar; si hay combinación aplicable, `combo show` y decidir.
- `05-REUSE`: registrar cada decisión con `memory.mjs add` (obligatorio) y guardar combinación al cerrar una pantalla importante.
- `AGENTS.md` y `SKILL.md`: sección de memoria con comandos y regla.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| El historial se pierde si el usuario borra `ai-frontend-output/` | README de la carpeta explica qué es y recomienda commitearla; el instalador nunca la toca |
| Comandos de instalación obsoletos en combinaciones antiguas | `combo show` relee el catálogo por `entry_id`; si la entrada desaparece, usa el comando guardado y lo advierte |
| Escritura concurrente en un directorio compartido | El historial es append por línea (bajo riesgo); documentado |
| Ruido si el agente registra cada micro-decisión | La guía pide una decisión por bloque del inventario, no por detalle |

## Migration Plan

- Aditivo: herramienta nueva, carpeta nueva, docs. Sin migración de datos.
- Rollback: eliminar `memory.mjs`, `ai-frontend-output/` y las secciones documentales añadidas.
