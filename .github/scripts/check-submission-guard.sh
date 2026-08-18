#!/usr/bin/env bash
# check-submission-guard.sh — CI enforcement for ARCH-8 / Story 1.7 AC-4.
#
# Fails the build if any community POST route handler does NOT import
# submission-guard. "Community POST handlers" are route files under:
#   src/app/api/lenders/*/reviews/
#   src/app/api/lenders/*/flags/
#   src/app/api/scam-board/
#
# This catches regressions where a developer adds a new community submission
# route without the Turnstile + rate limiting protection.
#
# Run: bash .github/scripts/check-submission-guard.sh
# CI:  called in .github/workflows/ci.yml

set -euo pipefail

COMMUNITY_PATTERNS=(
  "src/app/api/lenders/*/reviews/route.ts"
  "src/app/api/lenders/*/flags/route.ts"
  "src/app/api/scam-board/route.ts"
)

GUARD_IMPORT="submission-guard"
FAILED=0

for pattern in "${COMMUNITY_PATTERNS[@]}"; do
  # Use glob expansion
  for file in $pattern; do
    # Skip if no files match the glob
    [[ -e "$file" ]] || continue

    # Check if the file imports submission-guard
    if ! grep -q "$GUARD_IMPORT" "$file"; then
      echo "ERROR: $file does not import submission-guard"
      echo "  All community POST handlers MUST call submissionGuard() (ARCH-8)."
      echo "  Import: import { submissionGuard } from '@/lib/utils/submission-guard'"
      FAILED=1
    fi
  done
done

if [[ $FAILED -eq 1 ]]; then
  echo ""
  echo "Build failed: missing submission-guard import in community route handler(s)."
  exit 1
fi

echo "submission-guard check: OK (all community routes protected)"
exit 0
