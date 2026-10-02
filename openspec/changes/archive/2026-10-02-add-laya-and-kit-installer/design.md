# Design

## Context

Ver `proposal.md` para la motivación. Estado relevante:

- El kit `ai-frontend-guide/` (catálogo de 16 fuentes y 2.470 entradas + 9 guías + `find`/`get`) está implementado y verificado; su distribución es manual.
- En el PC de desarrollo hay Python 3.14.6, pip 26.1.2 y **laya 0.3.20 ya instalado**; el checkpoint inglés está cacheado en Hugging Face (~647 MB). Laya importa `torch`/`transformers`, ya presentes.
- Laya expone `Router.predict(state, questions)` con preguntas tipadas (`choice`, `score`, `noul`) y helpers de shortlisting (`embed_fn_from_agent`, `cached_embed_fn`). El `Router` enruta automáticamente inglés/multilingüe.
- Los scripts existentes del kit son Node sin dependencias; el catálogo se resuelve con rutas relativas a la carpeta del kit.

## Goals / Non-Goals

**Goals:**

- Ranking local de candidatos con probabilidades calibradas, integrable por cualquier agente vía un comando.
- Separación estricta hechos (catálogo) vs opinión (modelo).
- Distribución del kit con un solo comando, incluida la instalación de skills y el chequeo guiado de Laya.
- Repositorio listo para GitHub/npx sin dependencias npm.

**Non-Goals:**

- Servidor MCP o HTTP de Laya (el usuario trasladó Laya al PC de desarrollo; el cambio futuro `add-component-mcp-server` sigue fuera de alcance).
- Fine-tuning de Laya con decisiones propias (posible extensión futura; el checkpoint por defecto basta).
- Reemplazar `find`/`get`: Laya es un acelerador opcional.
- GPU/TileLang: CPU por defecto.

## Decisions

### D1. Laya como rankeador semántico posterior al filtro determinista

El script primero filtra el catálogo (licencia, comercial, categoría, stack, fuente, texto) y hace una preselección por solapamiento de tokens; solo entonces Laya opina. Las licencias, comandos y enlaces nunca pasan por el modelo.

- Alternativa descartada: búsqueda semántica pura con embeddings propios — añade dependencias y no aporta probabilidades calibradas.
- Alternativa descartada: dejar la selección al agente — es lo que ya hace `find`/`get`; Laya añade una señal comparable entre candidatos.

### D2. Preguntas: `noul` por candidato + `choice` global (una sola pasada)

Estado = necesidad + contexto opcional (`--context`). Por cada candidato (≤ 12), una pregunta `noul` con el perfil incrustado en las instrucciones; más una `choice` con todos los candidatos como opciones. El ranking usa la probabilidad `noul` (una por candidato, garantizada) y la `choice` como señal secundaria/desempate.

- Alternativa descartada: depender de la distribución completa de `choice` — su forma exacta varía entre versiones; `noul` es estable.
- Motivo: todas las preguntas se responden en una única pasada (~33 ms en GPU; segundos en CPU), sin N llamadas.

### D3. Script Python stdlib-only + salida doble

`laya_select.py` usa solo stdlib (json, argparse, pathlib, subprocess, importlib) y `laya` únicamente en el modo real. Modos: `--check`, `--install`, `--dry-run`, ranking (`--need`), `--json`. Salida legible para humanos y JSON para agentes; UTF-8 forzado en Windows.

- Alternativa descartada: wrapper Node que invoque un script Python por stdin — capa extra sin beneficio; el agente puede llamar a Python directamente.

### D4. Instalador Node sin dependencias con banderas explícitas

`install.mjs`: copia el kit, instala skills (`npx skills add`, omitible con `--no-skills`, fallo no fatal) y gestiona Laya (`--check` por defecto, `--with-laya` para instalar). `--target` permite instalar en otro directorio. Añade/crea el puntero en `AGENTS.md` sin tocar el resto.

- Alternativa descartada: `postinstall` automático — sorprendente y frágil; mejor un comando explícito.
- Alternativa descartada: instalar Laya por defecto — la descarga de `torch` es pesada; bandera explícita + mensaje claro.

### D5. Empaquetado de repositorio

`package.json` con `bin` (permite `npx github:<repo>`), `README.md` raíz con quickstart y `.gitignore` (node_modules, logs, `__pycache__`, `.playwright-mcp`). `tools/.cache` se conserva versionado: contiene el snapshot de Uiverse (necesario para refrescar esa fuente) y el payload de DSR.

### D6. Registro en el kit y verificación

`AGENTS.md` gana una sección "Laya (local decision engine)" con check/install/use; `04-FIND.md` un bloque opcional de ranking con el aviso de hechos vs opinión; `VERIFICATION.md` registra los resultados de `--check`, `--dry-run` y una ejecución real; `build-kit.mjs` verifica `tools/laya_select.py`.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| `torch` sin wheel para una versión de Python muy nueva | `--check` reporta la versión e instrucciones; el README recomienda 3.11–3.13 si la instalación falla; aquí 3.14 funciona con torch ya presente |
| Primera consulta descarga checkpoints (100s de MB) | Aviso explícito en `--check`, `--install` y README; el checkpoint inglés ya está cacheado en este PC |
| Latencia CPU en textos largos | Los perfiles de candidatos son cortos; el ranking usa una sola pasada; se documenta ~segundos en CPU |
| El modelo sobreconfía en sus probabilidades (documentado por Laya: `choice:11+` devuelve masa en 1.0) | El ranking usa probabilidades relativas entre candidatos, no umbrales absolutos; el script marca baja confianza de forma conservadora y muestra la señal `choice` por separado |
| Laya no disponible en el PC del frontend | Fallback documentado a `find`/`get`; el flujo nunca se bloquea |
| Salida en español/UTF-8 en consolas Windows | `sys.stdout.reconfigure(encoding="utf-8")` en el script |

## Migration Plan

- Cambio aditivo: no hay migración de datos ni de catálogo. El instalador es idempotente (reejecutar refresca el kit y repite los chequeos).
- Rollback: eliminar `install.mjs`, `package.json`, `README.md` y `.gitignore` de la raíz, y `ai-frontend-guide/tools/laya_select.py`; revertir las secciones añadidas en `AGENTS.md`, `04-FIND.md`, `README.md` y `VERIFICATION.md`.
