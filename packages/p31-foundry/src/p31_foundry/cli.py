from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from p31_foundry.events import append_event
from p31_foundry.ingest import ingest_file
from p31_foundry.local_store import FoundryStore
from p31_foundry.registry import get_pipelines
from p31_foundry.util import default_store_root, find_repo_root, sha256_file


def cmd_doctor(_: argparse.Namespace) -> int:
    print("p31-foundry doctor", file=sys.stderr)
    print(f"  python: {sys.version.split()[0]}", file=sys.stderr)
    print(f"  repo root (heuristic): {find_repo_root()}", file=sys.stderr)
    print(f"  default store: {default_store_root()}", file=sys.stderr)
    try:
        import pypdf  # noqa: F401

        print("  pypdf: OK", file=sys.stderr)
    except ImportError:
        print("  pypdf: MISSING", file=sys.stderr)
    try:
        import docx  # noqa: F401

        print("  python-docx: OK", file=sys.stderr)
    except ImportError:
        print("  python-docx: optional (pip install 'p31-foundry[docx]')", file=sys.stderr)
    return 0


def cmd_ingest(args: argparse.Namespace) -> int:
    paths: list[Path] = []
    for raw in args.paths:
        p = Path(raw).expanduser().resolve()
        if p.is_file():
            paths.append(p)
        elif p.is_dir():
            it = p.rglob("*") if args.recursive else p.iterdir()
            for x in it:
                if x.is_file():
                    paths.append(x)
        else:
            print(f"  skip (not found): {p}", file=sys.stderr)

    if not paths:
        print("p31-foundry ingest: no files matched", file=sys.stderr)
        return 1

    store_root = Path(args.store_root).expanduser() if args.store_root else default_store_root()
    store = FoundryStore(store_root) if args.store else None

    for p in paths:
        try:
            rec = ingest_file(p)
            print(json.dumps(rec.to_json_dict(), indent=2))
            if store:
                adir = store.persist(p, rec)
                print(f"  stored → {adir}", file=sys.stderr)
            if args.emit_events:
                append_event(store_root, "ingest", {"path": str(p), "id": rec.id})
        except Exception as e:
            print(f"ERROR {p}: {e}", file=sys.stderr)
            return 1
    return 0


def cmd_manifest(args: argparse.Namespace) -> int:
    pl = get_pipelines()["bundle-inventory"]
    use_stdout = args.output == "-"
    if use_stdout:
        import tempfile

        out_path = Path(tempfile.mkstemp(suffix=".json", prefix="foundry-manifest-")[1])
    elif args.output:
        out_path = Path(args.output).expanduser().resolve()
    else:
        out_path = (Path.cwd() / "foundry-manifest.json").resolve()
    extra: list[str] = [str(Path(args.dir).resolve()), str(out_path)]
    if args.glob:
        extra.extend(["--glob", args.glob])
    if args.recursive:
        extra.append("--recursive")
    if args.no_store:
        extra.append("--no-store")

    store_root = Path(args.store_root).expanduser() if args.store_root else None
    summ = pl(extra, store_root=store_root, emit_events=args.emit_events)
    body = out_path.read_text(encoding="utf-8")
    if use_stdout:
        print(body)
        try:
            out_path.unlink()
        except OSError:
            pass
    elif not args.output:
        print(body)
    print(summ.message, file=sys.stderr)
    return 0 if summ.ok else 1


def cmd_job_router(args: argparse.Namespace) -> int:
    sub = getattr(args, "job_cmd", None)
    if sub == "create":
        return cmd_job_create(args)
    if sub == "get":
        return cmd_job_get(args)
    if sub == "list":
        return cmd_job_list(args)
    print("p31-foundry job: missing subcommand", file=sys.stderr)
    return 2


def cmd_job_create(args: argparse.Namespace) -> int:
    from urllib.error import HTTPError, URLError
    from urllib.request import Request, urlopen

    if args.json_inline:
        body = args.json_inline.encode("utf-8")
    elif args.json_file:
        body = Path(args.json_file).expanduser().read_bytes()
    else:
        body = b"{}"
    base = args.url.rstrip("/")
    post_url = f"{base}/v1/jobs"
    headers = {"Content-Type": "application/json; charset=utf-8"}
    if args.bearer:
        headers["Authorization"] = f"Bearer {args.bearer}"
    try:
        req = Request(post_url, data=body, headers=headers, method="POST")
        with urlopen(req, timeout=args.timeout) as resp:
            out = resp.read().decode()
            code = resp.status
    except HTTPError as e:
        detail = e.read().decode(errors="replace")
        print(f"p31-foundry job create: HTTP {e.code} {detail}", file=sys.stderr)
        return 1
    except URLError as e:
        print(f"p31-foundry job create: {e.reason}", file=sys.stderr)
        return 1
    print(out)
    print(f"  {code} {post_url}", file=sys.stderr)
    return 0


def cmd_job_list(args: argparse.Namespace) -> int:
    from urllib.error import HTTPError, URLError
    from urllib.parse import urlencode
    from urllib.request import Request, urlopen

    base = args.url.rstrip("/")
    q: dict[str, str] = {}
    lim = max(1, min(200, int(args.limit)))
    q["limit"] = str(lim)
    if args.cursor:
        q["cursor"] = str(args.cursor)
    get_url = f"{base}/v1/jobs"
    if q:
        get_url += "?" + urlencode(q)
    headers: dict[str, str] = {}
    if args.bearer:
        headers["Authorization"] = f"Bearer {args.bearer}"
    try:
        req = Request(get_url, headers=headers, method="GET")
        with urlopen(req, timeout=args.timeout) as resp:
            out = resp.read().decode()
            code = resp.status
    except HTTPError as e:
        detail = e.read().decode(errors="replace")
        print(f"p31-foundry job list: HTTP {e.code} {detail}", file=sys.stderr)
        return 1
    except URLError as e:
        print(f"p31-foundry job list: {e.reason}", file=sys.stderr)
        return 1
    print(out)
    print(f"  {code} {get_url}", file=sys.stderr)
    return 0


def cmd_job_get(args: argparse.Namespace) -> int:
    from urllib.error import HTTPError, URLError
    from urllib.request import Request, urlopen

    base = args.url.rstrip("/")
    jid = args.job_id.strip()
    get_url = f"{base}/v1/jobs/{jid}"
    headers: dict[str, str] = {}
    if args.bearer:
        headers["Authorization"] = f"Bearer {args.bearer}"
    try:
        req = Request(get_url, headers=headers, method="GET")
        with urlopen(req, timeout=args.timeout) as resp:
            out = resp.read().decode()
            code = resp.status
    except HTTPError as e:
        detail = e.read().decode(errors="replace")
        print(f"p31-foundry job get: HTTP {e.code} {detail}", file=sys.stderr)
        return 1
    except URLError as e:
        print(f"p31-foundry job get: {e.reason}", file=sys.stderr)
        return 1
    print(out)
    print(f"  {code} {get_url}", file=sys.stderr)
    return 0


def cmd_push(args: argparse.Namespace) -> int:
    """PUT file bytes to Worker R2 at artifacts/<sha256>/source.bin (streaming read for digest + upload)."""
    from urllib.error import HTTPError, URLError
    from urllib.request import Request, urlopen

    path = Path(args.file).expanduser().resolve()
    if not path.is_file():
        print(f"p31-foundry push: not a file: {path}", file=sys.stderr)
        return 1
    digest = sha256_file(path)
    base = args.url.rstrip("/")
    put_url = f"{base}/v1/artifacts/by-sha/{digest}/source"
    if args.dry_run:
        print(f"sha256={digest}", file=sys.stderr)
        print(f"PUT {put_url}", file=sys.stderr)
        return 0
    headers = {"Content-Type": args.content_type}
    if args.bearer:
        headers["Authorization"] = f"Bearer {args.bearer}"
    try:
        with path.open("rb") as fh:
            req = Request(put_url, data=fh, headers=headers, method="PUT")
            with urlopen(req, timeout=args.timeout) as resp:
                out = resp.read().decode()
                code = resp.status
    except HTTPError as e:
        detail = e.read().decode(errors="replace")
        print(f"p31-foundry push: HTTP {e.code} {detail}", file=sys.stderr)
        return 1
    except URLError as e:
        print(f"p31-foundry push: {e.reason}", file=sys.stderr)
        return 1
    print(out)
    print(f"  {code} {put_url}", file=sys.stderr)
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    pipelines = get_pipelines()
    name = args.pipeline
    if name not in pipelines:
        print(f"unknown pipeline: {name!r}. Choose: {', '.join(sorted(pipelines))}", file=sys.stderr)
        return 2
    rest = list(args.rest or [])
    if rest and rest[0] == "--":
        rest = rest[1:]
    summ = pipelines[name](rest, emit_events=args.emit_events)
    print(summ.message, file=sys.stderr)
    for o in summ.outputs:
        print(o)
    return 0 if summ.ok else 1


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="p31-foundry", description="P31 Document Foundry")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("doctor", help="Environment check").set_defaults(handler=cmd_doctor)

    pi = sub.add_parser("ingest", help="Ingest files and print DocumentRecord JSON")
    pi.add_argument("paths", nargs="+", help="Files or directories")
    pi.add_argument("-r", "--recursive", action="store_true", help="Recurse into directories")
    pi.add_argument("--store", action="store_true", help="Persist into local foundry store")
    pi.add_argument("--store-root", default="", help="Override store root (else P31_FOUNDRY_ROOT or .p31-foundry)")
    pi.add_argument("--emit-events", action="store_true", help="Append JSONL events to store")
    pi.set_defaults(handler=cmd_ingest)

    pm = sub.add_parser("manifest", help="Build inventory manifest (bundle-inventory pipeline)")
    pm.add_argument("dir", help="Directory to scan")
    pm.add_argument(
        "-o",
        "--output",
        default="",
        help="Output JSON (default: ./foundry-manifest.json; use - for stdout)",
    )
    pm.add_argument("--glob", default="*", help="fnmatch pattern")
    pm.add_argument("-r", "--recursive", action="store_true")
    pm.add_argument("--no-store", action="store_true", help="Do not copy into artifact store")
    pm.add_argument("--store-root", default="")
    pm.add_argument("--emit-events", action="store_true")
    pm.set_defaults(handler=cmd_manifest)

    pr = sub.add_parser("run", help="Run a named pipeline")
    pr.add_argument("pipeline", choices=sorted(get_pipelines().keys()))
    pr.add_argument(
        "rest",
        nargs=argparse.REMAINDER,
        help="Pipeline args (e.g. scan_dir out.json [--glob '*.pdf'] [--recursive])",
    )
    pr.add_argument("--emit-events", action="store_true")
    pr.set_defaults(handler=cmd_run)

    pp = sub.add_parser(
        "push",
        help="PUT a file to deployed foundry worker (R2 key artifacts/<sha256>/source.bin)",
    )
    pp.add_argument("--url", required=True, help="Worker base URL (e.g. https://p31-foundry-worker.example.workers.dev)")
    pp.add_argument("--file", required=True, help="File to upload")
    pp.add_argument("--bearer", default="", help="Authorization bearer when FOUNDRY_AUTH_SECRET is set on the worker")
    pp.add_argument(
        "--content-type",
        default="application/octet-stream",
        help="Content-Type header for the stored object",
    )
    pp.add_argument("--timeout", type=float, default=300.0, help="HTTP timeout seconds")
    pp.add_argument("--dry-run", action="store_true", help="Print sha256 and URL only")
    pp.set_defaults(handler=cmd_push)

    pj = sub.add_parser("job", help="Remote Worker job API (list/create/get /v1/jobs)")
    pjs = pj.add_subparsers(dest="job_cmd", required=True)

    pjc = pjs.add_parser("create", help="POST /v1/jobs with JSON body")
    pjc.add_argument("--url", required=True, help="Worker base URL")
    pjc.add_argument("--bearer", default="", help="Bearer when FOUNDRY_AUTH_SECRET is set on the worker")
    pjc.add_argument("--json-file", default="", help="Path to JSON file (default body: {})")
    pjc.add_argument("--json", dest="json_inline", default="", help="Inline JSON string (overrides --json-file)")
    pjc.add_argument("--timeout", type=float, default=120.0)
    pjc.set_defaults(handler=cmd_job_router, job_cmd="create")

    pjg = pjs.add_parser("get", help="GET /v1/jobs/:id")
    pjg.add_argument("--url", required=True)
    pjg.add_argument("--id", required=True, dest="job_id")
    pjg.add_argument("--bearer", default="")
    pjg.add_argument("--timeout", type=float, default=120.0)
    pjg.set_defaults(handler=cmd_job_router, job_cmd="get")

    pjl = pjs.add_parser("list", help="GET /v1/jobs (R2 prefix list + pagination)")
    pjl.add_argument("--url", required=True)
    pjl.add_argument("--bearer", default="")
    pjl.add_argument("--limit", type=int, default=50, help="Max keys per page (1–200)")
    pjl.add_argument("--cursor", default="", help="Continuation token from previous response")
    pjl.add_argument("--timeout", type=float, default=120.0)
    pjl.set_defaults(handler=cmd_job_router, job_cmd="list")

    return p


def main(argv: list[str] | None = None) -> int:
    argv = list(argv) if argv is not None else sys.argv[1:]
    args = build_parser().parse_args(argv)
    handler = args.handler
    return handler(args)


def entrypoint() -> None:
    raise SystemExit(main())


if __name__ == "__main__":
    entrypoint()
