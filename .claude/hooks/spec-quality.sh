#!/usr/bin/env bash
# spec-quality.sh — Advisory hook for spec completeness
# Trigger: PostToolUse — sdd_write_spec
# Checks: minimum requirement count, REQ-ID format, acceptance criteria presence
# Type: ADVISORY (exit 0 always — coaches, never blocks)

set -euo pipefail

SPEC_DIR="${SDD_WORKSPACE:-.}/.specs"

# Find the most recently modified SPECIFICATION.md
SPEC_FILE=$(find "$SPEC_DIR" -name "SPECIFICATION.md" 2>/dev/null | \
  xargs ls -t 2>/dev/null | head -1)

[ -z "$SPEC_FILE" ] && exit 0
[ ! -f "$SPEC_FILE" ] && exit 0

# Count formal requirements (### REQ- heading format)
REQ_COUNT=$(grep -c "^### REQ-" "$SPEC_FILE" 2>/dev/null || true)
REQ_COUNT=${REQ_COUNT:-0}

# Count Acceptance Criteria sections
AC_COUNT=$(grep -c "Acceptance Criteria" "$SPEC_FILE" 2>/dev/null || true)
AC_COUNT=${AC_COUNT:-0}

# Count requirements with proper ID format (REQ-CATEGORY-NNN)
PROPER_IDS=$(grep -c "REQ-[A-Z][A-Z]*-[0-9][0-9]*" "$SPEC_FILE" 2>/dev/null || true)
PROPER_IDS=${PROPER_IDS:-0}

ISSUES=0

if [ "$REQ_COUNT" -lt 5 ]; then
  echo "[spec-quality] ⚠  Only $REQ_COUNT requirement(s) found (recommended: ≥5)."
  echo "               Consider running sdd_clarify to expand the specification."
  ISSUES=$((ISSUES + 1))
fi

if [ "$AC_COUNT" -lt "$REQ_COUNT" ] && [ "$REQ_COUNT" -gt 0 ]; then
  MISSING=$((REQ_COUNT - AC_COUNT))
  echo "[spec-quality] ⚠  $MISSING requirement(s) may be missing Acceptance Criteria sections."
  echo "               Each REQ-* should have '### Acceptance Criteria' with testable criteria."
  ISSUES=$((ISSUES + 1))
fi

if [ "$REQ_COUNT" -gt 0 ] && [ "$PROPER_IDS" -lt "$REQ_COUNT" ]; then
  echo "[spec-quality] ⚠  Some requirements may not follow REQ-CATEGORY-NNN format."
  echo "               Example: REQ-AUTH-001, REQ-DATA-002 — ensures traceability."
  ISSUES=$((ISSUES + 1))
fi

if [ "$ISSUES" -eq 0 ]; then
  echo "[spec-quality] ✓  Spec quality check passed: $REQ_COUNT requirements, $AC_COUNT AC sections."
fi

exit 0
