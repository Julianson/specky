#!/bin/bash
# Changelog Hook — Reminds to update changelog when agent stops
# Triggered by: Stop (only when in .specs/ context)

# Check if any spec files were modified in this session
SPEC_CHANGES=$(git diff --name-only HEAD 2>/dev/null | grep -c "\.specs/" 2>/dev/null)

if [[ "$SPEC_CHANGES" -gt 0 ]]; then
  echo "[changelog] $SPEC_CHANGES spec file(s) modified. Consider running sdd_generate_docs to update project documentation." >&2
fi

exit 0
