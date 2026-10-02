# Design

## Context

Ver `proposal.md`. El paquete ya tiene `name`, `bin` (`ai-frontend-guide-kit`), `repository`, `files` (sin `skills/`) y `prepublishOnly`. El instalador actual usa `npx skills add` (4 repositorios), que crea `skills-lock.json` y symlinks en `.claude`, `.agents` y otros. La publicación npm está **diferida** por decisión del usuario.

## Goals / Non-Goals

**Goals:**

- Instalación como dependencia con setup explícito y modo copy limpio a `.agents/skills`.
- Enlace automático a Claude Code solo si el proyecto ya usa `.claude/`.
- Cero nuevas dependencias; sin `postinstall`.

**Non-Goals:**

- Publicar en npm por ahora (el empaquetado queda listo, `npm pack` verificado).
- Reescribir el modo CLI existente (queda como opción avanzada).
- Vendorizar las 3 skills externas de diseño (se instalan por CLI bajo `--design-skills`).

## Decisions

### D1. Setup explícito, sin `postinstall`

`npm i -D …` solo descarga el paquete; `npx ai-frontend-guide-kit` ejecuta el setup idempotente. Evita mutaciones del repo en cada `npm install`/CI.

- Alternativa descartada: `postinstall` automático — sorpresas y diagnóstico difícil.

### D2. Modo copy por defecto

`--skills-mode copy` copia las 17 skills desde `<paquete>/skills/` a `<destino>/.agents/skills/`, borrando y reescribiendo únicamente esas 17 carpetas (idempotente, sin tocar ajenas). No crea `skills-lock.json` ni symlinks.

- Alternativa descartada: CLI por defecto — lockfile y enlaces en varios agentes que el usuario considera ruido.
- La copia desde el paquete requiere `skills/` en `files`; sin red.

### D3. Claude Code automático con junction

Si existe `.claude/`, se crea `.claude/skills/<name>` como junction (Windows, sin privilegios de admin) o symlink (POSIX); si falla, copia. No se crea `.claude/` si no existía.

### D4. Skills externas bajo `--design-skills`

impeccable, taste-skill y emilkowalski siguen instalándose vía `npx skills add` (requieren red y sus propios repos). `--skills-mode cli` conserva el flujo completo anterior (incluidas ellas y nuestra skill vía CLI).

### D5. Empaquetado

`files` gana `skills`; versión `1.1.0`; `prepublishOnly` sigue validando. `npm pack` se verifica; `npm publish` queda pendiente del login del usuario.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Junctions/symlinks no permitidos (Windows sin developer mode) | Fallback a copia con aviso; junction no suele requerir privilegios |
| Copia desactualizada respecto al paquete | Setup idempotente: re-ejecutar `npx ai-frontend-guide-kit` tras actualizar la dependencia |
| Skills ajenas en `.agents/skills` | Solo se tocan los 17 nombres del kit |
| Divergencia copy vs CLI | El modo CLI queda disponible y documentado; ambos instalan el mismo contenido |

## Migration Plan

- Aditivo con cambio de default: quien quiera el comportamiento anterior usa `--skills-mode cli`.
- Rollback: revertir `install.mjs`, `package.json` y docs. La publicación npm se hará en otro cambio cuando el usuario lo pida.
