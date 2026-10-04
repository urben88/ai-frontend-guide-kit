# UX spec — Tidewatch landing

Single page, anchored sections: Hero, How it works, Plans, FAQ, Sign up.

| Section | Job | Catalog id | Decision | Notes |
|---|---|---|---|---|
| Hero | State coverage and the one action | `daisyui-hero-hero` | adapt | Own copy; sticky sign-up button on mobile; no background effect |
| Announcement | Single factual notice (new harbours) | `hyperui-cta-marketing-announcements-1` | reuse | Dismissible, no urgency copy |
| How it works | Explain in 3 steps | custom | build | Plain ordered list; numbers are a real sequence |
| Plans | Compare 3 plans honestly | `hyperui-pricing-marketing-pricing-1` | adapt | Yearly total shown; cancel link under the table |
| FAQ | Remove last doubts | `hyperui-faq-application-accordions-1` | reuse | Native details/summary, keyboard accessible |
| Sign up | One field, magic link | custom | build | `autocomplete="email"`, paste allowed, no CAPTCHA puzzle (WCAG 3.3.8) |

## States
- Sign-up: idle, sending, sent (check your inbox + resend), error (inline, with fix).
- Cookie banner: equal-weight Accept / Reject / Manage.

## Honesty check (per flow)
- Reject takes as many clicks as accept; prices include tax; no scarcity or countdown; no testimonials or user counts shown because none are verified.

## Accessibility and performance
- Targets >= 44 px, visible 3:1 focus ring, one `h1`, landmarks, reduced motion respected.
- No web fonts beyond system stack; no images above the fold; budget LCP <= 2.5 s.
