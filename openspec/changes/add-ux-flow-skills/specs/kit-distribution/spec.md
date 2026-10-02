# Spec Delta

## ADDED Requirements

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
