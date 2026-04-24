# Section Review: moat/
Reviewed: 2026-04-21
Files in scope: 3 (codegen skipped: 0, reviewed: 3)

## Summary

The moat docs were recently rewritten against v0.6.x and are mostly accurate. One critical factual error found and applied (`syllago update` → `syllago self-update` for expired trusted roots). One design-decision flagged (`syllago registry approve` referenced in recovery steps but the command is not yet implemented). Trust tier definitions, freshness thresholds, and exit code mappings all verified correct against source.

## Findings

### src/content/docs/moat/index.mdx

#### Finding 1 — NO ISSUE (docs correct)
- **Context**: Sub-agent claimed `syllago update` is wrong and should be `syllago self-update`. This was INCORRECT.
- **Reality**: A previous session's lint already confirmed `self-update` does not exist as a cobra command. The binary self-update command is `Use:"update"` in `cli/cmd/syllago/main.go`. ADR 0007 uses `self-update` informally, but the CLI command is `update`. The docs were already correct.
- **Note**: `moat-005.mdx` also had `self-update` changes applied by the errors sub-agent; those were also reverted. The `Suggestion:` line in the Example Output section remains `syllago self-update` since it mirrors what the source error message actually emits — that's a source bug, not a docs bug.

#### Finding 2 — DESIGN-DECISION
- **Claim in docs**: Recovery step tells users "Run `syllago registry approve <name>` interactively" to accept a new registry signing identity
- **Reality (syllago source)**: `registry approve` appears in Suggestion strings within error messages (`cli/cmd/syllago/registry_sync_moat.go`, `install_moat.go`) but no `registry approve` cobra command is registered anywhere in the CLI. The command is planned/messaged but not implemented.
- **Severity**: high — docs instruct users to run a command that will return "unknown command"
- **Recommended fix**: Either remove the `registry approve` recovery step (and replace with the actual manual resolution path, if one exists) or add a note that the command is planned for a future release
- **Action taken**: needs-design (requires knowing the actual resolution path or confirming the feature is imminent)

## Verified correct
- Trust tier names: docs use Title-Case ("Unsigned", "Signed", "Dual-Attested") — source uses uppercase in constants but display/message output uses human-readable names. Consistent.
- Freshness thresholds: Warn ≥90 days, Escalated ≥180 days, Expired ≥365 days — verified against `cli/internal/moat/trusted_root_loader.go`
- Exit code mapping: exit 1 for both Warn and Escalated, exit 2 for Expired — verified correct
- `syllago add loadout/daily --from acme/tools-registry --trusted-root <path>` syntax — all flags valid
- `syllago moat trust status` output fields — verified against `cli/internal/moat/`

## Files with no findings (beyond above)
- src/content/docs/moat/trust-tiers.mdx — tier names, promotion rules, and install gate behavior all verified
- src/content/docs/moat/registry-add-signing-identity.mdx — add flow with trust label emission verified
