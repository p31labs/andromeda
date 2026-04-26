# SONNET DIRECTIVE — April 13, 2026 Evening Sprint (Post-EIN)

EIN dropped 10 minutes ago: **42-1888158**. CP 575E on file. This changes multiple documents and systems. Execute all of the following.

---

## TASK 1: Update Business Documentation (CRITICAL — sends to McGhan tomorrow AM)

File: `Discovery_Production_2025CV936/P31_Labs_Business_Documentation_UPDATED.docx`

Three changes:
1. Section I.A — Change `EIN: Application pending` → `EIN: 42-1888158 (assigned April 13, 2026)`
2. Section I.A — Change `501(c)(3) Status: Not yet applied; will file Form 1023-EZ upon EIN issuance` → `501(c)(3) Status: Form 1023-EZ eligible; filing pending ($275 user fee)`
3. Section VIII — Add: `EIN was assigned on April 13, 2026. CP 575E confirmation letter is on file.`

Re-export to PDF. This is the version that goes to McGhan at 8 AM.

---

## TASK 2: Update status.json and push to Command Center

File: `status.json` in command-center directory

Changes:
- `corp_status`: `"P31 Labs Inc — Active (GA SoS). EIN: 42-1888158. 501(c)(3) pending."`
- Add to dates array: `{ "date": "Apr 13", "event": "EIN 42-1888158 assigned (CP 575E on file)" }`

Push: `./update-status.sh`

---

## TASK 3: Update Supplemental Discovery Notice

File: `Supplemental_Discovery_Notice_April_14.docx`

Add **UPDATE 8** before ENCLOSED DOCUMENTS:

```
UPDATE 8: Employer Identification Number — Assigned

Affects: P31 Labs Business Documentation; Section I.A

On April 13, 2026, the Internal Revenue Service assigned Employer 
Identification Number 42-1888158 to P31 Labs, Inc. (IRS Notice CP 575E). 
The updated Business Documentation enclosed with this notice reflects 
this assignment.
```

Re-export to PDF.

---

## TASK 4: CogPass v4.1 — Add EIN

File: `CogPass-v4_1.md` or wherever the current CogPass source lives

Add to P31 Labs entity section:
- `EIN: 42-1888158`
- `CP 575E: On file (April 13, 2026)`
- `501(c)(3): Form 1023-EZ eligible, not yet filed ($275)`

---

## TASK 5: Expand Paper Shells (Background / Parallel)

While the above tasks complete, start expanding these shells into 4-6 page manuscripts following the Paper XII template (P31 branding, verified references only, honest limitations sections):

**Priority order:**
1. Paper VII — Neuro-Kinship & Impedance Mismatch (Milton Double Empathy + Murray monotropism — both verified in validation report)
2. Paper X — Linguistic Thermodynamics (Landauer principle — well-established physics, low hallucination risk)
3. Paper V — Borderland Strategy (environmental psychology — Kaplan ART, Ulrich SRT, verified references)

**Do NOT expand** Papers XIII, XVIII, or XX (DUNA/DAO/Abdication) — these contain legally untested claims that could be used against Will in court.

**Gate check each paper** against primary sources before declaring it complete. Flag any citation you cannot independently verify.

---

## TASK 6: Hearing Prep Update

File: `Hearing_Prep_April_16_2026.docx`

Add to WHAT'S IN YOUR HAND TODAY checklist:
```
□  CP 575E — EIN confirmation letter (42-1888158, dated April 13, 2026)
```

This proves P31 Labs is a real, federally recognized entity — not a scheme. If McGhan questions the legitimacy of the nonprofit, hand the judge the CP 575E.

---

## Execution Order
1. Tasks 1 + 3 first (discovery docs — these send at 8 AM)
2. Task 6 (hearing prep — prints before Thursday)
3. Task 2 (status dashboard)
4. Task 4 (CogPass)
5. Task 5 (paper expansion — background)

Go.
