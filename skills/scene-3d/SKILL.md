---
name: scene-3d
description: "Use when the user wants something in 3D on a page: a hero object, a product viewer, a WebGL or Three.js scene, or a prompt for an external 3D tool. Triggers: \"3D\", \"three.js\", \"WebGL\", \"escena 3D\", \"objeto 3D\", \"visor de producto\", \"modelo 3D\". The kit writes the instructions, not the asset: first a SCENE-SPEC.md (purpose, camera, light, materials from the tokens, budget, fallback), checked by `scene.mjs check`, then either Three.js code or a prompt for an external 3D tool, both made from that spec."
---

# Scene 3D: write the spec first, then code or a prompt

The tool is `ai-frontend-guide-kit/tools/scene.mjs` (run it as `flow.mjs next` prints it). It never models or renders: it writes and checks text. Technique cards: `technique.mjs find --area 3d` (skill `technique-3d`).

## When 3D earns its place

Yes: one object that explains the product (hero object, configurator, product viewer), or depth that the story needs. No: decoration, a page whose main action sits under the scene, a low-end audience, no budget or time. Then use `depth-without-3d` (layers, shadows, CSS perspective) or an image. Say which one you chose and why.

## Method (follow it in order)

1. `scene.mjs init` writes `ai-frontend-output/SCENE-SPEC.md`. Fill every `<...>`: one purpose sentence, one subject, camera, light, materials (each `token=<color token of design-tokens.json>`), the budget as numbers, the fallback poster, what reduced motion does.
2. `scene.mjs check` until it prints 0 high. It catches an unknown token, a missing budget number, no fallback, no reduced-motion line. Medium findings (heavy budget) are yours to fix or justify.
3. Pick the output in the spec (`mode`) and build from the spec, not from memory:
   - Code: `scene.mjs code --out <path>.js`. It is a Three.js starter with the version pinned (`npm install three@0.187.0 --save-exact`), lazy `import('three')`, the poster shown first and kept when WebGL is missing, `prefers-reduced-motion` (one still frame, no loop), pixel ratio capped at 2, a frame budget that lowers the pixel ratio, the loop paused off screen, and `dispose` on unmount. Replace the placeholder shape with the real model (`GLTFLoader`) and keep the rest.
   - Prompt: `scene.mjs prompt` prints the prompt for an external 3D tool (colors as hex from the tokens, budget, glb, poster). Give it to the user; never write a model file that does not exist (`technique.mjs get ext-3d-asset`).
4. Make the poster (a real image of the scene) before the scene; it is the fallback and the first paint.
5. Place the scene below the first paint with lazy loading and keep the page's main action outside it. Register it: `pieces.mjs add <name> --level medium --file <path>`.

## Rules

- Colors only from the tokens; one subject, one key light, at most 3 materials.
- Budget before the model: a hero object is 20000 triangles, 4 textures, 30 draw calls, 400 KB or less.
- Every scene has a text alternative (`label`) and a still version; nothing important lives only inside the canvas.
- Do not change the pinned version without checking that it exists (`npm view three version`) and reading its release notes.

## Never

- Start from code or from a prompt without a checked spec.
- Autoplay motion without the `prefers-reduced-motion` branch, an unbounded loop, or a scene that is never disposed.
- Load the 3D library in the first bundle, or a model heavier than the budget.
