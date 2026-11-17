# Product
## Audience
Propietarios de vivienda en España (casa con tejado o terraza, o comunidad de vecinos con permiso) que pagan una factura de luz alta. Llegan desde un anuncio o una búsqueda, en móvil o escritorio, y deciden con calma.
## Primary action
G1: el visitante envía el formulario de presupuesto (código postal, consumo de la factura, teléfono).
## Objections
O1: no sé si me compensa (ahorro real frente a la inversión).
O2: mi tejado no sirve o hay que pedir permisos.
O3: no me fío de la empresa que vendrá a casa.
O4: no sé cuánto cuesta ni qué incluye.
## Proof
P1: instaladores certificados (número y certificación: pendiente de confirmar por el cliente).
P2: instalaciones realizadas (cifra: pendiente de confirmar por el cliente).
P3: garantías de paneles, inversor y mano de obra (años: pendiente de confirmar por el cliente).
Nunca se muestra una cifra que el cliente no haya confirmado.
## Tone
Claro, cercano, honesto. Tres adjetivos: directo, sereno, transparente. Lo que el copy nunca hace: prometer ahorros fijos, usar jerga sin explicarla o meter urgencia falsa.
## User flows
llegada (anuncio o búsqueda) → hero con el panel 3D y «Pedir presupuesto» → garantías e instaladores → cómo funciona (escena fijada) → beneficios → precio orientativo y qué incluye → preguntas frecuentes → formulario de presupuesto (G1) → pantalla de confirmación.
Estados del formulario: vacío, enviando, error bajo el campo, enviado, error de red.
## Screen list
- Landing — vender la instalación y llevar a G1.
- Confirmación de presupuesto — dice qué pasa después y cuándo llamarán.
- Página de error 404 — vuelve a la landing con el botón de presupuesto.
- Versión sin escena 3D — mismo contenido para móviles lentos o sin WebGL.
## Constraints
- Marca: nombre comercial y logo pendientes; mientras tanto, texto neutro sin logo.
- Legal: el ahorro es orientativo y se indica; aviso de privacidad enlazado en el formulario; sin datos personales en la URL.
- Accesibilidad: WCAG 2.2 AA; respetar prefers-reduced-motion.
- Alcance: solo landing y confirmación; sin área de cliente ni simulador de tarifas en esta fase.
