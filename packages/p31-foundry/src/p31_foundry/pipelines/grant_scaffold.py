from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from p31_foundry.record import PipelineRunSummary


def run(argv: list[str], **_kwargs) -> PipelineRunSummary:
    """
    grant-scaffold -- [--out path.json]

    Emits a versioned checklist skeleton for grant packaging (human fills content).
    """
    args = list(argv)
    out = Path("grant_pack_skeleton.json").resolve()
    if "--out" in args:
        i = args.index("--out")
        out = Path(args[i + 1]).resolve()
        del args[i : i + 2]

    skeleton = {
        "version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "title": "",
        "sections": [
            {"id": "narrative", "label": "Project narrative", "done": False, "paths": []},
            {"id": "budget", "label": "Budget / justification", "done": False, "paths": []},
            {"id": "logic_model", "label": "Logic model / outcomes", "done": False, "paths": []},
            {"id": "bios", "label": "Key personnel bios", "done": False, "paths": []},
            {"id": "letters", "label": "Letters of support", "done": False, "paths": []},
            {"id": "attachments", "label": "Required attachments index", "done": False, "paths": []},
            {"id": "compliance", "label": "Compliance / representations", "done": False, "paths": []},
        ],
        "notes": "Edit paths[] with repo-relative or absolute paths to source docs; flip done when finalized.",
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(skeleton, indent=2), encoding="utf-8")
    return PipelineRunSummary("grant-scaffold", True, f"wrote {out}", outputs=[str(out)])
