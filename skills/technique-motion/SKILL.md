---
name: technique-motion
description: "Use when adding or reviewing animation: entrances, hover and press states, scroll reveals, page transitions, skeleton loading, parallax, text reveal. Triggers: \"animación\", \"motion\", \"animation\", \"transición\", \"scroll\", \"hover\", \"microinteracción\", \"parallax\". Finds the motion technique cards of the kit so each animation has a purpose, a cost and a reduced-motion fallback."
---

# Technique: motion

Load this only at the step that builds the screens (`compose`) or when a request is about animation.

## Commands (run them as `flow.mjs next` prints them)

```bash
node ai-frontend-guide-kit/tools/technique.mjs find --area motion --direction <style>
node ai-frontend-guide-kit/tools/technique.mjs find "<need>" --area motion
node ai-frontend-guide-kit/tools/technique.mjs get <id>
```

## Rules

1. Every animation answers one question: what does it explain, confirm or guide (`motion-purpose`). If none, remove it.
2. Animate only `transform` and `opacity`; at most 2 high-impact effects per view; durations and easing from the motion tokens.
3. Every interactive element has a hover, focus and pressed state; actions answer in under 100 ms (`microinteractions`, `hover-states`).
4. Content that takes more than 300 ms to appear gets a skeleton of the same shape, not a spinner (`skeleton-loading`).
5. Under `prefers-reduced-motion` every effect has a static fallback; prefer CSS (`scroll-driven-css`) before adding a library.

Key cards: `motion-purpose`, `microinteractions`, `hover-states`, `skeleton-loading`, `scroll-driven-css`
