#!/usr/bin/env python3
"""Minimal targeted fixer for remaining real token debt.
Fixes: Tailwind arbitrary colors in spaceship-earth.
Exempts:   - p31ca/public/p31-shared-surface.css (design-system source of truth)
           - bonding/public/soup/*.css (legacy campaign CSS, marked exempt)
"""
import re
from pathlib import Path

REPO = Path("/home/p31/andromeda")
CANON = {
    "#22d3ee": "cyan",
    "#fbbf24": "amber",
    "#00ff88": "phosphor",
    "#3ba372": "phosphorus",
    "#cc6247": "coral",
    "#8b7cc9": "lavender",
    "#e879f9": "fuchsia",
    "#4db8a8": "teal",
    "#5dcaa5": "teal",
    "#cda852": "amber",
}
ARBITRARY_RE = re.compile(
    r"\b(?:text|bg|border|from|to|via|ring|shadow|outline)-\[#([0-9a-fA-F]{6})\]",
    re.IGNORECASE,
)

EXEMPT_SUBSTRINGS = (
    "/p31-shared-surface.css",
    "/public/soup/",
)


def is_exempt(path: Path) -> bool:
    rel = str(path.relative_to(REPO))
    return any(ex in rel for ex in EXEMPT_SUBSTRINGS)


def fix_file(path: Path) -> int:
    if is_exempt(path):
        return 0
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return 0
    new_text = text
    count = 0
    for m in ARBITRARY_RE.finditer(text):
        hex_val = "#" + m.group(1).lower()
        if hex_val in CANON:
            token = CANON[hex_val]
            old = m.group(0)
            new = old.replace(hex_val, f"var(--color-{token})")
            if old != new:
                new_text = new_text.replace(old, new, 1)
                count += 1
    if count > 0 and new_text != text:
        path.write_text(new_text, encoding="utf-8")
    return count


def main():
    total = 0
    for project in ("software/spaceship-earth", "software/p31ca", "software/bonding"):
        base = REPO / project
        if not base.exists():
            continue
        for ext in ("*.tsx", "*.jsx", "*.ts", "*.js", "*.css"):
            for f in base.rglob(ext):
                if "node_modules" in str(f) or ".git" in str(f):
                    continue
                n = fix_file(f)
                if n:
                    total += n
                    print(f"  fixed {n} in {f.relative_to(REPO)}")
    print(f"Total Tailwind arbitrary colors fixed: {total}")


if __name__ == "__main__":
    main()
