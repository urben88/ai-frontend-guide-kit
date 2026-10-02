# laya-ranking Specification

## MODIFIED Requirements

### Requirement: Typed questions

La consulta SHALL construirse con preguntas tipadas de Laya y una plantilla de instrucciones por tarea (`--task`): `fit` (encaje por candidato y mejor opción global, catálogo de componentes), `direction` (encaje por arquetipo/filosofía/estilo y mejor dirección para el estado del proyecto), `next-question` (valor informativo de cada pregunta elegible y mejor pregunta siguiente) y `options` (encaje de cada opción de una pregunta y mejor opción para una respuesta ambigua). El estado SHALL componerse con la necesidad declarada más la dirección de experiencia opcional (`--direction <id>`, resuelta desde `experience/experience-manifest.json` e inyectada como perfil de la dirección antes del contexto del proyecto) más el contexto opcional (`--context`/`--context-file`, p. ej. el brief en curso). Si el id de dirección no existe, el script SHALL avisar y continuar sin bloquear. Cada tarea SHALL mantener una pregunta `noul` por candidato y una `choice` global con las mismas opciones. El payload SHALL poder previsualizarse sin ejecutar el modelo (`--dry-run`).

#### Scenario: Previsualización

- **WHEN** se ejecuta el modo de previsualización
- **THEN** el script imprime la tarea, el estado, las preguntas y la lista de candidatos sin importar Laya

#### Scenario: Tarea de dirección

- **WHEN** se ejecuta `--dataset experience --kind philosophy --task direction` con el brief como contexto
- **THEN** el payload incluye una `noul` por filosofía y una `choice` de mejor dirección

#### Scenario: Tarea de pregunta siguiente

- **WHEN** se ejecuta `--dataset experience --kind question --task next-question`
- **THEN** el payload pregunta por el valor informativo de cada pregunta elegible y por la pregunta que debería formularse a continuación

#### Scenario: Preguntas construidas

- **WHEN** hay candidatos tras el pre-filtro
- **THEN** el payload incluye una `noul` por candidato con su perfil y una `choice` con las mismas opciones

#### Scenario: Contexto de dirección

- **WHEN** se ejecuta con `--direction <id>` (p. ej. al rankear componentes) y el id existe en el manifest
- **THEN** el estado incluye el perfil de la dirección antes del contexto del proyecto, y el dry-run muestra el id usado

#### Scenario: Dirección desconocida

- **WHEN** el `--direction <id>` no existe en `experience/experience-manifest.json`
- **THEN** el script avisa, continúa con la necesidad y el contexto, y no bloquea el ranking

### Requirement: Registration in the kit

La capa de conciencia (`AGENTS.md`), la guía de experiencia (`guides/01-EXPERIENCE-DIRECTION.md`) y la guía de búsqueda (`guides/05-FIND.md`) SHALL documentar el chequeo, la instalación y el uso del ranking Laya para sus tres usos —preguntas adaptativas, dirección (arquetipos/filosofías/estilos) y componentes—, junto con el aviso de que el modelo opina sobre encaje semántico, que los hechos provienen del catálogo o del manifest y que las probabilidades son relativas entre candidatos. El uso de componentes SHALL documentar `--direction <id>` como contexto recomendado (la dirección elegida del `EXPERIENCE-BRIEF.md`) y el consentimiento por sesión ya establecido en la fase de dirección.

#### Scenario: Agente nuevo en el repo

- **WHEN** un agente lee `AGENTS.md`
- **THEN** encuentra el paso Laya con los comandos exactos para preguntas, dirección y componentes, y sabe cuándo caer al fallback determinista

#### Scenario: Guía de experiencia

- **WHEN** un agente sigue `guides/01-EXPERIENCE-DIRECTION.md`
- **THEN** la guía le indica usar `--task next-question` en las rondas y `--task direction` antes de proponer las tres direcciones, con el brief como contexto

#### Scenario: Componentes con dirección

- **WHEN** el agente rankea componentes tras el shortlist de `find`
- **THEN** la guía `05-FIND.md` le indica pasar `--direction <id>` y el brief como contexto, adoptar el orden como shortlist y mantener los hechos y licencias en `get`
