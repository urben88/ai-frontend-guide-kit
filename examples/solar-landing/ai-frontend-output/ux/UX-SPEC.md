# UX spec
## Screens
| Screen | Purpose | Primary action | Empty state | Loading state | Error state | Serves |
|---|---|---|---|---|---|---|
| Landing | Vender la instalación y llevar al formulario | Pedir presupuesto (ancla al formulario) | No aplica: el contenido es fijo; sin panel 3D, se muestra la imagen estática del panel | Hero visible en HTML; la escena 3D carga después con un marco reservado | Si falla WebGL, se queda la imagen estática y el texto sigue igual | G1, O1, O2, O3, O4, P1, P2, P3 |
| Formulario de presupuesto | Recoger código postal, consumo y teléfono | Pedir presupuesto (G1) | Campos vacíos con su pregunta visible; sin valores de ejemplo | Botón en estado «Enviando…» deshabilitado; campos en lectura | Error bajo cada campo y resumen arriba; los valores se conservan | G1, O2, O4 |
| Confirmación | Decir qué pasa después y cuándo llamarán | Volver a la landing | No aplica: solo se llega tras un envío correcto | No aplica | Si el envío falla, no se llega aquí: el formulario muestra el error | G1 |
| 404 | Recuperar al visitante perdido | Volver a la landing | No aplica | No aplica | Página con enlaces a la landing y al formulario | G1 |
| Landing sin escena 3D | Mismo contenido para móviles lentos o sin WebGL | Pedir presupuesto (G1) | No aplica | Sin carga de escena | No aplica: es la versión de respaldo | G1, P1 |

## Flows
### Pedir presupuesto (flujo principal)
1. Landing → muestra el hero con el panel y el titular → primary action «Pedir presupuesto» → va a Formulario (branch: si el visitante ya lee las garantías, el botón del cierre hace lo mismo).
2. Formulario → muestra tres preguntas, una por bloque visible: código postal, consumo mensual de la factura, teléfono → primary action «Enviar y recibir presupuesto» → va a Confirmación (branch: si hay errores de validación, se queda aquí con el resumen arriba y el foco en el primer campo con error).
3. Formulario, estado error de red → muestra el aviso «No hemos podido enviarlo. Tus datos siguen aquí.» → primary action «Reintentar» → vuelve al paso 2 con los valores intactos (branch: si vuelve a fallar tres veces, se ofrece el teléfono directo).
4. Confirmación → muestra qué pasa después y el plazo de llamada → primary action «Volver a la landing» → va a Landing.

### Visitante que duda (flujo secundario)
1. Landing → recorre «Cómo funciona» (escena fijada con tres tramos) → lee precio orientativo y FAQ → primary action de cierre «Pedir presupuesto» → va a Formulario (branch: si la escena no carga, la versión sin escena muestra los mismos tres pasos en lista).

## Navigation
Menú superior: Cómo funciona · Garantías · Precios · Preguntas · [Pedir presupuesto]. Al bajar de 768 px, los enlaces se pliegan en un botón de menú; el botón de presupuesto se queda visible fuera del menú. En móvil, el botón de presupuesto también aparece como barra fija inferior al pasar el hero.

## Audit
| Anti-pattern | Result (PASS, WARN or FAIL) | Where |
|---|---|---|
| Placeholder usado como etiqueta | PASS | Formulario: cada campo tiene etiqueta visible encima |
| Validar al primer carácter | PASS | Formulario: validación al salir del campo |
| Error genérico «Entrada no válida» | PASS | Formulario: cada error dice qué corregir |
| Borrar el formulario tras un error | PASS | Formulario: los valores se conservan siempre |
| Campo de confirmación de correo o contraseña | PASS | No hay correo ni contraseña en el formulario |
| Más de siete campos o dos temas | PASS | Tres campos, un solo tema |
| Botón deshabilitado sin explicación | PASS | Botón siempre activo; la validación explica |
| Página de éxito sin siguiente paso | PASS | Confirmación con plazo y botón de vuelta |
| Escena que oculta el contenido sin JavaScript | WARN | Landing: sin JS, la escena no aparece; el texto sí. Revisar en la fase de construcción |
| Ahorro prometido sin hipótesis | WARN | Landing, precio: se exige mostrar las hipótesis; pendiente de los datos del cliente |
