# 01 — UX flows (before any UI)

Purpose: define **how the product works** — screens, flows and states — with proven patterns, before choosing any component. The UX skills (`userflow` + `flow-*`) encode battle-tested flows (Stripe, Linear, GOV.UK…) and catch the anti-patterns LLMs produce by default.

> **BMAD or spec-driven repo?** Read `ADAPTERS.md` first: the BMAD PRD is the business anchor (no duplicated `PRODUCT.md`), existing UX docs are the as-is state, stories map to screens/blocks (`--ref "story:<id>"`), and OpenSpec specs are the behavioral source of truth (`--ref "spec:<capability>"`).

## Step 0 — Analyze the repository context

```bash
node ai-frontend-guide-kit/tools/context.mjs
```

Read `ai-frontend-output/ux/REPO-CONTEXT.md` (compact, ~150 lines) instead of exploring the repo. It reports the stack, routes/screens, docs, specs and **`ux_present`**.

## Step 1 — Anchor the product (`PRODUCT.md`)

If `PRODUCT.md` does not exist, create it (this is the business anchor and the constraint for everything below):

1. **Audience** — who uses this, in what context.
2. **Primary conversion** — the one measurable action.
3. **User flows** — landing → onboarding → checkout/confirmation → dashboard.
4. **Screen list** — one line of purpose each.
5. **Constraints** — brand, legal, accessibility, scope limits.

## Step 2 — Choose the path

| Context | Path | You produce |
|---|---|---|
| `ux_present: false` | **A · UX from scratch** | ideal `UX-SPEC.md` + `flow-report.html` |
| `ux_present: true` + user picks Summarize | **B · As-is summary** | current-state `UX-SPEC.md` + audit, **no changes** |
| `ux_present: true` + user picks Redesign | **C · Radical redesign** | `UX-BASELINE.md` → ideal `UX-SPEC.md` + `UX-DIFF.md` |
| A single surface to review | **D · Spot audit** | findings report, **no changes** |

**With `ux_present: true` you MUST ask the user once**: *"There is existing UX. Do you want a summary of what exists (as-is) or a radical redesign?"* Never redesign silently. Path C is UX-only: objective, audience and conversion in `PRODUCT.md` stay untouched; product-level ideas go to `OPEN-QUESTIONS.md`.

## Step 3 — Run the proven flows (`userflow`)

Use the `userflow` dispatcher (installed as a skill) with the context from Step 0:

- It selects **1–4** `flow-*` skills from its routing table — load them, never work from memory.
- State the selection in one line (e.g. "Applying flow-auth + flow-forms").
- Apply their rules; on conflict the most specific skill wins.
- Check the result against each loaded skill's **Anti-Patterns** section.
- For Path C, fill `UX-BASELINE.md` first (current screens/flows/states) so the diff is meaningful.
- Generate `flow-report.html` from the dispatcher's template and save it to `ai-frontend-output/ux/`.

## Step 4 — Write `UX-SPEC.md` in `ai-frontend-output/ux/`

Required content (this is what the UI phase consumes):

- **Screens table**: screen · purpose · primary action · empty state · loading state · error state.
- **Flows**: numbered steps per flow: screen → what it shows → primary action → destination → branch conditions.
- **Navigation / app shell**: structure and responsive collapse order.
- **Audit**: anti-pattern table with PASS/WARN/FAIL taken from the loaded skills.
- Path C adds `UX-DIFF.md`: added / removed / restructured screens and flows vs baseline.
- Path B adds no proposals — findings only.

## Gate to the UI phase

Do **not** continue to `02-TOKENS.md` until:

- [ ] `PRODUCT.md` exists (product anchored).
- [ ] `UX-SPEC.md` lists screens with their empty/loading/error states and numbered flows.
- [ ] `flow-report.html` is in `ai-frontend-output/ux/`.
- [ ] Anti-patterns were checked against the loaded skills.
- [ ] Path C: `UX-BASELINE.md` + `UX-DIFF.md` exist; `PRODUCT.md` unchanged.

The UI phase (`02`…`08`) uses `UX-SPEC.md` as the source of truth: inventory rows and `memory.mjs --screen/--block` come from it.
