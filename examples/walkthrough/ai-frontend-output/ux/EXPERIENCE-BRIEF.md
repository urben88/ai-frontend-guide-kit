# Experience brief — Tidewatch

## Context
- Building: marketing site + sign-up for a tide and swell alert service. From scratch. Real content exists for the product copy; no testimonials or user counts yet, so none are shown (q42).
- Audience: owners of small boats and kayaks; occasional visitors, mostly on phones at the harbour (q31: mobile first, q34: outdoor light).
- Success action: create a free account (q04).

## Goal and archetype
- Site archetype: marketing / conversion. Page archetype: **Converter** with a small **Explainer** section (how alerts work).
- Navigation model: single-page anchors (`exp-nav-single-page-anchors`).

## Philosophy and style
- Philosophy: functional clarity + trust (`exp-philosophy-functional-clarity`, `exp-philosophy-trust-authority`). Why: the decision is "can I rely on this before I go out", so confidence beats spectacle.
- Style: minimalist functional with high-contrast outdoor palette (`exp-style-minimalist-functional`). Rejected: liquid glass (contrast outdoors, see `reference-style-trends-2026`), dark-technical (wrong tone).
- Motion: none beyond focus and hover states (q28); no animated backgrounds (performance budget: LCP <= 2.5 s on mid-range phones, `reference-core-web-vitals`).

## References used
- [ref: wcag-22] target size 44 px on mobile, visible focus, no cognitive test at sign-in.
- [ref: mobile-touch-guidelines] thumb-zone sticky sign-up button.
- [ref: deceptive-patterns] equal-weight accept/reject on cookies; plans show total price; cancel link on the pricing page.
- [ref: laws-of-ux] Hick: three plans maximum; peak-end: the page ends on a calm summary, not a countdown.

## Journey (emotion)
1. Arrives from a search: wants proof it covers their harbour -> hero states coverage in one sentence. Emotion: doubt -> relief.
2. Scans how alerts work -> three steps, no jargon. Emotion: curiosity.
3. Compares plans -> total yearly price visible, cancel any time. Emotion: caution -> confidence.
4. Signs up -> one field, paste-friendly, magic link (no puzzles). Emotion: ease.

## Constraints
- WCAG 2.2 AA (q35). One language (English), RTL not needed (q38). Light theme only (q40). Collects an email only; consent banner required (q41).
