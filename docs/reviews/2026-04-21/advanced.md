# Section Review: advanced/
Reviewed: 2026-04-21
Files in scope: 4 (codegen skipped: 0, reviewed: 4)

## Summary

The advanced section is mostly accurate. Two concrete bugs were found in `registry-privacy.mdx`: a command that doesn't exist (`syllago loadout publish`) and a wrong argument format for `syllago inspect`. The other two files (`sandbox.mdx`, `team-setup.mdx`, `troubleshooting.mdx`) verified clean against source.

## Findings

### src/content/docs/advanced/registry-privacy.mdx

#### Finding 1 — OBVIOUS-FIX-FLAGGED
- **Claim in docs**: References `syllago loadout publish` to share a loadout to a registry
- **Reality (syllago source)**: No `loadout publish` subcommand exists (`cli/cmd/syllago/`). Sharing to a registry uses `syllago share --to <registry-name>`. The docs also correctly reference `syllago share` elsewhere.
- **Severity**: high
- **Recommended fix**: Replace `syllago loadout publish` with `syllago share <name> --to <registry-name>`
- **Action taken**: flagged (correct replacement needs context from surrounding prose)

#### Finding 2 — OBVIOUS-FIX-FLAGGED
- **Claim in docs**: Example shows `syllago inspect my-skill --json`
- **Reality (syllago source)**: `inspect` requires `<type>/<name>` format, not bare `<name>`. Source `cli/cmd/syllago/inspect_cmd.go` — `Use: "inspect <type>/<name>"`. Running `syllago inspect my-skill` is invalid.
- **Severity**: high
- **Recommended fix**: Change example to `syllago inspect skills/my-skill --json`
- **Action taken**: flagged

## Files with no findings
- src/content/docs/advanced/sandbox.mdx — Linux-only bubblewrap/socat requirement verified correct; all subcommand links resolve
- src/content/docs/advanced/team-setup.mdx — `--verbose/-v`, `--no-color`, `--json`, `NO_COLOR`, `--dry-run` all verified; registry sync/add/install flows verified; error code links resolve
- src/content/docs/advanced/troubleshooting.mdx — `syllago config add`, `syllago list --source`, `syllago info providers`, all error codes verified present in source
