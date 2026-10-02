# 04 — Find candidates in the catalog

Purpose: map each inventory row to a short list of concrete catalog entries, with reasons.

## Query basics

```bash
node tools/find.mjs --category hero --commercial          # must-have filter for client work
node tools/find.mjs --category forms --stack react
node tools/find.mjs --text marquee --limit 8
node tools/find.mjs --source magicui --category backgrounds-effects
node tools/get.mjs <entry-id>                             # full card: install, license, deps
```

Filters: `--category`, `--stack`, `--license`, `--commercial`, `--free`, `--source`, `--type`, `--text`, `--limit` (default 12), `--json`.

## Optional: rank with Laya (local)

When several candidates look similar, rank them with the local Laya decision engine (calibrated probabilities, runs on this PC, no server):

```bash
python tools/laya_select.py --check                    # ready? (exit 0 = usable)
python tools/laya_select.py --need "…" --dry-run        # preview the payload without the model
# after the user confirms:
python tools/laya_select.py --need "…the need…" --category <category> --commercial --confirmed
```

- **Ask the user first.** Laya is optional and never runs by default: ask for consent, then repeat with `--confirmed`. Without it the script exits with code 3 and does not load the model.
- The deterministic license/commercial filter runs **before** the model; facts (license, install command, links) always come from the catalog.
- Probabilities are **relative** between candidates. If the top score is low, the output marks it uncertain — compare alternatives or broaden filters.
- No Python or Laya? Skip this block and keep working with the table method below. The workflow never depends on Laya.

## Working method

1. For each inventory row run **one** `find` with the tightest filters.
2. If 0 results: broaden one filter at a time (category → text → drop stack). If still 0, mark "build custom" and move on.
3. For the top 2–3 results per row run `get` and note: license, commercial flag, dependencies, install command.
4. Add candidates to your working table; do not stop at the first result — compare at least two when available.
5. Optional: when the comparison is hard, ask the user for consent and then run `python tools/laya_select.py --need "…" --confirmed` with the same filters; adopt its order as the shortlist order (facts still come from `get`).

## Candidate table (extend `INVENTORY.md`)

| Block | Candidate id | Source | License OK? | Why it fits | Alternative |
|---|---|---|---|---|---|
| Landing hero | aceternity-hero-aurora… | Aceternity | yes (commercial) | gradient + motion matching brand | magicui-…-warp |
| Pricing | preline-pricing-… | Preline | yes | toggle included, plain markup | floatui-pricing-… |
| KPI row | motionprimitives-text-… | Motion Primitives | MIT | count-up animation | build custom |

## Selection heuristics

- **Structural blocks** (nav, forms, tables): choose `daisyui`, `preline`, `shadcn`, `coss` — predictable, low animation.
- **Expressive blocks** (hero, backgrounds): choose `aceternity` / `magicui` / `motionprimitives`, max 1–2 per view.
- **Micro details** (buttons, loaders, toggles): `uiverse`, `hover`, `motionprimitives`.
- **AI/agent surfaces**: `aicss`, `agentskit`, `21stdev` (check licenses first).
- Prefer the smallest dependency footprint; every `motion`-based piece costs bundle size and attention.

## License gate (quick)

- `non-commercial` → excluded for commercial projects (stop).
- `unknown` → open the docs URL and verify before shortlisting.
- `conditional` → read `limits` in the `get` card.

Next: `05-REUSE.md` decides reuse vs adapt vs build and installs.
