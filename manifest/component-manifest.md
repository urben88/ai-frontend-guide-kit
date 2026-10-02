# Component Manifest

Light index of 2470 reusable UI entries across 16 sources. Generated 2026-10-02.

**Rule:** consult this catalog before writing any component from scratch. Filter with `find`, inspect with `get`, then follow `guides/06-REUSE.md`.

## Sources

| Source | Entries | License | Granularity | Detail |
|---|---|---|---|---|
| 21st.dev | 812 | Varies per component (MIT frequent; some unknown) | curated: top 30 per tag across 40 tags | `sources/21stdev.json` |
| Aceternity UI | 112 | Proprietary (free tier; commercial use allowed, no redistribution) | complete free registry:ui set (premium detected via HTTP 401) | `sources/aceternity.json` |
| Agents Kit | 224 | Non-commercial for original families; MIT/Apache-2.0 for ported collections | complete (224 registry blocks) | `sources/agentskit.json` |
| aicss.dev | 13 | MIT (free components); Pro under a custom one-time license | complete for the 13 free components (Pro excluded by design) | `sources/aicss.json` |
| coss ui / Origin UI | 76 | MIT for component directories (apps/ui and apps/origin); AGPL elsewhere in the repo | coss ui complete; legacy Origin indexed at base-component level (30 categories, ~604 variants upstream) | `sources/coss.json` |
| DaisyUI | 68 | MIT (library); templates/charts/Figma assets sold separately | complete (68 components) | `sources/daisyui.json` |
| Design Systems Repo | 26 | Directory has no declared content license; each indexed system keeps its own | complete (26 design systems) | `sources/dsr.json` |
| Float UI | 198 | Custom Float UI license (not MIT/OSI; commercial end products allowed) | complete (192 components) | `sources/floatui.json` |
| Hover.dev | 53 | Proprietary custom license (free tier commercially usable, no attribution) | complete free set only (58 free of 153; paid requires Pro) | `sources/hover.json` |
| HyperUI | 266 | MIT | curated: top 5 per category (540 total in source) | `sources/hyperui.json` |
| Magic UI | 78 | MIT (components); Pro templates have a separate license | complete (all registry:ui items) | `sources/magicui.json` |
| Motion Primitives | 33 | MIT (core); Pro sections have a separate paid license | complete (33 components) | `sources/motionprimitives.json` |
| Preline UI | 85 | MIT + Preline UI Fair Use License (dual) | complete at page level (component docs pages with variant headings) | `sources/preline.json` |
| shadcn/ui | 63 | MIT | complete (registry:ui items) | `sources/shadcn.json` |
| Tailblocks | 63 | MIT | complete (all 63 free blocks) | `sources/tailblocks.json` |
| Uiverse | 300 | MIT (all community elements; author copyright notices apply) | curated: top 30 per category across 10 categories (~4.268 elements upstream) | `sources/uiverse.json` |

## Categories

| Category | Entries |
|---|---|
| forms | 402 |
| data-display | 278 |
| feedback | 246 |
| micro-interactions | 241 |
| ai-surfaces | 226 |
| navigation | 163 |
| backgrounds-effects | 134 |
| blocks-sections | 127 |
| overlay | 93 |
| text | 90 |
| layout | 84 |
| media | 72 |
| cta | 57 |
| features | 53 |
| testimonials | 52 |
| hero | 46 |
| faq | 42 |
| pricing | 38 |
| design-system | 26 |

## How to query

```bash
node tools/find.mjs --category hero --stack react --commercial   # short candidate list
node tools/get.mjs <entry-id>                                    # full decision card + install command
```

Read `taxonomy.md` for category definitions, `install-guides.md` for setup per source, and `sources/<id>.json` only when you need the raw entries of one source.
