# Section Review: reference/ (manually-authored files only)
Reviewed: 2026-04-21
Files in scope: 2 manually-authored (compare-providers.mdx, hooks-v1.mdx)

## Codegen-skipped (confirmed markers present)
- reference/canonical-keys/*.mdx (40 files) — `AUTO-GENERATED` on line 6
- reference/agents-matrix.mdx — `AUTO-GENERATED` on line 6
- reference/commands-matrix.mdx — `AUTO-GENERATED` on line 6
- reference/mcp-configs-matrix.mdx — `AUTO-GENERATED` on line 6
- reference/rules-matrix.mdx — `AUTO-GENERATED` on line 6
- reference/skills-matrix.mdx — `AUTO-GENERATED` on line 6
- reference/capabilities-matrix.mdx — `AUTO-GENERATED` on line 6
- reference/telemetry.mdx — `AUTO-GENERATED` on line 6
- reference/hook-events.mdx — `AUTO-GENERATED` on line 6

## Summary

`hooks-v1.mdx` had significant version and schema drift from the canonical spec (the spec moved from `1.0.0-draft` to `0.1.0`, several fields changed). Five obvious fixes applied inline. `compare-providers.mdx` has three flagged issues: one design decision (loadouts in matrix), two factual errors in the hook event mapping table.

## Findings

### src/content/docs/reference/hooks-v1.mdx

#### Finding 1 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: Spec version `1.0.0-draft`, canonical format `hooks/1.0`, frontmatter description includes "v1.0.0-draft"
- **Reality**: Spec source (`cli/internal/hooks/spec/`) declares version `0.1.0`. Per SemVer, this is pre-1.0 and anything MAY change.
- **Severity**: critical — tooling that reads the `spec` field will reject documents using `hooks/1.0`
- **Action taken**: applied (3 occurrences: frontmatter description, body version string, `spec` field value, Aside wording)

#### Finding 2 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: Platform field OS keys are `windows`, `linux`, `osx`
- **Reality**: Spec uses `windows`, `linux`, `darwin` (POSIX `uname -s` convention). `osx` is not a valid key.
- **Severity**: high — hooks with `osx` overrides silently fail on macOS
- **Action taken**: applied

#### Finding 3 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: Handler `type` field description says `"command"`, `"http"`, `"prompt"`, or `"agent"` are all valid required types
- **Reality**: Spec requires `"command"` support; `"http"`, `"prompt"`, `"agent"` are defined in the Capability Registry and require provider opt-in. Treating them as first-class required types overstates compatibility.
- **Severity**: medium
- **Action taken**: applied (description updated to reflect command-only requirement)

#### Finding 4 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: `timeout` field described without timeout action behavior
- **Reality**: Spec adds `timeout_action` field (`"warn"` or `"block"`, default `"warn"`) and clarifies `0` means no timeout
- **Severity**: medium — authors relying on `"block"` behavior to enforce timeouts won't know the field exists
- **Action taken**: applied (`timeout_action` field added to table, `timeout` description updated)

#### Finding 5 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: Handler table does not mention `status_message` field
- **Reality**: Spec defines `status_message` (string, optional — human-readable text shown while hook executes)
- **Severity**: low
- **Action taken**: applied

### src/content/docs/reference/compare-providers.mdx

#### Finding 6 — DESIGN-DECISION
- **Claim in docs**: "Loadouts" appears as a content type row in the provider comparison table
- **Reality**: The `ProviderCompare` component (which drives the rendered table) does NOT include loadouts as a column. Project memory (`MEMORY.md`) records explicitly: "Loadouts are syllago-specific, not a provider content type — never include loadouts as a row/column in cross-provider matrices."
- **Severity**: medium
- **Recommended fix**: Remove loadouts row from the content types comparison table
- **Action taken**: needs-design

#### Finding 7 — OBVIOUS-FIX-FLAGGED
- **Claim in docs**: `agent_stop` event for Copilot CLI shows `—` (not supported)
- **Reality**: `cli/providers.json` records `agentStop` as Copilot CLI's `agent_stop` mapping, indicating support was added after the docs were written
- **Severity**: medium
- **Recommended fix**: Update Copilot CLI `agent_stop` cell to `agentStop`
- **Action taken**: flagged (providers.json and events.md disagree within syllago itself; deferring to Holden for resolution)

#### Finding 8 — OBVIOUS-FIX-FLAGGED
- **Claim in docs**: Provider-Exclusive Events section lists `before_model`, `after_model`, `before_tool_selection` as exclusive to Gemini CLI
- **Reality**: `cli/providers.json` shows Cursor also supports all three. They belong in the standard event mapping table, not the exclusive list.
- **Severity**: medium — misinforms users building for Gemini CLI that these events are unique
- **Recommended fix**: Move these three events out of "Provider-Exclusive" and into the main cross-provider mapping; add Cursor column entries
- **Action taken**: flagged

#### Finding 9 — OBVIOUS-FIX-FLAGGED
- **Claim in docs**: Provider-Exclusive Events lists `file_saved` as a Kiro event
- **Reality**: `cli/providers.json` maps Kiro's file save event to canonical name `file_changed`, not `file_saved`. The `file_saved` canonical name does not exist in the spec.
- **Severity**: medium
- **Recommended fix**: Replace `file_saved` with `file_changed` in the Provider-Exclusive Events table
- **Action taken**: flagged
