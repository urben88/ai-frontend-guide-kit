# Walkthrough — the three phases on a tiny real project

A fictional product ("Tidewatch", tide and swell alerts for small-boat owners) taken through the kit's workflow. It is a **regression fixture and a documentation example**: `npm test` checks that every catalog id cited here exists, that the brief has the required sections, and that the page passes the honesty audit.

| Phase | Artifact in this folder |
|---|---|
| 1 · UX & theory | `ai-frontend-output/ux/EXPERIENCE-BRIEF.md`, `PRODUCT.md`, `UX-SPEC.md`, `DESIGN.md` |
| 2 · Composition | `ai-frontend-output/selections.jsonl` (decisions, written with `memory.mjs`), `site/index.html` (adapted components) |
| 3 · Polish | `site/tokens.css`, checks below |

## Reproduce the checks

```bash
node ai-frontend-guide-kit/tools/audit-honesty.mjs examples/walkthrough/site --strict
node ai-frontend-guide-kit/tools/find.mjs --category pricing --licensed --stack html
AI_FRONTEND_OUTPUT=examples/walkthrough/ai-frontend-output node ai-frontend-guide-kit/tools/memory.mjs list
# with the page served locally:
node ai-frontend-guide-kit/tools/audit-a11y.mjs http://localhost:8080
node ai-frontend-guide-kit/tools/audit-perf.mjs http://localhost:8080
```

Components are cited by catalog id; none of their code is copied into this repository (see `REFERENCE-PROTOCOL.md` ethical rules). `site/index.html` is hand-written to the tokens and shows the *adapted* result.
