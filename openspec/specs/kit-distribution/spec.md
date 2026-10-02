# kit-distribution Specification

## Purpose
Permite distribuir el kit completo (documentos, catálogo, herramientas y skills de diseño) a cualquier proyecto con un solo comando y prepara el repositorio para su uso remoto vía GitHub/npx.

## Requirements

### Requirement: One-command install
El repositorio SHALL ofrecer un único comando (`node install.mjs`) que copie el kit al proyecto destino, instale las skills de diseño y la skill propia, y verifique el estado de Laya, sin dependencias npm y sin pasos de build.

#### Scenario: Instalación en un proyecto
- **WHEN** el usuario ejecuta el comando en la raíz de un proyecto frontend
- **THEN** aparece la carpeta `ai-frontend-guide-kit/` con catálogo, guías y herramientas, las skills quedan instaladas y Laya queda verificado o con instrucciones

#### Scenario: Sin red para las skills
- **WHEN** la instalación de skills falla (sin red o sin npx)
- **THEN** el instalador continúa, informa del fallo y el kit sigue siendo funcional con `find`/`get`

### Requirement: Skills installation
El instalador SHALL instalar por defecto las 19 skills del kit en `<destino>/.agents/skills/` (copia limpia en modo copy), las tres skills externas de diseño (`pbakaus/impeccable`, `Leonxlnx/taste-skill`, `emilkowalski/skills`, 16 skills) mediante `npx skills add`, y SHALL permitir omitir las externas con `--no-design-skills` o todas con `--no-skills`. Si una instalación externa falla (sin red o sin npx), el instalador SHALL continuar, informar del fallo y dejar el kit funcional con `find`/`get`.

#### Scenario: Skills por defecto
- **WHEN** se ejecuta el instalador sin banderas
- **THEN** las 19 skills del kit quedan en `.agents/skills/` y se ejecutan los comandos `npx skills add` de las tres skills externas, reportando el resultado de cada una

#### Scenario: Skill propia incluida
- **WHEN** termina la instalación de skills
- **THEN** la skill `ai-frontend-guide` está presente para los agentes detectados y enseña el flujo del kit

#### Scenario: Sin red para las skills externas
- **WHEN** falla un `npx skills add` (sin red o sin npx)
- **THEN** el instalador continúa, informa del fallo y el kit sigue funcional

#### Scenario: Omitir externas
- **WHEN** se ejecuta con `--no-design-skills`
- **THEN** no se ejecuta ningún `npx skills add` y las 19 skills del kit siguen instaladas

#### Scenario: Omitir skills
- **WHEN** se ejecuta con la bandera de omisión
- **THEN** no se copia ninguna skill del kit ni se ejecuta `npx skills add`

### Requirement: Laya step
El instalador SHALL verificar siempre el entorno de Laya (Python/pip/laya) y SHALL permitir instalarlo en el mismo comando con una bandera explícita; sin la bandera, SHALL imprimir el comando exacto para hacerlo después.

#### Scenario: Verificación por defecto
- **WHEN** se ejecuta el instalador sin la bandera de Laya
- **THEN** se muestra el estado del entorno y el comando de instalación si falta

#### Scenario: Instalación con bandera
- **WHEN** se ejecuta con la bandera de instalar Laya
- **THEN** el instalador ejecuta `python -m pip install -U laya` y verifica la importación

### Requirement: Target safety
El instalador SHALL copiar únicamente dentro del destino indicado (por defecto el directorio actual), SHALL refrescar la carpeta del kit si ya existe, SHALL eliminar la carpeta legada `ai-frontend-guide/` si está presente (creada por versiones anteriores) y SHALL limitarse a: añadir o crear el puntero en `AGENTS.md`, fusionar la configuración de los servidores MCP (Playwright y Excalidraw) en arneses ya presentes (`<destino>/.claude/`, `<destino>/opencode.json`) sin crear configuraciones de arneses inexistentes ni modificar otras claves, y crear el scaffold `ai-frontend-output/ux/ux-map.excalidraw` si falta. Ningún otro archivo del proyecto SHALL modificarse.

#### Scenario: Kit existente
- **WHEN** el destino ya contiene `ai-frontend-guide-kit/`
- **THEN** la carpeta se reemplaza por la versión nueva y el resto del proyecto queda intacto

#### Scenario: Carpeta legada
- **WHEN** el destino contiene la carpeta antigua `ai-frontend-guide/`
- **THEN** el instalador la elimina, informa del reemplazo por `ai-frontend-guide-kit/` y no toca ningún otro archivo

#### Scenario: Puntero en AGENTS.md
- **WHEN** el proyecto tiene un `AGENTS.md` propio
- **THEN** el instalador añade o actualiza la sección de referencia al kit sin tocar el resto del contenido; si no existe, lo crea

#### Scenario: Config MCP existente
- **WHEN** el destino tiene `.claude/` u `opencode.json` con otros servidores MCP
- **THEN** solo se añaden los servidores `playwright` y `excalidraw` si faltan, preservando el resto del archivo

#### Scenario: Scaffold del mapa
- **WHEN** el destino no tiene `ai-frontend-output/ux/ux-map.excalidraw`
- **THEN** el instalador crea el archivo scaffold vacío y válido sin sobrescribir uno existente

### Requirement: Repository packaging
El repositorio SHALL incluir `package.json` con el instalador expuesto como `bin` (para `npx github:<repo>`), un `README.md` raíz con el quickstart y un `.gitignore` que excluya artefactos locales, manteniendo cero dependencias de runtime.

#### Scenario: Uso vía npx
- **WHEN** un usuario ejecuta `npx github:<owner>/<repo>`
- **THEN** se ejecuta el instalador sin instalar dependencias

#### Scenario: Repo limpio
- **WHEN** se clona el repositorio
- **THEN** no contiene artefactos locales (node_modules, logs, cachés de Python) y el README explica el quickstart

### Requirement: Kit completeness check

El empaquetado del kit (`tools/build-kit.mjs`) SHALL verificar la presencia de `tools/laya_select.py` y de los activos de la capa de experiencia (`experience/EXPERIENCE-DIRECTION.md`, `experience/experience-manifest.json` y `guides/01-EXPERIENCE-DIRECTION.md`) entre los activos requeridos, y SHALL seguir garantizando coherencia catálogo↔manifest.

#### Scenario: Build del kit

- **WHEN** se ejecuta el empaquetado
- **THEN** falla si falta el script de Laya o algún activo de `experience/`, y reporta la coherencia del catálogo con el manifest

#### Scenario: Manifest de experiencia inválido

- **WHEN** `experience-manifest.json` no parsea o tiene IDs duplicados
- **THEN** el empaquetado falla con el error correspondiente antes de distribuir el kit

### Requirement: Output folder provisioning
El instalador SHALL crear `<destino>/ai-frontend-output/` con un `README.md` explicativo y las estructuras iniciales si no existe, SHALL preservarlo íntegro en cada refresco del kit y SHALL mencionar los comandos de memoria en su salida final.

#### Scenario: Primera instalación
- **WHEN** el instalador termina en un proyecto sin `ai-frontend-output/`
- **THEN** la carpeta existe con su README y estructuras iniciales, sin sobrescribir nada del proyecto

#### Scenario: Refresco preservando memoria
- **WHEN** el instalador se re-ejecuta y `ai-frontend-output/` ya contiene historial
- **THEN** el historial, las combinaciones y el resumen quedan intactos

#### Scenario: Salida final con memoria
- **WHEN** el instalador imprime los siguientes pasos
- **THEN** incluye registrar decisiones con `memory.mjs` y consultar combinaciones guardadas antes de buscar

### Requirement: UX skills distribution

El instalador SHALL instalar las 19 skills de este repositorio (workflow `ai-frontend-guide`, 16 UX vendorizadas, `frontend-polish` y `ux-map`) y, por defecto, las tres skills de diseño externas; SHALL permitir omitir las externas con `--no-design-skills` y todas con `--no-skills`. El empaquetado (`tools/build-kit.mjs`) SHALL verificar la presencia de las skills vendorizadas, de `frontend-polish`, de `ux-map` y de sus archivos de origen/licencia en el repositorio.

#### Scenario: Instalación completa

- **WHEN** se ejecuta el instalador sin `--no-skills`
- **THEN** quedan instaladas las 19 skills del kit y las tres externas (salvo `--no-design-skills`)

#### Scenario: Empaquetado verificado

- **WHEN** se ejecuta el empaquetado
- **THEN** falla si faltan `skills/userflow/SKILL.md`, alguna `flow-*`, `skills/frontend-polish/SKILL.md`, `skills/ux-map/SKILL.md` o `skills/UX-SKILLS-ORIGIN.md`, y reporta coherencia del catálogo

#### Scenario: Salida final con UX

- **WHEN** el instalador imprime los siguientes pasos
- **THEN** el primer paso es la dirección de experiencia (guía `01-EXPERIENCE-DIRECTION` → `EXPERIENCE-BRIEF.md`), seguido de la fase UX (`tools/context.mjs` + guía `02-UX-FLOWS`), y se mencionan las tres fases, el mapa visual con el MCP Excalidraw y el MCP Playwright

### Requirement: Package install mode
El paquete SHALL poder instalarse como dependencia de `package.json` (`npm i -D github:urben88/ai-frontend-guide-kit`; registro npm diferido) y SHALL exponer el bin `ai-frontend-guide-kit`. El setup NO SHALL ejecutarse por `postinstall`: SHALL ser un comando explícito e idempotente (`npx ai-frontend-guide-kit`). El empaquetado SHALL incluir `skills/` en `files` para permitir la instalación de skills sin red.

#### Scenario: Instalación como dependencia
- **WHEN** el usuario ejecuta `npm i -D github:urben88/ai-frontend-guide-kit` y después `npx ai-frontend-guide-kit`
- **THEN** el kit queda copiado, `ai-frontend-output/` creado, el puntero en `AGENTS.md` y las skills instaladas, sin efectos en `npm install` a solas

#### Scenario: Empaquetado con skills
- **WHEN** se ejecuta `npm pack`
- **THEN** el tarball incluye `install.mjs`, `ai-frontend-guide-kit/`, `skills/` y `README.md`, y el bin resuelve desde `node_modules`

### Requirement: Clean skills copy mode
Por defecto (`--skills-mode copy`) el instalador SHALL copiar las 19 skills del paquete (workflow + 16 UX + pulido + mapa visual) a `<destino>/.agents/skills/`, de forma idempotente, SIN crear `skills-lock.json` ni symlinks para esas skills y sin tocar skills ajenas al kit. Además, en modo copy instalará por defecto las tres skills externas mediante `npx skills add` (sus artefactos propios, como lockfile o enlaces, los gestiona el CLI), salvo `--no-design-skills`. `--skills-mode cli` SHALL conservar el flujo anterior (CLI `skills` completo con lockfile y enlaces multiagente) y `--no-skills` SHALL omitir toda instalación de skills.

#### Scenario: Instalación limpia
- **WHEN** se ejecuta el setup en modo copy con `--no-design-skills` sobre un proyecto sin skills previas
- **THEN** `.agents/skills/` contiene las 19 skills del kit y no existe `skills-lock.json`

#### Scenario: Idempotencia y respeto
- **WHEN** se repite el setup en modo copy sobre un proyecto con skills propias
- **THEN** las 19 del kit se actualizan y las skills ajenas quedan intactas

#### Scenario: Modo CLI
- **WHEN** se ejecuta con `--skills-mode cli`
- **THEN** se usa `npx skills add` para las 19 skills del kit y las tres externas (lockfile y enlaces multiagente incluidos)

#### Scenario: Skills externas de diseño
- **WHEN** se ejecuta el setup sin `--no-design-skills`
- **THEN** impeccable, taste-skill y emilkowalski se instalan vía `npx skills add` (requiere red) además de las 19 skills del kit

### Requirement: Claude Code linking
Si el proyecto destino contiene un directorio `.claude/`, el instalador SHALL enlazar las 19 skills en `.claude/skills/<nombre>` (junction en Windows, symlink en POSIX) y SHALL recurrir a copia si el sistema no permite enlaces. Si no existe `.claude/`, NO SHALL crear ese directorio.

#### Scenario: Proyecto con Claude Code
- **WHEN** el destino contiene `.claude/`
- **THEN** `.claude/skills/` incluye las 19 skills (enlace o copia) y el resto de `.claude/` no se modifica

#### Scenario: Proyecto sin Claude Code
- **WHEN** el destino no contiene `.claude/`
- **THEN** solo se escribe `.agents/skills/` y no se crea `.claude/`

#### Scenario: Enlaces no permitidos
- **WHEN** la creación del enlace falla (permisos del sistema)
- **THEN** la skill se copia como fallback y el instalador informa del modo usado

### Requirement: Playwright MCP setup
El instalador SHALL configurar el servidor Playwright MCP (`npx @playwright/mcp@latest`) en los arneses ya presentes en el destino: si existe `<destino>/.claude/`, SHALL fusionar `mcpServers.playwright` en `<destino>/.mcp.json` (creándolo si falta); si existe `<destino>/opencode.json`, SHALL fusionar `mcp.playwright` (transporte local, habilitado) preservando el resto del archivo. NO SHALL crear configuraciones de arneses inexistentes, NO SHALL modificar otras claves y SHALL ser idempotente. En arneses sin archivo de proyecto SHALL imprimir el comando o snippet exacto. Si el archivo existe pero no es JSON válido, SHALL avisar y no modificarlo. `--no-mcp` SHALL omitir el paso. El instalador SHALL imprimir `npx playwright install chromium` como paso previo a la fase de pulimiento.

#### Scenario: Claude Code detectado
- **WHEN** el destino contiene `.claude/` y no tiene `.mcp.json`
- **THEN** el instalador crea `.mcp.json` con `mcpServers.playwright` = `npx @playwright/mcp@latest` y no toca ningún otro archivo de `.claude/`

#### Scenario: OpenCode detectado
- **WHEN** el destino contiene `opencode.json`
- **THEN** el instalador añade `mcp.playwright` (local, habilitado) preservando el resto de claves y servidores

#### Scenario: Arnés sin config de proyecto
- **WHEN** el destino no contiene `.claude/` ni `opencode.json`
- **THEN** el instalador imprime el comando exacto para configurar Playwright MCP y no escribe ninguna configuración

#### Scenario: Idempotencia
- **WHEN** `playwright` ya está presente en la configuración detectada
- **THEN** el instalador informa que ya está configurado y no reescribe el archivo

#### Scenario: JSON inválido
- **WHEN** el archivo de configuración existe pero no es JSON válido
- **THEN** el instalador avisa, no modifica el archivo y continúa

#### Scenario: Omitir MCP
- **WHEN** se ejecuta con `--no-mcp`
- **THEN** no se detecta ni se escribe ninguna configuración MCP

### Requirement: Excalidraw MCP setup
El instalador SHALL configurar el servidor MCP local de Excalidraw (servidor propio del kit, sin dependencias: `node ai-frontend-guide-kit/tools/excalidraw-mcp.mjs --diagram <ruta>`) en los arneses ya presentes del destino, junto al de Playwright y con las mismas garantías: si existe `<destino>/.claude/`, SHALL fusionar `mcpServers.excalidraw` en `<destino>/.mcp.json` (creándolo si falta); si existe `<destino>/opencode.json`, SHALL fusionar `mcp.excalidraw` (transporte local, habilitado) preservando el resto del archivo. NO SHALL crear configuraciones de arneses inexistentes, NO SHALL modificar otras claves y SHALL ser idempotente. La ruta del diagrama SHALL ser `<destino>/ai-frontend-output/ux/ux-map.excalidraw` y el instalador SHALL crear el archivo scaffold vacío y válido si no existe, sin sobrescribir uno existente. En arneses sin archivo de proyecto SHALL imprimir el comando o snippet exacto. Si el archivo de configuración existe pero no es JSON válido, SHALL avisar y no modificarlo. `--no-mcp` SHALL omitir la configuración de ambos servidores MCP.

#### Scenario: Claude Code detectado
- **WHEN** el destino contiene `.claude/` y no tiene `.mcp.json`
- **THEN** el instalador crea `.mcp.json` con `mcpServers.playwright` y `mcpServers.excalidraw` (con el `--diagram` apuntando al mapa) y no toca ningún otro archivo de `.claude/`

#### Scenario: OpenCode detectado
- **WHEN** el destino contiene `opencode.json`
- **THEN** el instalador añade `mcp.playwright` y `mcp.excalidraw` (locales, habilitados) preservando el resto de claves y servidores

#### Scenario: Scaffold creado
- **WHEN** el instalador configura el MCP de Excalidraw y el archivo del mapa no existe
- **THEN** crea `ai-frontend-output/ux/ux-map.excalidraw` con el scaffold válido y no sobrescribe uno existente

#### Scenario: Nuevo servidor idempotente
- **WHEN** `excalidraw` ya está presente en la configuración detectada
- **THEN** el instalador informa que ya está configurado y no reescribe el archivo

#### Scenario: Arnés sin config de proyecto
- **WHEN** el destino no contiene `.claude/` ni `opencode.json`
- **THEN** el instalador imprime el comando exacto para configurar el MCP de Excalidraw y no escribe ninguna configuración

#### Scenario: Omitir MCP
- **WHEN** se ejecuta con `--no-mcp`
- **THEN** no se detecta ni se escribe ninguna configuración de Playwright ni de Excalidraw
