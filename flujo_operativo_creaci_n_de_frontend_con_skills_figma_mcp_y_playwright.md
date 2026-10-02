# Guía Operativa: De Carpeta Vacía a Frontend Impecable con AI Skills, Figma MCP y Playwright

Esta guía describe el paso a paso exacto para arrancar tu proyecto desde cero usando:
- **Tus requisitos:** Idea de negocio, user journeys y flujos de navegación.
- **AI Design Skills:** `pbakaus/impeccable`, `leonxlnx/taste-skill` y `emilkowal.ski/skill`.
- **Modelos:** Claude (orquestador visual / frontend) y DeepSeek (arquitectura de datos, lógica de negocio y generación de tests Playwright).
- **Herramientas de entorno:** Figma MCP y Playwright Test Runner.

> **Integración con el Component Manifest (2026-10-02):** el paso de reutilización ya está estandarizado en la carpeta guiada `ai-frontend-guide-kit/` (catálogo de 16 fuentes y 2.470 entradas + guías 00–08 + herramientas `find`/`get`). Copia esa carpeta al repo del proyecto y sigue su flujo; esta guía describe el ciclo completo alrededor de ella.

---

## 1. División de Roles y Responsabilidades

| Herramienta / Skill | Rol específico en tu flujo |
|---|---|
| **Negocio & UX Specs** | Fuente de verdad de objetivos, métricas y pantallas clave. |
| **`pbakaus/impeccable`** | Define `PRODUCT.md` y `DESIGN.md`. Audita contrastes, tipografía y prohíbe el estilo genérico de IA. |
| **`leonxlnx/taste-skill`** | Establece el criterio visual de alto nivel (jerarquía, densidad de información y micro-detalles). |
| **`emilkowal.ski/skill`** | Reglas de interacción, físicas de muelles (*springs*), micro-feedback y animaciones perceptuales. |
| **Figma MCP** | Inspecciona nodos, extrae tokens numéricos y estructuras exactas de Figma a la IA. |
| **`ai-frontend-guide-kit/`** | Catálogo reusable-first: qué componentes existen, dónde, cómo se instalan y con qué licencia (guías 00–08 + `find`/`get`). |
| **Claude** | Orquestación visual, aplicación de las *skills* y maquetación de componentes interactivos. |
| **DeepSeek (API)** | Generación intensiva de lógica de negocio, mocks de backend y creación de suites de tests de Playwright. |
| **Playwright** | Ejecutor de verificación: tests de flujo E2E y regresión visual automática. |

---

## 2. Fase 0: Inicialización del Proyecto y Carpeta

Abre tu terminal en la carpeta raíz del nuevo proyecto:

```bash
# 1. Crear el proyecto frontend (Next.js o Vite + React + Tailwind)
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir --no-eslint
cd frontend

# 2. Instalar dependencias clave de UI y animaciones
npm install motion lucide-react clsx tailwind-merge

# 3. Instalar las AI Skills en tu entorno de desarrollo
# (Compatible con Claude Code, Cursor, Codex CLI o harness de agentes)
npx skills add https://github.com/pbakaus/impeccable --skill impeccable
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
npx skills add https://github.com/emilkowalski/skills

# 4. Inicializar Playwright
npm init playwright@latest
```

---

## 3. Fase 1: Anclar el Negocio y Configurar `PRODUCT.md`

Para evitar que los modelos inventen interfaces genéricas, ejecuta la inicialización de **Impeccable**:

```bash
/impeccable init
```

Esto generará el archivo `PRODUCT.md`. Rellénalo con tus especificaciones de negocio:
1. **Audiencia objetivo:** A quién va dirigida la web (B2B, consumidor final, perfil técnico, etc.).
2. **Propósito principal:** La conversión clave (registro, compra, demo, autoservicio).
3. **Flujos Críticos (User Flows):**
   - *Paso 1: Landing y propuesta de valor.*
   - *Paso 2: Onboarding / Selección de opciones.*
   - *Paso 3: Checkout o confirmación.*
   - *Paso 4: Dashboard y primer momento de valor.*

---

## 4. Fase 2: Conectar Figma MCP para Extraer el Sistema de Diseño

Configura tu archivo de configuración de MCP (`claude_desktop_config.json` o la configuración de MCP de tu editor):

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-figma"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "tu_token_personal_de_figma"
      }
    }
  }
}
```

### Prompt de sincronización a Claude:
> *"Usa el servidor Figma MCP para inspeccionar el archivo con URL `[TU_FIGMA_URL]`. Extrae la paleta de colores, la escala tipográfica, los radios y las dimensiones del layout base. Guarda estos tokens en `tailwind.config.ts` y en `DESIGN.md` respetando las directrices de `impeccable`."*

---

## 5. Fase 2.5: Reutilizar antes de programar con `ai-frontend-guide-kit/`

Con los tokens definidos, copia la carpeta `ai-frontend-guide-kit/` a la raíz del proyecto y sigue sus guías en orden:

1. **Inventario (`03-INVENTORY.md`):** cada pantalla → bloques → categorías de la taxonomía (sin elegir librerías todavía).
2. **Búsqueda (`04-FIND.md`):** 
   ```bash
   node ai-frontend-guide-kit/tools/find.mjs --category hero --stack react --commercial
   node ai-frontend-guide-kit/tools/get.mjs <entry-id>
   ```
   `find` devuelve candidatos cortos; `get` da la ficha con licencia, dependencias y comando exacto.
3. **Decisión (`05-REUSE.md`):** reutilizar → adaptar → crear, registrando la justificación. Queda prohibido crear desde cero sin haber consultado el catálogo.
4. **Instalación:** usar el `install_command` de la ficha (`npx shadcn@latest add …`, `npm i …`, o copy-paste según la fuente). Respetar los límites gratuitos (p. ej. 21st.dev: 2 copias/día) y las licencias (`license_type` / `commercial_use`).
5. **Adaptación (`06-ADAPT.md`):** tokens, props y springs; sin reescribir los internals del componente.

Regla de combinación: máximo 1–2 efectos de alto impacto por vista; el resto, componentes funcionales estables. La verificación visual de estas piezas ocurre en la Fase 5 (Playwright).

---

## 6. Fase 3: Desarrollo Guiado por Skills (Claude + Taste + Emil Kowalski)

Con los tokens, el `PRODUCT.md` y los componentes reutilizados/instalados, utilizas a Claude asistido por las tres *skills* instaladas:

1. **Estructura y Jerarquía (`taste-skill`):**
   - Elimina cajas dentro de cajas redundantes.
   - Aplica márgenes y paddings con escalas proporcionales limpias.
2. **Interacciones y Físicas (`emilkowal.ski/skill`):**
   - Sustituye cualquier transición lineal por muelles:
     ```tsx
     // Configuración de muelle natural según Emil Kowalski
     transition={{ type: "spring", stiffness: 400, damping: 30 }}
     ```
   - Micro-escalas al pulsar botones (`whileTap={{ scale: 0.98 }}`).
   - Transiciones de página sin parpadeos usando la API de *View Transitions*.
3. **Auditoría continua de acabado (`impeccable`):**
   ```bash
   /impeccable audit landing
   /impeccable polish checkout
   ```

---

## 7. Fase 4: Generación de la Lógica y Mocks con DeepSeek API

DeepSeek es muy eficiente generando lógica de estado, validación de esquemas y mocks complejos.

Crea un script o haz una llamada a la API de DeepSeek pasando tu `PRODUCT.md`:
> *"A partir de los flujos de negocio descritos en PRODUCT.md, genera los esquemas de validación de Zod, la lógica de gestión de estado del onboarding y las respuestas de API mockeadas para los tests de integración."*

Integra el código devuelto en tu carpeta `src/lib/` o `src/services/`.

---

## 8. Fase 5: Automatización de la Verificación con Playwright

Una vez que las pantallas están montadas en local (`localhost:3000`), Playwright valida tanto la **regresión visual** (*Taste & Craft*) como el **éxito del negocio** (*Flujo UX*).

### 7.1 Test de Flujo de Negocio (`tests/e2e/conversion.spec.ts`)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Flujo de Negocio: Onboarding', () => {
  test('El usuario completa el embudo principal', async ({ page }) => {
    await page.goto('/');

    // 1. Clic en llamada a la acción principal
    await page.getByRole('button', { name: /comenzar ahora/i }).click();
    await expect(page).toHaveURL(/\/registro/);

    // 2. Relleno de datos de negocio
    await page.getByLabel(/correo corporativo/i).fill('socio@negocio.com');
    await page.getByRole('button', { name: /continuar/i }).click();

    // 3. Confirmación de navegación fluida al dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /bienvenido a tu panel/i })).toBeVisible();
  });
});
```

### 7.2 Test de Calidad Visual de Estados Interactivos (`tests/visual/craft.spec.ts`)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Auditoría Visual de Microinteracciones', () => {
  test('El botón de acción responde con el estilo y sombra correctos en hover', async ({ page }) => {
    await page.goto('/componentes/botones');

    const boton = page.getByRole('button', { name: /guardar cambios/i });
    
    // Captura en estado neutral
    await expect(boton).toHaveScreenshot('boton-base.png');

    // Captura con hover activado
    await boton.hover();
    await page.waitForTimeout(200); // Espera a estabilizar el spring
    await expect(boton).toHaveScreenshot('boton-hover.png', {
      maxDiffPixelRatio: 0.01
    });
  });
});
```

---

## 9. Ciclo de Ejecución Diario (El Bucle de Iteración)

```
1. Actualizar requerimiento en PRODUCT.md
         │
         ▼
2. Extraer cambios de diseño con Figma MCP
         │
         ▼
3. Reutilizar/instalar componentes (ai-frontend-guide-kit: find → get → REUSE)
         │
         ▼
4. Claude programa la integración aplicando:
   - taste-skill (jerarquía)
   - emilkowalski/skill (físicas & microinteracciones)
         │
         ▼
5. Ejecutar: /impeccable polish
         │
         ▼
6. Ejecutar: npx playwright test
         │
    [¿Pasa tests?]
    ├── SÍ ──> Listo para producción / commit
    └── NO ──> Claude/DeepSeek corrigen el fallo exacto reportado por Playwright
```