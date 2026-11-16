---
name: technique-3d
description: "Use when a page might use 3D or depth: a hero object, a product viewer, scroll-linked camera, WebGL scenes, materials and lighting, or a prompt for an external 3D or AR tool. Triggers: \"3D\", \"three.js\", \"WebGL\", \"escena 3D\", \"visor de producto\", \"render\", \"AR\", \"profundidad\". Finds the 3D technique cards of the kit; the kit writes the scene instructions, it does not model assets."
---

# Technique: 3D

Load this only at the step that builds the screens (`compose`) and only when the brief or the user asks for 3D or depth.

## Commands (run them as `flow.mjs next` prints them)

```bash
node ai-frontend-guide-kit/tools/technique.mjs find --area 3d --direction <style>
node ai-frontend-guide-kit/tools/technique.mjs find "<need>" --area 3d
node ai-frontend-guide-kit/tools/technique.mjs get <id>
```

## Rules

1. Load the skill `scene-3d` (`scene.mjs init`, `check`, then `code` or `prompt`): it holds the method, so do not repeat it here. Write the scene as text first: purpose, camera, light, materials (colors from the tokens), performance budget, fallback. Then code or a prompt follows from it.
2. Every 3D piece has a 2D fallback that is accessible and loads first (`3d-fallback`); decide the budget before the scene (`3d-perf-budget`).
3. Load 3D lazily, below the first paint, and never block the main action behind it.
4. With no budget or time, get depth without WebGL first (`depth-without-3d`: layers, shadows, perspective in CSS).
5. A model, texture or AR preview that does not exist is an external task: `get ext-3d-asset` and give the user the prompt; never invent an asset file.

Key cards: `3d-hero-object`, `3d-scene-setup`, `3d-fallback`, `3d-perf-budget`, `depth-without-3d`
