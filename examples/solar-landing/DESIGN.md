# Design

## Visual intent

Una landing sobria y de confianza para vender placas solares a propietarios en España. El fondo es crema claro y la tinta grafito; el ámbar solar es el único color de acción y de énfasis, usado con poca frecuencia para que siempre signifique «aquí». Titulares en Manrope con peso firme; texto en Inter, legible. Espacio generoso, esquinas medianas, movimiento calmado: una entrada al cargar y el desplazamiento del panel 3D. Nada de degradados morados, tarjetas idénticas en cadena ni cifras sin fuente.

<!-- tokens:start -->
<!-- Written by tokens.mjs doc from design-tokens.json: change the JSON and run it again; text outside these markers is yours. -->
## Color
| Token | Value | Use |
|---|---|---|
| --color-primary | #1f2a3a | Brand color: main actions. |
| --color-on-primary | #f7f7f6 | Text and icons on primary. |
| --color-accent | #f5a524 | Second brand color: highlights. |
| --color-on-accent | #1c1a18 | Text and icons on accent. |
| --color-surface | #f7f7f6 | Page background. |
| --color-surface-raised | #ffffff | Cards and panels above the page. |
| --color-text | #32302c | Body text on the surface. |
| --color-text-muted | #5e5a54 | Secondary text. |
| --color-border | #dfdeda | Dividers and outlines. |
| --color-focus | #687588 | Keyboard focus ring. |
| --color-danger | #cc3336 | Errors and destructive actions, as text on the surface. |
| --color-success | #176d23 | Success messages, as text on the surface. |
| --color-warning | #7b5100 | Warnings, as text on the surface. |

Ramps (50 to 950): --color-primary-*, --color-accent-*, --color-neutral-*, --color-danger-*, --color-success-*, --color-warning-*.
## Type
display: Manrope · body: Inter · scale: xs 12px, sm 14px, base 16px, lg 20px, xl 25px, 2xl 31.2px, 3xl 39.1px, 4xl 48.8px, 5xl 61px (ratio 1.25)
## Spacing
scale: 4, 8, 12, 16, 24, 32, 48, 64 · control 44px · gutter 24px · section 48px · section-lg 64px
## Radius
sm 4px · md 8px · lg 12px · full 9999px
## Motion
calm · fast 150ms · base 250ms · slow 400ms · standard cubic-bezier(0.4, 0, 0.2, 1) · enter cubic-bezier(0, 0, 0.2, 1) · exit cubic-bezier(0.4, 0, 1, 1)
## Contrast
body text on surface: 12.28:1

| Pair | Ratio | Needs | Result |
|---|---|---|---|
| color.on-primary on color.primary | 13.5:1 | 4.5:1 | pass |
| color.on-accent on color.accent | 8.5:1 | 4.5:1 | pass |
| color.text on color.surface | 12.28:1 | 4.5:1 | pass |
| color.text on color.surface-raised | 13.16:1 | 4.5:1 | pass |
| color.text-muted on color.surface | 6.38:1 | 4.5:1 | pass |
| color.text-muted on color.surface-raised | 6.84:1 | 4.5:1 | pass |
| color.danger on color.surface | 4.78:1 | 4.5:1 | pass |
| color.success on color.surface | 6.03:1 | 4.5:1 | pass |
| color.warning on color.surface | 6.48:1 | 4.5:1 | pass |
| color.focus on color.surface | 4.36:1 | 3:1 | pass |
<!-- tokens:end -->
