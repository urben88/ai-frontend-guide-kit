---
name: technique-psychology
description: "Use when judging or deciding how a screen influences attention, choice, trust and action: hierarchy, one focal point, calls to action, forms, social proof, pricing, cancellation, honest urgency. Triggers: \"psicología\", \"conversión\", \"CTA\", \"jerarquía visual\", \"formulario\", \"prueba social\", \"confianza\", \"patrón oscuro\". Finds the psychology cards of the kit; they are applied in code and checked by the audits, never used to manipulate."
---

# Technique: psychology

Load this at the `polish` step (the `Psychology:` lines of the report) and when a screen has a form, a call to action, proof or a price.

## Commands (run them as `flow.mjs next` prints them)

```bash
node ai-frontend-guide-kit/tools/technique.mjs find --area psychology "<need>"
node ai-frontend-guide-kit/tools/technique.mjs find "<need>" --area psychology
node ai-frontend-guide-kit/tools/technique.mjs get <id>
```

## Rules

1. One primary action and one focal point per viewport; the button says what happens when pressed (`cta-promise`).
2. Few visible choices, grouped by intent; a long menu or form is cut, not styled (`hicks-choice-limit`, `minimal-form`).
3. Put proof next to the objection it answers, and make it specific: a name, a number, a source (`proof-near-objection`).
4. Price, cancellation and consent are as easy as the sign-up; urgency is only real urgency (`price-transparency`, `easy-cancel`, `real-urgency`).
5. Measure what a tool can: `audit-design.mjs --report` (target size, choices, fields) and `audit-honesty.mjs src --strict` (deceptive patterns); answer the rest yes or no in the polish report.

Key cards: `one-primary-action`, `cta-promise`, `hicks-choice-limit`, `proof-near-objection`, `easy-cancel`
