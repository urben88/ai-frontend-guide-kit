# Spec Delta

## ADDED Requirements

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
