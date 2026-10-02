# Tasks

## 1. Gate de consentimiento

- [x] 1.1 Añadir la bandera `--confirmed` al ranking de `laya_select.py` (código 3 sin ella, mensaje con el comando a repetir, sin importar Laya) y verificar la ejecución sin bandera con salida 3 y sin carga de modelo
- [x] 1.2 Verificar la ejecución con `--confirmed` (consulta real en inglés) y registrar el resultado y los códigos de salida en `VERIFICATION.md`

## 2. Documentación

- [x] 2.1 Actualizar `AGENTS.md` y `guides/04-FIND.md` con la regla "preguntar antes de usar Laya" y el ejemplo en dos pasos; verificar que la regla y el gate coinciden con el script
- [x] 2.2 Actualizar `README.md` del kit, `README.md` raíz y el mensaje final de `install.mjs`; verificar que los comandos documentados incluyen la confirmación en el ranking

## 3. Validación

- [x] 3.1 Ejecutar `node tools/build-kit.mjs`, `node tools/validate.mjs` y `openspec validate "require-laya-consent"`; verificar todo en verde y coherencia catálogo↔manifest
