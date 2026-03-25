#!/bin/bash
# Auto-Docs Hook — Flags when documentation may need updating
# Triggered by: PostToolUse (Edit|Write)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Only flag for source files, not docs/specs
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Check if the edited file is a significant source file
if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.py ]] || [[ "$FILE_PATH" == *.js ]] || [[ "$FILE_PATH" == *.java ]] || [[ "$FILE_PATH" == *.cs ]]; then
  if [[ "$FILE_PATH" != *"test"* ]] && [[ "$FILE_PATH" != *".specs/"* ]] && [[ "$FILE_PATH" != *"hooks/"* ]]; then
    echo "[auto-docs] Source file modified: $FILE_PATH — documentation may need updating." >&2
  fi
fi

exit 0
