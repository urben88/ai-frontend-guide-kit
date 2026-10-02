# Guion — Vídeo explicativo (estilo dibujo)

> Duración total: **55 s** · 1920×1080 · 30 fps · voz en off amigable (ES: Elvira · EN: Jenny, edge-tts neuronal)
> Idiomas: `?lang=es` (por defecto) y `?lang=en`

## Escenas

### 1 · El problema (0–6 s)

**ES:** ¿Otra vez un frontend desde cero?
`semanas de trabajo` · `código duplicado` · `resultado genérico`

**EN:** A frontend from scratch, again?
`weeks of work` · `duplicated code` · `generic result`

Doodle: navegador en blanco, cursor parpadeando, reloj, tarjetas de código copiadas.

### 2 · La idea (6–13 s)

**ES:** Reutiliza antes de crear
`16 fuentes verificadas` · `2.470 componentes` · `20 categorías`
Terminal: `npx github:urben88/ai-frontend-guide-kit`
Etiqueta: `licencia · instalación · enlace`

**EN:** Reuse before you build
`16 verified sources` · `2,470 components` · `20 categories`
Terminal: `npx github:urben88/ai-frontend-guide-kit`
Tag: `license · install · link`

Doodle: caja-catálogo, lupa recorriéndola, fichas que aparecen.

### 3 · Descubrimiento interactivo (13–22 s)

**ES:** Descubre ideas contigo
Burbuja: `¿Cuál te gusta más?` · `A` `B` `C`
`captura` → ficha `[ref: acme-web]` · `gusta: hero grande` · `evitar: pop-ups`

**EN:** Discover ideas together
Bubble: `Which one do you like?` · `A` `B` `C`
`screenshot` → card `[ref: acme-web]` · `liked: big hero` · `avoid: pop-ups`

Doodle: tres webs con estructuras distintas; el cursor elige la B; cámara; ficha guardada.

### 4 · La dirección (22–29,5 s)

**ES:** Elige la dirección
`Segura` (familiar) · `Diferenciada` (con carácter) · `Experimental` (atrevida)
Chips: `Arquetipo` `Filosofía` `Journey` `IA`
`Laya · ranking local · privado`

**EN:** Pick the direction
`Safe` (familiar) · `Differentiated` (with character) · `Experimental` (bold)
Chips: `Archetype` `Philosophy` `Journey` `IA`
`Laya · local ranking · private`

Doodle: brújula, tres cartas, la del medio con estrella, cerebro-chip.

### 5 · Las tres fases (29,5–38,5 s)

**ES:** Tres fases, a demanda
`UX y flujos — 16 skills` · `Composición — find · get` · `Pulido — Playwright`

**EN:** Three phases, on demand
`UX & flows — 16 skills` · `Composition — find · get` · `Polish — Playwright`

Doodle: camino punteado con tres hitos y un avión de papel que lo recorre.

### 6 · La memoria (38,5–46,5 s)

**ES:** Recuerda cada decisión
`combo save saas-landing-v1` → `reutiliza en el siguiente proyecto`
`ux-map.excalidraw` · `licencias al día`

**EN:** Remember every decision
`combo save saas-landing-v1` → `reuse it in the next project`
`ux-map.excalidraw` · `licenses up to date`

Doodle: caja-archivo que traga fichas, sello "reutiliza", mini-mapa de nodos, escudo.

### 7 · CTA (46,5–55 s)

Terminal:
```
npm i -D github:urben88/ai-frontend-guide-kit
npx ai-frontend-guide-kit
```

**ES:** Reutiliza antes de crear
**EN:** Reuse before you build
`github.com/urben88/ai-frontend-guide-kit`

Doodle: terminal con typewriter, subrayado a mano, chispas, robot con lápiz.

## Locución (voz en off)

Frases por escena, mezcladas sobre la línea de tiempo con `adelay` + `amix` + `loudnorm` (I=-15 LUFS) y `apad` hasta 55 s. Voces: `es-ES-ElviraNeural` y `en-US-JennyNeural` (edge-tts). Si una frase excede su hueco, el script aplica `atempo` (máx. 1,35×).

| Inicio | Hueco | ES | EN |
|---|---|---|---|
| 0,4 s | 5,35 s | ¿Otra vez un frontend desde cero? Semanas de trabajo y un resultado genérico. | Building a frontend from scratch again? Weeks of work and a generic result. |
| 5,9 s | 7,15 s | ¡Reutiliza antes de crear! Dieciséis fuentes y dos mil cuatrocientos setenta componentes, con licencia e instalación. | Reuse before you build: sixteen verified sources and two thousand four hundred seventy components, with license and install info. |
| 13,2 s | 8,85 s | Y lo mejor: descubrimos las ideas juntas. Te propongo webs de ejemplo, eliges la que más te gusta y guardamos tus capturas. | Then we discover ideas together: example sites, your picks, and screenshots saved for the brief. |
| 22,2 s | 7,35 s | Definimos la dirección: arquetipo, filosofía y tres propuestas. Laya las ordena en tu propio ordenador, en privado. | Pick a direction: archetype, philosophy and three proposals, ranked locally by Laya. |
| 29,7 s | 8,85 s | Después, tres fases a demanda: UX y flujos, composición con el catálogo y pulido final con Playwright. | Three phases on demand: UX and flows, composition from the catalog, and final polish with Playwright. |
| 38,7 s | 7,85 s | Cada decisión queda guardada: referencias, combinaciones y licencias, listas para el siguiente proyecto. | Every decision is remembered: references, combinations and licenses, ready for the next project. |
| 46,7 s | 8,15 s | Se instala en un minuto. ¡Reutiliza antes de crear! | Install it in a minute. Reuse before you build! |

Regenerar una frase:
```bash
python -m edge_tts --voice es-ES-ElviraNeural --text "…" --write-media segmento.mp3
```
Regenerar el vídeo con voz: render de frames (`render.mjs`) → `libx264` → mezcla con `adelay`/`amix`/`loudnorm`/`apad=whole_dur=55` → mux `-c:v copy -c:a aac`.

## Notas de producción

- Fuente reutilizable: `index.html` (`window.renderAt(t)` determinista, `window.TOTAL_DURATION = 55`).
- `?t=<segundos>` fija un fotograma (debug); `?render=1` desactiva el playback.
- Render: `render.mjs` (Playwright → frames PNG) + ffmpeg (`-framerate 30`, `libx264`).
- Estilo: papel `#f8f4ea`, tinta `#26221c`, acento `#e8590c`, azul `#2f6fed`, verde `#2f9e44`.
- Tipografías: Caveat (títulos) y Patrick Hand (texto), ambas OFL, locales en `fonts/`.
- Trazos dibujados con rough.js (MIT, `vendor/rough.js`); iconos 100 % vectoriales, sin imágenes.
