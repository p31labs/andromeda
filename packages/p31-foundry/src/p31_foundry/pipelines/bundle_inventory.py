from __future__ import annotations

import fnmatch
import json
from pathlib import Path

from p31_foundry.ingest import ingest_file
from p31_foundry.local_store import FoundryStore
from p31_foundry.record import PipelineRunSummary
from p31_foundry.util import default_store_root


def run(
    argv: list[str],
    *,
    store_root: Path | None = None,
    emit_events: bool = False,
) -> PipelineRunSummary:
    """
    bundle-inventory -- <scan_dir> <out_manifest.json> [--glob PATTERN] [--no-store]

    Walks scan_dir (non-recursive default: use --recursive in argv... actually we parse)
    """
    args = list(argv)
    recursive = "--recursive" in args or "-r" in args
    no_store = "--no-store" in args
    for flag in ("--recursive", "-r", "--no-store"):
        while flag in args:
            args.remove(flag)

    glob_pat = "*.pdf"
    if "--glob" in args:
        i = args.index("--glob")
        glob_pat = args[i + 1]
        del args[i : i + 2]

    if len(args) < 2:
        return PipelineRunSummary(
            "bundle-inventory",
            False,
            "usage: p31-foundry run bundle-inventory -- <scan_dir> <out.json> [--glob '*.md'] [--recursive] [--no-store]",
        )

    scan_dir = Path(args[0]).resolve()
    out_json = Path(args[1]).resolve()
    if not scan_dir.is_dir():
        return PipelineRunSummary("bundle-inventory", False, f"not a directory: {scan_dir}")

    root_store = (store_root or default_store_root()).resolve()
    store = FoundryStore(root_store) if not no_store else None

    entries: list[dict] = []
    if recursive:
        paths = sorted(scan_dir.rglob("*"))
    else:
        paths = sorted(scan_dir.iterdir())

    for p in paths:
        if not p.is_file():
            continue
        if not fnmatch.fnmatch(p.name, glob_pat):
            continue
        try:
            rec = ingest_file(p)
            if store:
                store.persist(p, rec)
            entries.append(rec.to_json_dict())
        except Exception as e:
            entries.append({"source_path": str(p), "errors": [str(e)]})

    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps({"version": 1, "scan_dir": str(scan_dir), "count": len(entries), "items": entries}, indent=2), encoding="utf-8")

    if emit_events:
        from p31_foundry.events import append_event

        append_event(root_store, "bundle_inventory", {"manifest": str(out_json), "count": len(entries)})

    return PipelineRunSummary(
        "bundle-inventory",
        True,
        f"wrote {len(entries)} entries → {out_json}",
        outputs=[str(out_json)],
    )
