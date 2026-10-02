# Tasks

## 1. Protocolo y banco de referencias

- [x] 1.1 Crear `ai-frontend-guide-kit/experience/DISCOVERY-LOOP.md` con las dos fases (estructura y componentes), el idea deck, la ronda de navegación, el intake de capturas, las rondas acotadas, la persistencia y el fallback; verificar que enlaza con `REFERENCE-PROTOCOL.md`, la memoria y el catálogo
- [x] 1.2 Actualizar `ai-frontend-guide-kit/experience/REFERENCE-PROTOCOL.md` con la separación banco del kit / banco de proyecto (`ai-frontend-output/ux/references/`), el intake de capturas y el enlace al loop; verificar que el esquema de ficha y las reglas éticas siguen intactos

## 2. Integración en guías y capa de conciencia

- [x] 2.1 Añadir el paso de descubrimiento de referencias en `guides/01-EXPERIENCE-DIRECTION.md` (entre journey/IA y las tres direcciones) con la sección de referencias del brief; verificar la coherencia con el gate
- [x] 2.2 Añadir combinaciones de componentes y candidatos web verificados al working method de `guides/05-FIND.md`; verificar que los hechos siguen saliendo de `get`
- [x] 2.3 Reflejar el loop en la tabla de herramientas y casuísticas de `guides/00-START-HERE.md`; verificar que la ruta "direction only" lo incluye
- [x] 2.4 Documentar el loop en `ai-frontend-guide-kit/AGENTS.md` y `skills/ai-frontend-guide/SKILL.md` sin duplicar contenido; verificar que apuntan a `DISCOVERY-LOOP.md`

## 3. Memoria de selección

- [x] 3.1 Permitir registros solo-ref en `tools/memory.mjs` (sin `--id` cuando hay `--ref`) y corregir el ejemplo `--decision adapt --ref "direction:<id>"`; verificar con un registro real en `ai-frontend-output/` y comprobar `SUMMARY.md`

## 4. Empaquetado y documentación

- [x] 4.1 Añadir `experience/DISCOVERY-LOOP.md` a `REQUIRED_KIT_FILES` de `tools/build-kit.mjs` y subir la versión a 1.3.0 en `package.json`; verificar `node tools/build-kit.mjs` en verde
- [x] 4.2 Actualizar `ai-frontend-guide-kit/README.md`, `README.md` raíz y `ai-frontend-guide-kit/VERIFICATION.md` con la capacidad y su evidencia; verificar las referencias al protocolo y a la carpeta de capturas

## 5. Validación y cierre

- [x] 5.1 Ejecutar `node tools/build-kit.mjs`, `npm run validate` y `openspec validate add-discovery-loop`; verificar todo en verde
- [x] 5.2 Prueba de humo del loop en una carpeta temporal (idea deck → elección → captura simulada en `ai-frontend-output/ux/references/` → ficha + ref → combo de componentes → `combo save`); verificar los artefactos generados
- [x] 5.3 Archivar el change (`openspec archive add-discovery-loop`) y verificar que los specs principales quedan sincronizados con los deltas
