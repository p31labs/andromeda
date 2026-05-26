from __future__ import annotations

import hashlib
import os
from pathlib import Path


def sha256_file(path: Path) -> str:
    """Streaming SHA-256 hex digest for large binaries."""
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def find_repo_root(start: Path | None = None) -> Path:
    p = (start or Path.cwd()).resolve()
    for _ in range(12):
        if (p / "package.json").is_file() and (p / "packages" / "p31-foundry").is_dir():
            return p
        if p.parent == p:
            break
        p = p.parent
    return Path.cwd().resolve()


def default_store_root() -> Path:
    env = os.environ.get("P31_FOUNDRY_ROOT", "").strip()
    if env:
        return Path(env).expanduser().resolve()
    return (Path.cwd() / ".p31-foundry").resolve()
