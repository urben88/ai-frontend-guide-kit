# ai-frontend-guide — README

Self-contained guided kit for building frontend UX/UI with a reuse-first workflow. Copy this folder into any frontend repository and point your AI agent to `AGENTS.md`.

## Copy into a project

1. Copy the whole `ai-frontend-guide/` folder to the target repository root (keep the folder intact).
2. Tell the agent: *"Read `ai-frontend-guide/AGENTS.md` and follow its workflow."*
3. Optional: add a pointer in the project's own `AGENTS.md`:

```markdown
## Frontend UI
Before creating UI components, follow `ai-frontend-guide/AGENTS.md` (reuse-first workflow).
```

Requirements: none for reading the guides or catalog. The query tools need Node.js ≥ 18; no npm packages are required.

## Structure

```
ai-frontend-guide/
├── AGENTS.md              # awareness layer: scope, golden rule, navigation
├── README.md              # this file (copy + integration instructions)
├── guides/                # 00-START-HERE … 08-VERIFY (the workflow)
├── catalog/
│   ├── component-manifest.json   # light index (sources, counts, paths)
│   ├── component-manifest.md     # readable index
│   ├── taxonomy.md               # category definitions + source mappings
│   ├── install-guides.md         # install/code retrieval per source
│   ├── schema.json               # entry schema
│   └── sources/*.json            # 16 source files (2,470 entries)
└── tools/
    ├── find.mjs           # filtered catalog search (short output)
    ├── get.mjs            # full decision card for one entry
    └── laya_select.py     # local Laya ranking (optional accelerator; Python >= 3.10)
```

## Laya (optional local ranking)

`tools/laya_select.py` ranks candidates with calibrated probabilities, running entirely on this PC:

```bash
python tools/laya_select.py --check     # environment status
python tools/laya_select.py --install   # pip install -U laya (first run downloads checkpoints)
# after asking the user for consent:
python tools/laya_select.py --need "pricing table with monthly toggle" --category pricing --commercial --confirmed
```

**Ask before using it:** Laya is optional and never runs by default; ranking requires `--confirmed` as proof of the user's consent (without it the script exits with code 3 and does not load the model). Facts (licenses, install commands) always come from the catalog; Laya only scores semantic fit. Without Python/Laya the kit works the same through `find`/`get`.

## Updating the kit

The catalog is generated in the factory repo (`PilaresAplicaciones/Diseño`):

```bash
node tools/refresh.mjs <source_id>   # refresh one source
node tools/build-index.mjs           # rebuild the light index
node tools/build-kit.mjs             # re-sync catalog into ai-frontend-guide/
node tools/validate.mjs              # schema + consistency check
```

Copy the updated folder again into projects when the catalog changes. Each entry records `verified_at` so agents know the data's age.

## Rules of engagement

- Reuse or adapt before creating (see `guides/05-REUSE.md`).
- Respect `license_type` / `commercial_use` / `limits` (see `AGENTS.md`).
- Keep high-impact animations to 1–2 per view (see `guides/07-PHILOSOPHY.md`).
- Do not paste third-party source into this kit — it stores metadata and links only.
