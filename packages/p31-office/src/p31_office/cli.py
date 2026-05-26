from __future__ import annotations

import sys
from pathlib import Path

from p31_office.zenodo.runner import find_repo_root


def doctor_main(argv: list[str] | None) -> int:
    _ = argv
    print("p31-office doctor", file=sys.stderr)
    print(f"  python: {sys.version.split()[0]} ({sys.executable})")
    root = Path(find_repo_root())
    print(f"  repo root (heuristic): {root}")
    try:
        import reportlab  # noqa: F401

        print("  reportlab: OK", file=sys.stderr)
    except ImportError:
        print("  reportlab: MISSING (pip install p31-office)", file=sys.stderr)
    try:
        import pypdf  # noqa: F401

        print("  pypdf: OK", file=sys.stderr)
    except ImportError:
        print("  pypdf: MISSING", file=sys.stderr)
    asm = root / "packages" / "p31-office" / "src" / "p31_office" / "discovery" / "assembler.py"
    print(f"  assembler: {'OK' if asm.is_file() else 'missing'} {asm}", file=sys.stderr)
    z = root / "p31labs" / "scripts" / "zenodo_scan_local.py"
    print(f"  zenodo script: {'OK' if z.is_file() else 'missing'} {z}", file=sys.stderr)
    return 0


def office_main(argv: list[str] | None = None) -> int:
    argv = list(argv) if argv is not None else sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(
            "usage: p31-office discovery assemble [ARGS…]\n"
            "       p31-office zenodo scan [-- ARGS…]\n"
            "       p31-office doctor\n"
            "  Install: pip install -e ./packages/p31-office\n"
            "  See: packages/p31-office/README.md",
            file=sys.stderr,
        )
        return 0 if argv and argv[0] in ("-h", "--help") else 1

    cmd = argv[0]
    if cmd == "discovery" and len(argv) >= 2 and argv[1] == "assemble":
        from p31_office.discovery.assembler import main as assemble_main

        return assemble_main(argv[2:])

    if cmd == "zenodo" and len(argv) >= 2 and argv[1] == "scan":
        from p31_office.zenodo.runner import main as zenodo_main

        rest = argv[2:]
        if rest and rest[0] == "--":
            rest = rest[1:]
        return zenodo_main(rest)

    if cmd == "doctor":
        return doctor_main(argv[1:])

    print(f"p31-office: unknown command {cmd!r}", file=sys.stderr)
    return 2


def entrypoint() -> None:
    raise SystemExit(office_main())


def main() -> None:
    """Alternate setuptools entry name."""
    entrypoint()
