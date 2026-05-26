from __future__ import annotations

from pathlib import Path

from p31_foundry.ingest import ingest_file
from p31_foundry.record import PipelineRunSummary


def run(argv: list[str], **_kwargs) -> PipelineRunSummary:
    """
    text-concat -- file1 file2 ... [-o out.txt]

    Pulls extracted_text or utf-8 fallback per file.
    """
    args = list(argv)
    out: Path | None = None
    if "-o" in args:
        i = args.index("-o")
        out = Path(args[i + 1]).resolve()
        del args[i : i + 2]
    if not args:
        return PipelineRunSummary(
            "text-concat",
            False,
            "usage: p31-foundry run text-concat -- <files...> [-o out.txt]",
        )
    if out is None:
        return PipelineRunSummary("text-concat", False, "missing -o out.txt")

    chunks: list[str] = []
    for raw in args:
        p = Path(raw).resolve()
        if not p.is_file():
            chunks.append(f"\n\n=== MISSING: {p} ===\n\n")
            continue
        rec = ingest_file(p)
        body = rec.extracted_text or ""
        chunks.append(f"\n\n=== FILE: {p.name} ===\n\n{body}")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(chunks).strip() + "\n", encoding="utf-8")
    return PipelineRunSummary("text-concat", True, f"wrote {out}", outputs=[str(out)])
