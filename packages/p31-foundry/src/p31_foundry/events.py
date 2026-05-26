from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any


def append_event(store_root: Path, event_type: str, payload: dict[str, Any]) -> None:
    store_root.mkdir(parents=True, exist_ok=True)
    path = store_root / "events.jsonl"
    line = json.dumps(
        {"ts": time.time(), "type": event_type, "payload": payload},
        ensure_ascii=False,
    )
    with path.open("a", encoding="utf-8") as f:
        f.write(line + "\n")
