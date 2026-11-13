# Layout rules

Numbers to apply without judgment. They sit on the tokens of `design-tokens.json` (`tokens.mjs init`): use the token, never the number typed by hand. Page recipes (`page-recipes.json`, read with `recipe.mjs`) name a layout from the table in rule 4 for every section. `audit-design.mjs` measures part of this.

## 1 · Numbers (regular density; compact and spacious change only the section and gutter values)

- Breakpoints (px, min-width): sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536. Check every screen at 360, 768 and 1280.
- Container (px): page 1152 · prose 672 · form 448. Centered, with side padding 16 below md, 24 at md, 32 from lg (spacing 4, 6, 8).
- Grid: 12 columns, gap = `spacing.gutter` (compact 16, regular 24, spacious 32).
- Spacing scale (px): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Nothing else, except `section-lg` of spacious density (96).
- Section padding top and bottom (px), compact · regular · spacious: below md 32 · 48 · 64; from md 48 · 64 · 96 (`spacing.section`, `spacing.section-lg`).

## 2 · Rhythm and spacing

1. Every section has the same vertical padding: `section` below md, `section-lg` from md. The hero may add nothing more.
2. Between two sections there is no extra margin: padding only. Mark the boundary with a different surface (`surface`, `surface-raised`) every second section, not with more space.
3. Inside a section use three distances, each at least double the one before: within a group 8 or 12 (label and field, title and text); between groups 24 or 32 (card and card, heading block and content); between sections the section padding.
4. A section holds one idea: one heading, at most one lead sentence, then the content.
5. Controls are `spacing.control` high (44 regular) and at least 24 apart from each other on touch.

## 3 · Type and alignment

1. One h1 per page: `4xl` from md, `3xl` below. h2 `2xl`. h3 `xl`. Lead paragraph `lg`. Body `base`. Meta, captions and legal `sm`; `xs` only for labels.
2. At most 3 text sizes in one viewport and 6 in the project. Weight and color make the rest of the hierarchy.
3. Line length of running text: 45 to 90 characters (target 60 to 75). Put text in `container.prose` (672px); never let a paragraph run the width of `container.page`.
4. Each section has one left edge: the heading, text and content start at the same x. Center text only for a hero or a closing call to action, at most 3 lines, and never mix centered and left text in one section.
5. Body text is left aligned and never justified.

## 4 · Layouts (columns of the 12-column grid at 360 · 768 · 1280)

| Layout | 360 | 768 | 1280 | Use |
|---|---|---|---|---|
| `full-bleed` | 12, edge to edge | 12, edge to edge | 12, edge to edge | Background spans the viewport; the content inside follows `contained` |
| `contained` | 12 | 12 | 12, max 1152 | Default for any section |
| `split` | 12 + 12 stacked | 6 + 6 | 5 + 7 or 6 + 6 | Text beside media; text first when stacked |
| `grid-3` | 12 (1 column) | 6 (2 columns) | 4 (3 columns) | Cards of equal weight |
| `grid-4` | 6 (2 columns) | 3 (4 columns) | 3 (4 columns) | Numbers, logos, small cards |
| `grid-bento` | 12 each | 6 + 6, last tile 12 | 8 + 4 then 4 + 8, or 4 + 4 + 4 | 4 to 6 tiles of unequal weight |
| `narrow-reading` | 12 | 12, max 672 | centered, max 672 | Running text, FAQ, article body |
| `narrow-form` | 12 | 12, max 448 | centered, max 448 | One-column form |
| `main-aside` | 12 + 12 stacked | 12 + 12 stacked | 8 + 4 | Main content and a side column; the aside goes below the main |
| `sidebar-main` | drawer + 12 | 3 + 9 | 2 + 10 | App shell: sidebar 256 fixed, main fills |
| `center-stage` | 12 | 12, centered | 6, offset 3 | One message block centered, for auth, empty and error screens |

Allowed column splits: 6 + 6, 5 + 7, 4 + 8, 3 + 9, 2 + 10, 4 + 4 + 4, 3 + 3 + 3 + 3. No 1-column or 11-column widths, no uneven rows inside a grid.

## 5 · One action and the first viewport

1. One primary (filled) button per viewport. Others are outline or text buttons. The primary action is repeated in later sections with the same words.
2. Where it sits: in a hero, left under the text (centered if the hero is centered); in an app page, the top right of the page header; in a form, at the end of the fields, aligned to the left edge of the fields, full width below md; on a product or checkout page, in a bar fixed to the bottom below md.
3. Without scrolling, at 360 x 640 and at 1280 x 720, the visitor must see: the name of the product or page (h1), one sentence of value, the primary action and a navigation entry.
4. The hero is at most 90vh high, so the top of the next section shows and invites the scroll. No banner, cookie notice or chat bubble may cover the primary action.
5. No more than 5 choices (buttons, links, cards that act) compete in the first viewport; the navigation counts as one.

## 6 · Images

1. Allowed aspect ratios: 1:1, 4:5, 3:4, 4:3, 3:2, 16:9, and 21:9 for a banner only. One ratio per grid.
2. Set `width` and `height` (or `aspect-ratio`) on every image so nothing shifts; give `alt` text, empty only for decoration.
3. Radius comes from `radius.md` or `radius.lg`; all images in a view use the same one.

## 7 · Density per archetype (`tokens.mjs init --density`)

- compact: Operator, Monitor, Reference and Internal / operational sites (dashboards, tables, docs).
- regular: Converter, Explorer, Marketplace, Comparator, Educator, Workflow (the default).
- spacious: Storyteller, Editorial, Portfolio and Narrative / experiential sites.

## 8 · Responsive collapse order

Collapse in this order and stop when the layout fits; nothing may scroll sideways at 360.

1. Grids lose columns: 4 to 2 to 1, or 3 to 2 to 1.
2. `split` stacks, text first; `main-aside` stacks, aside below.
3. The sidebar becomes a drawer opened by a menu button.
4. Horizontal navigation becomes a menu button below lg when it has more than 5 items.
5. Tables become a list of cards, or scroll sideways inside their own box with the first column fixed.
6. Hide only what the primary action does not need (decorative media, secondary columns).

## 9 · What a tool can measure (for `audit-design.mjs`)

Overflow at 360, 768 and 1280; line length 45 to 90; section padding on the scale; text sizes per view; one primary button per viewport; the h1 count; the hero height; image `width` and `height`; the control height and gap.
