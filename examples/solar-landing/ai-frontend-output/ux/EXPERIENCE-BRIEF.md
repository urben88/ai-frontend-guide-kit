# Experience brief
## Context
- Product: instalación de placas solares residenciales (fotovoltaica) para particulares. Incluye una figura 3D de un panel solar.
- Audience: propietarios de vivienda unifamiliar o piso con tejado o terraza en España que pagan una factura de luz alta.
- Where and when: móvil y escritorio, en búsqueda o tras ver un anuncio. Deciden con calma, comparando precio y garantías.
- Market (answer): España. Precios en euros; copy en español de España.
- Trust (answer): instaladores certificados, instalaciones realizadas y garantías. Se muestran como prueba social.

## Goal
- Pedir presupuesto: el usuario envía un formulario corto (código postal, consumo de la factura, teléfono).

## Laya consent
not asked

## Archetype
site archetype: Marketing / conversion · experience archetype: Converter (+ Explainer para el panel 3D)
navigation_model: single-page-anchors
pages: landing — vender la instalación y llevar a pedir presupuesto (secciones: hero con panel 3D, cómo funciona, garantías e instaladores, ahorro, formulario de presupuesto, preguntas frecuentes)
why: la acción de éxito es un único formulario, así que la página entera empuja hacia ese paso.
## Philosophy
chosen: Conversion without friction (12) · why: una sola acción clara y formulario corto junto a las señales de confianza.
discarded: Narrative and emotion (5) · why: el 3D sería espectáculo sin mensaje y pesaría en móviles lentos; el objetivo es el formulario, no la recordación.

## Journey
actor: propietario que paga una factura de luz alta · scenario: ve un anuncio o busca «placas solares» y quiere saber si le compensa. [ref: reference-nng-journey-mapping]
| Phase | Does | Thinks | Feels | Friction | Opportunity |
|---|---|---|---|---|---|
| 1. Llega | Abre la landing desde el móvil | «¿Esto es serio?» | Desconfianza | Promesas genéricas | Titular claro con qué vende y para quién |
| 2. Entiende | Mira el panel 3D y lee la oferta | «¿Cuánto me ahorro?» | Curiosidad | Jerga técnica (kWp, inversor) | Beneficios en lenguaje de factura |
| 3. Confía | Busca instaladores, garantías, instalaciones | «¿Quién viene a mi tejado?» | Duda | Falta de prueba social real | Instaladores certificados y garantías visibles |
| 4. Calcula | Revisa cómo funciona y el precio orientativo | «¿Cuánto cuesta y qué incluye?» | Miedo a letra pequeña | Precio no visible | Qué incluye y cómo se calcula, sin trucos [ref: reference-deceptive-patterns] |
| 5. Pide | Rellena el formulario de presupuesto | «Solo quiero que me llamen» | Ganas, si el paso es corto | Formulario largo | Tres campos; una pregunta visible por vez [ref: reference-govuk-design-system] |

## Information architecture
priority content: 1) beneficio y ahorro, 2) confianza (instaladores, instalaciones, garantías), 3) cómo funciona, 4) precio orientativo y qué incluye, 5) preguntas frecuentes, 6) formulario de presupuesto.
navigation: Cómo funciona · Garantías · Precios · Preguntas · [Pedir presupuesto] (botón).
section order: landing — 1 navbar, 2 hero (titular + panel 3D + botón), 3 garantías e instaladores (barra de confianza), 4 beneficios, 5 cómo funciona (3 pasos), 6 precios (teaser), 7 preguntas frecuentes, 8 cierre con botón, 9 pie. Se quitan logos y testimonios: no hay material real todavía; se añaden cuando el cliente los aporte. [ref: reference-martech-website-archetypes]
entry and exit points: entrada desde anuncio o búsqueda; salida al formulario de presupuesto y, después, a la página de gracias. Búsqueda o filtros: no hacen falta en una landing.

## Reference discoveries
the user gave no reference. Se usa la receta marketing-landing y el catálogo de referencias de evidencia (jerarquía, formulario por pasos, patrones de confianza) [ref: reference-govuk-design-system] [ref: reference-nng-10-heuristics].

## Three directions
### safe: Confianza sobria
changes: landing de una sola página con anclas. Hero dividido: titular y botón a la izquierda, panel 3D a la derecha. Barra de garantías justo debajo. Tarjetas planas y sin animación de entrada en cada sección.
key patterns: hero dividido, barra de confianza, precios en tabla simple, FAQ en acordeón. [ref: reference-martech-website-archetypes]
sacrifices: poca personalidad visual; el panel 3D es una pieza más. · main risk: parecer una plantilla de energía. · do not use when: el cliente quiera diferenciarse en el primer segundo.

### differentiated: El panel que se explica
changes: el panel 3D se queda fijo mientras la página avanza. Cada tramo de scroll enciende una parte (célula, marco, inversor) con su nombre en lenguaje de factura. Estructura de historia en «cómo funciona», no de bloques sueltos.
key patterns: escena fijada al hacer scroll, etiquetas que aparecen por tramo, botón de presupuesto repetido al final. [ref: reference-scrollytelling]
sacrifices: más peso en móvil y más trabajo de texto por tramo. · main risk: el scroll fijado se hace pesado o confuso en móviles lentos; hay que dar una versión sin escena. · do not use when: la prisa del visitante sea mayor que su curiosidad.

### experimental: Primero la factura
changes: la página empieza con un campo «¿cuánto pagas al mes?». El panel 3D cambia de tamaño y muestra un ahorro orientativo. El formulario de presupuesto continúa directamente desde ese mismo campo. Sin menú: solo logo y un botón.
key patterns: entrada por cálculo, estado de la escena ligado a un número, un solo botón de navegación. [ref: reference-nng-journey-mapping]
sacrifices: el visitante no ve el catálogo de garantías hasta bajar; el ahorro es una estimación. · main risk: prometer un ahorro que no es real; hay que mostrar las hipótesis y no inventar cifras. · do not use when: no haya datos de consumo fiables o la marca necesite autoridad antes que cálculo.

## Recommended direction
id: differentiated (El panel que se explica) · rationale: el usuario la eligió; une la confianza de la landing con una explicación visual del panel que el visitante entiende sin jerga. · risks: escena fijada pesada en móviles; hay que servir una versión sin escena.
## Interaction patterns
- landing (hero): entrada única y botón «Pedir presupuesto» visible — solves saber qué es y qué hacer en 3 segundos.
- landing (cómo funciona): escena de panel fijada con 3 tramos (célula, marco, inversor) — solves entender qué compra sin leer fichas técnicas.
- landing (precios): tabla simple de «qué incluye» con precio orientativo — solves la pregunta «¿cuánto cuesta?».
- landing (preguntas): acordeón con las 5 a 7 dudas más frecuentes — solves objeciones que frenan el paso.
- formulario de presupuesto: tres campos, una pregunta visible por paso, error bajo cada campo — solves abandono por formularios largos.
## Visual brief
style: sobria y técnica, con una sola acción de color; sin efectos de moda. · palette intent: fondo crema claro, tinta azul-grafito muy oscura, un único acento solar ámbar para botones y el panel activo. Sin violeta ni degradados morados. · typography personality: sans geométrica de cuerpo legible y titulares firmes; cifras grandes para el ahorro.
composition: hero dividido 50/50; escena fijada en «cómo funciona»; secciones con una idea cada una; sin tarjetas idénticas en cadena. · motion: calm (una entrada al cargar, desplazamiento de la escena, sin animación en cada sección).
anti-generic list: degradado morado-azul; héroe con tres tarjetas iguales; logos o testimonios inventados; cifras de ahorro sin hipótesis; mayúsculas espaciadas en etiquetas; textos «unlock the power»; iconos decorativos en cada beneficio.
## Accessibility
keyboard: todo el formulario y el menú alcanzables con Tab; foco visible siempre; la escena no atrapa el teclado. · contrast: texto principal ≥ 4.5:1 sobre el crema; el ámbar nunca lleva texto pequeño. · motion: respetar prefers-reduced-motion; con él, la escena se queda en su primer estado y el contenido sigue visible. · language: español de España, lang="es".
## Open questions
- Nombre comercial de la marca y logo: pendiente (el cliente debe confirmarlo).
- Precio orientativo y rango de potencia: pendiente de confirmar; se mostrará marcado como orientativo.
