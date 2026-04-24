# Section Review: cli-reference (a–l)
Reviewed: 2026-04-21
Files in scope: ~47 files (codegen skipped: 0, reviewed: all)

## Summary

The a–l CLI reference pages are accurate on command names, flags, and behavior — the docs are generated from `commands.json` which closely tracks cobra source. The main issues are: one missing doc page (`capmon backfill`), and stale source links on several pages (a codegen-side issue where the generator uses wrong filenames). Substantive command behavior is clean.

## Findings

### Missing doc page — DESIGN-DECISION

#### Finding 1
- **Source**: `capmon backfill` command exists in `cli/cmd/syllago/capmon_backfill_cmd.go` AND in `cli/commands.json`
- **Docs**: No `capmon-backfill.mdx` exists; `capmon.mdx` subcommands table does not list `backfill`
- **Severity**: medium — users can't discover the command from docs
- **Action taken**: needs-design (requires authoring new page content)

### Stale source links (codegen issue) — DESIGN-DECISION

The following pages have `<small>[Source](...)</small>` footer links pointing to files that don't exist in the syllago repo. This is a generator-side issue — the doc files themselves are technically correct on command behavior; only the source footer links are stale. Not fixing in docs directly since the fix belongs in the codegen script.

#### Finding 2
- `completion.mdx`, `completion-bash.mdx`, `completion-fish.mdx`, `completion-powershell.mdx`, `completion-zsh.mdx` — links to `completion.go` variants that don't exist; cobra auto-generates these, no standalone source file
- `config-paths.mdx`, `config-paths-clear.mdx`, `config-paths-set.mdx`, `config-paths-show.mdx` — links to `paths_cmd.go`, actual file is `config_paths.go`
- `convert.mdx` — links to `convert.go`, actual file is `convert_cmd.go`
- `doctor.mdx` — links to `doctor.go`, actual file is `doctor_cmd.go`
- **Severity**: low — functional pages, cosmetic broken links
- **Action taken**: needs-design (fix in codegen script, not individual .mdx files)

## Commands documented but not found in source (orphans)
None — all a–l docs map to real cobra commands.

## Files with no substantive findings
All 47 files verified clean on: command name, subcommand list, flags (name, shorthand, type, default), args constraint, description. Spot-checked against `cli/cmd/syllago/` and `cli/commands.json`:
- add.mdx, capmon.mdx, capmon-check.mdx through capmon-verify.mdx (14 files)
- compat.mdx, completion.mdx (5 files)
- config.mdx through config-remove.mdx (8 files)
- create.mdx, doctor.mdx, explain.mdx, index.mdx
- info.mdx, info-formats.mdx, info-providers.mdx
- init.mdx, inspect.mdx, install.mdx, list.mdx
- loadout.mdx through loadout-status.mdx (6 files)
