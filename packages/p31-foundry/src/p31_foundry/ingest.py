from __future__ import annotations

import hashlib
import mimetypes
from pathlib import Path

from p31_foundry.record import DocumentRecord

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None  # type: ignore[misc, assignment]


def _preview(text: str | None, n: int = 500) -> str | None:
    if text is None:
        return None
    t = text.strip()
    if len(t) <= n:
        return t
    return t[: n - 3] + "..."


def _ingest_pdf(path: Path) -> tuple[str | None, int | None, list[str]]:
    errs: list[str] = []
    if PdfReader is None:
        return None, None, ["pypdf not installed"]
    try:
        reader = PdfReader(path)
        n = len(reader.pages)
        parts: list[str] = []
        for i, page in enumerate(reader.pages):
            try:
                t = page.extract_text() or ""
            except Exception as e:
                errs.append(f"page {i + 1}: {e}")
                t = ""
            parts.append(t)
        return "\n\n".join(parts).strip() or None, n, errs
    except Exception as e:
        return None, None, [str(e)]


def _ingest_docx(path: Path) -> tuple[str | None, list[str]]:
    try:
        from docx import Document  # type: ignore[import-untyped]
    except ImportError:
        return None, ["python-docx not installed; pip install 'p31-foundry[docx]'"]
    try:
        doc = Document(str(path))
        paras = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paras), []
    except Exception as e:
        return None, [str(e)]


def ingest_file(path: Path) -> DocumentRecord:
    path = path.resolve()
    if not path.is_file():
        raise FileNotFoundError(path)

    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    mime, _ = mimetypes.guess_type(str(path))
    mime = mime or "application/octet-stream"
    suffix = path.suffix.lower()
    errors: list[str] = []
    text: str | None = None
    pages: int | None = None

    if suffix == ".pdf":
        text, pages, errs = _ingest_pdf(path)
        errors.extend(errs)
    elif suffix in (".md", ".markdown", ".txt", ".cff", ".json", ".yaml", ".yml", ".csv"):
        try:
            text = data.decode("utf-8", errors="replace")
        except Exception as e:
            errors.append(str(e))
    elif suffix == ".docx":
        text, errs = _ingest_docx(path)
        errors.extend(errs)
    else:
        try:
            text = data.decode("utf-8", errors="replace")
            if "\x00" in text:
                text = None
        except Exception:
            text = None

    return DocumentRecord(
        id=digest,
        source_path=str(path),
        mime=mime,
        byte_length=len(data),
        extracted_text=text,
        page_count=pages,
        text_preview=_preview(text),
        errors=errors,
    )
