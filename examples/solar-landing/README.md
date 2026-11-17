# Solar Casa · landing de placas solares

Landing para vender instalación de placas solares a particulares en España. Una página con un panel solar 3D, la acción «Pedir presupuesto» y un formulario de tres campos.

## Arrancar
- `npm install`
- `npm run dev` (desarrollo) · `npm run build` (producción) · `npm run preview`
- Para enviar el formulario, define `VITE_PRESUPUESTO_URL` en `.env.local`. Sin esa variable el envío muestra un aviso y no finge éxito.

## Dónde está cada cosa
- `ai-frontend-output/ux/`: brief, especificación de pantallas y mapa visual.
- `DESIGN.md` y `design-tokens.json`: colores, tipografía y espacios. Los estilos usan solo esos tokens.
- `PRODUCT.md`: objetivo, objeciones y pruebas de cada pantalla.
