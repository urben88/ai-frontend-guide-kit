---
name: technique-imagery
description: "Use when a page needs photos, illustrations or generated images: art direction, placeholders, responsive and lazy images, alt text, and prompts for an external image generator or editor. Triggers: \"imagen\", \"foto\", \"image\", \"ilustración\", \"prompt de imagen\", \"fondo\", \"alt text\", \"moodboard\". Finds the imagery cards of the kit; the cards starting with ext- give the prompt for a tool outside the kit."
---

# Technique: imagery

Load this only at the step that builds the screens (`compose`) or when a request is about images. The kit generates no photos: it gives the direction and the prompt, and checks the result in code.

## Commands (run them as `flow.mjs next` prints them)

```bash
node ai-frontend-guide-kit/tools/technique.mjs find --area imagery --direction <style>
node ai-frontend-guide-kit/tools/technique.mjs find "<need>" --area imagery
node ai-frontend-guide-kit/tools/technique.mjs get <id>
```

## Rules

1. Write the art direction first (subject, light, palette from the tokens, crop) and apply it to every image (`art-direction`).
2. An image that does not exist yet gets a placeholder with the final aspect ratio, so the layout does not jump (`smart-placeholder`).
3. Every photo below the first screen is lazy and responsive, with width and height set; every informative image has useful alt text, and a decorative one has empty alt.
4. For an image to be generated, `get ext-image-prompt` and hand the user the prompt; never invent a file that was not produced. Icons and shapes are made with `svg.mjs gen`, not with a generator.
5. State what is a placeholder in the final answer, so nobody ships it by mistake.

Key cards: `art-direction`, `smart-placeholder`, `responsive-images`, `alt-text`, `ext-image-prompt`
