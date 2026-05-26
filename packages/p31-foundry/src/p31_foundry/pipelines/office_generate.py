#!/usr/bin/env python3
"""
office-generate — Generate board/legal documents from templates

Usage:
  p31-foundry run office-generate --template board-notice --date "2027-04-15" --output ./out.md
  p31-foundry run office-generate --template coi-form --output ./coi.md
  p31-foundry run office-generate --template resolution --topic "budget-approval" --output ./res.md

Templates:
  board-notice    — Board meeting notice (ANNUAL-MEETING-NOTICE-TEMPLATE.md)
  written-consent — Written consent for actions without meeting
  coi-form        — Conflict of interest disclosure form
  resolution      — Board resolution template
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from p31_foundry.record import PipelineRunSummary


def find_repo_root() -> Path:
    """Find repo root by looking for p31-protocol-registry.json."""
    p = Path.cwd()
    for _ in range(10):
        if (p / "p31-protocol-registry.json").exists():
            return p
        if (p / "p31-constants.json").exists():
            return p
        parent = p.parent
        if parent == p:
            break
        p = parent
    return Path.cwd()


def read_protocol_registry(root: Path) -> dict[str, Any] | None:
    """Read p31-protocol-registry.json if it exists."""
    p = root / "p31-protocol-registry.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def read_constants(root: Path) -> dict[str, Any] | None:
    """Read p31-constants.json if it exists."""
    p = root / "p31-constants.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def template_board_notice(entity: dict, args: dict) -> str:
    """Generate board meeting notice from template data."""
    date = args.get("date", "[DATE]")
    time = args.get("time", "14:00")
    location = args.get("location", "401 Powder Horn Rd, Saint Marys, GA 31558")
    method = args.get("method", "in-person")
    directors = args.get("directors", entity.get("directors", ["Director 1", "Director 2", "Director 3"]))
    
    legal_name = entity.get("legalName", "P31 Labs, Inc.")
    
    template = f"""# NOTICE OF ANNUAL MEETING OF THE BOARD OF DIRECTORS
**{legal_name}**

---

**To:** {", ".join(directors)}  
**From:** William R. Johnson, President  
**Date of notice:** {datetime.now().strftime("%B %d, %Y")}

---

You are hereby notified that the Annual Meeting of the Board of Directors of {legal_name} will be held as follows:

**Date:** {date}

**Time:** {time}

**Location / method:** {location}  
*(Method: {method})*

**Quorum required:** 2 of 3 directors

---

## Proposed Agenda

1. Call to order and quorum confirmation
2. Review and approval of prior meeting minutes
3. Financial report — year-to-date
4. Officer and director term review (confirm no vacancies)
5. Conflict of interest disclosure review — collect annual forms
6. Program / mission update
7. Grant pipeline and funding review
8. Review of P31 Protocol Registry and compliance calendar
9. Any other business
10. Adjournment

---

*This notice is given in accordance with Article IV, Section 2 of the Bylaws.*

**Entity:** {legal_name}  
**EIN:** {entity.get('ein', '[EIN]')}  
**GA SOS Control #:** {entity.get('gaSosControlNumber', '[Control #]')}
"""
    return template


def template_coi_form(entity: dict, args: dict) -> str:
    """Generate conflict of interest disclosure form."""
    legal_name = entity.get("legalName", "P31 Labs, Inc.")
    year = args.get("year", str(datetime.now().year))
    
    template = f"""# CONFLICT OF INTEREST DISCLOSURE
**{legal_name}** — Annual Disclosure for Calendar Year {year}

---

**Director/Officer Name:** _________________________________________________

**Position:** _________________________________________________

**Date:** _________________________________________________

---

## Instructions

P31 Labs, Inc. is a Georgia nonprofit corporation with federal 501(c)(3) status pending. 
Directors and officers must disclose any actual, potential, or apparent conflicts of interest 
to ensure proper governance and IRS compliance.

---

## Part A: Financial Interests

Do you (or your immediate family) have any financial interest in any entity that does business 
with, competes with, or provides services to P31 Labs, Inc.?

- [ ] **No** — I have no such financial interests to disclose.
- [ ] **Yes** — I have the following financial interests to disclose:

  | Entity | Nature of Interest | Relationship to P31 |
  |--------|-------------------|----------------------|
  |        |                   |                      |
  |        |                   |                      |
  |        |                   |                      |

---

## Part B: Related Party Transactions

Have you (or your immediate family) engaged in any transaction with P31 Labs, Inc. during the past year?

- [ ] **No** — No related party transactions.
- [ ] **Yes** — The following transactions occurred:

  | Date | Description | Amount | Terms |
  |------|-------------|--------|-------|
  |      |             |        |       |
  |      |             |        |       |

---

## Part C: Gifts and Gratuities

Have you (or your immediate family) received any gifts, gratuities, or benefits from any person 
or entity doing business with P31 Labs, Inc. with a value exceeding $75?

- [ ] **No** — No gifts to disclose.
- [ ] **Yes** — The following gifts were received:

  | Date | Description | Value | Source |
  |------|-------------|-------|--------|
  |      |             |       |        |

---

## Part D: Outside Positions

Do you hold any position (director, officer, trustee, key employee) with any other organization 
that has a relationship with P31 Labs, Inc.?

- [ ] **No** — No outside positions to disclose.
- [ ] **Yes** — The following positions are held:

  | Organization | Your Position | Relationship to P31 |
  |--------------|---------------|----------------------|
  |              |               |                      |

---

## Certification

I certify that the information provided above is true and complete to the best of my knowledge. 
I understand that I must promptly update this disclosure if any material changes occur.

**Signature:** _________________________________________ **Date:** _________________

---

*Form version: office-generate {datetime.now().isoformat()}*  
*Entity EIN: {entity.get('ein', '[EIN]')}*  
*Keep this form confidential — file with Board Secretary*
"""
    return template


def template_written_consent(entity: dict, args: dict) -> str:
    """Generate written consent template."""
    legal_name = entity.get("legalName", "P31 Labs, Inc.")
    action = args.get("action", "[ACTION TO APPROVE]")
    
    template = f"""# WRITTEN CONSENT OF THE BOARD OF DIRECTORS
**{legal_name}**

---

**Action Taken Without Meeting**  
*Pursuant to Article IV, Section 4 of the Bylaws*

---

The undersigned, constituting all members of the Board of Directors of {legal_name}, 
hereby consent to the following action(s) and declare that this consent shall have the 
same force and effect as a unanimous vote at a duly called meeting:

---

## Action(s) Approved

{action}

---

## Director Consents

The following directors consent to the above action(s):

| Director Name | Signature | Date |
|----------------|-----------|------|
| William R. Johnson | _________________ | _______ |
| Joseph Tyler Cisco | _________________ | _______ |
| Brenda O'Dell | _________________ | _______ |

---

## Certification by Secretary

I, the undersigned Secretary, certify that:
1. The above-named individuals are all directors of the Corporation
2. Each has signed this written consent
3. The consent constitutes the act of the Board as if adopted at a duly called meeting
4. This consent is being maintained in the corporate records

**Secretary Signature:** _________________________ **Date:** _______________

---

**Entity:** {legal_name}  
**EIN:** {entity.get('ein', '[EIN]')}  
**GA SOS Control #:** {entity.get('gaSosControlNumber', '[Control #]')}

*Generated: {datetime.now().isoformat()}*
"""
    return template


def template_resolution(entity: dict, args: dict) -> str:
    """Generate board resolution template."""
    legal_name = entity.get("legalName", "P31 Labs, Inc.")
    topic = args.get("topic", "[RESOLUTION TOPIC]")
    
    template = f"""# BOARD RESOLUTION
**{legal_name}**

---

**Resolution Number:** [RES-202X-XXX]  
**Date Adopted:** [DATE]  
**Topic:** {topic}

---

## RESOLUTION

**WHEREAS**, [background/context]; and

**WHEREAS**, [additional context]; now, therefore,

**BE IT RESOLVED**, that [the action to be taken];

**RESOLVED FURTHER**, that [additional actions if any];

**RESOLVED FINALLY**, that [implementation/authorization details].

---

## Vote

This resolution was adopted by the Board of Directors on [DATE] by the following vote:

| Director | Vote |
|----------|------|
| William R. Johnson | [Yea / Nay / Abstain] |
| Joseph Tyler Cisco | [Yea / Nay / Abstain] |
| Brenda O'Dell | [Yea / Nay / Abstain] |

**Vote Result:** [Unanimous / Majority / etc.]

---

## Certification

I, the undersigned Secretary, certify that:
1. The above resolution was duly adopted by the Board of Directors
2. The vote is correctly recorded above
3. This resolution is being maintained in the corporate records
4. This is a true and correct copy of the resolution as adopted

**Secretary Signature:** _________________________ **Date:** _______________

---

**Entity:** {legal_name}  
**EIN:** {entity.get('ein', '[EIN]')}  
**GA SOS Control #:** {entity.get('gaSosControlNumber', '[Control #]')}

*Generated: {datetime.now().isoformat()}*
"""
    return template


TEMPLATES = {
    "board-notice": template_board_notice,
    "coi-form": template_coi_form,
    "conflict-of-interest": template_coi_form,
    "written-consent": template_written_consent,
    "resolution": template_resolution,
}


def run(argv: list[str], **_kwargs) -> PipelineRunSummary:
    """
    office-generate --template TEMPLATE [--output PATH] [ARGS...]
    """
    parser = argparse.ArgumentParser(prog="office-generate", description="Generate board/legal documents")
    parser.add_argument("--template", "-t", required=True, choices=list(TEMPLATES.keys()), help="Template to use")
    parser.add_argument("--output", "-o", default="./office-output.md", help="Output file path")
    parser.add_argument("--date", default="", help="Date for the document (YYYY-MM-DD)")
    parser.add_argument("--time", default="14:00", help="Time for meetings")
    parser.add_argument("--location", default="", help="Meeting location")
    parser.add_argument("--method", default="in-person", help="Meeting method")
    parser.add_argument("--action", default="", help="Action description for consent/resolution")
    parser.add_argument("--topic", default="", help="Topic for resolution")
    parser.add_argument("--year", default=str(datetime.now().year), help="Year for forms")
    
    try:
        args = parser.parse_args(argv)
    except SystemExit as e:
        return PipelineRunSummary("office-generate", False, f"argparse exit {e.code}")
    
    # Find repo root and read entity data
    root = find_repo_root()
    registry = read_protocol_registry(root)
    constants = read_constants(root)
    
    # Build entity data from available sources
    entity = {
        "legalName": "P31 Labs, Inc.",
        "ein": "42-1888158",
        "gaSosControlNumber": "26082141",
        "directors": ["William R. Johnson", "Joseph Tyler Cisco", "Brenda O'Dell"],
    }
    
    if registry and "officeCalendar" in registry:
        oc = registry["officeCalendar"]
        if "entity" in oc:
            entity.update(oc["entity"])
    
    if constants:
        if "organization" in constants:
            org = constants["organization"]
            entity.setdefault("legalName", org.get("legalName"))
            entity.setdefault("ein", org.get("ein"))
            entity.setdefault("gaSosControlNumber", org.get("sosControlNumber"))
    
    # Prepare template arguments
    template_args = {
        "date": args.date or datetime.now().strftime("%Y-%m-%d"),
        "time": args.time,
        "location": args.location or "401 Powder Horn Rd, Saint Marys, GA 31558",
        "method": args.method,
        "action": args.action,
        "topic": args.topic,
        "year": args.year,
    }
    
    # Generate document
    template_fn = TEMPLATES.get(args.template)
    if not template_fn:
        return PipelineRunSummary("office-generate", False, f"Unknown template: {args.template}")
    
    content = template_fn(entity, template_args)
    
    # Write output
    out_path = Path(args.output).expanduser().resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(content, encoding="utf-8")
    
    return PipelineRunSummary(
        "office-generate",
        True,
        f"Generated {args.template} → {out_path}",
        outputs=[str(out_path)],
        meta={"template": args.template, "entity": entity["legalName"]}
    )
