#!/usr/bin/env bash
# task-tracer.sh — Advisory hook for task traceability
# Trigger: PostToolUse — sdd_write_tasks
# Checks: each task row traces to at least one REQ-* requirement
# Type: ADVISORY (exit 0 always — coaches, never blocks)

set -euo pipefail

SPEC_DIR="${SDD_WORKSPACE:-.}/.specs"

# Find the most recently modified TASKS.md
TASKS_FILE=$(find "$SPEC_DIR" -name "TASKS.md" 2>/dev/null | \
  xargs ls -t 2>/dev/null | head -1)

[ -z "$TASKS_FILE" ] && exit 0
[ ! -f "$TASKS_FILE" ] && exit 0

# Count task rows in markdown tables (lines starting with | T-)
TASK_COUNT=$(grep -c "^| T-[0-9]" "$TASKS_FILE" 2>/dev/null || true)
TASK_COUNT=${TASK_COUNT:-0}

[ "$TASK_COUNT" -eq 0 ] && exit 0

# Count task rows that contain a REQ-* reference on the same line
TRACED_COUNT=$(grep "^| T-[0-9]" "$TASKS_FILE" 2>/dev/null | \
  grep -c "REQ-[A-Z]" 2>/dev/null || true)
TRACED_COUNT=${TRACED_COUNT:-0}

UNTRACED=$((TASK_COUNT - TRACED_COUNT))

if [ "$UNTRACED" -gt 0 ]; then
  echo "[task-tracer] ⚠  $UNTRACED of $TASK_COUNT task(s) lack REQ-* traceability."
  echo "              Each task row should reference the requirement it implements."
  echo "              Example: | T-001 | Implement auth | M | — | REQ-AUTH-001 |"
  echo "              Run sdd_run_analysis to get a full traceability report."
else
  echo "[task-tracer] ✓  All $TASK_COUNT task(s) trace to at least one requirement."
fi

exit 0
