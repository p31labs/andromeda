# p31-office

Python **local production** tools for the P31 home workspace: court discovery PDF assembly, Zenodo scan wrapper, and a small environment doctor.

## Install

From the P31 repo root (PEP 668–safe: uses **`Discovery/.venv`** or creates it):

```bash
npm run office:install
npm run office:ready
```

`office:ready` checks the venv, runs `p31-office doctor`, and confirms `p31labs/scripts/zenodo_scan_local.py` exists (no network).

Or manually:

```bash
python3 -m venv Discovery/.venv   # once
Discovery/.venv/bin/pip install -e ./packages/p31-office
```

## CLI

```bash
p31-office --help
p31-office discovery assemble --input-dir ./Discovery --output-dir ./Discovery/assembled_exhibits
p31-office zenodo scan -- --mode full --output-format json+markdown
p31-office doctor
```

`zenodo scan` forwards arguments after `--` to `p31labs/scripts/zenodo_scan_local.py` (run from repo root so paths resolve).

## Shims

- **`Discovery/assemble_supplemental_exhibits.py`** remains a one-file entry that imports this package (adds `packages/p31-office/src` to `sys.path` when not installed).

## Config

See **`examples/discovery_assembly.json`** for JSON keys accepted by `discovery assemble --config …`.

## Version

Package version is mirrored in `p31_office.__version__`; discovery assembler has its own `SCRIPT_VERSION` string inside `discovery/assembler.py`.
