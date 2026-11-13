# weak-model-design: technique list (source material)

The user's list, pasted on 2026-11-12, kept verbatim. It is the input of S9-S11 in `weak-model-design.md` (task T11 classifies every item). Do not edit the list; decisions go in the feature document.

---

Aquí tienes una **lista extensa de técnicas y capacidades** que debería tener una herramienta de diseño web con IA para conseguir resultados realmente bonitos, no plantillas genéricas. La idea central es que el modelo no “invente” todo: debe trabajar sobre un sistema visual, referencias, restricciones y revisiones iterativas.

## 1. Estrategia y concepto

Antes de maquetar, la herramienta debe entender **qué** se diseña, para quién y con qué intención.

- **Brief guiado:** objetivo del sitio, público, tono de marca, competencia, acciones prioritarias y mensajes clave.
- **Moodboard automático:** generar 3–5 direcciones visuales a partir de palabras clave, imágenes, marcas o referencias.
- **Referencias anotadas:** aceptar capturas, URLs, PDFs o imágenes y extraer patrones: tipografía, ritmo, color, composición y animación.
- **Referencias positivas y negativas:** “quiero esto”, “evito esto”; no solo inspiración positiva.
- **Positioning visual:** elegir entre editorial, premium, brutalista, técnico, industrial, lujoso, orgánico, retro, minimalista, maximalista, etc.
- **Mapa de mensajes:** jerarquía de contenido: qué debe entender el usuario primero, segundo y tercero.
- **Definición de CTA principal:** una acción dominante por pantalla, no diez botones compitiendo.
- **Arquetipos de marca:** innovador, fiable, premium, cercano, técnico, disruptivo, artesanal, etc.
- **Análisis de competencia:** comparar 3–5 webs rivales y detectar patrones que conviene evitar para diferenciarse.
- **Naming de secciones:** proponer títulos claros y persuasivos, no “Nuestros servicios” en todas las webs.

La investigación sobre generación de UI señala que los prompts más efectivos combinan objetivo, planificación, ejemplos, instrucciones técnicas y directrices de formato.

## 2. Arquitectura de información

Es la parte que decide si la web se entiende o parece un montón de secciones bonitas pero desordenadas.

- **Sitemap:** páginas, niveles, agrupaciones y rutas de navegación.
- **User flows:** recorridos desde llegada hasta conversión, compra, contacto o registro.
- **Card sorting:** organizar contenidos por categorías según cómo los entiende el usuario.
- **Content inventory:** inventario de textos, imágenes, vídeos, productos, testimonios y documentos.
- **Priority matrix:** qué contenido es esencial, importante u opcional.
- **Jerarquía de información:** H1, H2, H3, bloques, listas, tablas y llamadas destacadas.
- **Progressive disclosure:** mostrar información avanzada solo cuando hace falta.
- **Navegación persistente:** menú, breadcrumb, búsqueda, filtros y accesos rápidos.
- **Mapa de conversiones:** dónde aparece cada CTA y qué acción se espera en cada punto.
- **Diagramas de estados:** vacío, cargando, error, éxito, sin resultados, límite alcanzado, etc.

Figma Make, por ejemplo, permite describir una pantalla o flujo completo y convertirlo en un wireframe interactivo antes de aplicar estética final. [figma](https://www.figma.com/solutions/ai-wireframe-generator/)

## 3. Wireframes y maquetación

Aquí se define la estructura antes de gastar tiempo en color, tipografía o animaciones.

- **Wireframes low-fidelity:** cajas, bloques y jerarquía sin estilos.
- **Wireframes mid-fidelity:** jerarquía tipográfica, espacios, componentes básicos y densidad de contenido.
- **Grid system:** retícula de 12 columnas, márgenes, gutters, breakpoints y alineaciones.
- **Layout modular:** secciones reutilizables, tipo *bento grid*, bloques apilables y componentes intercambiables.
- **Layout asimétrico:** composiciones menos previsibles, pero manteniendo lectura y jerarquía.
- **Broken grid controlado:** elementos que rompen la retícula de forma intencional, no caótica.
- **Espaciado escalable:** escala de márgenes y paddings coherente: 4, 8, 16, 24, 32, 48, 64, 96 px.
- **Whitespace intencional:** aire suficiente para reducir carga cognitiva y guiar la lectura. [w3](https://www.w3.org/WAI/tips/designing/)
- **Ritmo visual:** alternar secciones densas y ligeras, textos largos y visuales, fondo claro y oscuro.
- **Z-pattern y F-pattern:** guiar la lectura según el tipo de página y contenido.
- **Sticky elements:** header, menú, CTA flotante, barra de progreso o filtros persistentes.
- **Responsive breakpoints:** móvil, tablet, portátil y escritorio; no solo “encoger” la versión desktop.
- **Fluid layout:** usar unidades relativas, `clamp()`, `min()/max()` y grids adaptables. [line25](https://line25.com/articles/web-design-trends-2026/)
- **Container queries:** componentes que cambian según el espacio disponible, no solo según el ancho de pantalla.
- **Auto-layout:** elementos que se reordenan y redimensionan sin romperse.
- **Density control:** modos compacto, normal y amplio para dashboards, catálogos o documentación.
- **Empty states:** qué mostrar cuando no hay datos, productos o resultados.
- **Skeletons:** estados de carga que conservan la estructura final.
- **Sticky/fixed sections:** secciones que permanecen visibles durante el scroll.
- **Scroll snapping:** anclar secciones para narrativas o presentaciones.
- **Multi-column layouts:** columnas equilibradas, masonry, bento, editorial y magazine.
- **Overlapping layers:** capas, imágenes superpuestas y profundidad visual.
- **Full-bleed sections:** imágenes o fondos que ocupan todo el ancho.
- **Split-screen layouts:** contenido y visual en paralelo.
- **Sticky sidebars:** navegación lateral, índices o filtros.

Las tendencias actuales favorecen layouts modulares, retículas rotas controladas, asimetría sutil y mucho espacio en blanco. [kontra](https://kontra.agency/top-web-design-trends-for-2026/)

## 4. Tipografía

La tipografía es probablemente la técnica con más impacto visual por euro invertido.

- **Escala tipográfica:** tamaños coherentes para display, H1, H2, H3, cuerpo, caption y botones.
- **Pareo tipográfico:** una fuente display expresiva + una fuente de lectura neutra.
- **Tipografía variable:** pesos, anchuras y ejes ópticos dinámicos. [line25](https://line25.com/articles/web-design-trends-2026/)
- **Kinetic typography:** texto animado en hero, transiciones o secciones clave. [inspirefusion](https://www.inspirefusion.com/web-design-inspiration-trends-2026/)
- **Oversized headlines:** titulares grandes como elemento gráfico principal. [line25](https://line25.com/articles/web-design-trends-2026/)
- **Fluid type:** tipografía que escala suavemente entre breakpoints con `clamp()`. [line25](https://line25.com/articles/web-design-trends-2026/)
- **Medida de línea:** cuerpo de texto entre 50 y 75 caracteres por línea; 66 es un objetivo habitual. [designrush](https://www.designrush.com/agency/website-design-development/trends/web-design-best-practices)
- **Interlineado:** mayor en textos largos; menor en titulares grandes.
- **Tracking:** ajustar letter-spacing en titulares grandes, que necesitan más aire. [designrush](https://www.designrush.com/agency/website-design-development/trends/web-design-trends)
- **Contraste tipográfico:** combinar tamaños, pesos, anchuras y estilos sin usar demasiadas familias.
- **Jerarquía por peso:** no depender solo del color para diferenciar niveles.
- **Texto sobre imagen:** overlays, degradados o fondos sólidos para garantizar legibilidad.
- **Números tabulares:** alineación correcta en precios, métricas y tablas.
- **Jerarquía de enlaces:** enlaces visibles, estados hover/focus y textos descriptivos.
- **Tipografía accesible:** contraste mínimo 4.5:1 en texto normal y 3:1 en texto grande. [w3](https://www.w3.org/WAI/tips/designing/)
- **Fallback fonts:** fuentes de respaldo para evitar saltos visuales si la webfont falla.
- **Anti-“AI font”:** evitar por defecto Inter, Roboto, Poppins o Montserrat si buscas personalidad.

## 5. Color y contraste

El color debe funcionar como sistema, no como decoración.

- **Paleta primaria:** 1 color dominante + 1–2 acentos.
- **Neutros:** fondo, superficie, borde, texto principal, texto secundario y texto deshabilitado.
- **Tokens semánticos:** `surface`, `text`, `border`, `success`, `warning`, `danger`, `accent`.
- **Modo claro y oscuro:** mismos roles, valores distintos; no invertir colores sin ajustar sombras y contraste. [line25](https://line25.com/articles/web-design-trends-2026/)
- **Contraste AA:** 4.5:1 para texto normal y 3:1 para texto grande. [w3](https://www.w3.org/WAI/tips/designing/)
- **Contraste no dependiente del color:** no comunicar errores o estados solo con rojo/verde; añadir icono, texto o forma. [w3](https://www.w3.org/WAI/tips/designing/)
- **Color como acento:** usar color para dirigir la atención, no para rellenar toda la pantalla.
- **Degradados con propósito:** evitar degradados azul-morado genéricos; usarlos como recurso puntual.
- **Gradientes accesibles:** comprobar contraste en cada punto donde haya texto.
- **Duotono:** imágenes tratadas con dos colores para unificar la identidad.
- **Paleta editorial:** fondos neutros, un acento fuerte y tipografía protagonista.
- **Paleta industrial:** grises, negros, naranjas/verdes técnicos y tipografía monoespaciada.
- **Paleta premium:** negro, crema, beige, verde profundo, dorado o azul marino.
- **Paleta brutalista:** alto contraste, colores planos y bordes marcados.
- **Dark mode real:** ajustar elevación, sombras, bordes y estados hover, no solo invertir blanco y negro. [line25](https://line25.com/articles/web-design-trends-2026/)
- **Color-blind safety:** simulación de daltonismo y validación de contraste.
- **Color tokens exportables:** CSS variables, Tailwind config, Figma variables o JSON.

## 6. Componentes y UI

La web debe construirse con piezas coherentes, no con secciones aisladas.

- **Design tokens:** color, tipografía, espaciado, radios, sombras, bordes, z-index y motion.
- **Botones:** primario, secundario, terciario, ghost, destructivo, deshabilitado, loading y estados hover/focus.
- **Inputs:** label, placeholder, helper text, error, éxito, requerido, disabled y validación.
- **Cards:** producto, artículo, servicio, testimonio, métrica, perfil y categoría.
- **Navigation:** navbar, mega-menú, drawer, tabs, breadcrumbs, paginación y filtros.
- **Modales y drawers:** con foco, cierre accesible, scroll lock y responsive.
- **Tooltips y popovers:** con posición adaptativa y accesible por teclado.
- **Tabs y acordeones:** para organizar contenido sin saturar la página.
- **Tables:** responsive, ordenables, filtrables y con estados vacíos.
- **Forms:** agrupación lógica, validación en tiempo real, mensajes claros y CTA único.
- **Badges y tags:** categorías, estados, precios, disponibilidad o etiquetas.
- **Avatares e imágenes:** recortes consistentes, placeholders y fallback.
- **Icon system:** un solo estilo: lineal, relleno, duotono o pictográfico.
- **Illustration system:** estilo coherente, no imágenes sueltas de bancos distintos.
- **Component variants:** cada componente debe tener variantes de tamaño, tono y estado.
- **Component constraints:** límites claros para que la IA no mezcle estilos incompatibles.
- **Design review automático:** detección de inconsistencias de espaciado, tipografía, contraste y jerarquía. [toools](https://www.toools.design/blog-posts/best-ai-tools-ui-ux-designers-2026)

## 7. Imagen, ilustración y arte

Una web bonita necesita una dirección de imagen, no fotos aleatorias.

- **Art direction:** definir estilo fotográfico, encuadres, iluminación, tratamiento de color y composición.
- **Image prompts:** generar imágenes con restricciones de lente, luz, encuadre, estilo y paleta.
- **Image editing:** recorte, expansión, limpieza, cambio de fondo, upscaling y variaciones.
- **Moodboard visual:** colección de imágenes que fija la estética antes de generar.
- **Consistencia de personajes/productos:** mantener identidad visual entre imágenes.
- **Ilustración vectorial:** iconos, escenas, patrones y gráficos coherentes con la marca.
- **Generative fill:** completar o modificar zonas de una imagen sin regenerarla entera.
- **Background removal:** separar sujetos y productos del fondo.
- **Image-to-UI:** convertir una captura, mockup o foto en estructura de página.
- **Screenshot-to-code:** transformar una referencia en HTML/CSS editable.
- **Brand asset extraction:** detectar colores, tipografías y componentes desde una web existente.
- **Placeholder inteligente:** imágenes provisionales con proporciones y composición correctas.
- **Lazy loading:** cargar imágenes solo cuando entran en pantalla.
- **Responsive images:** `srcset`, formatos modernos y tamaños adaptados.
- **Alt text generado:** descripciones útiles, no “imagen de…”.

## 8. Motion y microinteracciones

El movimiento debe guiar, no decorar.

- **Motion principles:** easing, duración, delay, stagger y curvas coherentes.
- **Microinteractions:** hover, focus, click, drag, toggle, copiar, guardar y errores.
- **Entrance animations:** entradas escalonadas de 50–100 ms; evitar que todo aparezca a la vez. [designrush](https://www.designrush.com/agency/website-design-development/trends/web-design-trends)
- **Scroll-driven animations:** revelar contenido, parallax, progreso y narrativa según el scroll. [line25](https://line25.com/articles/web-design-trends-2026/)
- **Scrollytelling:** contar una historia mientras el usuario baja por la página.
- **Hover states:** elevar, iluminar, desplazar, revelar o cambiar color.
- **Page transitions:** transiciones suaves entre rutas o secciones.
- **Loading animations:** skeletons, progress bars y estados de espera con personalidad.
- **Cursor effects:** cursores personalizados, magnetic buttons o efectos de seguimiento.
- **Magnetic buttons:** elementos que reaccionan sutilmente al cursor.
- **Text reveal:** animar palabras o líneas al entrar en viewport.
- **Parallax:** profundidad mediante capas que se mueven a velocidades distintas.
- **Lottie animations:** animaciones ligeras para iconos, ilustraciones y estados.
- **Reduced motion:** respetar `prefers-reduced-motion` y ofrecer una versión estática.
- **Performance budget:** animar solo `transform`, `opacity` y propiedades baratas; evitar animar layout.
- **Motion tokens:** duraciones, easings y delays reutilizables.
- **Narrative motion:** cada animación debe reforzar el mensaje, no distraer. [line25](https://line25.com/articles/web-design-trends-2026/)

## 9. 3D, WebGL y profundidad

Para webs con presencia visual fuerte, el 3D puede elevar mucho la percepción de calidad.

- **3D hero object:** objeto, producto o forma abstracta como protagonista.
- **Product viewer:** rotar, hacer zoom, cambiar color o configurar un producto.
- **Scene builder:** escenas con luces, materiales, sombras, cámara y entorno.
- **Material editor:** metal, vidrio, plástico, cerámica, tela, madera, líquido o superficies orgánicas.
- **Lighting presets:** estudio, cinematográfico, neón, suave, dramático o industrial.
- **Camera paths:** recorridos de cámara controlados por scroll o interacción.
- **Scroll-linked 3D:** el modelo cambia, rota o se desplaza según el scroll. [figma](https://www.figma.com/es-la/resource-library/tendencias-diseno-web/)
- **Interactive 3D:** arrastrar, rotar, hacer zoom y seleccionar partes del modelo.
- **3D-to-2D fallback:** imagen estática o vídeo para móviles o dispositivos sin WebGL. [designrush](https://www.designrush.com/agency/website-design-development/trends/web-design-trends)
- **Lazy 3D loading:** cargar la escena solo cuando entra en viewport. [designrush](https://www.designrush.com/agency/website-design-development/trends/web-design-trends)
- **Performance controls:** polígonos, texturas, sombras, antialiasing y límite de FPS.
- **Depth without 3D:** sombras, capas, parallax, blur y perspectiva CSS para dar volumen sin WebGL. [line25](https://line25.com/articles/web-design-trends-2026/)
- **AR preview:** visualizar un producto en el espacio real desde móvil.
- **3D asset generation:** generar modelos desde texto, imagen o referencia.
- **Texture generation:** crear materiales, patrones y mapas PBR.
- **Scene composition:** encuadre, foco, profundidad de campo y jerarquía visual.
- **Accessibility fallback:** descripción textual, controles alternativos y versión sin movimiento.

Figma señala que el 3D inmersivo, modelos interactivos, animaciones por scroll y previsualizaciones AR son una tendencia fuerte en 2026. [figma](https://www.figma.com/resource-library/web-design-trends/)

## 10. Creatividad y anti-genérico

Esta es la parte que evita el “diseño de IA”.

- **Style transfer:** aplicar una estética visual a una web sin copiar el contenido.
- **Creative direction agent:** proponer 3 conceptos con nombre, premisa y aplicación visual.
- **Moodboard-to-design:** convertir referencias en un sistema de diseño propio.
- **Design DNA:** guardar paleta, tipografías, ritmo, componentes y reglas de una marca.
- **Variation generator:** crear variantes de hero, cards, pricing, CTA y secciones.
- **Constraint-based creativity:** limitar recursos: “solo dos colores”, “solo tipografía”, “solo una imagen”.
- **Anti-pattern detection:** detectar hero genérico, degradados cliché, tarjetas repetidas y layouts de plantilla.
- **Originality score:** medir cuánto se parece el resultado a plantillas comunes.
- **Brand consistency check:** comprobar que todas las páginas respetan tipografía, color, tono y componentes.
- **Serendipity engine:** proponer combinaciones inesperadas de layout, tipografía y color.
- **Mood mixing:** mezclar dos estilos, por ejemplo “editorial + industrial” o “premium + brutalista”.
- **Reference blending:** tomar composición de una referencia y paleta de otra, sin copiar ninguna.
- **Content-aware design:** adaptar el diseño al tipo de contenido: portfolio, SaaS, ecommerce, blog, documentación o landing.
- **Persona-based design:** cambiar jerarquía y tono según el público objetivo.
- **A/B creative variants:** generar alternativas para comparar conversión y percepción.

## 11. Accesibilidad y calidad

No es un extra: una web bonita que no se puede usar no está bien diseñada.

- **Contrast checker:** validar texto, botones, iconos y estados.
- **Focus visible:** indicadores claros al navegar con teclado.
- **Keyboard navigation:** orden lógico de tabulación y atajos.
- **Semantic HTML:** encabezados, landmarks, listas, botones y enlaces correctos.
- **Heading hierarchy:** no saltar niveles de H1 a H3.
- **Alt text:** descriptivo para imágenes informativas.
- **Touch targets:** botones y controles suficientemente grandes en móvil.
- **Reduced motion:** alternativa sin animaciones.
- **Screen reader testing:** etiquetas, roles y anuncios coherentes.
- **Color-blind simulation:** comprobar que la información no depende solo del color. [w3](https://www.w3.org/WAI/tips/designing/)
- **Responsive audit:** revisar móvil, tablet y escritorio.
- **Performance audit:** peso de imágenes, fuentes, scripts y animaciones.
- **SEO basics:** títulos, meta descripciones, estructura semántica y Open Graph.
- **Content readability:** frases claras, escaneables y con jerarquía visual.
- **Accessibility report:** lista priorizada de errores y correcciones. [awesomeagents](https://awesomeagents.ai/tools/best-ai-design-tools-2026/)

## 12. Iteración y control humano

La herramienta debe permitir corregir sin destruir lo que ya funciona.

- **Design history:** volver a una versión anterior.
- **Version branches:** probar varias direcciones sin perder la original.
- **Section-level editing:** cambiar solo el hero, la tarjeta o el footer.
- **Lock elements:** bloquear paleta, tipografía, logo o layout para que la IA no los cambie.
- **Selective regeneration:** regenerar una zona, no toda la página.
- **Visual diff:** comparar dos versiones y ver qué cambió.
- **Critique mode:** analizar una captura y proponer mejoras priorizadas.
- **Rubric scoring:** puntuar jerarquía, contraste, ritmo, originalidad y usabilidad.
- **Reference adherence:** comprobar si el resultado respeta las referencias dadas.
- **Prompt memory:** recordar decisiones previas: “mantén esta paleta y esta tipografía”.
- **Feedback in natural language:** “menos corporativo”, “más editorial”, “más oscuro”, “menos tarjetas”.
- **Direct manipulation:** mover, redimensionar o alinear elementos manualmente.
- **Sketch-to-design:** convertir un boceto o wireframe dibujado en UI.
- **Comment-to-change:** seleccionar un elemento y escribir “hazlo más grande”, “dale más aire” o “cámbialo a oscuro”.
- **Human-in-the-loop:** la IA propone; la persona decide la dirección final. Los estudios muestran que comentarios, bocetos y manipulación directa mejoran la generación de UI.

## 13. Exportación y producción

El diseño solo vale si se puede implementar bien.

- **Exportar a HTML/CSS/JS limpio.**
- **Exportar a React, Vue, Svelte o Astro.**
- **Tailwind CSS y CSS variables.**
- **Design tokens en JSON, CSS o Figma variables.**
- **Componentes reutilizables.**
- **Responsive code real**, no solo una vista estática.
- **Accesibilidad integrada en el código.**
- **SEO semántico.**
- **Animaciones optimizadas.**
- **Imágenes optimizadas y responsive.**
- **Fuentes autohospedadas o con fallback.**
- **Dark mode funcional.**
- **CMS-ready blocks:** secciones preparadas para WordPress, Webflow, Sanity, Strapi u otro CMS.
- **Design-to-code fidelity:** que el código se parezca al diseño, sin recrearlo desde cero.
- **Code review:** detectar código redundante, accesibilidad deficiente o rendimiento pobre.

## 14. Módulos que yo añadiría

Si fuera a construir una herramienta así, incluiría estos módulos:

1. **Brand Brain:** guarda paleta, tipografías, tono, referencias, componentes y reglas de la marca.
2. **Reference Analyzer:** analiza capturas y URLs, pero extrae principios, no copia literal.
3. **Concept Generator:** propone 3 direcciones creativas antes de maquetar.
4. **Wireframe Engine:** crea estructura, jerarquía y flujos antes del estilo.
5. **Design System Builder:** tokens, componentes, estados y variantes.
6. **Visual Composer:** monta secciones con retícula, espaciado y jerarquía.
7. **Art Director:** controla tipografía, color, imagen, ilustración y composición.
8. **Motion Director:** define animaciones coherentes y accesibles.
9. **3D Studio:** genera escenas, materiales, iluminación y fallbacks.
10. **Accessibility Auditor:** valida contraste, foco, semántica y navegación.
11. **Critique Agent:** revisa capturas y propone cambios priorizados.
12. **Code Generator:** convierte el diseño en frontend limpio y responsive.
13. **Design QA:** compara el resultado con el brief, las referencias y el design system.
14. **Iteration Memory:** recuerda qué te gustó y qué rechazaste.

## Regla de oro

La herramienta ideal no debería preguntarte solo: **“¿qué web quieres?”**
Debería preguntarte:

- ¿Qué sensación debe transmitir?
- ¿A quién le habla?
- ¿Qué debe hacer el usuario?
- ¿Qué referencias te gustan y por qué?
- ¿Qué quieres evitar?
- ¿Qué elementos son intangibles de marca?
- ¿Qué secciones cambian y cuáles se bloquean?
- ¿Qué versión prefieres y por qué?

Eso convierte una generación automática en un proceso de **dirección de arte asistida por IA**. La evidencia actual apunta a que la combinación de prompts estructurados, ejemplos, contexto visual, restricciones de diseño y revisión iterativa produce interfaces mucho mejores que pedir simplemente “una web moderna”.
