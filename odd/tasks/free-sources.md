# free-sources

Objective: index large free/open-source component sources (ReUI first), drop sources whose free catalog is small behind a paywall, and make search and agents strictly prefer catalog components from big free sources over building new ones.
Branch: `feat/free-sources` (from main 7713a6a). Delivery: ask-on-risk. Test runner: `node --test`.

## Specs

- **S1 — New sources.** Add these sources to the catalog: "https://reui.io/components https://github.com/shadcnspace/shadcnspace https://blocks.so https://uiable.com/components https://www.indoui.com/ https://github.com/tabler/tabler https://flowbite-react.com/". Index only the free/open-source part of each (shadcnspace and ReUI have paid Pro tiers that stay out).
- **S2 — ReUI in depth.** "Quiero reindexar esa página bastante bien y que sea una de las primeras opciones a elegir." Registry: `https://reui.io/r/registry.json` (2,028 items on 2026-11-06: 1,942 `registry:block`, 82 `registry:ui`, 4 `registry:hook`), MIT.
- **S3 — Drop mostly-paid sources.** "filtrar un poquito entre enlaces los cuales tengan cosas de pago ... parte de su catálogo es de pago. Entonces de nada me sirven, hay poca cantidad, entonces los quiero quitar en ese caso." Proposed list pending user confirmation: hover, aceternity, magicui, preline, motionprimitives, flowbite (keep cultui and 21stdev). Verify each paid tier before removing.
- **S4 — Source order.** "Que ordenes a la hora de elegir entre páginas." "quiero coger que estas páginas que tengan muchos componentes gratis sea lo primero que haga y que sea muy estricto con eso." Ranking prefers sources with many free components.
- **S5 — Better search and reuse.** "mejora también la indexación para que la gente pueda buscar de manera correcta. Porque muchas veces lo que hace es que coge lo básico, no le da prioridad a coger estos componentes. No veo que esté funcionando, creo que lo genera nuevo." Agents must find and pick catalog components instead of generating new ones; reproduce the failure first.

## Tasks

- [ ] T1 (S3) Confirm removal list with the user; verify paid tiers; remove sources, extractors entries, docs, counts. Route: inline.
- [ ] T2 (S1, S2) ReUI source via `tools/extract/registry.mjs` (shadcn registry format); categories, tags, descriptions good enough to search. Route: inline.
- [ ] T3 (S1) Remaining six sources (shadcnspace, blocks.so, uiable, indoui, tabler, flowbite-react): research each data shape, one extractor or registry entry each. Route: decide after T2 (parallel writers only if units are independent and large).
- [ ] T4 (S4) Source tier/ranking by free catalog size in quality score and `find.mjs` ordering; tests. Route: inline.
- [ ] T5 (S5) Reproduce "coge lo básico / lo genera nuevo" (find + guides 05-FIND/06-REUSE + skill), fix retrieval and agent instructions; tests. Route: explore first.
- [ ] T6 Rebuild index and kit, update README counts and license report, `npm run verify`. Route: inline.

## Log

- L1 (2026-11-06, user): "https://reui.io/components https://github.com/shadcnspace/shadcnspace https://blocks.so https://uiable.com/components https://www.indoui.com/ https://github.com/tabler/tabler https://flowbite-react.com/ Quiero añadir estas páginas que son de componentes individuales dentro del repositorio. Además, quiero filtrar un poquito entre enlaces los cuales tengan cosas de pago. Es decir, ahora mismo el repositorio tiene muchos enlaces, pero hay muchos de ellos los cuales parte de su catálogo es de pago. Entonces de nada me sirven, hay poca cantidad, entonces los quiero quitar en ese caso. pero estos son open source por lo tanto aquí hay muchas más opciones para indexar y buscar y poder buscar mejores componentes"
- L2 (user): "https://reui.io/components tiene muchos"
- L3 (user): "Quiero reindexar esa página bastante bien y que sea una de las primeras opciones a elegir. Que ordenes a la hora de elegir entre páginas. Pero mejora también la indexación para que la gente pueda buscar de manera correcta. Porque muchas veces lo que hace es que coge lo básico, no le da prioridad a coger estos componentes. No veo que esté funcionando, creo que lo genera nuevo. Entonces quiero coger que estas páginas que tengan muchos componentes gratis sea lo primero que haga y que sea muy estricto con eso."
- L4 Evidence: 34 sources, extractors in `tools/extract/`, map in `tools/refresh.mjs`; `find.mjs` sorts by relevance then quality (license, install effort, deps, source tier). ReUI registry verified with curl (2,028 items). Next: T1 answer, then T2.
