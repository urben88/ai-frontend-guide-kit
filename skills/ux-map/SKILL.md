---
name: ux-map
description: "Use when generating or maintaining the visual screen map of an app in Excalidraw: pages as rectangles, labeled buttons/actions as arrows, drawn as a connected navigation network. Triggers: \"mapa visual\", \"mapa de pantallas\", \"wireframe de navegación\", \"diagrama de flujos\", \"boceto de las páginas\", \"excalidraw\", \"actualizar el mapa\", and the end of the UX phase in `01-UX-FLOWS.md`. Maintains `ai-frontend-output/ux/ux-map.excalidraw` incrementally through the Excalidraw MCP, with a manual fallback when the MCP is unavailable."
---

# UX Map — visual screen map (Excalidraw)

Living map of how the app's screens are structured and communicate: one node per screen, one labeled arrow per navigating action, color-coded by area. Output of the UX phase, updated (never regenerated) as the UX evolves.

## Artifact

`ai-frontend-output/ux/ux-map.excalidraw` — single source of truth (do NOT keep a parallel JSON). Open it with Excalidraw (excalidraw.com or the VS Code extension). The installer creates the empty scaffold; if it is missing, create it with the template in Fallback before the first tool call (the MCP reads the file and fails if absent).

## Recipe

### Grid — columns by area, rows by flow order

| Area | Column | Color preset | Shape |
|---|---|---|---|
| Public / marketing | 0 | `light-purple` | rectangle |
| Auth / account | 1 | `light-blue` | rectangle |
| App / product | 2 | `light-green` | rectangle |
| States / auxiliary (404, offline, legal, emails) | 3 | `light-yellow` | rectangle |
| Start marker | 0 (top) | `yellow` | ellipse |
| Decision (only if a branch matters) | by flow | `light-orange` | diamond |

- Coordinates: `x = column * 400`, `y = row * 240`; `width = 280`, leave height auto (the label sizes it). Start node at `y = -240`.
- Order rows by the flow narrative (landing row 0, onboarding row 1, app rows 2+). Leave one empty grid cell between clusters.

### Node label — stable and exact

```
{Nombre exacto de pantalla de UX-SPEC.md}
CTA: {acción primaria}
Bloques: {bloque1} · {bloque2} · {bloque3}
```

- The screen name MUST equal the name in `UX-SPEC.md`: it is the key used by `createEdge`/`deleteElement` (by label) and keeps map and spec coherent.
- 2–4 key blocks max; no prose, no every-field detail.
- Optional `link` on the node to the real route/component when the screen already exists in the repo.

### Edges — one per action

- `createEdge(from=<screen label>, to=<screen label>, label=<texto real del botón o enlace>)`.
- Label = the real action text that navigates ("Iniciar sesión", "Ir al dashboard"), not an abstraction.
- `style: "dashed"` for secondary or optional flows (forgot password, legal, "skip").
- Two actions to the same screen = two arrows with distinct labels. Never invent transitions: they come from the flows of `UX-SPEC.md`.

## MCP tools (server `excalidraw`, `@cmd8/excalidraw-mcp`)

| Tool | Use |
|---|---|
| `getFullDiagramState` | Read the current map (nodes, edges, labels) before touching anything |
| `createNode` | Add a screen/start/decision node (`label`, `shape`, `color`, `x`, `y`, `width`, optional `link`) |
| `createEdge` | Add a labeled arrow between nodes, referenced by label text or id |
| `deleteElement` | Remove a node or edge by label text or id |

## First build

1. Read `ai-frontend-output/ux/UX-SPEC.md` (screens table, flows, navigation) — never explore the repo for this.
2. Group screens by area and order them by flow to get each `(column, row)`.
3. `createNode` the INICIO ellipse and every screen with explicit `x`/`y` and the area color.
4. `createEdge` every transition from the flows, with the action text as label.
5. Verify with `getFullDiagramState`: every UX-SPEC screen has a node, every flow step has an arrow, no orphan nodes.

## Maintenance — incremental, never blind

1. `getFullDiagramState` first (always).
2. **New screen** → `createNode` in its area/row (shift later rows if needed; keep one-cell gaps).
3. **New transition** → `createEdge` by label.
4. **Removed screen** → `deleteElement(<label>)` (its arrows go with it; recreate any still needed).
5. **Renamed screen** → `deleteElement` + `createNode` with the new name + recreate its arrows (labels changed = new elements).
6. **Changed action** → delete the old edge by label and `createEdge` with the new text.
7. Re-run `getFullDiagramState` to confirm. Manual styling tweaks made in Excalidraw survive as long as you only add/delete what changed.

Update the map in the same pass as the UX change (guide 01, redesign, or `09-ITERATE.md` when screens/navigation move).

## Redesign (UX path C)

Before touching the map, copy the file: `ux-map.excalidraw` → `ux-map-baseline.excalidraw` (plain JSON copy), in parallel with `UX-BASELINE.md`. Then apply the maintenance steps to reach the ideal UX; `UX-DIFF.md` describes added/removed/restructured screens and transitions.

## Fallback without MCP

If the `excalidraw` server is unavailable (no network/npx or harness without MCP):

- Create/patch the JSON directly; keep it valid. Minimal empty scaffold:

```json
{ "type": "excalidraw", "version": 2, "source": "https://excalidraw.com", "elements": [], "appState": { "gridSize": null, "viewBackgroundColor": "#ffffff" }, "files": {} }
```

- Manual node = rectangle element + text element. Copy the shape of existing elements when present; for a new file use this pattern (repeat per screen with its `x`, `y` and color; arrow elements may omit bindings, which only means no auto-follow when moving nodes):

```json
{ "id": "screen-1", "type": "rectangle", "x": 0, "y": 0, "width": 280, "height": 120, "angle": 0, "strokeColor": "#6c8ebf", "backgroundColor": "#dae8fc", "fillStyle": "solid", "strokeWidth": 1.4, "strokeStyle": "solid", "roughness": 1, "opacity": 100, "groupIds": [], "frameId": null, "roundness": { "type": 3 }, "seed": 1, "version": 1, "versionNonce": 1, "isDeleted": false, "updated": 1, "link": null, "locked": false }
{ "id": "screen-1-text", "type": "text", "x": 20, "y": 40, "width": 240, "height": 40, "angle": 0, "strokeColor": "#1e1e1e", "backgroundColor": "transparent", "fillStyle": "solid", "strokeWidth": 1.4, "strokeStyle": "solid", "roughness": 1, "opacity": 100, "groupIds": [], "frameId": null, "roundness": null, "seed": 2, "version": 1, "versionNonce": 2, "isDeleted": false, "updated": 1, "link": null, "locked": false, "text": "Landing\nCTA: Empezar\nBloques: hero · prueba social", "fontSize": 16, "fontFamily": 1, "textAlign": "center", "verticalAlign": "middle", "containerId": "screen-1", "originalText": "Landing\nCTA: Empezar\nBloques: hero · prueba social", "lineHeight": 1.25, "autoResize": true }
```

- Tell the user the MCP was unavailable and that arrows may need manual re-binding. Never block the UX phase on the map; never claim it was generated visually if it was patched by hand.

## Anti-Patterns

| Mistake | Fix |
|---|---|
| Regenerating the whole file on every update | Read state and patch incrementally (maintenance steps) |
| Free-form labels that drift from `UX-SPEC.md` | Exact screen names — they are the key for edges and deletes |
| Drawing every UI element | Screens + key blocks + actions only |
| One arrow per screen pair | One arrow per action, labeled with its button text |
| Leaving the map stale after a UX change | Same-pass update (guide 01 / redesign / guide 09) |
| Ad-hoc coordinates | Grid by area/row so the map stays readable |
