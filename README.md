# AI Frontend Guide Kit

Reusable-first UI component catalog and guided workflow for AI agents building frontends. This repository is both the **factory** (extraction pipeline + catalog) and the **distributable kit** you copy into any frontend project.

- **Catalog:** 16 verified sources, 2,470 reusable entries, 20 categories, per-entry licenses and install commands.
- **Guided kit (`ai-frontend-guide/`):** `AGENTS.md` + 9 short guides (00–08) + `find`/`get` query tools. Self-contained, no build, no npm dependencies.
- **Local Laya ranking (optional):** `laya_select.py` ranks catalog candidates with calibrated probabilities, running entirely on the development PC.

## Quickstart (install into a project)

```bash
# one command, straight from GitHub (Node >= 18 + git required)
npx github:urben88/ai-frontend-guide-kit

# variants
npx github:urben88/ai-frontend-guide-kit --no-skills          # kit + docs only
npx github:urben88/ai-frontend-guide-kit --with-laya          # also install/update Laya
npx github:urben88/ai-frontend-guide-kit --target ../my-app   # install into another folder

# offline / no git: build the package once and reuse the tarball
npm pack                                   # -> ai-frontend-guide-kit-1.0.0.tgz (~0.2 MB)
npx ./ai-frontend-guide-kit-1.0.0.tgz      # run it in the destination project

# optional public npm publish (name is free): npm publish --access public
# then: npx ai-frontend-guide-kit
```

The installer:

1. Copies `ai-frontend-guide/` into the target project.
2. Adds a pointer block to the project's `AGENTS.md`.
3. Installs the design skills (`impeccable`, `taste-skill`, `emilkowalski`) unless `--no-skills`.
4. Checks Python/Laya and prints the exact next step (use `--with-laya` to install Laya in the same command).

Then tell your agent: *"Read `ai-frontend-guide/AGENTS.md` and follow its workflow."*

## Laya (local decision engine)

Laya is a fast, non-autoregressive decision model with calibrated probabilities. Here it ranks component candidates by semantic fit; licenses and install commands always come from the catalog.

```bash
python ai-frontend-guide/tools/laya_select.py --check       # status (exit 0 = ready)
python ai-frontend-guide/tools/laya_select.py --install     # pip install -U laya (first run downloads checkpoints)
python ai-frontend-guide/tools/laya_select.py --need "..." --dry-run   # preview the payload, no model
# after asking the user for consent:
python ai-frontend-guide/tools/laya_select.py --need "pricing table with monthly/anual toggle" --category pricing --commercial --confirmed
```

Laya is optional and the agent must ask before using it: ranking requires `--confirmed` as proof of consent (without it the script exits with code 3 and loads nothing). Everything runs locally: no server, no external APIs beyond the one-time Hugging Face checkpoint download. Without Python/Laya the kit still works via `node ai-frontend-guide/tools/find.mjs` + `get.mjs`.

## Repository layout

```
├── ai-frontend-guide/        # the distributable kit (copy this)
│   ├── AGENTS.md · README.md · VERIFICATION.md
│   ├── guides/00..08         # reuse-first UX/UI workflow
│   ├── catalog/              # index + taxonomy + install-guides + 16 sources
│   └── tools/                # find.mjs · get.mjs · laya_select.py
├── manifest/                 # catalog source of truth (generated)
├── tools/                    # extraction/refresh/build/validate pipeline
├── openspec/                 # change specs (OpenSpec)
└── install.mjs               # one-command installer (bin)
```

## Maintainer commands

```bash
node tools/refresh.mjs <source_id>   # refresh one source (or "all")
node tools/build-index.mjs           # rebuild the light index
node tools/build-kit.mjs             # re-sync catalog into ai-frontend-guide/
node tools/validate.mjs              # schema + ID + index checks
node tools/validate.mjs --urls 10    # sample links
npm run validate                     # same as above
```

## Licensing

- The tooling and documentation in this repository follow their own licenses; check `openspec/` history for decisions.
- Catalog entries inherit the license of their source (`license_type`, `commercial_use`, `limits` fields). Non-commercial entries (e.g. original Agents Kit families) are flagged and must not be used in commercial work.
- The kit stores metadata and links only — never third-party component code.
