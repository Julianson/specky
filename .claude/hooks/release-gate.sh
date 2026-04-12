#!/usr/bin/env bash
# release-gate.sh — BLOCKING hook for release readiness
# Trigger: PreToolUse — sdd_create_pr
# Checks: VERIFICATION.md exists, pass_rate ≥ 90, CHECKLIST.md exists
# Type: BLOCKING (exit 2 prevents sdd_create_pr from running)

set -euo pipefail

SPEC_DIR="${SDD_WORKSPACE:-.}/.specs"

# Find the feature directory (highest-numbered)
FEATURE_DIR=$(find "$SPEC_DIR" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | \
  sort | tail -1)

if [ -z "$FEATURE_DIR" ]; then
  echo "[release-gate] ⚠  No feature directory found in $SPEC_DIR. Proceeding."
  exit 0
fi

FEATURE_NAME=$(basename "$FEATURE_DIR")
VERIFICATION="$FEATURE_DIR/VERIFICATION.md"
CHECKLIST="$FEATURE_DIR/CHECKLIST.md"

echo "[release-gate] Checking release readiness for: $FEATURE_NAME"

# Check 1: VERIFICATION.md must exist
if [ ! -f "$VERIFICATION" ]; then
  echo "[release-gate] ✖  VERIFICATION.md is missing."
  echo "               Run sdd_verify_tasks to generate the verification report."
  echo "               A PR cannot be created without task verification."
  exit 2
fi

# Check 2: CHECKLIST.md must exist
if [ ! -f "$CHECKLIST" ]; then
  echo "[release-gate] ✖  CHECKLIST.md is missing."
  echo "               Run sdd_checklist to generate and complete the quality checklist."
  echo "               A PR cannot be created without checklist completion."
  exit 2
fi

# Check 3: pass_rate in VERIFICATION.md must be ≥ 90
PASS_RATE=$(grep "^pass_rate:" "$VERIFICATION" 2>/dev/null | \
  grep -o "[0-9]*" | head -1 || true)

if [ -n "$PASS_RATE" ] && [ "$PASS_RATE" -lt 90 ]; then
  echo "[release-gate] ✖  Verification pass rate is $PASS_RATE% (required: ≥90%)."
  echo "               Complete the remaining tasks in TASKS.md before creating a PR."
  echo "               Run sdd_verify_tasks after completing tasks to update the report."
  exit 2
fi

echo "[release-gate] ✓  Release gate passed for $FEATURE_NAME."
if [ -n "$PASS_RATE" ]; then
  echo "               Verification: $PASS_RATE% — ready for PR."
fi

exit 0
