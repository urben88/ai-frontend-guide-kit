# Design

## Context

Ver `proposal.md`. Estado actual relevante: `install.mjs` tiene un modo copy por defecto que copia 17 skills del paquete a `.agents/skills/` sin lockfile y enlaza a `.claude/skills/` si el destino usa Claude Code; las tres skills externas solo se instalan con `--design-skills` o `--skills-mode cli`. Las guías 00–08 son lineales y la única mención a herramientas externas es condicional ("if installed"). No existe skill de pulimiento ni configuración de Playwright MCP. La licencia de las externas es permisiva (impeccable Apache-2.0; taste-skill y emilkowalski MIT), pero impeccable pesa ~1,8 MB (índice de fuentes de 1,1 MB y `live-browser.js` de 547 KB).

## Goals / Non-Goals

**Goals:**

- Un único comando deja el proyecto listo para las tres fases: 18 skills del kit copiadas limpiamente, 3 skills externas instaladas por defecto y Playwright MCP configurado en los arneses presentes.
- Flujo unificado on-demand con intake explícito y casuísticas, sin romper la disciplina de tokens (guía por paso).
- Pulimiento total reproducible: skill `frontend-polish` con MCP + externas + regresión, con fallback.

**Non-Goals:**

- Vendorizar las skills externas (se instalan por CLI; ver D1).
- Editar configuraciones de arneses que no existan en el destino o formatos no-JSON (`.jsonc`, Codex, Cursor): solo se imprimen instrucciones.
- Descargar navegadores de Playwright automáticamente (pesado): se imprime `npx playwright install chromium`.
- Renumerar las guías 01–08 (referenciadas por skills y specs); se añade 09 y un router.

## Decisions

### D1. Skills externas por defecto vía `npx skills add`

Las tres skills externas se instalan por defecto con sus comandos oficiales (16 skills). Alternativa descartada: vendorizarlas — el contenido de impeccable supera 1,8 MB, requiere un `sync-design-skills.mjs` y snapshots que envejecen; el CLI mantiene frescura con coste de red asumido (ya era el caso en modo CLI). Si la red falla, se avisa y el kit sigue funcional (`find`/`get`). `--no-design-skills` restaura el comportamiento conservador. Los artefactos del CLI (`skills-lock.json`, enlaces multiagente) son responsabilidad del CLI y quedan documentados; la copia de las 18 skills del kit sigue siendo limpia.

### D2. MCP Playwright: auto-config por arnés detectado

Solo se tocan arneses ya presentes: `.claude/` → `.mcp.json` (`mcpServers.playwright`), `opencode.json` → `mcp.playwright` (local). Alternativa descartada: configurar siempre/solo instrucciones — el usuario pidió que quede instalado; la detección evita crear configs de herramientas que el proyecto no usa. Cursor/Codex/`.jsonc` reciben snippet impreso. `--no-mcp` omite el paso.

### D3. Merge JSON idempotente y conservador

Se lee el archivo, se parsea estricto (`JSON.parse`), se añade la clave `playwright` solo si falta y se reescribe con indentación de 2 espacios. Si el parseo falla, se avisa y NO se modifica (evita destruir comentarios o formato). Si ya existe `playwright`, no se reescribe. Nunca se borran claves ni servidores previos.

### D4. Skill `frontend-polish` + router de tres fases

La Fase 3 se empaqueta como skill propia (auto-trigger: "pulir", "polish", "revisión final", "QA visual") porque las skills se activan por `description` y el pulimiento puede invocarse standalone. El router vive en `00-START-HERE.md` (intake + fases + casuísticas) y una guía corta `09-ITERATE.md` cubre cambios pequeños/custom. Alternativa descartada: renumerar todo a tres guías — rompe referencias de la skill genérica, specs y hábitos.

### D5. Uso de skills externas por fase

Fase 1: `userflow` + `flow-*` (ya existente). Fase 2: reglas destiladas de 07 + emilkowalski al componer interacciones. Fase 3: `frontend-polish` orquesta impeccable/taste/emil (si están) y Playwright MCP; las guías 07/08 siguen siendo el fallback. Se escribe de forma agnóstica al arnés ("carga la skill", no slash-commands asumidos).

### D6. Conteo y empaquetado

El kit pasa de 17 a 18 skills; `tools/build-kit.mjs` verifica `skills/frontend-polish/SKILL.md` y los mensajes/READMEs se actualizan. `install.mjs` copia el directorio `skills/` completo, por lo que la nueva skill viaja sola.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Instalación por defecto requiere red | Fallo no aborta; `--no-design-skills`/`--no-skills`; mensajes claros |
| CLI de skills crea lockfile/enlaces que el usuario consideraba ruido | Documentado como artefactos del CLI; la copia del kit sigue limpia; modo `copy --no-design-skills` para máxima limpieza |
| Merge JSON rompe una config del proyecto | Parseo estricto, no se escribe si es inválido, idempotencia, tests en proyecto temporal con servidores previos |
| `opencode.jsonc` no se puede editar con seguridad | Solo se imprime el snippet |
| MCP sin navegador instalado | Se imprime `npx playwright install chromium`; la skill de pulido lo verifica antes de usarlo |
| Fases desordenadas confunden al agente | Intake obligatorio + declaración de ruta + tabla de casuísticas |

## Migration Plan

- Aditivo con cambio de defaults: re-ejecutar `npx ai-frontend-guide-kit` (idempotente, refresca kit y skills).
- Comportamiento conservador: `--no-design-skills`, `--no-mcp`, `--no-skills`, `--skills-mode cli` (legacy).
- Rollback: revertir `install.mjs`, skill nueva, guías y READMEs; las configs MCP escritas pueden eliminarse a mano.
