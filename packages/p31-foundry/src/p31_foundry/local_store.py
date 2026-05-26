from __future__ import annotations

import json
import shutil
from pathlib import Path

from p31_foundry.record import DocumentRecord


class FoundryStore:
    """Hash-keyed artifact storage under store_root/artifacts/<sha256>/."""

    def __init__(self, store_root: Path) -> None:
        self.root = store_root.resolve()
        self.artifacts = self.root / "artifacts"
        self.artifacts.mkdir(parents=True, exist_ok=True)

    def persist(self, path: Path, record: DocumentRecord) -> Path:
        """Copy source bytes and write record.json. Returns artifact directory."""
        adir = self.artifacts / record.id
        adir.mkdir(parents=True, exist_ok=True)
        src_copy = adir / "source.bin"
        shutil.copy2(path, src_copy)
        rec_path = adir / "record.json"
        payload = record.to_json_dict()
        rec_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return adir

    def load_record(self, digest: str) -> DocumentRecord | None:
        rec_path = self.artifacts / digest / "record.json"
        if not rec_path.is_file():
            return None
        data = json.loads(rec_path.read_text(encoding="utf-8"))
        return DocumentRecord(
            id=data["id"],
            source_path=data["source_path"],
            mime=data["mime"],
            byte_length=data["byte_length"],
            extracted_text=data.get("extracted_text"),
            page_count=data.get("page_count"),
            text_preview=data.get("text_preview"),
            errors=list(data.get("errors") or []),
        )
