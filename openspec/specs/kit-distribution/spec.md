# kit-distribution Specification

## Purpose
Permite distribuir el kit completo (documentos, catálogo, herramientas y skills de diseño) a cualquier proyecto con un solo comando y prepara el repositorio para su uso remoto vía GitHub/npx.

## Requirements

### Requirement: One-command install
El repositorio SHALL ofrecer un único comando (`node install.mjs`) que copie el kit al proyecto destino, instale las skills de diseño y verifique el estado de Laya, sin dependencias npm y sin pasos de build.

#### Scenario: Instalación en un proyecto
- **WHEN** el usuario ejecuta el comando en la raíz de un proyecto frontend
- **THEN** aparece la carpeta `ai-frontend-guide/` con catálogo, guías y herramientas, las skills quedan instaladas y Laya queda verificado o con instrucciones

#### Scenario: Sin red para las skills
- **WHEN** la instalación de skills falla (sin red o sin npx)
- **THEN** el instalador continúa, informa del fallo y el kit sigue siendo funcional con `find`/`get`

### Requirement: Skills installation
El instalador SHALL instalar por defecto las skills de diseño `pbakaus/impeccable`, `Leonxlnx/taste-skill` y `emilkowalski/skills` mediante sus comandos oficiales `npx skills add`, y SHALL permitir omitirlas con una bandera explícita.

#### Scenario: Skills por defecto
- **WHEN** se ejecuta el instalador sin banderas
- **THEN** se ejecutan los tres comandos `npx skills add` y se reporta el resultado de cada uno

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
El instalador SHALL copiar únicamente dentro del destino indicado (por defecto el directorio actual), SHALL refrescar la carpeta del kit si ya existe y SHALL limitarse a añadir o crear el puntero en `AGENTS.md`, sin modificar ningún otro archivo del proyecto.

#### Scenario: Kit existente
- **WHEN** el destino ya contiene `ai-frontend-guide/`
- **THEN** la carpeta se reemplaza por la versión nueva y el resto del proyecto queda intacto

#### Scenario: Puntero en AGENTS.md
- **WHEN** el proyecto tiene un `AGENTS.md` propio
- **THEN** el instalador añade la sección de referencia al kit sin tocar el contenido existente; si no existe, lo crea

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
