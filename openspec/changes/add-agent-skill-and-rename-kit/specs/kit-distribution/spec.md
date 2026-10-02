# Spec Delta

## MODIFIED Requirements

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
