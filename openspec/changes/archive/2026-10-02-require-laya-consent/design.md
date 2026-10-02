# Design

## Context

`laya_select.py` ya distingue modos con y sin modelo (`--check`, `--install`, `--dry-run` vs ranking). Ver `proposal.md` para la motivación. El catálogo y el resto del flujo no cambian.

## Goals / Non-Goals

**Goals:**

- Hacer que el ranking requiera consentimiento verificable del usuario, sin romper los modos que no usan el modelo.
- Dejar la regla escrita donde el agente la lee (capa 0 y guía 04).

**Non-Goals:**

- Gatear `--check`/`--install`/`--dry-run` (no ejecutan el modelo).
- Persistir consentimiento entre sesiones: cada ejecución de ranking exige la confirmación explícita.

## Decisions

### D1. Gate por bandera `--confirmed`

El ranking sin `--confirmed` imprime un mensaje de consentimiento (preguntar al usuario y repetir con la bandera) y sale con código 3, sin importar `laya`. Códigos: 0 éxito, 1 entorno no listo, 2 sin candidatos/fallback, 3 falta consentimiento.

- Alternativa descartada: variable de entorno — menos descubrible para agentes que copian comandos.
- Alternativa descartada: confiar solo en la documentación — sin gate técnico, el escenario "no preguntó" no es verificable.

### D2. Regla de consentimiento en la documentación

`AGENTS.md` y `guides/04-FIND.md` añaden la regla en el punto de uso (sección Laya), con el ejemplo en dos pasos: preguntar → `--confirmed`. Los `README` y el mensaje final del instalador la resumen.

### D3. Sin cambios en modos que no usan el modelo

`--check`, `--install` y `--dry-run` siguen funcionando sin bandera; la instalación de Laya ya es una acción explícita del usuario.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Fricción extra si el agente olvida la bandera | El mensaje del gate incluye el comando exacto para repetir; el fallback `find`/`get` sigue disponible |
| Confusión entre consentimiento para instalar y para ejecutar | `--install` no está gateado (acción directa del usuario); el gate solo cubre la inferencia |

## Migration Plan

- Cambio aditivo en un script y documentación; sin migración. Rollback: quitar el gate y las líneas de consentimiento en los documentos.
