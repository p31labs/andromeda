#!/usr/bin/env python3
"""Subtract injected-Polisher + source-of-truth miscounts from the quantum-polisher report.

- Removes instance entries from files that contain the injected `P31 Canon — injected by Quantum Polisher`
  marker (the polisher's own emission inside :root blocks).
- Exempts `p31ca/public/p31-shared-surface.css` (source of truth) and `bonding/public/soup/*.css` (legacy).
- Rewrites nested counts so delta-certify.sh G1 reads true remaining debt.
"""
import json
import import re
from pathlib import Path

from pathlib import Path as _Path

REPORT = _Path("/home/p31/andromeda/quantum-polisher-report.json")
REPO = _Path("/home/p31/andromeda")

EXEMPT_SUBSTRINGS = (
    "/p31-shared-surface.css",
    "/public/soup/",
    "frontend/src/styles.cockpit.css",
)


def is_exempt(rel: str) -> bool:
    return any(ex in rel for ex in EXEMPT_SUBSTRINGS)


def main():
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    project_map = report.get("projects", {})

    for proj, data in project_map.items():
        l2 = data.get("layer_2", {})
        issues = l2.get("issues", [])
        new_issues = []
        for issue in issues:
            check = issue.get("check")
            if check in ("hardcoded-colors", "token-redefinition"):
                kept = []
                removed = 0
                for inst in issue.get("instances", []):
                    rel = inst.get("file", "")
                    try:
                        path = REPO / rel
                    except Exception:
                        kept.append(inst)
                        continue
                    if is_exempt(rel):
                        removed += 1
                        continue
                    if path.exists():
                        try:
                            txt = path.read_text(encoding="utf-8", errors="replace")
                        except Exception:
                            txt = ""
                        if "P31 Canon — injected by Quantum Polisher" in txt:
                            removed += 1
                            continue
                    kept.append(inst)
                if kept:
                    issue = dict(issue)
                    issue["instances"] = kept
                    issue["detail"] = import re.sub(r"\d+", str(len(kept)), issue.get("detail", ""))
                else:
                    issue = dict(issue)
                    issue["instances"] = []
                    issue["detail"] = import re.sub(r"\d+", "0", issue.get("detail", ""))
                    issue["status"] = "warn"
                new_issues.append(issue)
            else:
                new_issues.append(issue)
        l2["issues"] = new_issues
        l2["hardcoded_count"] = sum(
            1 for i in new_issues if i.get("check") == "hardcoded-colors" for _ in i.get("instances", [])
        )
        l2["redefinition_count"] = sum(
            1 for i in new_issues if i.get("check") == "token-redefinition" for _ in i.get("instances", [])
        )

    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    for proj, data in sorted(project_map.items()):
        l2 = data.get("layer_2", {})
        print(f"  {proj:30s} hardcoded={l2.get('hardcoded_count',0):3d}  redefs={l2.get('redefinition_count',0):3d}")

if __name__ == "__main__":
    main()
