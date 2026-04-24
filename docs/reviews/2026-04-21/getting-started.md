# Section Review: getting-started/
Reviewed: 2026-04-21
Files in scope: 3 (codegen skipped: 0, reviewed: 3)

## Summary

Generally accurate and end-to-end quick-start verified to work. One fix applied (Go version requirement), one terminology drift flagged as a design decision. All 15 providers in `core-concepts.mdx` match `providers.json`. Command sequences in `quick-start.mdx` all verified against cobra source.

## End-to-end quick-start walkthrough check

All commands in the quick-start sequence exist and behave as documented:
- `syllago init [--yes]` — correct
- `syllago add <type>/<name> --from <provider>` — correct syntax
- `syllago install <name> --to <provider>` — correct
- `syllago share <name> --to <registry>` — correct
- `syllago` (no args) launches TUI — confirmed via `main.go` RunE

## Findings

### src/content/docs/getting-started/installation.mdx

#### Finding 1 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: "Go 1.25+" (3 occurrences in requirements table, `go install` section, and from-source section)
- **Reality (syllago source)**: `cli/go.mod` declares `go 1.26`. Installing with Go 1.25 will fail at compile time.
- **Severity**: high — users on Go 1.25 who follow docs will get a build failure with no actionable error message
- **Recommended fix**: Replace all three `1.25` references with `1.26`
- **Action taken**: applied (confirmed in git diff — 3 occurrences updated)

### src/content/docs/getting-started/core-concepts.mdx

#### Finding 2 — DESIGN-DECISION
- **Claim in docs**: Uses the term "syllago format" to describe the canonical representation
- **Reality (syllago source)**: `ARCHITECTURE.md`, `docs/design/`, and all internal docs consistently use "canonical format" (not "syllago format"). The phrase "syllago format" only appears incidentally in planning documents.
- **Severity**: low — doesn't break anything, but inconsistency with source and rest of the docs creates friction for users who read both
- **Recommended fix**: Replace "syllago format" with "canonical format" throughout `core-concepts.mdx`
- **Action taken**: needs-design (prose edit — deferring to Holden)

## Files with no findings
- src/content/docs/getting-started/quick-start.mdx — all commands verified; directory structure (`~/.syllago/content/`, `.syllago/config.json`) confirmed; `--method symlink/copy` confirmed; provider list matches source
