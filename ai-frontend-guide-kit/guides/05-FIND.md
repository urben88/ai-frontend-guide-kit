# 05 — Find candidates in the catalog

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

## Rank with Laya (recommended, local)

After the `find` shortlist and the `get` cards, rank the candidates with the local Laya engine, passing the **chosen direction** and the brief as context. Consent is once per session (recorded in `EXPERIENCE-BRIEF.md` from guide 01):

```bash
python tools/laya_select.py --check                    # ready? (exit 0 = usable)
python tools/laya_select.py --need "…" --dry-run        # preview the payload without the model
# after the user consented this session:
python tools/laya_select.py --need "…the block need…" --category <category> --commercial \
  --direction <experience-id> --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md --confirmed
```

- `--direction <id>` is the chosen archetype/philosophy/style (the one recorded in `EXPERIENCE-BRIEF.md`, e.g. `exp-archetype-monitor`): its profile goes into the ranking state so the fit matches the UX direction. A wrong id only prints a warning and continues.
- Adopt Laya's order as the shortlist order; facts (license, install command, links) always come from `get`.
- The deterministic license/commercial filter runs **before** the model; probabilities are **relative** between candidates. If the top score is low, compare alternatives or broaden filters.
- No Python/Laya or no consent this session? Keep working with the candidate table and the heuristics below. The workflow never depends on Laya.

## Working method

1. Before searching, check saved combinations (they live next to the kit and survive refreshes):
   ```bash
   node tools/memory.mjs combo list
   ```
   If one fits this project, `node tools/memory.mjs combo show <name>` and reuse its entries (record them with `combo apply` or `add`).
2. For each inventory row run **one** `find` with the tightest filters.
3. If 0 results: broaden one filter at a time (category → text → drop stack). If still 0, mark "build custom" and move on.
4. For the top 2–3 results per row run `get` and note: license, commercial flag, dependencies, install command.
5. Add candidates to your working table; do not stop at the first result — compare at least two when available.
6. Recommended: rank the shortlist with Laya passing `--direction <id>` and the brief as context (consent once per session); adopt its order and keep the facts from `get`.

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

Next: `06-REUSE.md` decides reuse vs adapt vs build and installs.
