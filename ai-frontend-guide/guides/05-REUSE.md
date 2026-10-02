# 05 — Reuse, adapt or build

Purpose: decide per inventory row and execute the installation with a documented justification.

## Decision tree

```
Need from inventory
   │
   ├─ Catalog entry exists?
   │     ├─ License compatible with this project?
   │     │     ├─ YES → Stack compatible?
   │     │     │     ├─ YES → REUSE (install as-is)
   │     │     │     └─ NO  → ADAPT (port markup/deps to the project stack)
   │     │     └─ NO  → search alternatives (broader filters)…
   │     │              └─ none suitable → BUILD CUSTOM (07-PHILOSOPHY)
   │     └─ (unknown license: verify on docs URL first)
   └─ No entry → search with broader filters → still none → BUILD CUSTOM
```

Record the path taken and one sentence of reasoning per row. "I liked it" is not a reason; "matches hero intent, MIT, reacts to scroll like the anchor requires" is.

## Install by method (use the `install_command` from `get`)

```bash
# shadcn-cli (shadcn, magicui, aceternity, coss, agentskit)
npx shadcn@latest add @magicui/marquee
npx shadcn@latest add "https://ui.aceternity.com/registry/3d-card.json"

# npm package
npm i preline @tailwindcss/forms
npx motion-primitives@latest add text-effect

# copy-paste (daisyui, uiverse, tailblocks, hyperui, floatui, hover)
#   → open docs_url, copy markup, paste into the project
```

After install: run the dev server, render the component in isolation once, and confirm it builds **before** integrating.

## Quotas and gates to respect

- 21st.dev free: 2 code copies/installs per day; CLI/MCP need an API key (403 without it).
- Aceternity premium registry URLs return 401 — only the free tier is in the catalog.
- Agents Kit original families are non-commercial; ported collections are MIT/Apache (check each entry).
- Float UI / Hover / Aceternity / 21st.dev: commercial end products OK; redistributing the components themselves is not.

## Prohibitions

- Never copy third-party component source into this guide folder or any shared catalog.
- Never strip license notices from copied files.
- Do not install a component whose license you have not confirmed when `commercial_use` is `conditional` or `unknown`.

## Deliverable

Decision log per row: `reused | adapted | built` + entry id + justification. Attach it to the PR or keep it next to `INVENTORY.md`.

Next: `06-ADAPT.md`.
