# Step: polish

Total polish of what was built. `flow.mjs next` prints the commands and the report to fill; these are the judgment notes.

## Judgment notes

- Design measures (spacing, sizes, colors, contrast, layout, overflow) come from `audit-design.mjs --report`, never from your own review. The step cannot close while the report has a `high` finding: fix the numbered list from the top.
- The sibling skill `frontend-polish` drives the loop: external audits, then the Playwright MCP pass (accessibility snapshot, states, console, keyboard, reduced motion, responsive), then the `@playwright/test` regression of `guides/09-VERIFY.md`.
- External audits: `impeccable` for critique, polish and `detect` (its `bolder` and `quieter` change the direction: only when the user asks); `hallmark` is a report-only second opinion, do not let it rebuild the screen; `design-taste-frontend` only on a screen it built; `emilkowalski` for animation review.
- Check the rest by hand only where no tool measures: answer each `Psychology:` line of the polish report with yes or no and where you saw it (3-second clarity, one focal point, what the button promises, grouping, feedback, proof, the way back, real rewards, the closing action), and that nothing default-looking is left.
- React projects: offer the user the human round (they point at elements with Agentation, `steps/visual-feedback.md`) for fine tweaks, once, at the end. Never require it.
- Fill the report line by line: `[x]` with the result, or `[n/a]` with the reason.

## Common mistakes

- Declaring spacing or contrast "fine" by eye while the audit lists a finding.
- Closing with a failing audit by re-running it until it passes without changing anything.
- Letting an external skill rewrite the design direction.
