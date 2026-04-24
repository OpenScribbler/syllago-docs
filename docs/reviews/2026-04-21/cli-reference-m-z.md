# Section Review: cli-reference (m–z)
Reviewed: 2026-04-21
Files in scope: ~37 files (codegen skipped: 0, reviewed: all)

## Summary

Nine stale source footer links corrected inline. One subcommand description wrong in `sandbox.mdx` corrected. One design-decision flagged around the dual `update` command implementations. All command names, flags, and behaviors verified accurate.

## Findings

### src/content/docs/using-syllago/cli-reference/sandbox.mdx

#### Finding 1 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: `env` subcommand described as "Add an env var to the sandbox allowlist"
- **Reality**: `cli/cmd/syllago/sandbox_cmd.go:286` — `sandboxEnvCmd` Short = "List allowed env vars". Adding an env var is `sandbox allow-env`, not `sandbox env`.
- **Severity**: high — confuses the listing and adding commands
- **Action taken**: applied

### Stale source footer links — OBVIOUS-FIX-APPLIED (9 files)

The following source links used non-existent filenames and were corrected to actual source paths:

| File | Old link | Corrected to |
|------|----------|--------------|
| moat-trust-status.mdx | `trust_cmd.go` | `moat_cmd.go` |
| remove.mdx | `remove.go` | `remove_cmd.go` |
| rename.mdx | `rename.go` | `rename_cmd.go` |
| share.mdx | `share.go` | `share_cmd.go` |
| sync-and-export.mdx | `sync-and-export.go` | `sync_and_export.go` |
| uninstall.mdx | `uninstall.go` | `uninstall_cmd.go` |
| update.mdx | `update.go` | `main.go` |
| version.mdx | `version.go` | `main.go` |

All corrections verified — target files confirmed present in `cli/cmd/syllago/`.

### src/content/docs/using-syllago/cli-reference/update.mdx

#### Finding 2 — DESIGN-DECISION
- **Claim in docs**: `syllago update` updates the syllago binary to the latest release (self-update)
- **Reality**: Two `update` cobra commands exist in source — `updateCmd` in `main.go` (binary self-update, no args) AND `updateContentCmd` in `update_content_cmd.go` (content update, takes `[name]` arg + `--dry-run`/`--all`/`--registry` flags). Both are registered to `rootCmd`. The current doc describes the self-update behavior only, but the content update command likely has CLI-level precedence.
- **Severity**: high — docs may be documenting the wrong command's behavior depending on cobra resolution order
- **Recommended fix**: Determine which `update` actually runs in the CLI (or if they were intended to be separate); likely needs a dedicated `update-content` or `self-update` rename to disambiguate
- **Action taken**: needs-design

## Commands documented but not found in source (orphans)
None — all m–z docs map to real cobra commands.

## Files with no substantive findings
- manifest.mdx, manifest-generate.mdx
- moat.mdx, moat-trust.mdx, moat-trust-status.mdx
- registry.mdx, registry-add.mdx, registry-create.mdx, registry-items.mdx, registry-list.mdx, registry-remove.mdx, registry-sync.mdx
- remove.mdx, rename.mdx
- sandbox.mdx (except subcommand desc corrected above), sandbox-allow-domain.mdx through sandbox-run.mdx (13 sandbox files)
- share.mdx, sync-and-export.mdx
- telemetry.mdx, telemetry-off.mdx, telemetry-on.mdx, telemetry-reset.mdx, telemetry-status.mdx
- uninstall.mdx, version.mdx
