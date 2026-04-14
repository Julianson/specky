#!/bin/bash
# release-gate.sh — Verify VERIFICATION.md + 90% pass rate before PR
# Target: Claude Code (.claude/hooks/)
# Type: BLOCKING (exit 2) | Trigger: before sdd_create_pr | Phase: 9
# Paper: arXiv:2601.03878 — human-in-loop gate

set -euo pipefail
FAILS=0

echo "🚦 Release Gate Check"

# Find active feature
LATEST=$(ls -td .specs/*/ 2>/dev/null | head -1)
[ -z "$LATEST" ] && { echo "❌ No .specs/ directory found"; exit 2; }

# VERIFICATION.md must exist
if [ ! -f "$LATEST/VERIFICATION.md" ]; then
  echo "🚫 Missing VERIFICATION.md in $LATEST — run /sdd:test first"
  FAILS=$((FAILS+1))
fi

# CHECKLIST.md must exist
if [ ! -f "$LATEST/CHECKLIST.md" ]; then
  echo "🚫 Missing CHECKLIST.md in $LATEST — run /sdd:implement first"
  FAILS=$((FAILS+1))
fi

# Pass rate >= 90%
if [ -f "$LATEST/VERIFICATION.md" ]; then
  RATE=$(grep -oP 'pass_rate:\s*"?(\d+(\.\d+)?)"?' "$LATEST/VERIFICATION.md" | grep -oP '[\d.]+' | head -1 || echo "0")
  if [ -n "$RATE" ]; then
    PASS=$(echo "$RATE >= 90" | bc -l 2>/dev/null || echo "0")
    if [ "$PASS" -eq 0 ]; then
      echo "🚫 Test pass rate ${RATE}% < 90% — fix failing tests"
      FAILS=$((FAILS+1))
    fi
  fi
fi

if [ "$FAILS" -gt 0 ]; then
  echo ""
  echo "❌ Release gate FAILED ($FAILS issues). Cannot create PR."
  exit 2  # BLOCKING
fi

echo "✅ Release gate passed."
exit 0
