# Arquitectura

- `src/pages/`: una página por ruta (`/`, `/presupuesto`, `/gracias`, 404).
- `src/components/`: piezas reutilizables. Cada botón, aviso o sección del inventario tiene su archivo.
- `src/scene/panel-scene.js`: la escena 3D. Se monta solo cerca de la pantalla y se libera al salir. Sin WebGL queda el poster (`public/panel-poster.svg`).
- `src/lib/presupuesto.js`: validación y envío del formulario.
- `ai-frontend-output/theme.css`: tokens generados por el kit. No se editan a mano.
