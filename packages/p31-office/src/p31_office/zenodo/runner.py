from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def find_repo_root(start: Path | None = None) -> Path:
    p = (start or Path.cwd()).resolve()
    for _ in range(10):
        if (p / "package.json").is_file() and (p / "packages" / "p31-office").is_dir():
            return p
        if p.parent == p:
            break
        p = p.parent
    return Path.cwd().resolve()


def resolve_zenodo_script(repo_root: Path | None = None) -> Path | None:
    root = repo_root or find_repo_root()
    cand = root / "p31labs" / "scripts" / "zenodo_scan_local.py"
    if cand.is_file():
        return cand
    return None


def main(argv: list[str] | None = None) -> int:
    argv = list(argv) if argv is not None else sys.argv[1:]
    env_root = os.environ.get("P31_REPO_ROOT", "").strip()
    root = Path(env_root).resolve() if env_root else find_repo_root()
    script = resolve_zenodo_script(root)
    if not script:
        print(
            "p31-office: zenodo_scan_local.py not found at <repo>/p31labs/scripts/zenodo_scan_local.py\n"
            "  Set P31_REPO_ROOT to your P31 home checkout, or run from that directory.",
            file=sys.stderr,
        )
        return 1
    cmd = [sys.executable, str(script), *argv]
    return subprocess.call(cmd, cwd=str(root))
