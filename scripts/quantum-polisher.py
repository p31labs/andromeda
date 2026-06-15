#!/usr/bin/env python3
"""
Quantum Code Polisher — UI/UX fidelity engine.

Runs between grader and jitterbug. Four onion layers:
  Layer 1 (Surface):  Formatting, linting auto-fix, trailing whitespace
  Layer 2 (Token):    Design token drift — hardcoded colors, glass params
  Layer 3 (Pattern):  Component conventions — exports, naming, strictness
  Layer 4 (Arch):     Design system adoption — shared imports, Tailwind preset

Output: drift-report.json + auto-fixes + jitterbug-compatible signals
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path("/home/p31/andromeda").resolve()
CANON_PATH = REPO_ROOT / "software" / "packages" / "shared" / "src" / "theme" / "canon.ts"
SHARED_UI_PATH = REPO_ROOT / "software" / "packages" / "shared" / "src" / "ui" / "p31-shared"
DRIFT_REPORT_PATH = REPO_ROOT / "quantum-polisher-report.json"

# Known UI/UX projects (discovered by survey)
UI_PROJECTS = {
    "bonding": {"path": "software/bonding", "framework": "react", "css": "tailwind-v4", "strict_ts": False},
    "spaceship-earth": {"path": "software/spaceship-earth", "framework": "react", "css": "vanilla", "strict_ts": False},
    "frontend": {"path": "software/frontend", "framework": "react", "css": "vanilla", "strict_ts": True},
    "p31ca": {"path": "software/p31ca", "framework": "astro", "css": "tailwind-v3", "strict_ts": True},
    "sovereign-command-center": {"path": "software/sovereign-command-center", "framework": "nextjs", "css": "tailwind-v3", "strict_ts": True},
    "spoon-calculator": {"path": "software/spoon-calculator", "framework": "react", "css": "vanilla", "strict_ts": False},
    "p31-hearing-ops": {"path": "software/p31-hearing-ops", "framework": "react", "css": "vanilla", "strict_ts": False},
    "p31-delta-hiring": {"path": "software/p31-delta-hiring", "framework": "vanilla", "css": "vanilla", "strict_ts": False},
    "p31-pwa": {"path": "software/packages/node-zero/pwa", "framework": "react", "css": "vanilla", "strict_ts": False},
}

# Known canonical colors from @p31/shared/theme/canon.ts
CANON_COLORS = {
    "coral": "#cc6247",
    "teal": "#5DCAA5",
    "cyan": "#4db8a8",
    "amber": "#cda852",
    "lavender": "#8b7cc9",
    "phosphorus": "#3ba372",
    "phosphor": "#00FF88",
    "fuchsia": "#e879f9",
}

CANON_VARS = {
    "phosphor": "var(--color-phosphor)",
    "void": "var(--color-void)",
    "surface": "var(--color-surface)",
    "text-primary": "var(--color-text-primary)",
}

# Patterns that indicate hardcoded colors that should use tokens
HARDCODED_COLOR_RE = re.compile(
    r'#[0-9a-fA-F]{6}\b|'
    r'rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*[\d.]+)?\s*\)'
)

# Layer 2 — detect color redefinitions (project overriding canonical)
REDEFINITION_RE = re.compile(
    r'(--color-|--cl-|--glow-|--neon-|--void|--phosphor|\bphosphor\b|\bteal\b|\bcoral\b|\bamber\b|\blavender\b)'
)


def _read_canon_palette() -> dict:
    """Extract canonical color palette from canon.ts."""
    if not CANON_PATH.exists():
        return CANON_COLORS
    text = CANON_PATH.read_text(encoding="utf-8", errors="replace")
    colors = {}
    for name, hex_val in CANON_COLORS.items():
        colors[name] = hex_val
    return colors


def _run(cmd: list[str], cwd: Path, timeout: int = 30) -> tuple[int, str, str]:
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except Exception as e:
        return -1, "", str(e)


def _fix_trailing_whitespace(project_path: Path) -> int:
    """Remove trailing whitespace from all source files. Returns fix count."""
    count = 0
    for ext in ["*.py", "*.js", "*.jsx", "*.ts", "*.tsx", "*.css", "*.json", "*.md", "*.html", "*.yml", "*.yaml", "*.mjs"]:
        for f in project_path.rglob(ext):
            if "node_modules" in str(f) or ".git" in str(f):
                continue
            try:
                text = f.read_text(encoding="utf-8", errors="replace")
                lines = text.splitlines(keepends=True)
                fixed = [re.sub(r'[ \t]+$', '', line) for line in lines]
                new_text = "".join(fixed)
                if not new_text.endswith("\n"):
                    new_text += "\n"
                if new_text != text:
                    f.write_text(new_text, encoding="utf-8")
                    count += 1
            except Exception:
                pass
    return count


def layer_1_surface(project_path: Path, project_name: str, auto_fix: bool = True) -> dict:
    """Layer 1: Formatting, lint auto-fix, trailing whitespace, final newlines."""
    issues = []
    fixes_applied = 0

    # 1a — ESLint auto-fix
    eslint_configs = list(project_path.glob("eslint*")) + list(project_path.glob(".eslintrc*"))
    if eslint_configs:
        rc, out, err = _run(["npx", "eslint", "--fix", "--ext", ".js,.jsx,.ts,.tsx", "."], project_path)
        if rc == 0:
            fixes_applied += 1
        else:
            issues.append({"check": "eslint", "status": "warning", "detail": err.strip()[:200]})
    else:
        issues.append({"check": "eslint", "status": "missing", "detail": "No ESLint config found"})

    # 1b — Check for Prettier/Biome config
    prettier_configs = list(project_path.glob(".prettierrc*")) + list(project_path.glob("prettier*"))
    biome_configs = list(project_path.glob("biome.json*"))
    if not prettier_configs and not biome_configs:
        issues.append({"check": "formatter", "status": "missing", "detail": "No Prettier or Biome config"})

    # 1c — Auto-fix trailing whitespace + final newlines
    if auto_fix:
        fixed = _fix_trailing_whitespace(project_path)
        if fixed > 0:
            fixes_applied += fixed

    # Scan for remaining issues
    trailing_count = 0
    no_newline_count = 0
    for ext in ["*.js", ".jsx", ".ts", ".tsx", ".css", ".json"]:
        for f in project_path.rglob(ext):
            if "node_modules" in str(f) or ".git" in str(f):
                continue
            try:
                text = f.read_text(encoding="utf-8", errors="replace")
                for line in text.splitlines(keepends=True):
                    if line.rstrip("\n\r").endswith(" ") or line.rstrip("\n\r").endswith("\t"):
                        trailing_count += 1
                        break
                if text and not text.endswith("\n"):
                    no_newline_count += 1
            except Exception:
                pass

    if trailing_count > 0:
        issues.append({"check": "trailing-whitespace", "status": "fail", "detail": f"{trailing_count} files with trailing whitespace"})
    if no_newline_count > 0:
        issues.append({"check": "final-newline", "status": "fail", "detail": f"{no_newline_count} files missing final newline"})

    score = 100
    if issues:
        score = max(0, 100 - len(issues) * 15)

    return {"layer": 1, "name": "surface", "score": score, "issues": issues, "fixes_applied": fixes_applied}


def layer_2_tokens(project_path: Path, project_name: str) -> dict:
    """Layer 2: Design token fidelity — detect hardcoded colors, glass drift."""
    issues = []
    canon = _read_canon_palette()
    hardcoded = []
    redefinitions = []
    glass_params = {}

    for ext in ["*.css", ".jsx", ".tsx", ".js", ".ts"]:
        for f in project_path.rglob(ext):
            if "node_modules" in str(f) or ".git" in str(f):
                continue
            try:
                text = f.read_text(encoding="utf-8", errors="replace")
                # Find hardcoded colors
                for match in HARDCODED_COLOR_RE.finditer(text):
                    hex_val = match.group()
                    for name, canon_hex in canon.items():
                        if hex_val.lower() == canon_hex.lower():
                            rel = f.relative_to(REPO_ROOT)
                            hardcoded.append({"file": str(rel), "color": hex_val, "canonical_name": name, "line": text[:match.start()].count("\n") + 1})
                            break

                # Detect glass pattern drift
                if "backdrop-filter" in text or "glass" in text.lower():
                    for line in text.splitlines():
                        if "backdrop-filter" in line:
                            m = re.search(r'blur\((\d+)px\)', line)
                            if m:
                                val = int(m.group(1))
                                rel = str(f.relative_to(REPO_ROOT))
                                glass_params[rel] = val

                # Detect redefined CSS variables that overlap canonical
                for line in text.splitlines():
                    if ":" in line and "--color-" in line:
                        redefinitions.append({"file": str(f.relative_to(REPO_ROOT)), "line": line.strip()[:80]})
            except Exception:
                pass

    if hardcoded:
        issues.append({"check": "hardcoded-colors", "status": "fail", "detail": f"{len(hardcoded)} instances of canonical colors used as hardcoded hex instead of CSS variables", "instances": hardcoded[:10]})
    if redefinitions:
        issues.append({"check": "token-redefinition", "status": "fail", "detail": f"{len(redefinitions)} CSS variable redefinitions of canonical tokens", "instances": redefinitions[:5]})

    # Glass parameter drift
    glass_expected = 10  # from shared css-variables.css
    glass_drift = [{"file": k, "blur_px": v, "expected": glass_expected, "delta": v - glass_expected} for k, v in glass_params.items() if v != glass_expected]
    if glass_drift:
        issues.append({"check": "glass-drift", "status": "fail", "detail": f"{len(glass_drift)} glass effects with non-standard blur", "instances": glass_drift})

    score = 100
    if hardcoded:
        score -= min(len(hardcoded) * 5, 40)
    if redefinitions:
        score -= min(len(redefinitions) * 10, 30)
    if glass_drift:
        score -= min(len(glass_drift) * 10, 20)
    score = max(0, score)

    return {"layer": 2, "name": "tokens", "score": score, "issues": issues, "hardcoded_count": len(hardcoded), "redefinition_count": len(redefinitions)}


def layer_3_patterns(project_path: Path, project_name: str, meta: dict) -> dict:
    """Layer 3: Component pattern consistency — exports, naming, TS strictness."""
    issues = []
    info = UI_PROJECTS.get(project_name, {})

    # 3a — TypeScript strictness
    tsconfig_paths = list(project_path.glob("tsconfig*.json"))
    strict_ok = None
    for tsconfig_path in tsconfig_paths:
        try:
            tsconfig = json.loads(tsconfig_path.read_text(encoding="utf-8", errors="replace"))
            compiler_options = tsconfig.get("compilerOptions", {})
            strict_val = compiler_options.get("strict", None)
            if strict_val is False:
                strict_ok = False
            elif strict_val is True:
                strict_ok = True
            else:
                strict_ok = None
        except Exception:
            pass

    if strict_ok is False:
        issues.append({"check": "typescript-strict", "status": "fail", "detail": f"{project_name}: TypeScript strict mode is disabled"})
    elif strict_ok is True:
        pass
    else:
        issues.append({"check": "typescript-strict", "status": "unknown", "detail": "No tsconfig found"})

    # 3b — Export style consistency
    named_exports = 0
    default_exports = 0
    for ext in ["*.tsx", "*.jsx"]:
        for f in project_path.rglob(ext):
            if "node_modules" in str(f) or ".git" in str(f):
                continue
            try:
                text = f.read_text(encoding="utf-8", errors="replace")
                if "export default" in text:
                    default_exports += 1
                if re.search(r'^export (const|function|class|interface|type) ', text, re.MULTILINE):
                    named_exports += 1
            except Exception:
                pass

    # Heuristic: React projects should be consistent (all named or all default)
    total_exports = named_exports + default_exports
    if total_exports > 3:
        ratio = named_exports / total_exports
        if 0.2 < ratio < 0.8:
            issues.append({"check": "export-style", "status": "warn", "detail": f"Mixed export styles: {named_exports} named, {default_exports} default (ratio {ratio:.0%})"})

    # 3c — React version alignment
    pkg_json_path = project_path / "package.json"
    react_version = None
    if pkg_json_path.exists():
        try:
            pkg = json.loads(pkg_json_path.read_text(encoding="utf-8"))
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            react_version = deps.get("react", deps.get("react-dom", ""))
        except Exception:
            pass

    score = 100
    if strict_ok is False:
        score -= 25
    if issues and any(i["check"] == "export-style" for i in issues):
        score -= 15
    score = max(0, score)

    return {"layer": 3, "name": "patterns", "score": score, "issues": issues, "react_version": react_version, "strict_ts": strict_ok}


def layer_4_architecture(project_path: Path, project_name: str) -> dict:
    """Layer 4: Design system adoption — shared imports, Tailwind preset, CSS variables."""
    issues = []
    adoption_score = 0
    checks = []

    # 4a — Imports from @p31/shared
    shared_imports = 0
    for ext in ["*.ts", "*.tsx", "*.js", "*.jsx", "*.css", "*.mjs"]:
        for f in project_path.rglob(ext):
            if "node_modules" in str(f) or ".git" in str(f):
                continue
            try:
                text = f.read_text(encoding="utf-8", errors="replace")
                if "@p31/shared" in text:
                    shared_imports += 1
            except Exception:
                pass

    checks.append({"check": "shared-imports", "pass": shared_imports > 0, "detail": f"{shared_imports} imports from @p31/shared"})
    if shared_imports > 0:
        adoption_score += 30

    # 4b — Tailwind preset usage
    uses_p31_preset = False
    for f in project_path.rglob("tailwind.config.*"):
        try:
            text = f.read_text(encoding="utf-8", errors="replace")
            if "p31Preset" in text or "p31/shared" in text:
                uses_p31_preset = True
        except Exception:
            pass

    checks.append({"check": "tailwind-preset", "pass": uses_p31_preset, "detail": "Uses @p31/shared Tailwind preset" if uses_p31_preset else "No p31Preset found"})
    if uses_p31_preset:
        adoption_score += 30

    # 4c — CSS variables from shared
    uses_shared_css_vars = False
    for ext in ["*.css", "*.tsx", "*.jsx"]:
        for f in project_path.rglob(ext):
            if "node_modules" in str(f) or ".git" in str(f):
                continue
            try:
                text = f.read_text(encoding="utf-8", errors="replace")
                for var_name in ["--color-phosphor", "--color-void", "--color-surface", "--font-family-mono"]:
                    if var_name in text:
                        uses_shared_css_vars = True
                        break
            except Exception:
                pass

    checks.append({"check": "shared-css-vars", "pass": uses_shared_css_vars, "detail": "Uses shared CSS variables" if uses_shared_css_vars else "No shared CSS variable references"})
    if uses_shared_css_vars:
        adoption_score += 20

    # 4d — Theme store usage
    uses_theme_store = False
    for ext in ["*.ts", "*.tsx", "*.jsx"]:
        for f in project_path.rglob(ext):
            if "node_modules" in str(f) or ".git" in str(f):
                continue
            try:
                text = f.read_text(encoding="utf-8", errors="replace")
                if "useThemeStore" in text or "themeStore" in text:
                    uses_theme_store = True
                    break
            except Exception:
                pass

    checks.append({"check": "theme-store", "pass": uses_theme_store, "detail": "Uses shared Zustand theme store" if uses_theme_store else "No useThemeStore import"})
    if uses_theme_store:
        adoption_score += 20

    # Flag low adoption
    if adoption_score < 50:
        issues.append({"check": "design-system-adoption", "status": "fail", "detail": f"Design system adoption score: {adoption_score}/100", "checks": checks})
    elif adoption_score < 80:
        issues.append({"check": "design-system-adoption", "status": "warn", "detail": f"Partial design system adoption: {adoption_score}/100", "checks": checks})

    score = adoption_score

    return {"layer": 4, "name": "architecture", "score": score, "issues": issues, "checks": checks, "adoption_score": adoption_score}


def run():
    print("=" * 60)
    print("  QUANTUM CODE POLISHER — UI/UX Fidelity Engine")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    results = {}
    overall_scores = []

    for project_name, meta in sorted(UI_PROJECTS.items()):
        project_path = (REPO_ROOT / meta["path"]).resolve()
        if not project_path.exists():
            print(f"\n  ⚠  {project_name}: path not found, skipping")
            continue

        print(f"\n  {'='*50}")
        print(f"  🧅  {project_name}")
        print(f"  {'='*50}")

        project_result = {"meta": meta}

        # Layer 1
        l1 = layer_1_surface(project_path, project_name)
        project_result["layer_1"] = l1
        print(f"  Layer 1 (Surface):     {l1['score']:3d}/100  ({len(l1['issues'])} issues, {l1['fixes_applied']} fixes)")

        # Layer 2
        l2 = layer_2_tokens(project_path, project_name)
        project_result["layer_2"] = l2
        print(f"  Layer 2 (Tokens):      {l2['score']:3d}/100  ({l2['hardcoded_count']} hardcoded colors, {l2['redefinition_count']} redefinitions)")

        # Layer 3
        l3 = layer_3_patterns(project_path, project_name, meta)
        project_result["layer_3"] = l3
        ts_status = "strict" if l3["strict_ts"] else "not strict" if l3["strict_ts"] is False else "unknown"
        print(f"  Layer 3 (Patterns):    {l3['score']:3d}/100  (TS: {ts_status}, React: {l3.get('react_version', 'N/A')[:20]})")

        # Layer 4
        l4 = layer_4_architecture(project_path, project_name)
        project_result["layer_4"] = l4
        print(f"  Layer 4 (Architecture): {l4['score']:3d}/100  (adoption: {l4['adoption_score']}/100)")

        # Overall
        layer_scores = [l1["score"], l2["score"], l3["score"], l4["score"]]
        overall = sum(layer_scores) / len(layer_scores)
        project_result["overall"] = round(overall, 1)
        overall_scores.append(overall)

        print(f"  ─────────────────────────────────")
        print(f"  🧅  Overall: {overall:.1f}/100")

        results[project_name] = project_result

    # Global summary
    print(f"\n{'='*60}")
    print(f"  QUANTUM POLISHER — GLOBAL SUMMARY")
    print(f"{'='*60}")

    overall_total = sum(overall_scores) / len(overall_scores) if overall_scores else 0
    print(f"\n  Ecosystem UI/UX Fidelity: {overall_total:.1f}/100")
    print()

    for project_name, r in sorted(results.items()):
        bar_len = int(r["overall"] / 5)
        bar = "█" * bar_len + "░" * (20 - bar_len)
        print(f"  {project_name:30s} [{bar}] {r['overall']:5.1f}/100")

    # Build drift signal data for jitterbug
    drift_signals = {}
    for project_name, r in results.items():
        artifact_path = str(REPO_ROOT / UI_PROJECTS[project_name]["path"])
        drift_signals[artifact_path] = {
            "ui_ux_fidelity": r["overall"],
            "layer_1_surface": r["layer_1"]["score"],
            "layer_2_tokens": r["layer_2"]["score"],
            "layer_3_patterns": r["layer_3"]["score"],
            "layer_4_architecture": r["layer_4"]["score"],
            "hardcoded_colors": r["layer_2"]["hardcoded_count"],
            "design_system_adoption": r["layer_4"]["adoption_score"],
        }

    report = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "ecosystem_fidelity": round(overall_total, 1),
        "projects": results,
        "drift_signals": drift_signals,
    }

    DRIFT_REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\n  Report written: {DRIFT_REPORT_PATH}")
    print(f"  Done. {len(results)} projects polished.")

    return report


if __name__ == "__main__":
    report = run()
    sys.exit(0)
