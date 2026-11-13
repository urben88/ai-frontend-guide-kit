# Step: visual-feedback

The user points at elements in the browser and the agent changes exactly those (React). `flow.mjs next` prints the commands; these are the judgment notes.

## Judgment notes

- The tool is the Agentation MCP. The install message (`npm install agentation -D`, the `claude mcp add agentation` line and `<Agentation />` mounted in development only) is in `guides/11-VISUAL-FEEDBACK.md`. The installer prints it and never installs it.
- Process each annotation as written: change the element it points at, nothing around it, then mark it resolved.
- Before an edit, `ui-map.mjs impact` on the component: a shared component changes for every user, so tell the user when an annotation touches one.
- After the round, run the design audit on what changed; a human tweak can break spacing or contrast.
- Record the changes with `memory.mjs add` and `pieces.mjs version` as in any other edit.

## Common mistakes

- Treating an annotation as a request for a redesign of the whole screen.
- Leaving the Agentation component mounted in production builds.
