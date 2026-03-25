#!/bin/bash
# Spec-Sync Hook — Detects spec-code drift after file edits
# Triggered by: PostToolUse (Edit|Write)
# Reads JSON from stdin with tool_input.file_path

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Only check if a source file was edited (not spec files)
if [[ -z "$FILE_PATH" ]] || [[ "$FILE_PATH" == *".specs/"* ]] || [[ "$FILE_PATH" == *".checkpoints/"* ]]; then
  exit 0
fi

# Check if specs exist
SPEC_DIR=".specs"
if [[ ! -d "$SPEC_DIR" ]]; then
  exit 0
fi

# Log the edit for drift tracking
echo "[spec-sync] Source file modified: $FILE_PATH" >&2
echo "[spec-sync] Consider running sdd_check_sync to verify spec-code alignment." >&2
exit 0
