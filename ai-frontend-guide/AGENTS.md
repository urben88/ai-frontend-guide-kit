# AI Frontend Guide

This folder is a **guided, self-contained kit** for agents (and humans) that build frontend UX/UI. Its purpose: **reuse what already exists before creating anything from scratch.**

## What you have here

- A catalog of **2,470 reusable UI entries** from **16 verified sources** (updated 2026-10-02), organized in 20 categories.
- Per-entry decision data: what it is, when to use it, where to find it, how to install it and its license constraints.
- A standardized reuse-first workflow in 9 short guides.
- Two local query tools (`tools/find.mjs`, `tools/get.mjs`) that answer with minimal output.

## Golden rule

> **Before writing any component, form, section or animation from scratch: search this catalog.**

Only if nothing fits (or the license blocks you), build custom — and follow `guides/07-PHILOSOPHY.md`.

## How to use (token-efficient layers)

| Layer | Read / run | Cost |
|---|---|---|
| 0 · Awareness | this file | ~1 page |
| 1 · Guide | only the guide for the current step (`guides/00` … `08`) | ≤ ~120 lines |
| 2 · Query | `node tools/find.mjs ...` and `node tools/get.mjs <id>` | < 1 KB each |
| 3 · Detail | `catalog/sources/<source>.json` or the official docs URL | only when needed |

Never load all `catalog/sources/*.json` files into context. Never read `install-guides.md` end-to-end — jump to the section of the chosen source.

## Workflow map

| Step | Guide | Output |
|---|---|---|
| 0 | `guides/00-START-HERE.md` | flow map + rules |
| 1 | `guides/01-ANCHOR.md` | `PRODUCT.md` (audience, conversion, flows, screens) |
| 2 | `guides/02-TOKENS.md` | `DESIGN.md` + Tailwind v4 theme (Figma MCP or fallback) |
| 3 | `guides/03-INVENTORY.md` | component inventory per screen |
| 4 | `guides/04-FIND.md` | shortlist of candidates per need (optionally Laya-ranked) |
| 5 | `guides/05-REUSE.md` | reuse/adapt/build decision + install |
| 6 | `guides/06-ADAPT.md` | adapted component with tokens |
| 7 | `guides/07-PHILOSOPHY.md` | hierarchy, springs, anti-generic rules |
| 8 | `guides/08-VERIFY.md` | Playwright E2E + visual checks green |

## Query examples

```bash
node tools/find.mjs --category hero --stack react --commercial
node tools/find.mjs --text marquee --limit 8
node tools/get.mjs magicui-micro-interactions-marquee
```

## Laya (local decision engine — optional accelerator)

Laya is a fast decision model with **calibrated probabilities** that runs entirely on this PC (no server). Use it to rank candidates when the choice between similar components is not obvious.

```bash
python tools/laya_select.py --check       # ready? (exit 0 = usable on this PC)
python tools/laya_select.py --install     # only if missing (first run downloads checkpoints, ~0.1-1.7 GB)
python tools/laya_select.py --need "..." --dry-run   # preview selection payload, no model needed
# after the user confirms:
python tools/laya_select.py --need "pricing table with monthly/anual toggle" --category pricing --commercial --confirmed
```

Rules:

- **Ask the user first.** Laya is optional and never runs by default: ask for consent before every ranking, then repeat the command with `--confirmed`. Without it the script exits with code 3 and does not load the model.
- **Facts vs opinion:** licenses, compatibility and install commands always come from the catalog (`get`); Laya only scores semantic fit.
- Treat probabilities as **relative** between candidates; if the top score is low the script says so — compare alternatives or broaden filters.
- If Python/Laya is unavailable, continue with `find`/`get`. Never block the workflow on Laya.
- Pre-filter is deterministic and mandatory: non-commercial entries never reach the model for commercial projects.

## License discipline

- `license_type: non-commercial` → **do not use in commercial work** (permission required).
- `license_type: unknown` → verify on the component page before production.
- `commercial_use: conditional` → read `limits` in `get` output first.
- This kit never ships third-party component code; it only stores metadata and links.
