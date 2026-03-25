#!/bin/bash
# Auto-Test Hook — Reminds to generate tests after task completion
# Triggered by: TaskCompleted

echo "[auto-test] Task completed. Consider running sdd_generate_tests or sdd_generate_pbt to verify acceptance criteria." >&2
exit 0
