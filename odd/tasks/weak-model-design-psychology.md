# weak-model-design: applied psychology (source material)

The user's list, pasted on 2026-11-12, kept verbatim. It is the input of S12 in `weak-model-design.md` (task T14). Do not edit the list; decisions go in the feature document.

---

Sí: una buena herramienta de diseño debería incorporar **psicología aplicada**, no solo estética. El objetivo no es “crear dopamina” de forma manipuladora, sino diseñar una experiencia que reduzca esfuerzo mental, dé sensación de progreso, recompensa justa y control al usuario. [nngroup](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/)

## Principio central

El cerebro no procesa una web como una lista de elementos: la escanea, agrupa, predice y decide rápido. Una página agradable es la que hace evidente **dónde mirar, qué es importante, qué puede hacer y qué ocurrirá después**. [nngroup](https://www.nngroup.com/articles/psychology-study-guide/)

La regla práctica es: **una pantalla, una intención principal; una sección, una idea; un bloque, una acción.**

## 1. Atención y jerarquía visual

| Principio psicológico | Qué significa | Cómo aplicarlo en la web |
|---|---|---|
| **Jerarquía visual** | El ojo sigue primero lo más grande, contrastado o aislado.  [nngroup](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/) | Un solo titular dominante, un CTA principal y elementos secundarios más discretos. |
| **Atención selectiva** | Las personas no ven todo; filtran lo que no parece relevante.  [nngroup](https://www.nngroup.com/articles/psychology-study-guide/) | Elimina banners, badges y textos que compiten con la acción principal. |
| **Ley de Fitts** | Los objetivos grandes y cercanos se pulsan mejor.  [nngroup](https://www.nngroup.com/articles/psychology-study-guide/) | CTA grande, con área táctil amplia y cerca del contenido relevante. |
| **Ley de Hick** | Más opciones = decisión más lenta y más parálisis.  [nngroup](https://www.nngroup.com/articles/psychology-study-guide/) | Máximo 3–5 opciones visibles por decisión; una recomendación destacada. |
| **Ley de Proximidad** | Lo cercano se percibe como relacionado. | Agrupa título, descripción, precio y botón del mismo elemento. |
| **Ley de Similitud** | Elementos parecidos parecen pertenecer al mismo grupo. | Mismo estilo para todas las tarjetas de servicio, producto o artículo. |
| **Ley de Continuidad** | El ojo sigue líneas, alineaciones y flujos visuales. | Alinear imágenes, textos y CTA para crear un recorrido natural. |
| **Ley de Cierre** | El cerebro completa formas incompletas. | Usar formas parciales, máscaras e ilustraciones sugeridas con moderación. |
| **Figura-fondo** | Lo que contrasta se percibe como figura; lo demás, fondo. | Fondo tranquilo, contenido nítido, acentos reservados para acciones. |
| **Zona de lectura** | En páginas de texto, la atención se concentra arriba y a la izquierda.  [emulent](https://emulent.com/insight/website-layout-psychology/) | Mensaje principal arriba a la izquierda; CTA visible sin depender del scroll. |

**Regla de diseño:** cada sección debe responder a una pregunta implícita del usuario: “¿qué es esto?”, “¿por qué me importa?”, “¿cómo funciona?”, “¿qué hago ahora?”.

## 2. Carga cognitiva

La carga cognitiva es el esfuerzo mental necesario para usar la interfaz; reducir el esfuerzo innecesario mejora la usabilidad. [nngroup](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/)

- **Una idea por bloque:** no mezclar precio, garantía, especificaciones y testimonios en la misma tarjeta.
- **Máximo 3–4 grupos de información por pantalla:** la memoria de trabajo maneja pocos elementos a la vez. [idealogic](https://idealogic.io/blog/psychology-behind-ui-ux-design-5-principles-you-should-know)
- **Progresión por pasos:** dividir formularios largos en etapas cortas con progreso visible.
- **Valores por defecto inteligentes:** preseleccionar opciones razonables en vez de obligar a decidir todo.
- **Mostrar, no obligar a recordar:** rellenar datos previos, mostrar resúmenes y evitar que el usuario tenga que memorizar información. [nngroup](https://www.nngroup.com/articles/minimize-cognitive-load/)
- **Etiquetas familiares:** usar “Buscar”, “Carrito”, “Contacto” y “Ver precios”, no inventos creativos que confundan.
- **Modelos mentales existentes:** el logo arriba a la izquierda, el menú arriba, el carrito arriba a la derecha y el CTA visible funcionan porque la gente ya los reconoce. [nngroup](https://www.nngroup.com/articles/minimize-cognitive-load/)
- **Eliminar ruido visual:** imágenes irrelevantes, enlaces redundantes y adornos tipográficos aumentan carga sin aportar significado. [nngroup](https://www.nngroup.com/articles/minimize-cognitive-load/)
- **Chunking:** agrupar información en bloques de 3–5 elementos.
- **Progresiva:** mostrar detalles técnicos solo al expandir, filtrar o hacer clic.
- **Feedback inmediato:** confirmar cada acción: “Guardado”, “Añadido”, “Enviado”, “Error en el email”.
- **Prevención de errores:** validar antes de enviar y explicar cómo corregir el problema.

## 3. Recompensa y motivación

La dopamina está más relacionada con la **anticipación de recompensa** que con la recompensa en sí. Eso puede usarse para motivar, pero también para manipular; la diferencia ética está en si el usuario recibe valor real y mantiene el control. [uxmag](https://uxmag.com/articles/designing-for-dependence-when-ux-turns-tools-into-traps)

| Mecanismo | Aplicación sana | Aplicación a evitar |
|---|---|---|
| **Progreso visible** | Barra “3 de 4 pasos completados” | Barra que nunca termina o avanza de forma falsa |
| **Recompensa inmediata** | Confirmación clara, vista previa, resultado útil | Recompensa vacía o ruido visual |
| **Recompensa variable** | Contenido recomendado relevante, descubrimiento controlado | Scroll infinito adictivo sin límite ni salida clara |
| **Curiosidad** | “Ver cómo funciona” con una promesa concreta | Clickbait que no cumple lo prometido |
| **Logro** | “Has completado tu perfil”, “Has creado tu primer proyecto” | Insignias sin valor real |
| **Momentum** | Guardar borrador, recordar dónde estaba, retomar fácilmente | Obligar a empezar de cero |
| **Autonomía** | Permitir saltar, editar, deshacer y salir | Flujos forzados o botones confusos |
| **Pérdida aversiva** | “Tu borrador se guarda automáticamente” | “¡Solo quedan 2 minutos!” falso |
| **Prueba social** | Testimonios reales, casos, cifras verificables | Testimonios inventados o urgencia artificial |
| **Compromiso progresivo** | Pedir primero lo mínimo y aumentar gradualmente | Pedir todos los datos antes de mostrar valor |

**Diseño ético:** la recompensa debe ser real, inmediata y proporcional al esfuerzo. Si pides un email, entrega algo útil: una plantilla, un presupuesto, un acceso, un resultado o una demo.

## 4. Emoción y primera impresión

El usuario forma una impresión casi instantánea antes de leer el contenido. Por eso el hero, la tipografía y la primera imagen pesan tanto.

- **Claridad antes que originalidad:** primero debe entenderse qué es y para quién es.
- **Una emoción dominante:** calma, confianza, lujo, energía, curiosidad o cercanía; no todas a la vez.
- **Coherencia sensorial:** tipografía, color, fotografía, movimiento y copy deben transmitir la misma personalidad.
- **Contraste emocional:** alternar calma y énfasis; no mantener la misma intensidad en toda la página.
- **Rostro humano:** fotos reales, miradas y expresiones aumentan cercanía cuando son auténticas.
- **Imágenes específicas:** mostrar el producto, el resultado o el contexto real, no fotos corporativas genéricas.
- **Microcopy humano:** “Te ayudamos a lanzar tu tienda” comunica más que “Soluciones digitales innovadoras”.
- **Reducción de incertidumbre:** explicar qué ocurre al pulsar: “Ver demo”, “Calcular precio”, “Descargar guía”.
- **Confianza visual:** diseño consistente, sin errores, con pruebas sociales y información de contacto clara.
- **Peak-End rule:** la experiencia se recuerda por su momento más intenso y por el final; cuida el momento de éxito y la despedida. [uxprinciples](https://uxprinciples.design/laws)

## 5. Distribución de la página

La distribución no es solo estética: dirige la atención y crea una narrativa.

### Hero

- Un mensaje principal, no tres propuestas compitiendo.
- Un CTA principal, no cinco botones.
- Una imagen o visual que explique el beneficio, no que solo decore.
- Prueba de valor cercana: “Sin tarjeta”, “Respuesta en 24 h”, “Usado por 1.200 equipos”.
- Evitar el hero centrado genérico si buscas personalidad.

### Secciones

- Alternar **ritmo**: texto denso, visual grande, espacio en blanco, prueba social, CTA.
- Usar **una idea por sección**.
- Colocar la información crítica antes de pedir scroll excesivo.
- Repetir el CTA cuando el usuario ya tiene contexto, no cada dos líneas.
- Usar testimonios cerca de la objeción que resuelven: precio, confianza, complejidad o tiempo.
- Terminar cada bloque con una microacción clara.

### Layout

- **Z-pattern:** adecuado para landings visuales y comerciales.
- **F-pattern:** adecuado para páginas con mucho texto, blogs y documentación. [emulent](https://emulent.com/insight/website-layout-psychology/)
- **Columna única en móvil:** una acción y una lectura a la vez.
- **Retícula modular:** secciones independientes, fáciles de reordenar y mantener.
- **Asimetría controlada:** rompe la monotonía sin perder jerarquía.
- **Espacio en blanco:** no es espacio desperdiciado; es la herramienta que hace legible y premium el diseño.
- **Punto focal único:** cada viewport debe tener un elemento que domine.
- **Progresión descendente:** cada sección debe hacer más fácil tomar la siguiente decisión.

## 6. Formularios y conversión

Los formularios son donde más se nota la psicología del esfuerzo.

- **Menos campos al inicio:** pedir solo lo imprescindible.
- **Un campo por línea en móvil.**
- **Etiquetas siempre visibles:** no depender solo del placeholder.
- **Validación en tiempo real:** avisar antes de enviar.
- **Mensajes útiles:** “Introduce un email válido”, no “Campo incorrecto”.
- **Autocompletado:** nombre, email, dirección y tarjeta.
- **Barra de progreso honesta.**
- **Botón con verbo concreto:** “Crear mi cuenta”, no “Enviar”.
- **Reassurance cerca del CTA:** “Sin compromiso”, “Puedes cancelar cuando quieras”.
- **Error recuperable:** conservar datos y señalar exactamente el campo fallido.
- **Recompensa al completar:** confirmación clara, siguiente paso visible y valor entregado.

Reducir la carga cognitiva en formularios mejora la comprensión de la estructura y guía mejor la atención del usuario. [nngroup](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/)

## 7. Navegación y decisiones

- **Menú corto:** 5–7 elementos principales como máximo.
- **Una acción primaria:** “Contactar”, “Comprar”, “Probar gratis” o “Ver demo”.
- **Acciones secundarias menos visibles:** “Más información”, “Comparar”, “Ver detalles”.
- **Agrupar por intención:** no por estructura interna de la empresa.
- **Breadcrumbs:** para webs con muchas categorías o documentación.
- **Búsqueda visible** si hay mucho contenido.
- **Filtros progresivos:** primero categoría, luego atributos.
- **Estado actual claro:** el usuario siempre debe saber dónde está.
- **Salidas claras:** poder volver, cancelar, cerrar o cambiar de opción sin sentirse atrapado.
- **Defaults útiles:** preseleccionar la opción recomendada, no la más cara por defecto.

La Ley de Hick indica que reducir y agrupar opciones, además de destacar una recomendación, disminuye la fricción de decisión. [nngroup](https://www.nngroup.com/articles/psychology-study-guide/)

## 8. Confianza y seguridad

La confianza se construye con señales consistentes, no con promesas grandes.

- **Prueba social específica:** “Usado por 120 talleres industriales” es mejor que “Miles de clientes”.
- **Prueba de competencia:** logos, certificaciones, casos, prensa o métricas verificables.
- **Transparencia de precio:** evitar “Contacta para saber el precio” si puedes mostrar un rango.
- **Política clara:** devoluciones, privacidad, cancelación y soporte accesibles.
- **Fotos reales:** equipo, producto, proceso o resultado.
- **Testimonios con contexto:** quién es la persona, qué problema tenía y qué resultado obtuvo.
- **Errores humanos visibles:** un pequeño detalle imperfecto puede aumentar cercanía si es auténtico.
- **Consistencia:** tipografía, tono, color y calidad visual uniformes transmiten profesionalidad.
- **Riesgo reducido:** garantía, demo, prueba gratuita o devolución clara.

## 9. Movimiento y recompensa sensorial

El movimiento puede generar placer y sensación de calidad, pero también ansiedad si es excesivo.

- **Animar solo lo importante:** entrada del hero, aparición de secciones, hover de CTA, confirmación de acción.
- **Duraciones cortas:** 150–400 ms para microinteracciones.
- **Movimiento con propósito:** guiar la mirada, confirmar una acción o explicar una relación.
- **Momentum:** animaciones que continúan la dirección del gesto del usuario.
- **Feedback táctil:** botón que se hunde, tarjeta que reacciona, toggle que cambia de estado.
- **Recompensa de finalización:** animación breve al enviar, guardar o completar.
- **Sin movimiento constante:** fondos que se mueven sin parar cansan y distraen.
- **Reduced motion:** ofrecer una versión estática para quien lo necesite.
- **Coherencia:** usar las mismas curvas, duraciones y estilos en toda la web.

## 10. Personalización y relevancia

La relevancia es una de las formas más potentes de generar atención y satisfacción.

- **Segmentar por intención:** “Soy empresa”, “Soy particular”, “Busco integración”, “Busco soporte”.
- **Contenido dinámico:** mostrar casos, precios o ejemplos según sector o necesidad.
- **Recordar preferencias:** idioma, filtros, tema claro/oscuro y últimas búsquedas.
- **Recomendaciones útiles:** basadas en comportamiento real, no solo en popularidad.
- **Evitar personalización invasiva:** no usar datos sensibles ni crear sensación de vigilancia.
- **Contexto en cada pantalla:** el usuario debe entender por qué ve esa recomendación.
- **Control del usuario:** poder modificar, ocultar o reiniciar las recomendaciones.

## 11. Psicología del scroll

El scroll no debe sentirse como trabajo; debe sentirse como descubrimiento.

- **Ganchos por sección:** cada bloque debe abrir una pregunta o prometer un beneficio.
- **Reveal progresivo:** mostrar información cuando aporta contexto, no todo de golpe.
- **Ritmo de lectura:** alternar bloques largos y cortos.
- **Anclas visuales:** títulos, imágenes o elementos que indiquen que sigue habiendo contenido.
- **CTA contextual:** repetir la acción cuando ya se ha explicado el valor.
- **No esconder lo esencial:** precios, contacto y CTA principal no deben requerir una búsqueda.
- **Final con cierre:** terminar con una decisión clara, no con un footer caótico.

## 12. Reglas anti-manipulación

Una web puede ser persuasiva sin ser oscura. Los *dark patterns* usan conocimientos psicológicos para engañar o presionar al usuario en contra de su interés. [ht.csr-pub](https://ht.csr-pub.eu/index.php/ht/article/download/6/4)

Evita:

- Urgencia falsa: “Solo quedan 2” cuando no es cierto.
- Suscripciones ocultas o cancelación difícil.
- Botones de aceptar enormes y rechazar diminutos.
- Precios confusos o cargos ocultos.
- Consentimiento por defecto.
- Popups que impiden cerrar fácilmente.
- Texto legal que contradice la interfaz.
- Gamificación sin valor real.
- Scroll infinito sin límites ni control.
- “FOMO” artificial.

En su lugar, usa:

- Urgencia real y verificable.
- Cancelación en un clic.
- Elección equilibrada.
- Precios transparentes.
- Consentimiento explícito.
- Recompensas basadas en valor.
- Progreso honesto.
- Control total del usuario.

## 13. Checklist psicológico para cada pantalla

Antes de dar por buena una página, la herramienta debería validar:

- ¿Se entiende en 3 segundos qué es y para quién es?
- ¿Hay un solo punto focal principal?
- ¿Hay una sola acción prioritaria?
- ¿El CTA es grande, visible y comprensible?
- ¿El usuario sabe qué pasará al pulsar?
- ¿Hay menos de 5 decisiones visibles?
- ¿La información está agrupada por relación?
- ¿Hay espacio suficiente entre bloques?
- ¿El contraste cumple accesibilidad?
- ¿El texto principal es legible en móvil?
- ¿El formulario pide lo mínimo?
- ¿Hay feedback inmediato tras cada acción?
- ¿La prueba social es específica y creíble?
- ¿El usuario puede volver, cancelar o deshacer?
- ¿La recompensa es real y proporcional?
- ¿La página termina con una acción clara?

## 14. Cómo integrarlo en una herramienta IA

La herramienta debería tener estos módulos psicológicos:

1. **Attention Map:** simula dónde mirará el usuario y detecta elementos compitiendo.
2. **Cognitive Load Analyzer:** detecta demasiadas opciones, textos densos, formularios largos o jerarquía confusa.
3. **Decision Optimizer:** reduce opciones, destaca una recomendación y ordena alternativas.
4. **Motivation Designer:** propone progresos, recompensas y micrologros éticos.
5. **Emotion Mapper:** comprueba si la estética transmite la emoción de marca deseada.
6. **Trust Auditor:** detecta falta de pruebas, precios poco claros o garantías ausentes.
7. **Friction Detector:** localiza formularios largos, pasos innecesarios y decisiones prematuras.
8. **Ethical Persuasion Guard:** bloquea urgencias falsas, dark patterns y manipulación.
9. **Scroll Narrative Engine:** convierte la página en una secuencia: atención, interés, prueba, objeción, acción.
10. **Persona Simulator:** evalúa la página desde distintos perfiles: novato, experto, móvil, prisa, desconfianza o accesibilidad reducida.

**En una frase:** la web debe hacer sentir al usuario: *“Entiendo esto, sé qué hacer y me resulta fácil avanzar”*. Esa sensación de claridad, control y progreso es mucho más sostenible que intentar fabricar dopamina con trucos. [nngroup](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/)
