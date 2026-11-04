# Guion — Vídeo explicativo (estilo dibujo)

> Duración total: **64 s** · 1920×1080 · 30 fps · voz en off local con Supertonic 3, voz `M1` (ES y EN)
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
`34 fuentes verificadas` · `4.287 componentes` · `21 categorías`
Terminal: `npx github:urben88/ai-frontend-guide-kit`
Etiqueta: `licencia · instalación · enlace`

**EN:** Reuse before you build
`34 verified sources` · `4,287 components` · `21 categories`
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

### 6 · Conoce tu proyecto (38,5–47,5 s)

**ES:** Conoce tu proyecto
Ruta `intake → direction → ux → tokens → compose → polish`: tres pasos hechos, `tokens` es el actual y el salto a `polish` se tacha.
`flow.mjs · sin saltarse pasos`
Mapa `UI-MAP.md` (App → Header · Card · Button) · `$ ui-map have Button` → `✓ ya existe → reutiliza` · `impact · have · check`

**EN:** Knows your project
Same route; the jump to `polish` is crossed out.
`flow.mjs · no skipped steps`
`UI-MAP.md` · `$ ui-map have Button` → `✓ already there → reuse it` · `impact · have · check`

Doodle: escalera de pasos con checks, flecha roja tachada, árbol de componentes con `Button` rodeado en verde.

### 7 · La memoria (47,5–55,5 s)

**ES:** Recuerda cada decisión
`ai-frontend-output/` → `siguiente proyecto` · `reutiliza`
`ux-map.excalidraw` · `licencias al día` · `React · shadcn/ui` (`librerías de UI en uso`)

**EN:** Remember every decision
`ai-frontend-output/` → `next project` · `reuse`
`ux-map.excalidraw` · `licenses up to date` · `React · shadcn/ui` (`UI libraries in use`)

Doodle: caja-archivo que traga fichas, sello "reutiliza", mini-mapa de nodos, escudo, ficha azul de librerías.

### 8 · CTA (55,5–64 s)

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

Voz `M1` de Supertonic 3 (local, ONNX en CPU), la misma en los dos idiomas. Cada frase se coloca con `adelay` y se mezcla con `amix` + `loudnorm` (I=-15 LUFS) + `apad` hasta 64 s. Si una frase no cabe en su hueco, se acorta el texto o se sube la velocidad de síntesis (máx. 1,2×), nunca con `atempo`.

| Inicio | Hueco | ES | EN |
|---|---|---|---|
| 0,4 s | 5,35 s | ¿Otra vez un frontend desde cero? Semanas de trabajo y un resultado genérico. | Building a frontend from scratch again? Weeks of work and a generic result. |
| 5,9 s | 7,15 s | ¡Reutiliza antes de crear! Treinta y cuatro fuentes y más de cuatro mil componentes, con su licencia. | Reuse before you build: thirty-four sources and over four thousand components, each with its license. |
| 13,2 s | 8,85 s | Y lo mejor: descubrimos las ideas juntos. Te propongo webs de ejemplo, eliges la que más te gusta y guardamos tus capturas. | Then we discover ideas together: example sites, your picks, and screenshots saved for the brief. |
| 22,2 s | 7,35 s | Eliges la dirección: arquetipo, filosofía y tres propuestas, que Laya ordena en privado. | Pick a direction: archetype, philosophy and three proposals, ranked locally by Laya. |
| 29,7 s | 8,85 s | Después, tres fases a demanda: UX y flujos, composición con el catálogo y pulido final con Playwright. | Three phases on demand: UX and flows, composition from the catalog, and final polish with Playwright. |
| 38,7 s | 8,85 s | Y nunca se salta un paso: sigue tu ruta, conoce cada componente de tu proyecto y te avisa antes de duplicar. | And it never skips a step: it follows your route, knows every component in your project, and warns you before you duplicate one. |
| 47,7 s | 7,85 s | Cada decisión queda guardada: referencias, librerías y licencias, listas para el siguiente proyecto. | Every decision is remembered: references, UI libraries and licenses, ready for the next project. |
| 55,7 s | 8,15 s | Se instala en un minuto. ¡Reutiliza antes de crear! | Install it in a minute. Reuse before you build! |

Regenerar el vídeo con voz: frases con Supertonic (`Supertonic(dir_modelo, voz="M1").sintetizar(texto, idioma, pasos=16, velocidad=…)`, WAV mono) → render de frames (`render.mjs`) → `libx264` → mezcla con `adelay`/`amix`/`loudnorm`/`apad=whole_dur=64` → mux `-c:v copy -c:a aac`.

## Notas de producción

- Fuente reutilizable: `index.html` (`window.renderAt(t)` determinista, `window.TOTAL_DURATION = 64`).
- `?t=<segundos>` fija un fotograma (debug); `?render=1` desactiva el playback.
- Render: `render.mjs` (Playwright → frames PNG) + ffmpeg (`-framerate 30`, `libx264`).
- Estilo: papel `#f8f4ea`, tinta `#26221c`, acento `#e8590c`, azul `#2f6fed`, verde `#2f9e44`.
- Tipografías: Caveat (títulos) y Patrick Hand (texto), ambas OFL, locales en `fonts/`.
- Trazos dibujados con rough.js (MIT, `vendor/rough.js`); iconos 100 % vectoriales, sin imágenes.
