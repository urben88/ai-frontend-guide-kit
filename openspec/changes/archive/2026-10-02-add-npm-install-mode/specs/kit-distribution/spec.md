# Spec Delta

## ADDED Requirements

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
