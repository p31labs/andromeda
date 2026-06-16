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
    if CANON_PATH.exists():
        text = CANON_PATH.read_text(encoding="utf-8", errors="replace")
        colors = {}
        for line in text.splitlines():
            m = re.match(r'\s+(\w+):\s*[\'"]#?([0-9a-fA-F]{6})[\',?]', line)
            if m:
                name, hex_val = m.group(1), '#' + m.group(2).lower()
                canon_key = hex_val.lower()
                if canon_key not in [v.lower() for v in colors.values()]:
                    colors[name] = hex_val
        if colors:
            return colors
    return CANON_COLORS


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
                fixed = [re.sub(r"[ 	]+$", "", line) for line in lines]
                new_text = "".join(fixed)
                if not new_text.endswith("\n"):
                    new_text += "\n"
                if new_text != text:
                    f.write_text(new_text, encoding="utf-8")
                    count += 1
            except Exception:
                pass
    return count


def _run_prettier(project_path: Path) -> int:
    """Run prettier --write and return number of files formatted."""
    try:
        rc, out, err = _run(["npx", "prettier", "--version"], project_path)
        if rc != 0:
            return 0
        rc, out, err = _run(["npx", "prettier", "--write", "."], project_path)
        return 1 if rc == 0 else 0
    except Exception:
        return 0


def _run_biome(project_path: Path) -> int:
    """Run biome check --apply and return number of files formatted."""
    try:
        rc, out, err = _run(["npx", "biome", "--version"], project_path)
        if rc != 0:
            return 0
        rc, out, err = _run(["npx", "biome", "check", "--apply", ".", "--unknown-as-warning"], project_path)
        return 1 if rc == 0 else 0
    except Exception:
        return 0
def layer_1_surface(project_path: Path, project_name: str, auto_fix: bool = True) -> dict:
    """Layer 1: Formatting, lint auto-fix, trailing whitespace, final newlines."""


    issues = []
    fixes_applied = 0

    eslint_configs = list(project_path.glob("eslint*")) + list(project_path.glob(".eslintrc*"))
    if eslint_configs:
        rc, out, err = _run(["npx", "eslint", "--fix", "--ext", ".js,.jsx,.ts,.tsx", "."], project_path)
        if rc == 0:
            fixes_applied += 1
        else:
            issues.append({"check": "eslint", "status": "warning", "detail": err.strip()[:200]})
    else:
        issues.append({"check": "eslint", "status": "missing", "detail": "No ESLint config found"})
    # 1b — Prettier/Biome auto-fix
    prettier_configs = list(project_path.glob(".prettierrc*")) + list(project_path.glob("prettier*"))
    biome_configs = list(project_path.glob("biome.json*"))
    formatter_fixed = 0
    if prettier_configs:
        fixed = _run_prettier(project_path)
        if fixed > 0:
            formatter_fixed += fixed
    if biome_configs:
        fixed = _run_biome(project_path)
        if fixed > 0:
            formatter_fixed += fixed
    if formatter_fixed > 0:
        fixes_applied += formatter_fixed
    elif not prettier_configs and not biome_configs:
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
                            line_start = text.rfind("\n", 0, match.start()) + 1
                            line_end = text.find("\n", match.end())
                            line = text[line_start:line_end if line_end > line_start else len(text)]
                            if "--color-" in line and ":" in line.split("#")[0]:
                                continue
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

                # Detect redefined CSS variables that differ from canonical
                in_canon_block = False
                for line in text.splitlines():
                    stripped = line.strip()
                    if stripped.startswith("/* P31 Canon — injected by Quantum Polisher */"):
                        in_canon_block = True
                        continue
                    if in_canon_block and stripped == "}":
                        in_canon_block = False
                        continue
                    if in_canon_block:
                        continue
                    if ":" in stripped and "--color-" in stripped and "#" in stripped:
                        m = re.search(r'--([\w-]+):\s*#([0-9a-fA-F]{6})', stripped)
                        if m:
                            var_name = m.group(1)
                            var_hex = '#' + m.group(2).lower()
                            canon_name = var_name.replace("color-", "")
                            for canon_key, canon_hex in canon.items():
                                if canon_key.lower() == canon_name.lower():
                                    if var_hex != canon_hex.lower():
                                        redefinitions.append({"file": str(f.relative_to(REPO_ROOT)), "line": stripped[:80], "canonical": canon_hex, "actual": var_hex})
                                    break
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


# ═══════════════════════════════════════════════════════════════
# REMEDIATION — Auto-heal layers (Sierpinski scaling)
# ═══════════════════════════════════════════════════════════════

def _ensure_css_var_file(project_path: Path) -> Path | None:
    """Find or create the main CSS file for CSS variable injection."""
    css_files = list(project_path.rglob("*.css"))
    # Prefer src/index.css, index.css, styles.css, App.css
    for preferred in ["src/index.css", "index.css", "src/styles.css", "styles.css", "src/App.css", "App.css"]:
        candidate = project_path / preferred
        if candidate.exists():
            return candidate
    # Fallback: first CSS file not in node_modules
    for f in css_files:
        if "node_modules" not in str(f):
            return f
    return None


def _inject_css_variables(project_path: Path, project_name: str) -> int:
    """Inject missing shared CSS variables into project's main CSS file.
    Returns number of variables injected."""
    main_css = _ensure_css_var_file(project_path)
    if not main_css:
        return 0

    try:
        text = main_css.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return 0

    canon_path = CANON_PATH
    if not canon_path.exists():
        return 0

    # Extract canonical CSS variable declarations from canon.ts
    try:
        canon_text = canon_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return 0

    # Parse color variables from canon.ts
    canon_vars = {}
    for line in canon_text.splitlines():
        # Match patterns like: phosphor: '#00FF88', or phosphor: "#00FF88"
        m = re.match(r'\s+(\w+):\s*[\'"]#?([0-9a-fA-F]{6})[\'],?', line)
        if m:
            name = m.group(1)
            hex_val = "#" + m.group(2).lower()
            canon_vars[f"--color-{name}"] = hex_val

    if not canon_vars:
        return 0

    # Check which vars are already defined in the project
    defined = set()
    for line in text.splitlines():
        for var_name in canon_vars:
            if var_name in line and ":" in line:
                defined.add(var_name)

    # Inject missing vars at the top of the CSS (after any @import or @charset)
    missing = [v for v in canon_vars if v not in defined]
    if not missing:
        return 0

    lines = text.splitlines(keepends=True)
    inject_point = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("@import") or stripped.startswith("@charset") or stripped.startswith("/*"):
            inject_point = i + 1
        else:
            break

    var_block = f"\n/* P31 Canon — injected by Quantum Polisher */\n:root {{\n"
    for var_name in sorted(missing):
        hex_val = canon_vars[var_name]
        var_block += f"  {var_name}: {hex_val};\n"
    var_block += "}\n"

    lines.insert(inject_point, var_block)
    new_text = "".join(lines)

    if new_text != text:
        main_css.write_text(new_text, encoding="utf-8")
        return len(missing)
    return 0


def _replace_hardcoded_canonical_colors(project_path: Path, canon: dict) -> int:
    """Replace known canonical hex values with CSS variable references in JSX/TSX/CSS.
    Returns number of replacements made."""
    canon_reverse = {v.lower(): k for k, v in canon.items()}
    if not canon_reverse:
        return 0

    replacements = 0
    for ext in ["*.tsx", "*.jsx", "*.js", "*.ts", "*.css"]:
        for f in project_path.rglob(ext):
            if "node_modules" in str(f) or ".git" in str(f):
                continue
            try:
                text = f.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue

            # Skip binary or huge files
            if len(text) > 500000:
                continue

            new_text = text
            # Find all hex colors in the file
            for match in HARDCODED_COLOR_RE.finditer(text):
                hex_val = match.group().lower()
                if hex_val in canon_reverse:
                    var_name = f"var(--color-{canon_reverse[hex_val]})"
                    # Only replace if not already a CSS variable or in a context where var() would break
                    # Skip if inside a CSS variable definition (already defining it)
                    line_start = text.rfind("\n", 0, match.start()) + 1
                    line_end = text.find("\n", match.end())
                    line = text[line_start:line_end] if line_end > line_start else text[line_start:]

                    # Skip if this is a CSS variable definition
                    if "--color-" in line and ":" in line.split("#")[0] if "#" in line else False:
                        continue

                    new_text = new_text.replace(match.group(), var_name, 1)
                    replacements += 1

            if new_text != text:
                f.write_text(new_text, encoding="utf-8")

    return replacements


def _normalize_glass_effects(project_path: Path) -> int:
    """Normalize glass-effect backdrop-filter blur to shared standard (10px).
    Returns number of corrections made."""
    corrections = 0
    expected_blur = 10
    for ext in ["*.css", "*.tsx", "*.jsx"]:
        for f in project_path.rglob(ext):
            if "node_modules" in str(f) or ".git" in str(f):
                continue
            try:
                text = f.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue

            new_text = text
            for m in re.finditer(r'backdrop-filter:\s*blur\((\d+)px\)', text, re.IGNORECASE):
                current = int(m.group(1))
                if current != expected_blur:
                    old = m.group(0)
                    new = f"backdrop-filter: blur({expected_blur}px)"
                    new_text = new_text.replace(old, new)
                    corrections += 1

            if new_text != text:
                f.write_text(new_text, encoding="utf-8")
    return corrections


def _enable_typescript_strict(project_path: Path) -> int:
    """Enable TypeScript strict mode in tsconfig.json files.
    Returns number of tsconfig files fixed."""
    fixes = 0
    for tsconfig_path in project_path.rglob("tsconfig*.json"):
        if "node_modules" in str(tsconfig_path) or ".git" in str(tsconfig_path):
            continue
        try:
            tsconfig = json.loads(tsconfig_path.read_text(encoding="utf-8", errors="replace"))
        except Exception:
            continue

        compiler_options = tsconfig.get("compilerOptions", {})
        if compiler_options.get("strict") is False:
            compiler_options["strict"] = True
            tsconfig["compilerOptions"] = compiler_options
            tsconfig_path.write_text(json.dumps(tsconfig, indent=2) + "\n", encoding="utf-8")
            fixes += 1
        elif "compilerOptions" not in tsconfig:
            tsconfig["compilerOptions"] = {"strict": True}
            tsconfig_path.write_text(json.dumps(tsconfig, indent=2) + "\n", encoding="utf-8")
            fixes += 1
        elif compiler_options.get("strict") is None:
            compiler_options["strict"] = True
            tsconfig["compilerOptions"] = compiler_options
            tsconfig_path.write_text(json.dumps(tsconfig, indent=2) + "\n", encoding="utf-8")
            fixes += 1

    return fixes


def _inject_shared_dependency(project_path: Path) -> bool:
    """Add @p31/shared to package.json dependencies if missing.
    Returns True if modified."""
    pkg_path = project_path / "package.json"
    if not pkg_path.exists():
        return False
    try:
        pkg = json.loads(pkg_path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return False

    deps = pkg.get("dependencies", {})
    if "@p31/shared" in deps:
        return False

    deps["@p31/shared"] = "workspace:*"
    pkg["dependencies"] = deps
    pkg_path.write_text(json.dumps(pkg, indent=2) + "\n", encoding="utf-8")
    return True


def _inject_css_variables_import(project_path: Path) -> int:
    """Add import of shared CSS variables to project's main CSS file.
    Returns 1 if modified, 0 otherwise."""
    main_css = _ensure_css_var_file(project_path)
    if not main_css:
        return 0
    try:
        text = main_css.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return 0

    import_stmt = "@import '@p31/shared/src/theme/css-variables.css';\n"
    if import_stmt in text:
        return 0

    lines = text.splitlines(keepends=True)
    inject_point = 0
    for i, line in enumerate(lines):
        if line.strip().startswith("@import") or line.strip().startswith("@charset") or line.strip().startswith("/*"):
            inject_point = i + 1
        else:
            break

    lines.insert(inject_point, import_stmt)
    new_text = "".join(lines)
    if new_text != text:
        main_css.write_text(new_text, encoding="utf-8")
        return 1
    return 0


def _inject_tailwind_preset(project_path: Path) -> int:
    """Add @p31/shared Tailwind preset to tailwind.config.* if missing.
    Returns 1 if modified, 0 otherwise."""
    for tw_config in project_path.rglob("tailwind.config.*"):
        if "node_modules" in str(tw_config):
            continue
        try:
            text = tw_config.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue

        if "p31Preset" in text or "p31/shared" in text:
            continue

        # Inject presets array
        if "presets:" not in text:
            new_text = text.replace(
                "theme: {",
                "presets: [require('@p31/shared/theme/tailwind-preset').p31Preset],\n  theme: {",
            )
            if new_text != text:
                # Also add require at top
                if "@p31/shared" not in new_text:
                    new_text = "const { p31Preset } = require('@p31/shared/theme/tailwind-preset');\n" + new_text
                tw_config.write_text(new_text, encoding="utf-8")
                return 1

    return 0


def remediate(project_path: Path, project_name: str, auto_fix_colors: bool = True) -> dict:
    """Run all remediation layers. Returns report of what was fixed."""
    canon = _read_canon_palette()
    results = {}

    # Layer 2R — CSS variable injection
    vars_injected = _inject_css_variables(project_path, project_name)
    results["css_vars_injected"] = vars_injected

    # Layer 2R — Hardcoded color replacement
    colors_replaced = 0
    if auto_fix_colors and canon:
        colors_replaced = _replace_hardcoded_canonical_colors(project_path, canon)
    results["colors_replaced"] = colors_replaced

    # Layer 2R — Glass effect normalization
    glass_fixed = _normalize_glass_effects(project_path)
    results["glass_normalized"] = glass_fixed

    # Layer 3R — TypeScript strict
    ts_fixed = _enable_typescript_strict(project_path)
    results["ts_strict_fixed"] = ts_fixed

    # Layer 4R — Design system injection
    dep_added = _inject_shared_dependency(project_path)
    results["shared_dep_added"] = dep_added

    css_import_added = _inject_css_variables_import(project_path)
    results["css_import_added"] = css_import_added

    tw_preset_added = _inject_tailwind_preset(project_path)
    results["tw_preset_added"] = tw_preset_added

    total = sum(results.values())
    results["total_fixes"] = total

    return results


def run(remediate_mode: bool = True, create_pr: bool = False):
    print("=" * 60)
    print("  QUANTUM CODE POLISHER — UI/UX Fidelity Engine")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    if remediate_mode:
        print("  Mode: AUTO-REMEDIATION 🌱")
    print("=" * 60)

    results = {}
    overall_scores = []
    global_remediation = {}

    for project_name, meta in sorted(UI_PROJECTS.items()):
        project_path = (REPO_ROOT / meta["path"]).resolve()
        if not project_path.exists():
            print(f"\n  ⚠  {project_name}: path not found, skipping")
            continue

        print(f"\n  {'='*50}")
        print(f"  🧅  {project_name}")
        print(f"  {'='*50}")

        project_result = {"meta": meta}

        # Get pre-remediation scores (for display)
        l1_pre = layer_1_surface(project_path, project_name)
        l2_pre = layer_2_tokens(project_path, project_name)
        l3_pre = layer_3_patterns(project_path, project_name, meta)
        l4_pre = layer_4_architecture(project_path, project_name)

        # Remediation
        rem = {}
        if remediate_mode:
            rem = remediate(project_path, project_name)
            project_result["remediation"] = rem
            global_remediation[project_name] = rem

        # Get post-remediation scores (for report)
        l1_post = layer_1_surface(project_path, project_name)
        l2_post = layer_2_tokens(project_path, project_name)
        l3_post = layer_3_patterns(project_path, project_name, meta)
        l4_post = layer_4_architecture(project_path, project_name)

        # Store both pre and post in project_result for potential use
        project_result["layer_1_pre"] = l1_pre
        project_result["layer_2_pre"] = l2_pre
        project_result["layer_3_pre"] = l3_pre
        project_result["layer_4_pre"] = l4_pre
        project_result["layer_1"] = l1_post
        project_result["layer_2"] = l2_post
        project_result["layer_3"] = l3_post
        project_result["layer_4"] = l4_post

        # Display pre/post scores
        ts_status_pre = "strict" if l3_pre["strict_ts"] else "not strict" if l3_pre["strict_ts"] is False else "unknown"
        ts_status_post = "strict" if l3_post["strict_ts"] else "not strict" if l3_post["strict_ts"] is False else "unknown"
        print(f"  Layer 1 (Surface):     {l1_pre['score']:3d}→{l1_post['score']:3d}/100  ({len(l1_pre['issues'])} issues)")
        print(f"  Layer 2 (Tokens):      {l2_pre['score']:3d}→{l2_post['score']:3d}/100  ({l2_pre['hardcoded_count']}→{l2_post['hardcoded_count']} hardcoded, {l2_pre['redefinition_count']}→{l2_post['redefinition_count']} redefinitions)")
        print(f"  Layer 3 (Patterns):    {l3_pre['score']:3d}→{l3_post['score']:3d}/100  (TS: {ts_status_pre}→{ts_status_post})")
        print(f"  Layer 4 (Architecture): {l4_pre['score']:3d}→{l4_post['score']:3d}/100  (adoption: {l4_pre['adoption_score']}→{l4_post['adoption_score']})")

        # Remediation details
        if remediate_mode and rem.get("total_fixes", 0) > 0:
            fixes_detail = []
            if rem["css_vars_injected"]: fixes_detail.append(f"{rem['css_vars_injected']} CSS vars")
            if rem["colors_replaced"]: fixes_detail.append(f"{rem['colors_replaced']} colors")
            if rem["glass_normalized"]: fixes_detail.append(f"{rem['glass_normalized']} glass")
            if rem["ts_strict_fixed"]: fixes_detail.append(f"{rem['ts_strict_fixed']} tsconfig")
            if rem["shared_dep_added"]: fixes_detail.append("shared dep")
            if rem["css_import_added"]: fixes_detail.append("css import")
            if rem["tw_preset_added"]: fixes_detail.append("tw preset")
            print(f"  🌱 Remediation:       {', '.join(fixes_detail)}")

        # Overall (use post-remediation scores)
        layer_scores = [l1_post["score"], l2_post["score"], l3_post["score"], l4_post["score"]]
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

    if global_remediation:
        total_global = sum(rem["total_fixes"] for rem in global_remediation.values())
        print(f"\n  🌱 Total remediation fixes: {total_global}")

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
    if create_pr and remediate_mode:
        total_global = sum(rem["total_fixes"] for rem in global_remediation.values())
        if total_global > 0:
            create_auto_pr(global_remediation, REPO_ROOT)

    return report


def create_auto_pr(global_remediation: dict, repo_root: Path) -> None:
    """Create a draft PR with the remediation fixes."""
    # Check if we are in a git repository
    rc, out, err = _run(["git", "rev-parse", "--is-inside-work-tree"], repo_root)
    if rc != 0 or out.strip() != "true":
        print("  ⚠  Not a git repository, skipping PR creation")
        return

    # Get the current branch (we are going to create a new branch from the current HEAD)
    rc, out, err = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"], repo_root)
    if rc != 0:
        print("  ⚠  Could not get current branch, skipping PR creation")
        return
    current_branch = out.strip()

    # Generate a branch name
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    branch_name = f"auto-heal/ui-ux-drift-{timestamp}"

    # Checkout the new branch
    rc, out, err = _run(["git", "checkout", "-b", branch_name], repo_root)
    if rc != 0:
        print(f"  ⚠  Failed to create branch {branch_name}: {err}")
        return

    # Stage all changes
    rc, out, err = _run(["git", "add", "-A"], repo_root)
    if rc != 0:
        print(f"  ⚠  Failed to stage changes: {err}")
        return

    # Check if there are any changes to commit
    rc, out, err = _run(["git", "diff", "--staged", "--quiet"], repo_root)
    if rc == 0:
        print("  ℹ  No changes to commit, skipping PR creation")
        # Checkout back to the original branch
        _run(["git", "checkout", current_branch], repo_root)
        return

    # Prepare the commit message
    total_fixes = sum(rem["total_fixes"] for rem in global_remediation.values())
    subject = f"chore: auto-heal UI/UX drift fixes ({total_fixes} fixes)"
    body_lines = [
        "This PR was automatically generated by the Quantum Code Polisher to fix UI/UX drift.",
        "",
        "Summary of fixes:"
    ]
    for project_name, rem in global_remediation.items():
        fixes = rem["total_fixes"]
        if fixes > 0:
            body_lines.append(f"  - {project_name}: {fixes} fixes")
            if rem["css_vars_injected"]:
                body_lines.append(f"      • {rem['css_vars_injected']} CSS variables injected")
            if rem["colors_replaced"]:
                body_lines.append(f"      • {rem['colors_replaced']} hardcoded colors replaced")
            if rem["glass_normalized"]:
                body_lines.append(f"      • {rem['glass_normalized']} glass effects normalized")
            if rem["ts_strict_fixed"]:
                body_lines.append(f"      • {rem['ts_strict_fixed']} tsconfig files made strict")
            if rem["shared_dep_added"]:
                body_lines.append(f"      • Added @p31/shared dependency")
            if rem["css_import_added"]:
                body_lines.append(f"      • Added CSS variables import")
            if rem["tw_preset_added"]:
                body_lines.append(f"      • Added Tailwind preset")
    body = "\n".join(body_lines)

    # Commit
    rc, out, err = _run(["git", "commit", "-m", subject, "-m", body], repo_root)
    if rc != 0:
        print(f"  ⚠  Failed to commit: {err}")
        # Checkout back to the original branch
        _run(["git", "checkout", current_branch], repo_root)
        return

    # Push
    rc, out, err = _run(["git", "push", "-u", "origin", branch_name], repo_root)
    if rc != 0:
        print(f"  ⚠  Failed to push branch {branch_name}: {err}")
        # Checkout back to the original branch
        _run(["git", "checkout", current_branch], repo_root)
        return

    # Create a draft PR
    rc, out, err = _run([
        "gh", "pr", "create",
        "--draft",
        "--title", subject,
        "--body", body,
        "--base", "main"
    ], repo_root)
    if rc != 0:
        print(f"  ⚠  Failed to create PR: {err}")
        # We still leave the branch and commit, but we can try to clean up?
        # For now, we just return and leave the branch pushed.
        return

    print(f"  🌱 Created draft PR: {out.strip()}")

    # Checkout back to the original branch
    _run(["git", "checkout", current_branch], repo_root)
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Quantum Code Polisher")
    parser.add_argument("--remediate", action="store_true", default=True,
                        help="Enable auto-remediation (default: True)")
    parser.add_argument("--create-pr", action="store_true", default=True,
                        help="Create PR after remediation (default: True)")
    parser.add_argument("--scan-only", action="store_true",
                        help="Scan only, no auto-remediation")
    args = parser.parse_args()
    report = run(remediate_mode=not args.scan_only, create_pr=args.create_pr)
    sys.exit(0)
