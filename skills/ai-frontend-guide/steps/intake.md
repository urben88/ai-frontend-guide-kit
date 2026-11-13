# Step: intake

`flow.mjs next` already prints the commands. These are the judgment notes.

## Choosing the route

- The phases are entry points, not a pipeline: never run a phase the user did not ask for.
- A small change to an existing UI, or a custom component, is `iterate`: it never repeats the UX phase.
- "Make it look better" on an existing screen is `redesign` (keep flows, content and wiring) or `polish` (fixes only); ask when it is not clear.
- Backend or logic only is not this kit: say so and stop.
- Say the route in one line to the user before you start it, for example: "Route: iterate, adapt the hero, then polish".

## Common mistakes

- Exploring the repo by hand. `REPO-CONTEXT.md` and `UI-MAP.md` already hold the stack, screens, components, routes and UI libraries: read them instead.
- Starting a design skill (hallmark, impeccable and others) because its description says it covers any UI request. They run only at the step the flow names.
- Skipping the intake for "just one line". The route `iterate` is for exactly that case.
- Answering "what is this kit?" by listing folders. Answer from `HELP.md`.
