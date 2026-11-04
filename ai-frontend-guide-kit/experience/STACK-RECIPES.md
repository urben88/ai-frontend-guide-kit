# Stack recipes — documented combinations per project type

**Honest limit:** these are documented combinations, not measured survey data. Nobody has published a comparative study of them, so nothing here is a ranking and none of it claims a winner. Evidence levels are `vendor docs` (the stack's own documentation says to combine it this way), `this kit` (a rule this kit already fixes elsewhere) and `community practice` (what practitioners repeat in articles and examples, with no published measurement). Only vendor documentation counts as strong evidence; treat the rest as a starting point to verify in the project.

How to use a recipe: pick the project type, confirm the stack with the user, then follow the recipe's architecture mode and documents. Architecture mode is `map` by default (the folders keep their own names and `ARCHITECTURE.md` records their roles); `fsd` (Feature-Sliced Design layers) is applied only when the user asks for it. Component sources are catalog sources of this kit — search them with `node ai-frontend-guide-kit/tools/find.mjs --category <category>` before building anything, and check the project first with `node ai-frontend-guide-kit/tools/ui-map.mjs have "<need>"`.

## SaaS dashboard

- Stack: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui primitives, charts from the shadcn chart set.
- Architecture: `map`; `fsd` only on request (dashboard apps gain the most from `widgets`/`features` once the user asks).
- Component sources: `shadcn` (navigation, data-display, forms), `coss` (data-display, forms), `hover` (navigation, data-display), `21stdev` dashboards (`blocks-sections`).
- Documents: `standard` — `README.md`, `DESIGN.md`, `PRODUCT.md`, `UX-SPEC.md`, `ARCHITECTURE.md`, generated `UI-MAP.md`; `long-term` adds `docs/DECISIONS.md`, `CONTRIBUTING.md`, `ACCESSIBILITY.md`, `PERFORMANCE.md`; `sprint` keeps `README.md` and `DESIGN.md`.
- Check: `node ai-frontend-guide-kit/tools/ui-map.mjs check --profile standard`; run `long-term` once more than one person works on it.
- Source: shadcn/ui documentation (https://ui.shadcn.com/docs) and Next.js App Router documentation (https://nextjs.org/docs/app).
- Checked: 2026-11-04.
- Evidence: vendor docs.

## Marketing landing page

- Stack: Astro or Next.js (static output) + Tailwind CSS + copy-paste marketing blocks; no client router needed.
- Architecture: `map`; `fsd` is never applied to a single-page marketing site, because the layers have nothing to separate.
- Component sources: `21stdev` (hero, cta, features, pricing, testimonials, faq), `tailblocks` (hero, features, cta, testimonials), `floatui` marketing (hero, pricing, cta), `hyperui` marketing (hero, features, pricing).
- Documents: `sprint` — `README.md`, `DESIGN.md`; `standard` adds `PRODUCT.md`, `UX-SPEC.md`, `ARCHITECTURE.md`, `UI-MAP.md`; `long-term` only if the page keeps growing after launch.
- Check: `node ai-frontend-guide-kit/tools/ui-map.mjs check --profile sprint` — a campaign page rarely earns more documents than that.
- Source: Astro documentation (https://docs.astro.build/) and Tailwind CSS documentation (https://tailwindcss.com/docs).
- Checked: 2026-11-04.
- Evidence: vendor docs for the stack; `community practice` for pairing it with copy-paste block libraries.

## E-commerce storefront

- Stack: Next.js (App Router) with commerce APIs, Tailwind CSS and shadcn/ui for the shell; product media through the catalog's media entries.
- Architecture: `map`; `fsd` on request only, and then `entities` carry product and cart, `features` carry add-to-cart and checkout steps.
- Component sources: `shadcn` (forms, overlay, data-display), `21stdev` ecommerce and pricing (`blocks-sections`, `pricing`), `tailblocks` ecommerce (`blocks-sections`), `floatui` (forms, navigation).
- Documents: `standard` — the full standard set, because cart, checkout and product states must be written down; `long-term` adds the decision log and the performance budget, which a storefront needs for Core Web Vitals; `sprint` only for a prototype catalog.
- Check: `node ai-frontend-guide-kit/tools/ui-map.mjs check --profile long-term` before the first sale.
- Source: Next.js App Router documentation (https://nextjs.org/docs/app); commerce API documentation of the chosen provider.
- Checked: 2026-11-04.
- Evidence: vendor docs; `community practice` for the specific component pairing.

## Documentation site

- Stack: Astro Starlight, Docusaurus or Next.js with a markdown pipeline + Tailwind CSS; content stays in markdown, the shell in components.
- Architecture: `map`; `fsd` is unnecessary — the content tree is the structure, and renaming it into layers only adds noise.
- Component sources: `shadcn` (navigation, layout), `hyperui` application blocks (`navigation`), `motionprimitives` for in-page motion (`micro-interactions`), `dsr` design-system references (`design-system`).
- Documents: `standard` — `README.md`, `DESIGN.md`, `ARCHITECTURE.md`, `UI-MAP.md` plus `PRODUCT.md` and `UX-SPEC.md` for the navigation model; `long-term` adds `docs/CONTRIBUTING.md` (how a page is written) and `docs/ACCESSIBILITY.md`.
- Check: `node ai-frontend-guide-kit/tools/ui-map.mjs check --profile standard`.
- Source: Starlight documentation (https://starlight.astro.build/) and Docusaurus documentation (https://docusaurus.io/docs).
- Checked: 2026-11-04.
- Evidence: vendor docs.

## Internal tool

- Stack: Vite + React + TypeScript + Tailwind CSS + shadcn/ui, or the company's existing design system (`antd`, `mui`, `mantine`) when one already exists.
- Architecture: `map`, and reuse the existing design system instead of adding a second one; `fsd` only on request.
- Component sources: whichever design system the company already uses (`antd`, `mui`, `mantine`, `flowbite`), then `shadcn` (forms, data-display) for gaps, `uiverse` for small controls (`micro-interactions`).
- Documents: `sprint` — `README.md`, `DESIGN.md`; `standard` adds `PRODUCT.md`, `UX-SPEC.md`, `ARCHITECTURE.md`, `UI-MAP.md`; `long-term` when the tool outlives the team that built it.
- Check: `node ai-frontend-guide-kit/tools/ui-map.mjs check --profile sprint` for a throwaway tool, `standard` once others depend on it.
- Source: Vite documentation (https://vite.dev/guide/) and the chosen design system's own documentation.
- Checked: 2026-11-04.
- Evidence: vendor docs for the stack; `this kit` for the reuse-the-existing-design-system rule (`guides/06-REUSE.md`).

## Mobile-first PWA

- Stack: Next.js or Vite + React, a manifest and a service worker, Tailwind CSS, safe-area aware layout components.
- Architecture: `map`; `fsd` on request only, with `shared` holding the platform shims.
- Component sources: `shadcn` (navigation, overlay, feedback), `daisyui` (layout, feedback), `uiverse` loaders (`feedback`), `agentskit` only for AI surfaces (`ai-surfaces`).
- Documents: `standard` — the full standard set, with the offline states written into `UX-SPEC.md`; `long-term` adds `docs/PERFORMANCE.md` (bytes matter more on mobile) and `docs/DECISIONS.md` for caching decisions.
- Check: `node ai-frontend-guide-kit/tools/ui-map.mjs check --profile standard`.
- Source: web.dev installability and service worker guides (https://web.dev/learn/pwa) and the browser vendor documentation for safe areas.
- Checked: 2026-11-04.
- Evidence: vendor docs for the platform; `community practice` for the component pairing.

### Limits of this file

- No recipe lists versions: pin them in the project and record the choice in `docs/DECISIONS.md`.
- A recipe is a starting point, not a constraint: if the project already has a stack, adapt the recipe instead of replacing the stack.
- The document list follows `guides/13-CONTEXT-DOCS.md`, which is the authority; when the two disagree, the guide wins.
- `ui-map check` is the mechanical part of this list (missing documents, unresolved imports, duplicates, strays); the stack choice itself stays a human decision.
