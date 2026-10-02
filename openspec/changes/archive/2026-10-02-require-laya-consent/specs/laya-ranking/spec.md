# Spec Delta

## ADDED Requirements

### Requirement: Consent before use
El uso de Laya SHALL ser opcional y explícito: el agente NO SHALL ejecutar el ranking sin preguntar antes al usuario y obtener su confirmación. El script SHALL exigir una bandera de confirmación (`--confirmed`) para cargar el modelo y, sin ella, SHALL explicar el paso de consentimiento y terminar sin ejecutar el ranking.

#### Scenario: Sin confirmación
- **WHEN** se ejecuta el ranking sin la bandera de confirmación
- **THEN** el script no importa Laya, indica que debe pedirse permiso al usuario y muestra el comando a repetir con `--confirmed`

#### Scenario: Con confirmación
- **WHEN** el usuario ha dado su permiso y el agente repite con `--confirmed`
- **THEN** el ranking se ejecuta con normalidad y se mantienen las reglas de hechos vs opinión

#### Scenario: Regla en la documentación
- **WHEN** un agente lee `AGENTS.md` o `guides/04-FIND.md`
- **THEN** encuentra la regla de preguntar antes de usar Laya y sabe que `find`/`get` son la vía por defecto sin Laya

#### Scenario: Comandos sin modelo
- **WHEN** se ejecutan `--check`, `--install` o `--dry-run`
- **THEN** no se requiere la confirmación porque no ejecutan el modelo
