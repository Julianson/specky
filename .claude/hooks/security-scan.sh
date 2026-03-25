#!/bin/bash
# Security-Scan Hook — Checks for common security issues after agent stops
# Triggered by: Stop

INPUT=$(cat)

# Check for secrets in recently modified files
SECRETS_PATTERN='(api[_-]?key|secret|password|token|credential|private[_-]?key)\s*[:=]\s*["\x27][^\s"'\'']{8,}'

# Get list of modified files from git
MODIFIED_FILES=$(git diff --name-only HEAD 2>/dev/null)

if [[ -n "$MODIFIED_FILES" ]]; then
  FOUND_SECRETS=false
  while IFS= read -r file; do
    if [[ -f "$file" ]] && grep -qiE "$SECRETS_PATTERN" "$file" 2>/dev/null; then
      echo "[security-scan] WARNING: Possible secret detected in $file" >&2
      FOUND_SECRETS=true
    fi
  done <<< "$MODIFIED_FILES"

  if [[ "$FOUND_SECRETS" == "true" ]]; then
    echo "[security-scan] Review flagged files before committing. Run sdd_compliance_check for full audit." >&2
  fi
fi

exit 0
