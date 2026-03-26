#!/usr/bin/env python3
"""
PeachCourt Exhibit Merger
=========================
Merges NFCU bank statements into a single exhibit PDF for e-filing.
Run: python merge_exhibits.py
Requires: pip install pypdf
"""

import os
import sys
from pathlib import Path

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)

from pypdf import PdfWriter

# Define the exhibit order (chronological)
EXHIBIT_ORDER = [
    "2025-08-16_STMSSCM.pdf",  # WRJ-001 - August 2025
    "2025-09-16_STMSSCM.pdf",  # WRJ-002 - September 2025
    "2025-10-16_STMSSCM.pdf",  # WRJ-003 - October 2025
    "2025-11-16_STMSSCM.pdf",  # WRJ-004 - November 2025
    "2025-12-16_STMSSCM.pdf",  # WRJ-005 - December 2025
    "2026-01-16_STMSSCM.pdf",  # WRJ-006 - January 2026
    "2026-02-16_STMSSCM.pdf",  # WRJ-007 - February 2026
    "2026-03-16_STMSSCM.pdf",  # WRJ-008 - March 2026
]

INPUT_DIR = Path("docs/bank statements")
OUTPUT_FILE = "docs/Johnson_Exhibits_WRJ001_WRJ008.pdf"

def merge_pdfs():
    """Merge bank statements into single exhibit PDF."""
    merger = PdfWriter()
    
    print("=== Merging NFCU Bank Statements for PeachCourt E-Filing ===")
    
    for i, filename in enumerate(EXHIBIT_ORDER, start=1):
        filepath = INPUT_DIR / filename
        if filepath.exists():
            merger.append(str(filepath))
            print(f"  [{i}] Added: {filename}")
        else:
            print(f"  [MISSING]: {filename}")
    
    # Write merged PDF
    output_path = Path(OUTPUT_FILE)
    merger.write(str(output_path))
    merger.close()
    
    print("=== DONE ===")
    print(f"Created: {OUTPUT_FILE}")
    print("Ready for PeachCourt upload as 'Exhibits' category")
    
    # Get file size
    size_kb = output_path.stat().st_size / 1024
    print(f"Size: {size_kb:.1f} KB")

if __name__ == "__main__":
    merge_pdfs()