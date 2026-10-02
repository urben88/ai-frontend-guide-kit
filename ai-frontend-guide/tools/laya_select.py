#!/usr/bin/env python3
"""
laya_select — rank component-manifest candidates with the local Laya decision engine.

Runs entirely on this machine (no server, no third-party APIs beyond the
one-time Hugging Face checkpoint download). Facts (license, install command,
links) always come from the catalog; Laya only scores semantic fit.

Usage:
  python tools/laya_select.py --check                 # environment status (exit 0 = ready, 1 = missing)
  python tools/laya_select.py --install               # python -m pip install -U laya, then verify
  python tools/laya_select.py --need "..." [filters] --confirmed  # rank (ask the user for consent first)
  python tools/laya_select.py --need "..." --dry-run  # print state + questions without importing Laya

Filters: --category --stack --license --commercial --free --source --text
Other:   --context/--context-file --top N (8 default, 12 max) --model auto|english|multilingual --json

Exit codes: 0 ok · 1 environment not ready · 2 no candidates/fallback · 3 missing consent (--confirmed)
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import subprocess
import sys
import time
from pathlib import Path

MIN_PYTHON = (3, 10)
MAX_CANDIDATES = 12
DEFAULT_CANDIDATES = 8
LOW_CONFIDENCE = 0.50

KIT_DIR = Path(__file__).resolve().parent.parent
CATALOG_DIR = KIT_DIR / "catalog"
SOURCES_DIR = CATALOG_DIR / "sources"
HF_CACHE = Path.home() / ".cache" / "huggingface" / "hub" / "models--convaiinnovations--laya"

DISCLAIMER = (
    "Laya scores semantic fit only (calibrated probabilities). Licenses, install "
    "commands and links are catalog facts and must be verified with `get`."
)


def reconfigure_stdout() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def pip_available() -> bool:
    try:
        proc = subprocess.run(
            [sys.executable, "-m", "pip", "--version"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        return proc.returncode == 0
    except Exception:
        return False


def laya_installed() -> bool:
    return importlib.util.find_spec("laya") is not None


def hf_cache_info() -> dict:
    if not HF_CACHE.exists():
        return {"present": False, "size_mb": 0.0, "checkpoints": []}
    size = 0
    for file in HF_CACHE.rglob("*"):
        if file.is_file():
            try:
                size += file.stat().st_size
            except OSError:
                pass
    snapshots = HF_CACHE / "snapshots"
    checkpoints = []
    if snapshots.exists():
        for snapshot in snapshots.iterdir():
            if snapshot.is_dir():
                names = [f.name for f in snapshot.iterdir() if f.is_file()][:4]
                checkpoints.append(", ".join(names) if names else snapshot.name)
    return {"present": True, "size_mb": round(size / 1_048_576, 1), "checkpoints": checkpoints}


def run_check(as_json: bool = False) -> int:
    info = {
        "python": sys.version.split()[0],
        "python_ok": sys.version_info >= MIN_PYTHON,
        "pip_available": pip_available(),
        "laya_installed": laya_installed(),
        "hf_cache": hf_cache_info(),
    }
    info["ready"] = info["python_ok"] and info["pip_available"] and info["laya_installed"]

    if as_json:
        print(json.dumps(info, indent=2))
        return 0 if info["ready"] else 1

    print("Laya environment check (local, on this PC)")
    print(f"  python : {info['python']} {'OK' if info['python_ok'] else 'TOO OLD (need >= 3.10)'}")
    print(f"  pip    : {'OK' if info['pip_available'] else 'NOT FOUND'}")
    print(f"  laya   : {'installed' if info['laya_installed'] else 'NOT installed'}")
    cache = info["hf_cache"]
    print(f"  cache  : {cache['size_mb']} MB cached" if cache["present"] else "  cache  : empty (first run downloads checkpoints, ~0.1-1.7 GB per language)")
    print()
    if info["ready"]:
        print("Ready. Example:")
        print('  python tools/laya_select.py --need "marketing hero with animated gradient" --category hero --commercial')
    else:
        if not info["python_ok"]:
            print("Install Python 3.10+ (3.11-3.13 recommended if pip fails to find a torch wheel).")
        if not info["laya_installed"]:
            print("Install Laya with:")
            print(f'  "{sys.executable}" -m pip install -U laya')
        print("Fallback without Laya: node tools/find.mjs ... and node tools/get.mjs ...")
    return 0 if info["ready"] else 1


def run_install() -> int:
    print(f"Installing laya with: {sys.executable} -m pip install -U laya")
    proc = subprocess.run([sys.executable, "-m", "pip", "install", "-U", "laya"])
    if proc.returncode != 0:
        print("pip install failed. If no torch wheel matches your Python version, try Python 3.11-3.13.")
        return 1
    if not laya_installed():
        print("laya installed but not importable; check your environment.")
        return 1
    print("laya installed and importable. First ranking call downloads checkpoints (one time).")
    return 0


def load_entries() -> list[dict]:
    if not SOURCES_DIR.exists():
        print(f"Catalog not found at {SOURCES_DIR}. Run this script from the ai-frontend-guide folder.")
        sys.exit(2)
    entries: list[dict] = []
    for file in sorted(SOURCES_DIR.glob("*.json")):
        data = json.loads(file.read_text(encoding="utf-8"))
        entries.extend(data.get("entries", []))
    return entries


def matches(entry: dict, args: argparse.Namespace) -> bool:
    if args.category and entry.get("category") != args.category:
        return False
    if args.type and entry.get("entry_type") != args.type:
        return False
    if args.source and args.source.lower() not in entry.get("source", "").lower().replace(" ", "-"):
        return False
    if args.stack and not any(s.lower() == args.stack.lower() for s in entry.get("stack", [])):
        return False
    if args.license and entry.get("license_type") != args.license:
        return False
    if args.commercial and entry.get("commercial_use") is False:
        return False
    if args.free and entry.get("free") is not True:
        return False
    if args.text:
        haystack = " ".join(
            [entry.get("name", ""), entry.get("description", ""), entry.get("category", ""), entry.get("source", "")]
            + entry.get("search_tags", [])
        ).lower()
        if args.text.lower() not in haystack:
            return False
    return True


def preselect(entries: list[dict], need: str, top: int) -> list[dict]:
    tokens = {t for t in re.split(r"[^a-z0-9]+", need.lower()) if len(t) > 2}

    def score(entry: dict) -> float:
        haystack = " ".join(
            [entry.get("name", ""), entry.get("description", ""), entry.get("use_case", "")]
            + entry.get("search_tags", [])
        ).lower()
        overlap = sum(1 for token in tokens if token in haystack)
        return overlap - (0.01 * len(haystack))

    ranked = sorted(entries, key=score, reverse=True)
    return ranked[:top]


def profile_text(entry: dict) -> str:
    return (
        f"{entry.get('name')} — {entry.get('source')} [{entry.get('category')}]. "
        f"{entry.get('description', '')} Use case: {entry.get('use_case', '')}"
    )


def build_payload(need: str, context: str | None, candidates: list[dict]) -> tuple[str, dict]:
    state = need if not context else f"{need}\n\nProject context:\n{context}"
    questions: dict = {}
    for index, entry in enumerate(candidates):
        questions[f"fit_{index:02d}"] = {
            "type": "noul",
            "instructions": (
                f"Candidate: {profile_text(entry)}\n"
                "Does this candidate fit the stated UI need well enough to be reused in this project?"
            ),
        }
    questions["best_overall"] = {
        "type": "choice",
        "instructions": "Which single candidate best fits the stated UI need?",
        "criteria": {entry["id"]: profile_text(entry) for entry in candidates},
    }
    return state, questions


def extract_choice_signal(answer: dict, ids: set[str]) -> dict:
    """Best-effort extraction of per-option probabilities from a choice answer."""
    for value in answer.values():
        if isinstance(value, dict) and ids.issubset(set(value.keys())):
            try:
                return {key: float(val) for key, val in value.items()}
            except (TypeError, ValueError):
                continue
    return {}


def run_ranking(args: argparse.Namespace) -> int:
    need = args.need
    context = args.context
    if args.context_file:
        context = Path(args.context_file).read_text(encoding="utf-8")

    entries = [entry for entry in load_entries() if matches(entry, args)]
    top = max(1, min(args.top, MAX_CANDIDATES))
    candidates = preselect(entries, need, top)

    if not candidates:
        print("No candidates after the deterministic filter. Broaden filters (try --text or drop --stack).")
        print("Fallback: node tools/find.mjs ... — no Laya call was made.")
        return 2

    state, questions = build_payload(need, context, candidates)

    if args.dry_run:
        if args.json:
            print(json.dumps({"need": need, "state": state, "questions": questions, "candidate_ids": [c["id"] for c in candidates]}, indent=2))
        else:
            print(f"# Dry run — {len(candidates)} candidates preselected (no Laya import)")
            for entry in candidates:
                print(f"- {entry['id']} | {entry['name']} | {entry['source']} | {entry['license_type']}")
            print()
            print("State:")
            print(state if len(state) < 1500 else state[:1500] + "…")
            print()
            print("Questions:")
            print(json.dumps(questions, indent=2, ensure_ascii=False))
            print()
            print("Run without --dry-run to score these with Laya.")
        return 0

    if not args.confirmed:
        print("Laya is optional and must not run without the user's permission.")
        print("Ask the user for consent first, then repeat the same command adding --confirmed, e.g.:")
        print(f'  python tools/laya_select.py --need "{need}" --confirmed   # plus your filters')
        print("Without Laya, continue with: node tools/find.mjs ... and node tools/get.mjs ...")
        return 3

    if not laya_installed():
        print("Laya is not installed. Run: python tools/laya_select.py --check")
        print("Fallback: node tools/find.mjs ... and node tools/get.mjs ...")
        return 2

    from laya import Router  # noqa: PLC0415

    started = time.time()
    router = Router()
    predict_kwargs = {"model": args.model} if args.model and args.model != "auto" else {}
    result = router.predict(state, questions, **predict_kwargs)
    elapsed = round(time.time() - started, 1)

    answers = result.get("answers", {})
    ids = {entry["id"] for entry in candidates}
    choice_answer = answers.get("best_overall", {})
    choice_probs = extract_choice_signal(choice_answer, ids)
    chosen = choice_answer.get("choice") if isinstance(choice_answer, dict) else None

    rows = []
    for index, entry in enumerate(candidates):
        answer = answers.get(f"fit_{index:02d}", {})
        fit = answer.get("noul") if isinstance(answer, dict) else None
        rows.append(
            {
                "id": entry["id"],
                "name": entry["name"],
                "source": entry["source"],
                "category": entry["category"],
                "fit": fit,
                "choice_probability": choice_probs.get(entry["id"]),
                "is_choice_pick": entry["id"] == chosen,
                "license_type": entry.get("license_type"),
                "commercial_use": entry.get("commercial_use"),
                "install_command": entry.get("install_command"),
                "docs_url": entry.get("docs_url"),
            }
        )
    rows.sort(key=lambda row: (row["fit"] is None, -(row["fit"] or 0)))

    payload = {
        "need": need,
        "elapsed_seconds": elapsed,
        "routing": result.get("routing"),
        "candidates": rows,
        "disclaimer": DISCLAIMER,
    }

    if args.json:
        print(json.dumps(payload, indent=2, ensure_ascii=False, default=str))
        return 0

    top_fit = rows[0]["fit"] if rows and rows[0]["fit"] is not None else None
    print(f'# Laya ranking — need: "{need}"')
    routing_model = (result.get("routing") or {}).get("model", "unknown")
    print(f"model: {routing_model} | candidates: {len(rows)} | {elapsed}s" + (f" | choice: {chosen}" if chosen else ""))
    print()
    print(f"{'rank':<4} {'P(fit)':<7} {'best':<5} candidate | source | license | commercial | install")
    for position, row in enumerate(rows, start=1):
        fit = f"{row['fit']:.2f}" if row["fit"] is not None else "n/a"
        star = "*" if row["is_choice_pick"] else ""
        print(
            f"{position:<4} {fit:<7} {star:<5} {row['id']} | {row['source']} | "
            f"{row['license_type']} | {row['commercial_use']} | {row['install_command'] or row['docs_url']}"
        )
    print()
    if top_fit is not None and top_fit < LOW_CONFIDENCE:
        print(f"WARNING: low confidence (top P(fit)={top_fit:.2f}); compare alternatives or broaden filters.")
    print(DISCLAIMER)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="laya_select",
        description="Rank component-manifest candidates with the local Laya decision engine.",
    )
    parser.add_argument("--check", action="store_true", help="report environment status (exit 0 = ready)")
    parser.add_argument("--install", action="store_true", help="install/update laya with pip, then verify")
    parser.add_argument("--need", help="the UI need to rank for (e.g. 'pricing table with monthly toggle')")
    parser.add_argument("--context", help="extra project context (PRODUCT.md excerpt, tokens intent…)")
    parser.add_argument("--context-file", help="read the context from a file instead")
    parser.add_argument("--category")
    parser.add_argument("--type")
    parser.add_argument("--stack")
    parser.add_argument("--license")
    parser.add_argument("--commercial", action="store_true")
    parser.add_argument("--free", action="store_true")
    parser.add_argument("--source")
    parser.add_argument("--text")
    parser.add_argument("--top", type=int, default=DEFAULT_CANDIDATES)
    parser.add_argument("--model", choices=["auto", "english", "multilingual"], default="auto")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--dry-run", action="store_true", help="print state + questions without importing Laya")
    parser.add_argument("--confirmed", action="store_true", help="confirm the user consented to running the model (required for ranking)")
    return parser


def main() -> int:
    reconfigure_stdout()
    parser = build_parser()
    args = parser.parse_args()

    if args.check:
        return run_check(as_json=args.json)
    if args.install:
        return run_install()
    if not args.need:
        parser.print_help()
        print("\nNothing to do: pass --check, --install or --need \"...\".")
        return 0
    return run_ranking(args)


if __name__ == "__main__":
    sys.exit(main())
