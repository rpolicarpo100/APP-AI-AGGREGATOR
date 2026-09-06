#!/usr/bin/env python3
"""
Multi-dimensional repository rating from real GitHub signals only.

Dimensions
  FUNC  functionality  — is there working, runnable substance?
  MKT   marketability  — could this become a product?
  QUAL  quality        — tests, CI, structure, typing
  MAINT maintainability— docs, config, dependency hygiene
  ACT   activity       — commit cadence and recency
  RISK  risk           — broken CI, secrets, dead weight (inverted: high = safe)

No value is invented; every input comes from the API payloads in /tmp/aud.
"""
import json, os, re, datetime, glob

AUD = "/tmp/aud"
TODAY = datetime.date(2026, 9, 6)

CODE_EXT = {".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".rb",
            ".php", ".sh", ".html", ".css", ".vue", ".svelte"}
TEST_PAT = re.compile(r"(^|/)(tests?|__tests__|spec)/|\.(test|spec)\.[a-z]+$|test_.*\.py$", re.I)
CONFIG_FILES = {"dockerfile", "docker-compose.yml", "docker-compose.yaml", "makefile",
                "pyproject.toml", "package.json", "requirements.txt", "go.mod",
                "cargo.toml", "tsconfig.json", "vercel.json", "netlify.toml"}
PRODUCT_WORDS = re.compile(
    r"\b(saas|platform|plataforma|dashboard|api|service|product|produto|client|cliente|"
    r"pricing|preco|preço|subscription|assinatura|users|utilizadores|deploy|production|"
    r"producao|produção|launch|marketplace|revenue|monetiz)\w*", re.I)
DEMO_WORDS = re.compile(r"\b(test|teste|demo|sandbox|playground|experiment|poc|scratch|tmp|temp)\b", re.I)


def load(path, default=None):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return default


def read(path):
    try:
        with open(path, encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return ""


def days(iso):
    if not iso:
        return None
    d = datetime.date(*map(int, iso[:10].split("-")))
    return (TODAY - d).days


def clamp(v, lo=0, hi=100):
    return max(lo, min(hi, v))


def stars(score):
    """0-100 -> 5-star string with halves."""
    n = round(score / 20 * 2) / 2
    full = int(n)
    half = 1 if n - full >= 0.5 else 0
    return "★" * full + ("½" if half else "") + "·" * (5 - full - half)


def analyse(meta):
    name = meta["name"]
    tree = load(f"{AUD}/tree_{name}.json", {}) or {}
    blobs = [t for t in tree.get("tree", []) if t.get("type") == "blob"]
    paths = [b["path"] for b in blobs]
    lower = [p.lower() for p in paths]

    readme = read(f"{AUD}/readme_{name}.md")
    if readme.lstrip().startswith("{"):   # API error payload, not a real readme
        readme = ""
    commits = load(f"{AUD}/commits_{name}.json", []) or []
    if isinstance(commits, dict):
        commits = []
    runs = (load(f"{AUD}/runs_{name}.json", {}) or {}).get("workflow_runs", [])

    code = [b for b in blobs if any(b["path"].endswith(e) for e in CODE_EXT)]
    code_kb = sum(b.get("size", 0) for b in code) / 1024
    docs = [p for p in paths if p.lower().endswith(".md")]
    tests = [p for p in paths if TEST_PAT.search(p)]
    configs = [p for p in lower if os.path.basename(p) in CONFIG_FILES]
    has_ci = any(p.startswith(".github/workflows/") for p in lower)
    ts_files = [p for p in lower if p.endswith((".ts", ".tsx"))]

    idle = days(meta.get("pushed_at"))
    age = days(meta.get("created_at")) or 1
    ncommits = len(commits)

    ci_fail = bool(runs) and runs[0].get("conclusion") == "failure"
    ci_ok = bool(runs) and runs[0].get("conclusion") == "success"

    # ---------------- FUNCTIONALITY ----------------
    # Does it contain enough working substance to actually do something?
    f = 0
    f += min(35, code_kb / 8)                    # volume of real code
    f += min(20, len(code) * 0.6)                # breadth of modules
    if configs:
        f += 12                                   # runnable/installable
    if has_ci:
        f += 8
    if ci_ok:
        f += 10
    if any("main." in p or "index." in p or "app." in p or p.endswith(".sh") for p in lower):
        f += 8
    if meta.get("size", 0) > 100:
        f += 7
    if len(code) <= 1:
        f = min(f, 25)                            # a single file is not a system
    func = clamp(f)

    # ---------------- MARKETABILITY ----------------
    # Could this plausibly become a product someone pays for?
    m = 0
    blob = f"{name} {meta.get('description') or ''} {readme[:6000]}"
    hits = len(set(w.lower() for w in PRODUCT_WORDS.findall(blob)))
    m += min(26, hits * 5)
    if meta.get("description"):
        m += 10
    if meta.get("topics"):
        m += 6
    if meta.get("homepage"):
        m += 10
    if meta.get("has_pages"):
        m += 6
    if readme:
        m += min(16, len(readme) / 320)           # a real pitch/readme
    if re.search(r"^#{1,2} .*(install|quick ?start|getting started|uso|usage)", readme, re.I | re.M):
        m += 10
    if not meta.get("private"):
        m += 8                                    # already shippable/visible
    if DEMO_WORDS.search(name):
        m -= 18
    if func < 30:
        m -= 12                                   # nothing to sell without substance
    mkt = clamp(m)

    # ---------------- QUALITY ----------------
    q = 40
    if tests:
        q += min(24, 10 + len(tests) * 1.5)
    else:
        q -= 12
    if has_ci:
        q += 10
    if ci_ok:
        q += 10
    if ci_fail:
        q -= 22
    if ts_files:
        q += 6                                    # static typing
    if any(p.endswith((".eslintrc", ".eslintrc.json", ".eslintrc.js", "ruff.toml",
                       ".flake8", ".pre-commit-config.yaml")) or "eslint.config" in p
           for p in lower):
        q += 6
    if len(code) > 12:
        q += 5                                    # modular rather than monolithic
    big = [b for b in code if b.get("size", 0) > 60_000]
    q -= min(12, len(big) * 4)                    # very large files
    qual = clamp(q)

    # ---------------- MAINTAINABILITY ----------------
    mt = 35
    if readme:
        mt += min(18, len(readme) / 260)
    else:
        mt -= 18
    mt += min(14, len(docs) * 1.6)
    if configs:
        mt += 10
    if meta.get("license"):
        mt += 10
    else:
        mt -= 6
    if any(p in lower for p in (".gitignore",)):
        mt += 5
    if any("lock" in os.path.basename(p) for p in lower):
        mt += 6                                   # pinned dependencies
    if len(docs) > 14:
        mt -= 6                                   # doc sprawl
    maint = clamp(mt)

    # ---------------- ACTIVITY ----------------
    a = 0
    if idle is not None:
        a += 46 if idle <= 3 else 38 if idle <= 7 else 28 if idle <= 14 else \
             18 if idle <= 30 else 8 if idle <= 90 else 0
    a += min(30, ncommits * 0.4)
    per_week = ncommits / max(1, age / 7)
    a += min(24, per_week * 4)
    act = clamp(a)

    # ---------------- RISK (inverted: 100 = safe) ----------------
    r = 100
    if ci_fail:
        r -= 30
    if not tests:
        r -= 14
    if not meta.get("license"):
        r -= 10
    if idle and idle > 60:
        r -= 12
    if not readme:
        r -= 12
    if len(code) <= 1:
        r -= 12
    # Only actual secret-bearing artefacts, not source files that merely
    # handle credentials (e.g. a module named credentials.py).
    secret_like = [p for p in lower
                   if re.search(r"(^|/)\.env$|(^|/)\.env\.(local|prod|production)$"
                                r"|\.pem$|\.key$|(^|/)id_rsa$", p)]
    if secret_like:
        r -= 25
    risk = clamp(r)

    overall = round(func * .28 + mkt * .18 + qual * .22 + maint * .14 + act * .10 + risk * .08)

    return dict(name=name, private=meta.get("private"), lang=meta.get("language"),
                func=round(func), mkt=round(mkt), qual=round(qual), maint=round(maint),
                act=round(act), risk=round(risk), overall=overall,
                code_files=len(code), code_kb=round(code_kb), tests=len(tests),
                docs=len(docs), commits=ncommits, idle=idle, ci_fail=ci_fail,
                ci_ok=ci_ok, has_ci=has_ci, license=bool(meta.get("license")),
                desc=bool(meta.get("description")), readme=bool(readme),
                secrets=secret_like)


def verdict(r):
    if r["overall"] >= 62 and not r["ci_fail"]:
        return "MANTER · PRIORITÁRIO"
    if r["overall"] >= 48:
        return "MANTER"
    if r["code_files"] <= 1 or r["code_kb"] < 12:
        return "ARQUIVAR"
    if r["overall"] < 36:
        return "ARQUIVAR"
    return "REVER"


def main():
    metas = load(f"{AUD}/repos.json", [])
    rows = sorted((analyse(m) for m in metas), key=lambda x: -x["overall"])

    print(f"\n{'REPOSITÓRIO':34}{'GERAL':>6}  {'FUNC':>4} {'VEND':>4} {'QUAL':>4} "
          f"{'MANU':>4} {'ATIV':>4} {'SEGR':>4}   VEREDICTO")
    print("─" * 104)
    for r in rows:
        print(f"{r['name'][:33]:34}{r['overall']:>5}  {r['func']:>5} {r['mkt']:>4} "
              f"{r['qual']:>4} {r['maint']:>4} {r['act']:>4} {r['risk']:>4}   {verdict(r)}")

    print("\n\nESTRELAS\n" + "─" * 104)
    for r in rows:
        print(f"{r['name'][:33]:34} {stars(r['overall']):9} "
              f"F{stars(r['func']):9} V{stars(r['mkt']):9} Q{stars(r['qual']):9}")

    print("\n\nDETALHE\n" + "─" * 104)
    for r in rows:
        flags = []
        if r["ci_fail"]:
            flags.append("CI PARTIDO")
        if not r["tests"]:
            flags.append("sem testes")
        if not r["license"]:
            flags.append("sem licença")
        if not r["desc"]:
            flags.append("sem descrição")
        if not r["readme"]:
            flags.append("sem readme")
        if r["secrets"]:
            flags.append(f"SEGREDOS: {','.join(r['secrets'][:2])}")
        print(f"{r['name'][:33]:34} {r['code_files']:>3}f {r['code_kb']:>5}KB "
              f"{r['tests']:>3}t {r['docs']:>3}d {r['commits']:>4}c "
              f"{str(r['idle'])+'d':>5}  {', '.join(flags) if flags else 'ok'}")

    with open("/tmp/aud/ratings.json", "w") as f:
        json.dump(rows, f, indent=1)
    print(f"\n{len(rows)} repositórios avaliados.")


if __name__ == "__main__":
    main()
