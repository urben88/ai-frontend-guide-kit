# 01 — Anchor the product

Purpose: define **what the site is for** before any visual decision. This prevents generic "AI-made" interfaces.

## Produce `PRODUCT.md`

Write it at the project root with these sections:

1. **Audience** — who uses this (B2B, consumers, technical users…) and in what context.
2. **Primary conversion** — the one action that matters (signup, purchase, demo request, self-service).
3. **User flows** — the critical paths, step by step:
   - Landing → proposition understood
   - Onboarding / option selection
   - Checkout / confirmation
   - Dashboard / first value moment
4. **Screen list** — every screen or section the flows require, with a one-line purpose each.
5. **Constraints** — brand assets, legal/bilingual requirements, accessibility level, tone.

## If the `impeccable` skill is installed

Run its init flow (`/impeccable init`) instead of writing `PRODUCT.md` by hand; it generates the same structure and adds anti-generic guidelines. Fill in every field.

## Checklist before moving on

- [ ] The problem fits in one sentence a stranger understands.
- [ ] The primary conversion is a single, measurable action.
- [ ] Every screen in the list is reachable from a flow (no orphan screens).
- [ ] You can name what you are **not** building (scope limits).

## Deliverable

`PRODUCT.md` committed to the repo. Next step uses it to derive tokens (`02-TOKENS.md`) and never invents features the anchor does not mention.
