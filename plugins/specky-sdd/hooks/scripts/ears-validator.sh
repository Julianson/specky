#!/bin/bash
# ears-validator.sh — Validate EARS pattern compliance
# Target: Claude Code (.claude/hooks/)
# Type: Advisory | Trigger: PostToolUse | Phase: 2,3
# Paper: arXiv:2601.03878 — EARS quality

set -euo pipefail

LATEST=$(ls -td .specs/*/ 2>/dev/null | head -1)
[ -z "$LATEST" ] && exit 0
SPEC="$LATEST/SPECIFICATION.md"
[ -f "$SPEC" ] || exit 0

echo "🔍 EARS Validation: $SPEC"

# Count each EARS pattern
UBIQ=$(grep -cP 'The system shall' "$SPEC" 2>/dev/null || echo "0")
EVENT=$(grep -cP 'When .*, the system shall' "$SPEC" 2>/dev/null || echo "0")
STATE=$(grep -cP 'While .*, the system shall' "$SPEC" 2>/dev/null || echo "0")
OPTION=$(grep -cP 'Where .*, the system shall' "$SPEC" 2>/dev/null || echo "0")
UNWANTED=$(grep -cP 'If .*, then the system shall' "$SPEC" 2>/dev/null || echo "0")
COMPLEX=$(grep -cP 'While .*, when .*, the system shall' "$SPEC" 2>/dev/null || echo "0")

TOTAL=$((UBIQ + EVENT + STATE + OPTION + UNWANTED + COMPLEX))
REQS=$(grep -cP 'REQ-[A-Z]+-\d+' "$SPEC" 2>/dev/null || echo "0")

echo "  Ubiquitous:  $UBIQ"
echo "  Event-driven: $EVENT"
echo "  State-driven: $STATE"
echo "  Optional:     $OPTION"
echo "  Unwanted:     $UNWANTED"
echo "  Complex:      $COMPLEX"
echo "  ─────────────"
echo "  EARS total:   $TOTAL / $REQS requirements"

if [ "$TOTAL" -lt "$REQS" ]; then
  echo "⚠️  $((REQS - TOTAL)) requirements may not follow EARS notation."
  echo "   Run sdd_validate_ears for detailed analysis."
fi

exit 0
