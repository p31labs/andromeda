#!/usr/bin/env python3
"""
Supplemental discovery: prepend exhibit cover pages (Johnson v. Johnson, 2025CV936).

**Package:** `p31-office discovery assemble` (see `packages/p31-office/README.md`).
**Shim:** `Discovery/assemble_supplemental_exhibits.py` imports this module.

Also writes one combined PDF (S00 + S01..S18) unless `--no-combined-volume`.
Caption block follows `IN THE SUPERIOR COURT OF CAMDEN COUNTY.docx`.

Raw inputs: NFCU `*_STMSSCM.pdf`, Cash App `monthly-statement*.pdf` in `--input-dir`.
Default: manifest filenames preferred. Image-only PDFs: `--strict-files`.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import tempfile
import time
from dataclasses import asdict, dataclass, field
from typing import Any, Callable, TextIO

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter

# Caption text/layout must stay aligned with: IN THE SUPERIOR COURT OF CAMDEN COUNTY.docx
DEFAULT_PRODUCTION_COVER = "Supplemental_Production_Cover_Sheet.pdf"
SCRIPT_VERSION = "2.0.0"

# Env var defaults (override with CLI)
ENV_INPUT = "DISCOVERY_INPUT_DIR"
ENV_OUTPUT = "DISCOVERY_OUTPUT_DIR"


class Term:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    RED = "\033[31m"
    CYAN = "\033[36m"


@dataclass
class RunLogger:
    """Terminal + optional file log; respects quiet / verbose / color / dry-run."""

    verbose: bool = False
    quiet: bool = False
    color: bool = True
    dry_run: bool = False
    log_file: TextIO | None = None

    def _paint(self, msg: str, kind: str) -> str:
        if not self.color or not sys.stderr.isatty():
            return msg
        p = {
            "ok": Term.GREEN + Term.BOLD,
            "warn": Term.YELLOW,
            "err": Term.RED + Term.BOLD,
            "note": Term.CYAN,
            "info": "",
            "debug": Term.DIM,
            "dry": Term.CYAN + Term.BOLD,
        }.get(kind, "")
        return f"{p}{msg}{Term.RESET}" if p else msg

    def _write_file(self, msg: str) -> None:
        if self.log_file:
            self.log_file.write(msg + "\n")
            self.log_file.flush()

    def _emit(self, msg: str, kind: str, *, file: TextIO = sys.stderr) -> None:
        if self.quiet and kind in ("info", "note", "debug"):
            return
        if kind == "debug" and not self.verbose:
            return
        line = self._paint(msg, kind) if file is sys.stderr else msg
        print(line, file=file)
        plain = msg
        if self.log_file:
            self.log_file.write(plain + "\n")
            self.log_file.flush()

    def info(self, msg: str) -> None:
        self._emit(msg, "info")

    def note(self, msg: str) -> None:
        self._emit(msg, "note")

    def warn(self, msg: str) -> None:
        self._emit(msg, "warn")

    def error(self, msg: str) -> None:
        self._emit(msg, "err")

    def debug(self, msg: str) -> None:
        self._emit(msg, "debug")

    def ok(self, msg: str) -> None:
        self._emit(msg, "ok")

    def dry(self, msg: str) -> None:
        self._emit(msg, "dry")


@dataclass
class RunSummary:
    started_epoch: float = field(default_factory=time.time)
    dry_run: bool = False
    exhibits_built: int = 0
    exhibits_skipped_existing: int = 0
    exhibits_failed: int = 0
    combined_written: bool = False
    combined_path: str | None = None
    validation_errors: list[str] = field(default_factory=list)
    manifest_rows: list[dict[str, Any]] = field(default_factory=list)

    def elapsed_s(self) -> float:
        return round(time.time() - self.started_epoch, 2)


@dataclass(frozen=True)
class ExhibitSpec:
    exhibit_id: str
    output_basename: str
    description: str
    period_display: str
    matcher: Callable[[str], bool]


def _nfcu_token(end_dates: tuple[str, ...]) -> Callable[[str], bool]:
    def _m(text: str) -> bool:
        t = text.replace("\n", " ")
        return any(d in t for d in end_dates)

    return _m


def _cash_month(label: str) -> Callable[[str], bool]:
    """Match 'August 2025' etc.; tolerate minor OCR quirks."""

    def _m(text: str) -> bool:
        head = (text or "")[:4000]
        # Normalize whitespace
        norm = re.sub(r"\s+", " ", head)
        return re.search(re.escape(label), norm, re.IGNORECASE) is not None

    return _m


def build_specs(production_date: str) -> list[ExhibitSpec]:
    # NFCU: match typical statement-period closing date (institution formats vary).
    nfcu: list[ExhibitSpec] = [
        ExhibitSpec(
            "WRJ-S01",
            "WRJ-S01_NFCU_Jun2025.pdf",
            "Navy Federal Credit Union Statement of Account",
            "05/17/25 - 06/16/25",
            _nfcu_token(("06/16/25", "06/16/2025", "6/16/25", "6/16/2025")),
        ),
        ExhibitSpec(
            "WRJ-S02",
            "WRJ-S02_NFCU_Jul2025.pdf",
            "Navy Federal Credit Union Statement of Account",
            "06/17/25 - 07/16/25",
            _nfcu_token(("07/16/25", "07/16/2025", "7/16/25", "7/16/2025")),
        ),
        ExhibitSpec(
            "WRJ-S03",
            "WRJ-S03_NFCU_Aug2025.pdf",
            "Navy Federal Credit Union Statement of Account",
            "07/17/25 - 08/16/25",
            _nfcu_token(("08/16/25", "08/16/2025", "8/16/25", "8/16/2025")),
        ),
        ExhibitSpec(
            "WRJ-S04",
            "WRJ-S04_NFCU_Sep2025.pdf",
            "Navy Federal Credit Union Statement of Account",
            "08/17/25 - 09/16/25",
            _nfcu_token(("09/16/25", "09/16/2025", "9/16/25", "9/16/2025")),
        ),
        ExhibitSpec(
            "WRJ-S05",
            "WRJ-S05_NFCU_Oct2025.pdf",
            "Navy Federal Credit Union Statement of Account",
            "09/17/25 - 10/16/25",
            _nfcu_token(("10/16/25", "10/16/2025")),
        ),
        ExhibitSpec(
            "WRJ-S06",
            "WRJ-S06_NFCU_Nov2025.pdf",
            "Navy Federal Credit Union Statement of Account",
            "10/17/25 - 11/16/25",
            _nfcu_token(("11/16/25", "11/16/2025")),
        ),
        ExhibitSpec(
            "WRJ-S07",
            "WRJ-S07_NFCU_Dec2025.pdf",
            "Navy Federal Credit Union Statement of Account",
            "11/17/25 - 12/16/25",
            _nfcu_token(("12/16/25", "12/16/2025")),
        ),
        ExhibitSpec(
            "WRJ-S08",
            "WRJ-S08_NFCU_Jan2026.pdf",
            "Navy Federal Credit Union Statement of Account",
            "12/17/25 - 01/16/26",
            _nfcu_token(("01/16/26", "1/16/26", "01/16/2026", "1/16/2026")),
        ),
        ExhibitSpec(
            "WRJ-S09",
            "WRJ-S09_NFCU_Feb2026.pdf",
            "Navy Federal Credit Union Statement of Account",
            "01/17/26 - 02/16/26",
            _nfcu_token(("02/16/26", "2/16/26", "02/16/2026", "2/16/2026")),
        ),
        ExhibitSpec(
            "WRJ-S10",
            "WRJ-S10_NFCU_Mar2026.pdf",
            "Navy Federal Credit Union Statement of Account",
            "02/17/26 - 03/16/26",
            _nfcu_token(("03/16/26", "3/16/26", "03/16/2026", "3/16/2026")),
        ),
    ]
    cash: list[ExhibitSpec] = [
        ExhibitSpec(
            "WRJ-S11",
            "WRJ-S11_CashApp_Aug2025.pdf",
            "Cash App Monthly Account Statement",
            "August 2025",
            _cash_month("August 2025"),
        ),
        ExhibitSpec(
            "WRJ-S12",
            "WRJ-S12_CashApp_Sep2025.pdf",
            "Cash App Monthly Account Statement",
            "September 2025",
            _cash_month("September 2025"),
        ),
        ExhibitSpec(
            "WRJ-S13",
            "WRJ-S13_CashApp_Oct2025.pdf",
            "Cash App Monthly Account Statement",
            "October 2025",
            _cash_month("October 2025"),
        ),
        ExhibitSpec(
            "WRJ-S14",
            "WRJ-S14_CashApp_Nov2025.pdf",
            "Cash App Monthly Account Statement",
            "November 2025",
            _cash_month("November 2025"),
        ),
        ExhibitSpec(
            "WRJ-S15",
            "WRJ-S15_CashApp_Dec2025.pdf",
            "Cash App Monthly Account Statement",
            "December 2025",
            _cash_month("December 2025"),
        ),
        ExhibitSpec(
            "WRJ-S16",
            "WRJ-S16_CashApp_Jan2026.pdf",
            "Cash App Monthly Account Statement",
            "January 2026",
            _cash_month("January 2026"),
        ),
        ExhibitSpec(
            "WRJ-S17",
            "WRJ-S17_CashApp_Feb2026.pdf",
            "Cash App Monthly Account Statement",
            "February 2026",
            _cash_month("February 2026"),
        ),
        ExhibitSpec(
            "WRJ-S18",
            "WRJ-S18_CashApp_Mar2026.pdf",
            "Cash App Monthly Account Statement",
            "March 2026",
            _cash_month("March 2026"),
        ),
    ]
    _ = production_date  # reserved if caption block needs dynamic copy later
    return nfcu + cash


STRICT_CASHAPP_SOURCES: dict[str, str] = {
    # From content/size analysis in SUPPLEMENTAL_DISCOVERY_ASSEMBLY_PROMPT.md
    "WRJ-S11": "monthly-statement (5).pdf",
    "WRJ-S12": "monthly-statement (6).pdf",
    "WRJ-S13": "monthly-statement (7).pdf",
    "WRJ-S14": "monthly-statement.pdf",
    "WRJ-S15": "monthly-statement (1).pdf",
    "WRJ-S16": "monthly-statement (2).pdf",
    "WRJ-S17": "monthly-statement (3).pdf",
    "WRJ-S18": "monthly-statement (4).pdf",
}

# NFCU exports named by statement closing date (YYYY-MM-DD_STMSSCM.pdf)
STRICT_NFCU_SOURCES: dict[str, str] = {
    "WRJ-S01": "2025-06-16_STMSSCM.pdf",
    "WRJ-S02": "2025-07-16_STMSSCM.pdf",
    "WRJ-S03": "2025-08-16_STMSSCM.pdf",
    "WRJ-S04": "2025-09-16_STMSSCM.pdf",
    "WRJ-S05": "2025-10-16_STMSSCM.pdf",
    "WRJ-S06": "2025-11-16_STMSSCM.pdf",
    "WRJ-S07": "2025-12-16_STMSSCM.pdf",
    "WRJ-S08": "2026-01-16_STMSSCM.pdf",
    "WRJ-S09": "2026-02-16_STMSSCM.pdf",
    "WRJ-S10": "2026-03-16_STMSSCM.pdf",
}


def parse_exhibit_filter(
    only: str | None, exhibit_from: int | None, exhibit_to: int | None
) -> set[str] | None:
    """Return set of WRJ-S## to include, or None = all."""
    ids: set[str] = set()
    if only:
        for part in re.split(r"[\s,]+", only.strip()):
            if not part:
                continue
            m = re.fullmatch(r"(?i)WRJ-S(\d{2})", part)
            if not m:
                raise ValueError(f"Invalid exhibit id (use WRJ-S01 format): {part!r}")
            ids.add(f"WRJ-S{int(m.group(1)):02d}")
    if exhibit_from is not None or exhibit_to is not None:
        lo = exhibit_from if exhibit_from is not None else 1
        hi = exhibit_to if exhibit_to is not None else 18
        for n in range(lo, hi + 1):
            if 1 <= n <= 18:
                ids.add(f"WRJ-S{n:02d}")
    return ids if ids else None


def filter_specs(specs: list[ExhibitSpec], wanted: set[str] | None) -> list[ExhibitSpec]:
    if not wanted:
        return specs
    return [s for s in specs if s.exhibit_id in wanted]


def load_json_config(path: str) -> dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("Config must be a JSON object")
    return data


def apply_config_to_args(args: argparse.Namespace, cfg: dict[str, Any]) -> None:
    """Apply config keys to argparse namespace (CLI already parsed wins — call before parse_args via defaults, or merge)."""
    keymap = {
        "input_dir": "input_dir",
        "output_dir": "output_dir",
        "production_date": "production_date",
        "production_cover": "production_cover",
        "combined_output": "combined_output",
        "strict_files": "strict_files",
        "no_prefer_manifest": "no_prefer_manifest",
        "no_combined_volume": "no_combined_volume",
        "dry_run": "dry_run",
        "verbose": "verbose",
        "quiet": "quiet",
        "no_color": "no_color",
        "force": "force",
        "skip_existing": "skip_existing",
        "only_exhibits": "only_exhibits",
        "exhibit_from": "exhibit_from",
        "exhibit_to": "exhibit_to",
        "manifest_json": "manifest_json",
        "manifest_csv": "manifest_csv",
        "summary_json": "summary_json",
        "checksum_manifest": "checksum_manifest",
        "no_validate": "no_validate",
        "strict_validate": "strict_validate",
        "list_unmatched": "list_unmatched",
        "print_page_counts": "print_page_counts",
        "keep_temp_covers": "keep_temp_covers",
        "timestamp_output_dir": "timestamp_output_dir",
        "symlink_latest": "symlink_latest",
        "log_file": "log_file",
    }
    for cfg_key, dest in keymap.items():
        if cfg_key in cfg and cfg[cfg_key] is not None:
            setattr(args, dest, cfg[cfg_key])


def pdf_page_count(path: str) -> int:
    return len(PdfReader(path).pages)


def first_page_text(path: str) -> str:
    reader = PdfReader(path)
    if not reader.pages:
        return ""
    return reader.pages[0].extract_text() or ""


def draw_caption_block(c: canvas.Canvas, w: float, h: float) -> float:
    """Court caption matching IN THE SUPERIOR COURT OF CAMDEN COUNTY.docx (Georgia style).
    Margins: 1\" left/right, 0.75\" top. Returns baseline y below caption enclosure for exhibit block."""

    ml = 1.0 * inch
    mr = w - 1.0 * inch
    y = h - 0.75 * inch

    c.setFont("Times-Bold", 12)
    c.drawCentredString(w / 2, y, "IN THE SUPERIOR COURT OF CAMDEN COUNTY")
    y -= 16
    c.drawCentredString(w / 2, y, "STATE OF GEORGIA")
    y -= 20

    c.setFont("Times-Roman", 11)
    c.setLineWidth(0.5)
    c.line(ml, y, mr, y)
    y -= 18

    c.drawString(ml, y, "CHRISTYN JOHNSON,")
    c.drawRightString(mr, y, ")")
    y -= 15
    c.drawString(ml + 0.25 * inch, y, "Plaintiff,")
    c.drawRightString(mr, y, ")")
    y -= 15
    c.drawRightString(mr, y, ")")
    y -= 15

    c.drawString(ml + 0.35 * inch, y, "-vs-")
    c.drawString(5.05 * inch, y, ")")
    c.drawString(5.22 * inch, y, "Civil Action No. 2025CV936")
    y -= 18

    c.drawString(ml, y, "WILLIAM JOHNSON,")
    c.drawRightString(mr, y, ")")
    y -= 15
    c.drawString(ml + 0.25 * inch, y, "Defendant.")
    c.drawRightString(mr, y, ")")
    y -= 16

    c.setFont("Times-Roman", 9)
    bottom = "____________________________________)_________________________________________"
    sw = c.stringWidth(bottom, "Times-Roman", 9)
    c.drawString((w - sw) / 2, y, bottom)
    y -= 22

    c.setLineWidth(0.5)
    c.line(ml, y, mr, y)
    y -= 20
    return y


def _draw_wrapped_centred(
    c: canvas.Canvas, w: float, y: float, text: str, font: str, size: int, leading: int, max_width: float
) -> float:
    """Draw centred lines; returns y after last line."""
    c.setFont(font, size)
    words = text.split()
    if not words:
        return y
    lines: list[str] = []
    cur: list[str] = []
    for word in words:
        trial = " ".join(cur + [word]) if cur else word
        if c.stringWidth(trial, font, size) <= max_width:
            cur.append(word)
        else:
            if cur:
                lines.append(" ".join(cur))
            if c.stringWidth(word, font, size) > max_width:
                lines.append(word)
                cur = []
            else:
                cur = [word]
    if cur:
        lines.append(" ".join(cur))
    for ln in lines:
        c.drawCentredString(w / 2, y, ln)
        y -= leading
    return y


def create_exhibit_cover(
    output_path: str,
    exhibit_number: str,
    description: str,
    period: str,
    production_date: str,
) -> None:
    c = canvas.Canvas(output_path, pagesize=letter)
    w, h = letter

    y = draw_caption_block(c, w, h)

    max_w = w - 2.2 * inch
    c.setFont("Times-Bold", 14)
    c.drawCentredString(w / 2, y, f"EXHIBIT {exhibit_number}")
    y -= 22

    y = _draw_wrapped_centred(c, w, y, description, "Times-Roman", 12, 16, max_w)
    y -= 6

    c.setFont("Times-Roman", 11)
    c.drawCentredString(w / 2, y, f"Statement Period: {period}")
    y -= 26

    c.setFont("Times-Italic", 10)
    c.drawCentredString(
        w / 2,
        y,
        "Produced in connection with Defendant's Supplemental Document Production",
    )
    y -= 14
    c.drawCentredString(w / 2, y, "Johnson v. Johnson, Civil Action No. 2025CV936")
    y -= 14
    c.drawCentredString(w / 2, y, production_date)

    c.setFont("Times-Roman", 9)
    c.drawCentredString(w / 2, 0.65 * inch, "CONFIDENTIAL — PRODUCED PURSUANT TO O.C.G.A. § 9-11-34")

    c.save()


def merge_cover_and_document(cover_path: str, document_path: str, output_path: str) -> None:
    writer = PdfWriter()
    cover_reader = PdfReader(cover_path)
    writer.add_page(cover_reader.pages[0])
    doc_reader = PdfReader(document_path)
    for page in doc_reader.pages:
        writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)


def append_pdf_pages(writer: PdfWriter, pdf_path: str) -> None:
    reader = PdfReader(pdf_path)
    for page in reader.pages:
        writer.add_page(page)


def write_combined_volume(production_cover_path: str, exhibit_pdf_paths: list[str], output_path: str) -> None:
    """Single PDF: WRJ-S00 (full production cover) + WRJ-S01..S18 (each cover + statement), in order."""
    writer = PdfWriter()
    append_pdf_pages(writer, production_cover_path)
    for path in exhibit_pdf_paths:
        append_pdf_pages(writer, path)
    with open(output_path, "wb") as f:
        writer.write(f)


def _is_statement_pdf(filename: str) -> bool:
    """Exclude cover sheet, correspondence, and other non-statement PDFs in the same folder."""
    n = filename.lower()
    if n.startswith("."):
        return False
    if "supplemental_production_cover" in n or n.startswith("wrj-s00"):
        return False
    if "gmail" in n or "notice of production" in n:
        return False
    # NFCU consolidated exports; Cash App monthly downloads
    if "_stmsscm" in n or n.startswith("monthly-statement"):
        return True
    return False


def all_statement_pdfs(input_dir: str) -> list[str]:
    return [
        os.path.join(input_dir, f)
        for f in sorted(os.listdir(input_dir))
        if f.lower().endswith(".pdf") and _is_statement_pdf(f)
    ]


def assign_sources(
    input_dir: str,
    specs: list[ExhibitSpec],
    strict_files: bool,
    prefer_manifest: bool,
    log: RunLogger,
) -> tuple[dict[str, str], set[str]]:
    pdfs = all_statement_pdfs(input_dir)
    if strict_files:
        out: dict[str, str] = {}
        for spec in specs:
            if spec.exhibit_id in STRICT_CASHAPP_SOURCES:
                name = STRICT_CASHAPP_SOURCES[spec.exhibit_id]
                path = os.path.join(input_dir, name)
                if os.path.isfile(path):
                    out[spec.exhibit_id] = path
                else:
                    log.warn(f"MISSING (strict): {name} for {spec.exhibit_id}")
            elif spec.exhibit_id in STRICT_NFCU_SOURCES:
                name = STRICT_NFCU_SOURCES[spec.exhibit_id]
                path = os.path.join(input_dir, name)
                if os.path.isfile(path):
                    out[spec.exhibit_id] = path
                else:
                    log.warn(f"MISSING (strict): {name} for {spec.exhibit_id}")
            else:
                cand = os.path.join(input_dir, spec.output_basename)
                if os.path.isfile(cand):
                    out[spec.exhibit_id] = cand
                else:
                    log.warn(f"MISSING (strict): place raw PDF as {spec.output_basename} for {spec.exhibit_id}")
        return out, set(out.values())

    assigned: dict[str, str] = {}
    used: set[str] = set()

    if prefer_manifest:
        for spec in specs:
            name: str | None = None
            if spec.exhibit_id in STRICT_CASHAPP_SOURCES:
                name = STRICT_CASHAPP_SOURCES[spec.exhibit_id]
            elif spec.exhibit_id in STRICT_NFCU_SOURCES:
                name = STRICT_NFCU_SOURCES[spec.exhibit_id]
            if name:
                path = os.path.join(input_dir, name)
                if os.path.isfile(path):
                    assigned[spec.exhibit_id] = path
                    used.add(path)
                    log.note(f"NOTE: {spec.exhibit_id} bound to manifest filename {name}.")

    texts = {p: first_page_text(p) for p in pdfs}
    empty = [p for p, t in texts.items() if not t.strip()]
    if empty:
        log.warn(
            "WARNING: no extractable text on page 1 for:\n  "
            + "\n  ".join(os.path.basename(p) for p in empty)
            + "\nIf these are scans, use --strict-files and name files per the prompt."
        )

    for spec in specs:
        if spec.exhibit_id in assigned:
            continue
        matches = [p for p in pdfs if p not in used and spec.matcher(texts[p])]
        if len(matches) == 1:
            assigned[spec.exhibit_id] = matches[0]
            used.add(matches[0])
            continue
        if len(matches) > 1:
            chosen: str | None = None
            if spec.exhibit_id in STRICT_CASHAPP_SOURCES:
                fb = os.path.join(input_dir, STRICT_CASHAPP_SOURCES[spec.exhibit_id])
                if fb in matches:
                    chosen = fb
            if spec.exhibit_id in STRICT_NFCU_SOURCES:
                nb = os.path.join(input_dir, STRICT_NFCU_SOURCES[spec.exhibit_id])
                if nb in matches:
                    chosen = nb
            if chosen:
                assigned[spec.exhibit_id] = chosen
                used.add(chosen)
                log.note(f"NOTE: {spec.exhibit_id} disambiguated to {os.path.basename(chosen)}.")
                continue
            log.warn(
                f"AMBIGUOUS: {spec.exhibit_id} — {len(matches)} PDFs matched. "
                f"Candidates: {[os.path.basename(m) for m in matches]}"
            )
            continue
        if spec.exhibit_id in STRICT_CASHAPP_SOURCES:
            fb = os.path.join(input_dir, STRICT_CASHAPP_SOURCES[spec.exhibit_id])
            if os.path.isfile(fb) and fb not in used:
                assigned[spec.exhibit_id] = fb
                used.add(fb)
                log.note(
                    f"NOTE: {spec.exhibit_id} used Cash App filename fallback "
                    f"({STRICT_CASHAPP_SOURCES[spec.exhibit_id]})."
                )
                continue
        if spec.exhibit_id in STRICT_NFCU_SOURCES:
            nb = os.path.join(input_dir, STRICT_NFCU_SOURCES[spec.exhibit_id])
            if os.path.isfile(nb) and nb not in used:
                assigned[spec.exhibit_id] = nb
                used.add(nb)
                log.note(f"NOTE: {spec.exhibit_id} used NFCU filename fallback ({STRICT_NFCU_SOURCES[spec.exhibit_id]}).")
                continue
        log.warn(f"MISSING: {spec.exhibit_id} — no PDF matched page-1 text and no fallback file.")

    return assigned, set(assigned.values())


ALLOWED_CONFIG_KEYS = frozenset(
    {
        "input_dir",
        "output_dir",
        "production_date",
        "production_cover",
        "combined_output",
        "strict_files",
        "no_prefer_manifest",
        "no_combined_volume",
        "dry_run",
        "verbose",
        "quiet",
        "no_color",
        "force",
        "skip_existing",
        "only_exhibits",
        "exhibit_from",
        "exhibit_to",
        "manifest_json",
        "manifest_csv",
        "summary_json",
        "checksum_manifest",
        "no_validate",
        "strict_validate",
        "list_unmatched",
        "print_page_counts",
        "keep_temp_covers",
        "timestamp_output_dir",
        "symlink_latest",
        "log_file",
    }
)


def merge_env_and_config_argv(argv: list[str]) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    if os.environ.get(ENV_INPUT):
        merged["input_dir"] = os.environ[ENV_INPUT]
    if os.environ.get(ENV_OUTPUT):
        merged["output_dir"] = os.environ[ENV_OUTPUT]
    cp = peek_config_path(argv)
    if cp and os.path.isfile(cp):
        cfg = load_json_config(cp)
        for k, v in cfg.items():
            if k in ALLOWED_CONFIG_KEYS:
                merged[k] = v
    return merged


def peek_config_path(argv: list[str]) -> str | None:
    for i, a in enumerate(argv):
        if a == "--config" and i + 1 < len(argv):
            return argv[i + 1]
        if a.startswith("--config="):
            return a.split("=", 1)[1].strip() or None
    return None


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def validate_exhibit_pdf(out_path: str, exhibit_id: str, src_path: str, log: RunLogger) -> list[str]:
    errs: list[str] = []
    try:
        n_out = pdf_page_count(out_path)
        n_src = pdf_page_count(src_path)
        if n_out < 2:
            errs.append(f"{exhibit_id}: output has {n_out} page(s) (need cover + ≥1 body page)")
        if n_out != n_src + 1:
            errs.append(f"{exhibit_id}: expected {n_src + 1} pages (source {n_src} + 1 cover), got {n_out}")
        t = (first_page_text(out_path) or "").replace("\n", " ")
        if exhibit_id not in t:
            errs.append(f"{exhibit_id}: exhibit id not found on first page text extract (check cover)")
        if "EXHIBIT" not in t.upper():
            errs.append(f"{exhibit_id}: word EXHIBIT not found on first page")
    except Exception as e:
        errs.append(f"{exhibit_id}: {e}")
    for e in errs:
        log.warn(f"VALIDATION: {e}")
    return errs


def validate_combined_volume(path: str, min_pages: int, log: RunLogger) -> list[str]:
    errs: list[str] = []
    try:
        n = pdf_page_count(path)
        if n < min_pages:
            errs.append(f"Combined volume has {n} pages; expected at least {min_pages}")
    except Exception as e:
        errs.append(str(e))
    for e in errs:
        log.warn(f"VALIDATION (combined): {e}")
    return errs


def write_manifest_json(path: str, rows: list[dict[str, Any]], log: RunLogger) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2)
    log.info(f"Wrote manifest JSON → {path}")


def write_manifest_csv(path: str, rows: list[dict[str, Any]], log: RunLogger) -> None:
    if not rows:
        return
    keys = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    log.info(f"Wrote manifest CSV → {path}")


def write_checksum_manifest(path: str, file_paths: list[str], log: RunLogger) -> None:
    lines: list[str] = []
    for p in file_paths:
        if os.path.isfile(p):
            lines.append(f"{sha256_file(p)}  {os.path.basename(p)}")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + ("\n" if lines else ""))
    log.info(f"Wrote checksum manifest → {path}")


def symlink_latest_run(parent_dir: str, run_name: str, log: RunLogger) -> None:
    link = os.path.join(parent_dir, "latest")
    if os.path.lexists(link) or os.path.exists(link):
        try:
            os.unlink(link)
        except OSError as e:
            log.warn(f"Could not remove old symlink {link}: {e}")
            return
    try:
        os.symlink(run_name, link)
        log.ok(f"Symlink {link} → {run_name}")
    except OSError as e:
        log.warn(f"Symlink skipped: {e}")


def print_plan_table(specs: list[ExhibitSpec], sources: dict[str, str]) -> None:
    print("exhibit_id\tsource_pdf\toutput_pdf", file=sys.stdout)
    for spec in specs:
        src = sources.get(spec.exhibit_id, "")
        print(
            f"{spec.exhibit_id}\t{os.path.basename(src) if src else '(missing)'}\t{spec.output_basename}",
            file=sys.stdout,
        )


def build_arg_parser(defaults: dict[str, Any]) -> argparse.ArgumentParser:
    epilog = f"""
Examples:
  # One-shot (env + config friendly)
  export {ENV_INPUT}=/path/to/Discovery
  export {ENV_OUTPUT}=/path/to/out
  %(prog)s --config discovery_assembly.json

  # Preview mapping only (no writes)
  %(prog)s --plan --input-dir ./Discovery

  # Full run with manifests + validation + checksums
  %(prog)s -v --input-dir ./Discovery --output-dir ./out \\
      --manifest-json ./out/manifest.json --checksum-manifest ./out/SHA256SUMS \\
      --summary-json ./out/summary.json

  # Rebuild only some exhibits; skip unchanged outputs
  %(prog)s --only-exhibits WRJ-S14,WRJ-S15 --skip-existing --force

  # Timestamped subfolder + symlink parent/latest → that run
  %(prog)s --input-dir ./Discovery --output-dir ./runs --timestamp-output-dir --symlink-latest

Environment:
  {ENV_INPUT}   default --input-dir
  {ENV_OUTPUT}  default --output-dir

Version: {SCRIPT_VERSION}
"""
    p = argparse.ArgumentParser(
        description="Assemble WRJ-S01..S18 supplemental discovery exhibit PDFs + optional combined volume.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=epilog,
    )
    p.set_defaults(**defaults)
    p.add_argument("--version", action="version", version=f"%(prog)s {SCRIPT_VERSION}")

    p.add_argument("--input-dir", help=f"Raw PDF folder (or set {ENV_INPUT})")
    p.add_argument(
        "--output-dir",
        help=f"Output folder for merged exhibits (or set {ENV_OUTPUT}; omit with --plan)",
    )
    p.add_argument("--production-date", default="April 29, 2026", help="Date line on exhibit cover pages")
    p.add_argument(
        "--production-cover",
        default="",
        help=f"WRJ-S00 PDF path (default: <input-dir>/{DEFAULT_PRODUCTION_COVER})",
    )
    p.add_argument(
        "--combined-output",
        default="WRJ_Supplemental_Production_S00_through_S18.pdf",
        help="Combined volume filename under output-dir",
    )
    p.add_argument(
        "--strict-files",
        action="store_true",
        help="Use STRICT_* manifest filenames only (no page-1 text matching).",
    )
    p.add_argument(
        "--no-prefer-manifest",
        action="store_true",
        help="Do not prefer known NFCU/Cash App filenames (duplicate months may collide).",
    )
    p.add_argument("--no-combined-volume", action="store_true", help="Skip single combined PDF (S00+S01..S18).")

    qol = p.add_argument_group("Quality-of-life / friction reducers")
    qol.add_argument(
        "--config",
        metavar="FILE.json",
        help="JSON config (merged before CLI; same keys as long options, snake_case). "
        "Also auto-loaded if passed as first --config in argv before other flags.",
    )
    qol.add_argument("--dry-run", action="store_true", help="Log actions but do not write PDFs or manifests.")
    qol.add_argument(
        "--plan",
        action="store_true",
        help="Print exhibit→source→output mapping (TSV on stdout) and exit; implies --dry-run.",
    )
    qol.add_argument("-v", "--verbose", action="store_true", help="Extra diagnostics (page counts, timings).")
    qol.add_argument("-q", "--quiet", action="store_true", help="Fewer messages (errors/warnings + stdout summary).")
    qol.add_argument("--no-color", action="store_true", help="Disable ANSI colors on stderr.")
    qol.add_argument("--force", action="store_true", help="Overwrite existing outputs instead of failing/skipping.")
    qol.add_argument(
        "--skip-existing",
        action="store_true",
        help="If an output PDF already exists, skip rebuilding that exhibit (still use it in combined).",
    )
    qol.add_argument(
        "--only-exhibits",
        metavar="WRJ-S01,WRJ-S14",
        help="Comma/space-separated exhibit ids to build (subset of WRJ-S01..S18).",
    )
    qol.add_argument("--exhibit-from", type=int, metavar="N", help="With --exhibit-to, build WRJ-SN..WRJ-SM by number.")
    qol.add_argument("--exhibit-to", type=int, metavar="N", help="Inclusive end for --exhibit-from range.")
    qol.add_argument("--manifest-json", metavar="PATH", help="Write JSON manifest of exhibit assembly.")
    qol.add_argument("--manifest-csv", metavar="PATH", help="Write CSV manifest.")
    qol.add_argument(
        "--summary-json",
        metavar="PATH",
        help="Write machine-readable run summary (paths, counts, validation, elapsed).",
    )
    qol.add_argument(
        "--checksum-manifest",
        metavar="PATH",
        help="Write SHA256 sums for each produced exhibit PDF (and combined if built).",
    )
    qol.add_argument("--no-validate", action="store_true", help="Skip post-build PDF checks.")
    qol.add_argument(
        "--strict-validate",
        action="store_true",
        help="Exit non-zero if any validation warning (default: warn only).",
    )
    qol.add_argument(
        "--list-unmatched",
        action="store_true",
        help="After mapping, list statement PDFs in input-dir that were not used as a source.",
    )
    qol.add_argument(
        "--print-page-counts",
        action="store_true",
        help="After each exhibit, log source pages, cover+merged page count.",
    )
    qol.add_argument(
        "--keep-temp-covers",
        action="store_true",
        help="Keep temporary cover PDFs in output-dir as .debug_cover_<EXHIBIT>.pdf (debug).",
    )
    qol.add_argument(
        "--timestamp-output-dir",
        action="store_true",
        help="Create run_<YYYYMMDD_HHMMSS> under --output-dir and write there instead.",
    )
    qol.add_argument(
        "--symlink-latest",
        action="store_true",
        help="With --timestamp-output-dir, symlink <output-dir>/latest → the new run subfolder.",
    )
    qol.add_argument("--log-file", metavar="PATH", help="Append plain-text log lines (no ANSI).")

    return p


def main(argv: list[str] | None = None) -> int:
    argv = list(argv) if argv is not None else sys.argv[1:]
    defaults = merge_env_and_config_argv(argv)
    ap = build_arg_parser(defaults)
    args = ap.parse_args(argv)

    if getattr(args, "config", None) and os.path.isfile(args.config):
        ns = argparse.Namespace(**vars(args))
        apply_config_to_args(ns, load_json_config(args.config))
        for k, v in vars(ns).items():
            if k in ALLOWED_CONFIG_KEYS or k in vars(args):
                setattr(args, k, v)

    log_fp: TextIO | None = None
    if args.log_file:
        log_fp = open(args.log_file, "a", encoding="utf-8")
    log = RunLogger(
        verbose=args.verbose,
        quiet=args.quiet,
        color=not args.no_color,
        dry_run=args.dry_run,
        log_file=log_fp,
    )

    if args.plan:
        args.dry_run = True

    if not args.input_dir:
        ap.error(f"--input-dir is required (or set {ENV_INPUT} or config).")
    if not args.plan and not args.output_dir:
        ap.error(f"--output-dir is required unless --plan (or set {ENV_OUTPUT} or config).")

    input_dir = os.path.abspath(args.input_dir)
    base_output_dir = os.path.abspath(args.output_dir) if args.output_dir else input_dir
    if args.timestamp_output_dir and not args.plan:
        run_name = time.strftime("run_%Y%m%d_%H%M%S")
        output_dir = os.path.join(base_output_dir, run_name)
        if args.symlink_latest:
            os.makedirs(base_output_dir, exist_ok=True)
    else:
        output_dir = base_output_dir
        run_name = os.path.basename(output_dir.rstrip(os.sep))

    if not args.plan:
        os.makedirs(output_dir, exist_ok=True)

    if args.dry_run or args.plan:
        log.dry("DRY-RUN: no PDF or manifest files will be written.")

    summary = RunSummary(dry_run=args.dry_run)
    t0 = time.time()

    try:
        wanted = parse_exhibit_filter(
            args.only_exhibits,
            args.exhibit_from,
            args.exhibit_to,
        )
    except ValueError as e:
        log.error(str(e))
        return 2

    specs_full = build_specs(args.production_date)
    specs = filter_specs(specs_full, wanted)
    if not specs:
        log.error("No exhibits selected (check --only-exhibits / --exhibit-from / --exhibit-to).")
        return 2
    if wanted and len(specs) != len(wanted):
        missing = wanted - {s.exhibit_id for s in specs}
        if missing:
            log.warn(f"Some requested exhibit ids are unknown and were ignored: {sorted(missing)}")

    log.debug(f"Input dir: {input_dir}")
    log.debug(f"Output dir: {output_dir}")
    log.info(f"Selected {len(specs)} exhibit(s) of {len(specs_full)}.")

    sources, used_sources = assign_sources(
        input_dir,
        specs,
        args.strict_files,
        prefer_manifest=not args.no_prefer_manifest,
        log=log,
    )

    if args.list_unmatched:
        all_s = set(all_statement_pdfs(input_dir))
        stray = sorted(all_s - used_sources)
        if stray:
            log.info("Statement PDFs in input dir NOT matched to any selected exhibit:")
            for p in stray:
                log.info(f"  — {os.path.basename(p)}")
        else:
            log.info("All statement PDFs in input dir were matched to some exhibit.")

    if args.plan:
        print_plan_table(specs, sources)
        if log_fp:
            log_fp.close()
        return 0

    exhibit_paths_in_order: list[str] = []
    manifest_rows: list[dict[str, Any]] = []
    ok = 0

    for i, spec in enumerate(specs, start=1):
        src = sources.get(spec.exhibit_id)
        if not src:
            log.warn(f"SKIP {spec.exhibit_id} — no source PDF")
            summary.exhibits_failed += 1
            continue
        out_path = os.path.join(output_dir, spec.output_basename)
        if args.skip_existing and os.path.isfile(out_path) and not args.force:
            log.note(f"SKIP (exists) {spec.exhibit_id} → {out_path}")
            exhibit_paths_in_order.append(out_path)
            summary.exhibits_skipped_existing += 1
            ok += 1
            manifest_rows.append(
                {
                    "exhibit_id": spec.exhibit_id,
                    "source_path": src,
                    "source_basename": os.path.basename(src),
                    "output_path": out_path,
                    "output_basename": spec.output_basename,
                    "skipped": True,
                }
            )
            continue

        if os.path.isfile(out_path) and not args.force:
            log.error(f"Refusing to overwrite {out_path} (use --force or --skip-existing).")
            summary.exhibits_failed += 1
            continue

        cover_path: str | None = None
        try:
            if args.dry_run:
                log.dry(f"Would build {spec.exhibit_id} ← {src} → {out_path}")
                exhibit_paths_in_order.append(out_path)
                ok += 1
                summary.exhibits_built += 1
                manifest_rows.append(
                    {
                        "exhibit_id": spec.exhibit_id,
                        "source_path": src,
                        "output_path": out_path,
                        "dry_run": True,
                    }
                )
                continue

            if args.keep_temp_covers:
                cover_path = os.path.join(output_dir, f".debug_cover_{spec.exhibit_id}.pdf")
            else:
                tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
                cover_path = tmp.name
                tmp.close()

            t_cover = time.time()
            create_exhibit_cover(
                cover_path,
                spec.exhibit_id,
                spec.description,
                spec.period_display,
                args.production_date,
            )
            if args.verbose:
                log.debug(f"  cover render {spec.exhibit_id}: {time.time() - t_cover:.2f}s")

            merge_cover_and_document(cover_path, src, out_path)
            n_src = pdf_page_count(src)
            n_out = pdf_page_count(out_path)
            if args.print_page_counts or args.verbose:
                log.info(f"{spec.exhibit_id}: source_pages={n_src} merged_pages={n_out} ({i}/{len(specs)})")

            log.ok(f"OK {spec.exhibit_id} ← {os.path.basename(src)} → {spec.output_basename}")
            exhibit_paths_in_order.append(out_path)
            ok += 1
            summary.exhibits_built += 1
            manifest_rows.append(
                {
                    "exhibit_id": spec.exhibit_id,
                    "source_path": src,
                    "source_basename": os.path.basename(src),
                    "output_path": out_path,
                    "output_basename": spec.output_basename,
                    "source_pages": n_src,
                    "merged_pages": n_out,
                }
            )
        finally:
            if cover_path and not args.keep_temp_covers and os.path.isfile(cover_path):
                try:
                    os.unlink(cover_path)
                except OSError:
                    pass

    log.info(f"Exhibits ready: {ok}/{len(specs)} → {output_dir}")

    cover_arg = (args.production_cover or "").strip()
    cover_path_s00 = os.path.abspath(cover_arg) if cover_arg else os.path.join(input_dir, DEFAULT_PRODUCTION_COVER)
    combined_path = os.path.join(output_dir, args.combined_output)

    combined_ok = False
    if not args.no_combined_volume and ok == len(specs) and exhibit_paths_in_order and not args.dry_run:
        if not os.path.isfile(cover_path_s00):
            log.warn(
                f"Production cover not found at {cover_path_s00}; skipping combined volume. "
                f"Use --production-cover or place {DEFAULT_PRODUCTION_COVER} in the input folder."
            )
        else:
            write_combined_volume(cover_path_s00, exhibit_paths_in_order, combined_path)
            log.ok(f"OK combined volume → {combined_path}")
            combined_ok = True
            summary.combined_written = True
            summary.combined_path = combined_path
    elif not args.no_combined_volume and args.dry_run and ok == len(specs):
        log.dry(f"Would write combined volume → {combined_path}")
        summary.combined_path = combined_path

    min_combined_pages = 0
    if not args.no_validate and not args.dry_run:
        for spec, outp in zip(specs, exhibit_paths_in_order, strict=False):
            if not os.path.isfile(outp):
                continue
            src = sources.get(spec.exhibit_id, "")
            if src:
                summary.validation_errors.extend(validate_exhibit_pdf(outp, spec.exhibit_id, src, log))
        min_combined_pages = pdf_page_count(cover_path_s00) + sum(
            pdf_page_count(p) for p in exhibit_paths_in_order if os.path.isfile(p)
        )
        if combined_ok and os.path.isfile(combined_path):
            summary.validation_errors.extend(
                validate_combined_volume(combined_path, max(1, min_combined_pages - 2), log)
            )

    if args.manifest_json and manifest_rows and not args.dry_run:
        write_manifest_json(os.path.abspath(args.manifest_json), manifest_rows, log)
    elif args.manifest_json and args.dry_run:
        log.dry(f"Would write --manifest-json {args.manifest_json}")

    if args.manifest_csv and manifest_rows and not args.dry_run:
        write_manifest_csv(os.path.abspath(args.manifest_csv), manifest_rows, log)
    elif args.manifest_csv and args.dry_run:
        log.dry(f"Would write --manifest-csv {args.manifest_csv}")

    checksum_targets = list(exhibit_paths_in_order)
    if combined_ok:
        checksum_targets.append(combined_path)
    if args.checksum_manifest and not args.dry_run:
        write_checksum_manifest(os.path.abspath(args.checksum_manifest), checksum_targets, log)
    elif args.checksum_manifest and args.dry_run:
        log.dry(f"Would write --checksum-manifest {args.checksum_manifest}")

    if args.summary_json and not args.dry_run:
        payload = {
            **asdict(summary),
            "input_dir": input_dir,
            "output_dir": output_dir,
            "exhibit_count_requested": len(specs),
            "exhibits_ok": ok,
            "combined_path": summary.combined_path,
            "elapsed_s": round(time.time() - t0, 2),
        }
        with open(os.path.abspath(args.summary_json), "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        log.info(f"Wrote summary JSON → {args.summary_json}")

    if args.timestamp_output_dir and args.symlink_latest and not args.dry_run and not args.plan:
        symlink_latest_run(base_output_dir, run_name, log)

    print(
        f"p31-office discovery assemble: {ok}/{len(specs)} exhibits"
        + (f"; combined={'yes' if combined_ok else 'no'}" if not args.no_combined_volume else "")
        + f"; {round(time.time() - t0, 2)}s → {output_dir}",
        file=sys.stdout,
    )

    if log_fp:
        log_fp.close()

    if summary.validation_errors and args.strict_validate:
        return 3
    return 0 if ok == len(specs) else 1


if __name__ == "__main__":
    raise SystemExit(main())
