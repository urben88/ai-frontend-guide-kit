# Step: direction

The experience direction comes before colors, components or any UI. `flow.mjs next` prints each part; these are the judgment notes.

## Judgment notes

- Ask in rounds of 3 to 5 questions, never all at once, and never ask what the repo or a PRD already answers.
- The three directions (safe, differentiated, experimental) must differ in structure (navigation, section order, interaction), not only in colors or fonts. Three themes on one layout is one direction.
- The brief states a chosen direction with its rationale and risks. The user chooses; you do not.
- `direction.questions`, `.references` and `.choose` end with STOP: show the questions, the examples and the three directions to the user, wait, and close each part with `--answer "<their words>"`. An answer you wrote yourself ("no references, decided by recipe") is a skipped step.
- Apply the anti-generic list and the purpose and convergence tests of `experience/STYLE-DIRECTIONS.md` to the visual brief.
- Example sites: show a few with their structure, ask which the user likes, keep screenshots in `ai-frontend-output/ux/references/` and cite them as `[ref: <slug>]`. A component or site found on the web stays `provisional` until its license is checked on the origin page.
- Laya ranks questions and directions only when the brief records `laya_consent`. The flow prints its commands only then. Without it, use the question bank and the tables of `experience/`.
- Landing or marketing pages: the `landing-page-design` skill may help with intake topics (offer, audience, objections, proof). Its visual rules never override the brief.

## Common mistakes

- A brief with an empty "Open questions" or "Reference discoveries" section instead of saying "none" or "the user gave no reference".
- Asking for the visual style before the goal and the audience are known.
- Moving to the UX phase without a chosen direction: the gate refuses it.
