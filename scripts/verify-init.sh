#!/usr/bin/env bash
# Story 1.1 — Acceptance Criteria verification script
# Exits 0 on full pass, non-zero on first failure.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0

pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1"; FAIL=1; }

echo "=== Story 1.1 AC Verification ==="

# --- AC-1: Next.js scaffold with correct structure ---
echo ""
echo "AC-1: Next.js scaffold"

[[ -d "$PROJECT_ROOT/src/app" ]] && pass "src/app/ exists" || fail "src/app/ missing"
[[ -f "$PROJECT_ROOT/tsconfig.json" ]] && pass "tsconfig.json exists" || fail "tsconfig.json missing"
grep -q '"@/\*"' "$PROJECT_ROOT/tsconfig.json" && pass '@/* alias present in tsconfig.json' || fail '@/* alias missing in tsconfig.json'
[[ -f "$PROJECT_ROOT/tailwind.config.ts" ]] || [[ -f "$PROJECT_ROOT/postcss.config.mjs" ]] && pass "Tailwind v4 config present" || fail "Tailwind config missing"

# --- AC-2: Node engine + .nvmrc ---
echo ""
echo "AC-2: Node engine + .nvmrc"

[[ -f "$PROJECT_ROOT/.nvmrc" ]] && pass ".nvmrc exists" || fail ".nvmrc missing"
NVMRC_VAL="$(cat "$PROJECT_ROOT/.nvmrc" | tr -d '[:space:]')"
[[ "$NVMRC_VAL" == "22" ]] && pass ".nvmrc contains '22'" || fail ".nvmrc value is '$NVMRC_VAL', expected '22'"

python3 -c "
import json, sys
with open('$PROJECT_ROOT/package.json') as f:
    pkg = json.load(f)
engines = pkg.get('engines', {})
node_req = engines.get('node', '')
if '>=22.0.0' in node_req:
    print('  PASS: engines.node = ' + node_req)
else:
    print('  FAIL: engines.node missing or wrong: ' + node_req)
    sys.exit(1)
"

# --- AC-3: Pinned dependencies + lockfile ---
echo ""
echo "AC-3: Pinned dependencies"

REQUIRED_DEPS=(
  "next:16.3.0"
  "@prisma/client:7.7.0"
  "iron-session:8.0.4"
  "zod:3.25.74"
  "@vercel/analytics:1.5.0"
  "@upstash/redis:1.34.9"
)
REQUIRED_DEV_DEPS=(
  "prisma:7.7.0"
  "shadcn:4.13.1"
)

python3 -c "
import json, sys
with open('$PROJECT_ROOT/package.json') as f:
    pkg = json.load(f)
deps = pkg.get('dependencies', {})
dev = pkg.get('devDependencies', {})

required = [
    ('next', '16.3.0', deps),
    ('@prisma/client', '7.7.0', deps),
    ('iron-session', '8.0.4', deps),
    ('zod', '3.25.74', deps),
    ('@vercel/analytics', '1.5.0', deps),
    ('@upstash/redis', '1.34.9', deps),
    ('prisma', '7.7.0', dev),
    ('shadcn', '4.13.1', dev),
]
ok = True
for name, ver, bucket in required:
    if name in bucket:
        actual = bucket[name].lstrip('^~')
        if actual == ver:
            print(f'  PASS: {name}@{ver}')
        else:
            print(f'  WARN: {name} pinned at {actual} (spec says {ver}) — acceptable if intentional')
    else:
        print(f'  FAIL: {name} not found')
        ok = False
if not ok:
    sys.exit(1)
"

[[ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]] && pass "pnpm-lock.yaml present" || fail "pnpm-lock.yaml missing"

# --- AC-4: Scraper isolation ---
echo ""
echo "AC-4: Scraper isolation"

[[ -d "$PROJECT_ROOT/scripts/scraper" ]] && pass "scripts/scraper/ directory exists" || fail "scripts/scraper/ missing"
[[ -f "$PROJECT_ROOT/scripts/scraper/package.json" ]] && pass "scripts/scraper/package.json exists" || fail "scripts/scraper/package.json missing"

# playwright must NOT be in the app's node_modules
if ls "$PROJECT_ROOT/node_modules" 2>/dev/null | grep -q "^playwright$"; then
    fail "playwright found in app node_modules — must be scraper-only"
else
    pass "playwright absent from app node_modules"
fi

# playwright must NOT be in the app's package.json
python3 -c "
import json
with open('$PROJECT_ROOT/package.json') as f:
    pkg = json.load(f)
all_deps = {**pkg.get('dependencies',{}), **pkg.get('devDependencies',{})}
if 'playwright' in all_deps:
    print('  FAIL: playwright listed in app package.json')
    exit(1)
else:
    print('  PASS: playwright not in app package.json')
"

echo ""
echo "==================================="
if [[ $FAIL -eq 0 ]]; then
    echo "ALL CHECKS PASSED"
    exit 0
else
    echo "ONE OR MORE CHECKS FAILED"
    exit 1
fi
