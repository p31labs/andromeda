# P31 Document Foundry (`p31-foundry`)

**v1.3:** v1 local spine + **`push`** + **`job create` / `get` / `list`** + Worker (R2, queue stub, **`GET /v1/jobs`**, mutation rate limit). See **`packages/p31-foundry/worker/README.md`**.

Full architecture and roadmap: **`docs/P31-DOCUMENT-FOUNDRY.md`** (repo root).

## Install

Uses the same venv as **`p31-office`**:

```bash
npm run office:install    # installs p31-office + p31-foundry into Discovery/.venv
```

Or:

```bash
Discovery/.venv/bin/pip install -e ./packages/p31-foundry
```

Optional DOCX text extraction:

```bash
Discovery/.venv/bin/pip install -e './packages/p31-foundry[docx]'
```

## CLI

```bash
p31-foundry doctor
p31-foundry ingest ./path/to/file.pdf
p31-foundry ingest ./docs/ --recursive
p31-foundry manifest ./Discovery --glob '*.pdf'
p31-foundry run bundle-inventory -- ./Discovery ./out/manifest.json
p31-foundry run text-concat -- ./a.md ./b.md -o ./bundle.txt
p31-foundry run grant-scaffold -- --out ./out/grant_pack_skeleton.json
p31-foundry push --url https://<worker>.workers.dev --file ./doc.pdf --dry-run
p31-foundry push --url https://<worker>.workers.dev --file ./doc.pdf --bearer '<secret>'
p31-foundry job create --url https://<worker>.workers.dev --json '{"type":"demo"}'
p31-foundry job get --url https://<worker>.workers.dev --id job_<uuid>
p31-foundry job list --url https://<worker>.workers.dev --limit 20
```

## Pipelines (v1)

| Name | Purpose |
|------|---------|
| `bundle-inventory` | Ingest every file under a directory (optional `--glob`), write **manifest JSON** (paths, hashes, mime, page counts, text preview). |
| `text-concat` | Concatenate extracted/plain text from files with clear separators (for RAG / LLM context packs). |
| `grant-scaffold` | Emit a **checklist JSON** skeleton (sections + `done` flags) for grant packaging. |

## Store layout

Default root: **`.p31-foundry/`** in the current working directory, or **`P31_FOUNDRY_ROOT`**.

```
.p31-foundry/
  artifacts/<sha256>/
    record.json      # DocumentRecord
    source.bin       # original bytes
  events.jsonl       # optional --emit-events
```

## Worker (edge, optional)

**`packages/p31-foundry/worker/`** — R2 + Queues + optional bearer auth (see worker README).

## Version

**1.3.0** — **`job list`** + Worker list + mutation RL per `docs/P31-DOCUMENT-FOUNDRY.md` § v1.3.
