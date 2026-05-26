from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class DocumentRecord:
    """Canonical ingested document (hash-addressed)."""

    id: str  # full sha256 hex of file bytes
    source_path: str
    mime: str
    byte_length: int
    extracted_text: str | None = None
    page_count: int | None = None
    text_preview: str | None = None  # first ~500 chars for manifests
    errors: list[str] = field(default_factory=list)

    def to_json_dict(self) -> dict[str, Any]:
        d = asdict(self)
        return d


@dataclass
class PipelineRunSummary:
    pipeline: str
    ok: bool
    message: str
    outputs: list[str] = field(default_factory=list)
