# Scene spec

Escena del panel solar para la landing (direction «El panel que se explica»). Colores son nombres de design-tokens.json.

## Purpose
Que el visitante vea de un vistazo qué es una placa solar y qué compra: el panel, la caja del inversor y el marco, y que la escena acompañe los tres pasos de «Cómo funciona» sirviendo a G1 (pedir presupuesto).

## Subject
- object: un panel solar de 2 x 1,2 con rejilla de células, marco fino y una caja de inversor detrás
- style: vidrio oscuro sobrio con marco metálico; sin texturas fotográficas

## Camera
- type: perspective
- fov: 35
- position: 0, 1.4, 5.2
- target: 0, 0, 0

## Light
- ambient: intensity 0.6
- key: directional, intensity 2.2
- key-position: 3, 4, 5

## Materials
- main: token=primary, roughness=0.35, metalness=0.25
- highlight (parte activa): token=accent, roughness=0.4, metalness=0.1

## Motion
- idle: rotación lenta en Y, 0.15 rad por segundo
- reduced-motion: un solo fotograma fijo, sin rotación

## Interaction
- input: scroll (el tramo activo de «Cómo funciona» enciende su parte: células, marco o inversor)

## Performance budget
- triangles: 6000
- textures: 1
- draw-calls: 12
- target-fps: 30
- max-kb: 60

## Fallback
- image: public/panel-poster.svg
- when: sin WebGL, ahorro de datos, antes de cargar la escena

## Accessibility
- label: Ilustración de un panel solar con su caja de inversor; el texto de cada tramo describe la parte activa.

## Output
- mode: code
