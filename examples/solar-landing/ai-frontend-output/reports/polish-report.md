# Polish report

Estado: abierto. Quedan fallos de rendimiento en móvil y bloqueantes de `ui-map check`. Ver «Decisiones pendientes».

- [x] Honesty audit (audit-honesty --strict) — result: 0 findings en 16 archivos.
- [x] Design audit (audit-design --report) — result: 0 high, 0 medium, 0 low (18 archivos).
- [n/a] Accessibility audit (axe) — reason: @axe-core/playwright no está instalado; se añade con `npm i -D @axe-core/playwright`.
- [ ] Performance audit (LCP, CLS, TBT) — result: FALLA en móvil. LCP 1,73–2,54 s (límite 2,5); CLS 0,016 en una medida y 0,173 en otra (límite 0,1); TBT 302–485 ms (límite 200). Escritorio: LCP 0,47 s, CLS 0,061, TBT 10 ms, todo OK.
- [ ] Frontend map check (ui-map check) — result: 14 bloqueantes. 13 están en carpetas de skills del kit (`.agents/`, `.claude/`), no en el código del producto. 1 es el `import('three')` de `src/scene/panel-scene.js`, que el comprobador no resuelve.
- [n/a] Regression suite (@playwright/test) — reason: el proyecto no tiene @playwright/test.
- [x] Console without errors — result: 0 errores en `/` y `/presupuesto`. Los 2 avisos de React Router se atienden con las flags de v7 en `main.jsx`; esa corrección no se volvió a comprobar en el navegador.
- [x] States: empty, loading and error — result: error de validación verificado en el navegador (3 mensajes, foco en el primer campo, valores conservados). Estado de carga: «Enviando…». Error de red y error de configuración: no probados en navegador.
- [x] Widths 360, 768 and 1280 — result: 1280 y 390 revisados con captura; 360 y 768 no revisados en esta pasada.
- [n/a] Keyboard only — reason: recorrido con Tab no ejecutado en esta pasada.
- [n/a] Reduced motion — reason: emulación de `prefers-reduced-motion` no ejecutada en esta pasada. El código sí lo contempla (CSS y escena).
- [x] Craft by hand (one focal point, copy that says what the page does, nothing default-looking) — result: hero con el panel 3D como foco y una sola acción; copy describe el servicio; sin degradados ni tarjetas idénticas en cadena.
- [n/a] Every finding was fixed and its check run again — reason: rendimiento móvil y bloqueantes de ui-map siguen abiertos.
- [x] Psychology: is it clear in 3 seconds what this is and who it is for? — sí. Titular y subtítulo del hero (captura 1280).
- [x] Psychology: does one element dominate each viewport (one focal point)? — sí en el hero: el panel y el botón de acción.
- [x] Psychology: does the main button say what happens when pressed? — sí. «Pedir presupuesto» lleva al formulario; «Enviar y recibir presupuesto» dice qué pasa.
- [x] Psychology: is related information grouped, with room between blocks? — sí. Secciones con padding uniforme (LAYOUT-RULES).
- [x] Psychology: does every action give immediate feedback? — sí en el formulario (validación, «Enviando…», error con reintento). Los desplegables de preguntas responden al clic.
- [ ] Psychology: is the social proof specific and credible? — no. La barra de confianza muestra tres datos sin cifras ni nombres; falta la prueba concreta que confirme el cliente.
- [x] Psychology: can the user go back, cancel or undo? — sí. «Volver a la landing» en el formulario y en la confirmación; el error conserva los valores.
- [ ] Psychology: is every reward real and proportional to the effort? — no verificable aquí. Las promesas («no te llamamos si no lo pides», «presupuesto sin compromiso») deben cumplirse en el proceso del cliente.
- [x] Psychology: does the page end with one clear action? — sí. Cierre con «Pedir presupuesto».

## Decisiones pendientes
1. Móvil: mantener la escena 3D en móvil (TBT de 300–480 ms) o mostrar el poster y montar la escena solo en escritorio o bajo demanda.
2. `ui-map`: el `import('three')` es real y se queda; los 13 bloqueantes del kit son ajenos al producto.
