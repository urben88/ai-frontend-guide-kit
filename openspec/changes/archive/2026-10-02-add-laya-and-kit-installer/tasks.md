# Tasks

## 1. Script de Laya

- [x] 1.1 Crear `ai-frontend-guide/tools/laya_select.py` con modos `--check` y `--install` (Python/pip/laya, versión ≥ 3.10, aviso de descarga de checkpoints); verificar `--check` con código 0 en este PC
- [x] 1.2 Implementar el pre-filtro determinista (categoría, stack, licencia, comercial, fuente, texto) + preselección por tokens y el modo `--dry-run` que imprime estado y payload sin importar Laya; verificar con una necesidad real que el payload incluya `noul` por candidato y una `choice`
- [x] 1.3 Implementar el ranking real con `laya.Router` (parseo de respuestas, fusión con hechos del catálogo, tabla legible y `--json`, aviso de baja confianza y fallback explicado); verificar con una ejecución real en inglés usando el checkpoint cacheado

## 2. Instalador y empaquetado del repositorio

- [x] 2.1 Crear `install.mjs` (copiar kit, skills con `--no-skills`, Laya con `--with-laya`, puntero en `AGENTS.md`, `--target`) y verificar una instalación completa en un directorio temporal
- [x] 2.2 Crear `package.json` (bin sin dependencias), `README.md` raíz (quickstart) y `.gitignore`; verificar que `node install.mjs --help` no requiere instalación y que el repo clona sin artefactos locales (node_modules, logs, cachés de Python)

## 3. Integración en el kit

- [x] 3.1 Actualizar `AGENTS.md` (sección Laya con check/install/use) y `guides/04-FIND.md` (bloque opcional de ranking + aviso hechos vs opinión); verificar que un agente puede seguir el flujo solo con esos textos
- [x] 3.2 Actualizar `README.md` del kit y `VERIFICATION.md` (resultados de `--check`, `--dry-run` y ejecución real); verificar que los comandos documentados coinciden con el script
- [x] 3.3 Añadir `tools/laya_select.py` a los activos requeridos de `tools/build-kit.mjs` y reempaquetar; verificar que el build falla si falta el script y que el catálogo sigue coherente

## 4. Validación final

- [x] 4.1 Ejecutar `python ai-frontend-guide/tools/laya_select.py --check`, `--dry-run` y una consulta real; registrar la salida en `VERIFICATION.md` y comprobar códigos de salida y tiempos
- [x] 4.2 Ejecutar `node tools/validate.mjs`, `openspec validate "add-laya-and-kit-installer"` y la prueba de copia limpia del kit actualizado; verificar todo en verde
