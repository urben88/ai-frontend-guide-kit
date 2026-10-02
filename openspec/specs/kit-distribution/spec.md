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
El instalador SHALL instalar por defecto las skills de diseño `pbakaus/impeccable`, `Leonxlnx/taste-skill` y `emilkowalski/skills`, más la skill propia del kit (`urben88/ai-frontend-guide-kit`, skill `ai-frontend-guide`), mediante sus comandos oficiales `npx skills add`, y SHALL permitir omitirlas todas con una bandera explícita.

#### Scenario: Skills por defecto
- **WHEN** se ejecuta el instalador sin banderas
- **THEN** se ejecutan los cuatro comandos `npx skills add` y se reporta el resultado de cada uno

#### Scenario: Skill propia incluida
- **WHEN** termina la instalación de skills
- **THEN** la skill `ai-frontend-guide` está presente para los agentes detectados y enseña el flujo del kit

#### Scenario: Omitir skills
- **WHEN** se ejecuta con la bandera de omisión
- **THEN** no se ejecuta ningún comando `npx skills add`

### Requirement: Laya step
El instalador SHALL verificar siempre el entorno de Laya (Python/pip/laya) y SHALL permitir instalarlo en el mismo comando con una bandera explícita; sin la bandera, SHALL imprimir el comando exacto para hacerlo después.

#### Scenario: Verificación por defecto
- **WHEN** se ejecuta el instalador sin la bandera de Laya
- **THEN** se muestra el estado del entorno y el comando de instalación si falta

#### Scenario: Instalación con bandera
- **WHEN** se ejecuta con la bandera de instalar Laya
- **THEN** el instalador ejecuta `python -m pip install -U laya` y verifica la importación

### Requirement: Target safety
El instalador SHALL copiar únicamente dentro del destino indicado (por defecto el directorio actual), SHALL refrescar la carpeta del kit si ya existe, SHALL eliminar la carpeta legada `ai-frontend-guide/` si está presente (creada por versiones anteriores) y SHALL limitarse a añadir o crear el puntero en `AGENTS.md`, sin modificar ningún otro archivo del proyecto.

#### Scenario: Kit existente
- **WHEN** el destino ya contiene `ai-frontend-guide-kit/`
- **THEN** la carpeta se reemplaza por la versión nueva y el resto del proyecto queda intacto

#### Scenario: Carpeta legada
- **WHEN** el destino contiene la carpeta antigua `ai-frontend-guide/`
- **THEN** el instalador la elimina, informa del reemplazo por `ai-frontend-guide-kit/` y no toca ningún otro archivo

#### Scenario: Puntero en AGENTS.md
- **WHEN** el proyecto tiene un `AGENTS.md` propio
- **THEN** el instalador añade o actualiza la sección de referencia al kit sin tocar el resto del contenido; si no existe, lo crea

### Requirement: Repository packaging
El repositorio SHALL incluir `package.json` con el instalador expuesto como `bin` (para `npx github:<repo>`), un `README.md` raíz con el quickstart y un `.gitignore` que excluya artefactos locales, manteniendo cero dependencias de runtime.

#### Scenario: Uso vía npx
- **WHEN** un usuario ejecuta `npx github:<owner>/<repo>`
- **THEN** se ejecuta el instalador sin instalar dependencias

#### Scenario: Repo limpio
- **WHEN** se clona el repositorio
- **THEN** no contiene artefactos locales (node_modules, logs, cachés de Python) y el README explica el quickstart

### Requirement: Kit completeness check
El empaquetado del kit (`tools/build-kit.mjs`) SHALL verificar la presencia de `tools/laya_select.py` entre los activos requeridos y SHALL seguir garantizando coherencia catálogo↔manifest.

#### Scenario: Build del kit
- **WHEN** se ejecuta el empaquetado
- **THEN** falla si falta el script de Laya y reporta la coherencia del catálogo con el manifest

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
El instalador SHALL instalar las 16 UX skills vendorizadas junto con la skill del kit desde este repositorio (`npx skills add urben88/ai-frontend-guide-kit`, 17 skills), además de las tres skills de diseño existentes, y SHALL permitir omitirlas todas con la bandera ya existente. El empaquetado (`tools/build-kit.mjs`) SHALL verificar la presencia de las skills vendorizadas y de su archivo de origen en el repositorio.

#### Scenario: Instalación completa
- **WHEN** se ejecuta el instalador sin `--no-skills`
- **THEN** quedan instaladas las 17 skills del repo (workflow + 16 UX) y las tres de diseño

#### Scenario: Empaquetado verificado
- **WHEN** se ejecuta el empaquetado
- **THEN** falla si faltan `skills/userflow/SKILL.md`, alguna `flow-*` o `skills/UX-SKILLS-ORIGIN.md`, y reporta coherencia del catálogo

#### Scenario: Salida final con UX
- **WHEN** el instalador imprime los siguientes pasos
- **THEN** el primer paso es la fase UX (`tools/context.mjs` + guía `01-UX-FLOWS`) antes de la memoria y la selección de componentes

### Requirement: Package install mode
El paquete SHALL poder instalarse como dependencia de `package.json` (`npm i -D github:urben88/ai-frontend-guide-kit`; registro npm diferido) y SHALL exponer el bin `ai-frontend-guide-kit`. El setup NO SHALL ejecutarse por `postinstall`: SHALL ser un comando explícito e idempotente (`npx ai-frontend-guide-kit`). El empaquetado SHALL incluir `skills/` en `files` para permitir la instalación de skills sin red.

#### Scenario: Instalación como dependencia
- **WHEN** el usuario ejecuta `npm i -D github:urben88/ai-frontend-guide-kit` y después `npx ai-frontend-guide-kit`
- **THEN** el kit queda copiado, `ai-frontend-output/` creado, el puntero en `AGENTS.md` y las skills instaladas, sin efectos en `npm install` a solas

#### Scenario: Empaquetado con skills
- **WHEN** se ejecuta `npm pack`
- **THEN** el tarball incluye `install.mjs`, `ai-frontend-guide-kit/`, `skills/` y `README.md`, y el bin resuelve desde `node_modules`

### Requirement: Clean skills copy mode
Por defecto (`--skills-mode copy`) el instalador SHALL copiar las 17 skills del paquete (workflow + 16 UX) a `<destino>/.agents/skills/`, de forma idempotente, SIN crear `skills-lock.json` ni symlinks, y sin tocar skills ajenas al kit. `--skills-mode cli` SHALL conservar el flujo anterior (CLI `skills`, lockfile y enlaces multiagente) y `--no-skills` SHALL seguir omitiendo toda instalación de skills.

#### Scenario: Instalación limpia
- **WHEN** se ejecuta el setup en modo copy sobre un proyecto sin skills previas
- **THEN** `.agents/skills/` contiene las 17 skills del kit y no existe `skills-lock.json`

#### Scenario: Idempotencia y respeto
- **WHEN** se repite el setup en modo copy sobre un proyecto con skills propias
- **THEN** las 17 del kit se actualizan y las skills ajenas quedan intactas

#### Scenario: Modo CLI
- **WHEN** se ejecuta con `--skills-mode cli`
- **THEN** se usa `npx skills add` como antes (lockfile y enlaces multiagente incluidos)

#### Scenario: Skills externas de diseño
- **WHEN** se ejecuta con `--design-skills`
- **THEN** impeccable, taste-skill y emilkowalski se instalan vía `npx skills add` (requiere red)

### Requirement: Claude Code linking
Si el proyecto destino contiene un directorio `.claude/`, el instalador SHALL enlazar las 17 skills en `.claude/skills/<nombre>` (junction en Windows, symlink en POSIX) y SHALL recurrir a copia si el sistema no permite enlaces. Si no existe `.claude/`, NO SHALL crear ese directorio.

#### Scenario: Proyecto con Claude Code
- **WHEN** el destino contiene `.claude/`
- **THEN** `.claude/skills/` incluye las 17 skills (enlace o copia) y el resto de `.claude/` no se modifica

#### Scenario: Proyecto sin Claude Code
- **WHEN** el destino no contiene `.claude/`
- **THEN** solo se escribe `.agents/skills/` y no se crea `.claude/`

#### Scenario: Enlaces no permitidos
- **WHEN** la creación del enlace falla (permisos del sistema)
- **THEN** la skill se copia como fallback y el instalador informa del modo usado
