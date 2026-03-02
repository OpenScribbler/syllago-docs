#!/usr/bin/env bash
# validate-actions.sh — Validate GitHub Action SHA pins in workflow files.
#
# Checks:
#   1. All `uses:` refs are full 40-char hex SHAs (not tags/branches)
#   2. Each SHA actually exists in the referenced repo
#   3. Composite actions don't have transitive deps pinned by tag
#
# Usage:
#   GH_TOKEN=$(gh auth token) bash .github/scripts/validate-actions.sh
#
# Requires: gh CLI (authenticated) or GH_TOKEN/GITHUB_TOKEN env var

set -euo pipefail

ERRORS=0
WORKFLOW_DIR=".github/workflows"

# ---------------------------------------------------------------------------
# Auth: prefer GH_TOKEN, fall back to GITHUB_TOKEN (available on runners)
# ---------------------------------------------------------------------------
TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [[ -z "$TOKEN" ]]; then
  echo "::error::No GH_TOKEN or GITHUB_TOKEN set. Cannot validate SHAs."
  exit 1
fi

AUTH_HEADER="Authorization: token $TOKEN"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
gh_api() {
  # Silent curl against the GitHub API. Returns HTTP body; exits non-zero on
  # network failure. Caller checks HTTP status via response content.
  curl -sf -H "$AUTH_HEADER" -H "Accept: application/vnd.github+json" "$@"
}

annotate_error() {
  local file="$1" line="$2" msg="$3"
  echo "::error file=${file},line=${line}::${msg}"
  (( ERRORS++ ))
}

# ---------------------------------------------------------------------------
# Collect unique action references: owner/repo@ref
# grep -n gives us "file:line:  uses: owner/repo@ref"
# We skip local actions (paths starting with ./) and Docker refs.
# ---------------------------------------------------------------------------
echo "--- Validating GitHub Action SHA pins ---"

# Process substitution keeps the while loop in the current shell so ERRORS
# propagates. A pipe (grep | while) would run the loop in a subshell and
# silently reset ERRORS to 0.
while IFS= read -r match; do
  file="${match%%:*}"
  rest="${match#*:}"
  line="${rest%%:*}"
  content="${rest#*:}"

  # Extract the action reference from the uses: directive
  ref="$(echo "$content" | sed -n 's/.*uses:[[:space:]]*//p' | sed 's/[[:space:]]*#.*//' | xargs)"

  # Skip local actions (./) and Docker refs (docker://)
  if [[ "$ref" == ./* ]] || [[ "$ref" == docker://* ]]; then
    continue
  fi

  # Split into action (owner/repo) and version (the part after @)
  action="${ref%%@*}"
  version="${ref##*@}"

  # ------------------------------------------------------------------
  # Check 1: SHA format — must be exactly 40 hex characters
  # ------------------------------------------------------------------
  if ! [[ "$version" =~ ^[0-9a-f]{40}$ ]]; then
    annotate_error "$file" "$line" \
      "Action '$action' is not pinned to a full SHA (found '$version'). Use a 40-char commit SHA."
    continue  # Can't check existence of a non-SHA ref
  fi

  # ------------------------------------------------------------------
  # Check 2: SHA existence — verify the commit exists in the repo
  # ------------------------------------------------------------------
  api_url="https://api.github.com/repos/${action}/git/commits/${version}"
  if ! gh_api "$api_url" > /dev/null 2>&1; then
    annotate_error "$file" "$line" \
      "SHA '$version' does not exist in '${action}'. The commit may have been force-pushed away or the SHA is wrong."
  fi

  # ------------------------------------------------------------------
  # Check 3: Composite transitive deps — if the action is composite,
  # fetch its action.yml and check that any `uses:` inside also pin
  # to full SHAs.
  # ------------------------------------------------------------------
  # Try action.yml first, then action.yaml
  action_yml=""
  for filename in action.yml action.yaml; do
    contents_url="https://api.github.com/repos/${action}/contents/${filename}?ref=${version}"
    action_yml="$(gh_api "$contents_url" 2>/dev/null || true)"
    if [[ -n "$action_yml" ]]; then
      break
    fi
  done

  if [[ -z "$action_yml" ]]; then
    continue  # Not a local action definition (might be a reusable workflow)
  fi

  # Check if it's a composite action
  is_composite="$(echo "$action_yml" | grep -o '"content"' || true)"
  if [[ -z "$is_composite" ]]; then
    continue
  fi

  # Decode the base64 content and look for uses: directives
  decoded="$(echo "$action_yml" | python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
print(base64.b64decode(data['content']).decode())
" 2>/dev/null || true)"

  if [[ -z "$decoded" ]]; then
    continue
  fi

  # Check if it's actually a composite action (runs.using: composite)
  if ! echo "$decoded" | grep -qE '^\s*using:\s*.*composite'; then
    continue
  fi

  # Find any uses: directives in the composite action
  while IFS= read -r inner_line; do
    inner_ref="$(echo "$inner_line" | sed -n 's/.*uses:[[:space:]]*//p' | sed 's/[[:space:]]*#.*//' | xargs)"

    # Skip empty, local, and Docker refs
    if [[ -z "$inner_ref" ]] || [[ "$inner_ref" == ./* ]] || [[ "$inner_ref" == docker://* ]]; then
      continue
    fi

    inner_version="${inner_ref##*@}"
    inner_action="${inner_ref%%@*}"

    if ! [[ "$inner_version" =~ ^[0-9a-f]{40}$ ]]; then
      annotate_error "$file" "$line" \
        "Composite action '${action}' has transitive dep '${inner_action}@${inner_version}' pinned by tag, not SHA. Consider upgrading to a version that pins its own deps."
    fi
  done < <(echo "$decoded" | grep -E '^\s*uses:')

done < <(grep -rnE '^\s*-?\s*uses:' "$WORKFLOW_DIR")

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
if (( ERRORS > 0 )); then
  echo "::error::Found ${ERRORS} action pinning issue(s). See annotations above."
  exit 1
else
  echo "All action references are properly SHA-pinned."
  exit 0
fi
