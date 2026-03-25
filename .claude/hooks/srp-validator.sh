#!/bin/bash
# SRP-Validator Hook — Flags large files that may violate Single Responsibility Principle
# Triggered by: PostToolUse (Edit|Write)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [[ -z "$FILE_PATH" ]] || [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Skip non-source files
if [[ "$FILE_PATH" != *.ts ]] && [[ "$FILE_PATH" != *.py ]] && [[ "$FILE_PATH" != *.js ]] && [[ "$FILE_PATH" != *.java ]] && [[ "$FILE_PATH" != *.cs ]]; then
  exit 0
fi

# Count lines
LINE_COUNT=$(wc -l < "$FILE_PATH" 2>/dev/null | tr -d ' ')

if [[ "$LINE_COUNT" -gt 300 ]]; then
  echo "[srp-validator] WARNING: $FILE_PATH has $LINE_COUNT lines (>300). Consider splitting for Single Responsibility." >&2
fi

exit 0
