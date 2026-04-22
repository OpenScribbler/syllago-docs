# Section Review: using-syllago/ (non-CLI-reference)
Reviewed: 2026-04-21
Files in scope: 12 manually-authored
Codegen-skipped: using-syllago/content-types/hooks.mdx, content-types/index.mdx, providers/index.mdx (confirmed markers)

## Summary

The TUI docs have significant keybinding drift — multiple keys are wrong or document keys that don't exist. Two loadout command examples have wrong argument syntax. `format-conversion.mdx` and `syllago-yaml.mdx` are clean. Collections docs are mostly correct with only the argument drift.

## Findings

### src/content/docs/using-syllago/tui.mdx

#### Finding 1 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: `u` — uninstall
- **Reality**: `cli/internal/tui/keys.go` — uninstall is bound to `x`, not `u`
- **Severity**: high
- **Action taken**: applied

#### Finding 2 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: `r` — remove from library
- **Reality**: `cli/internal/tui/keys.go` — remove is bound to `d`, not `r`
- **Severity**: high
- **Action taken**: applied

#### Finding 3 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: `c` — copy
- **Reality**: No `copy` keybinding exists in `keys.go` or any TUI handler
- **Severity**: medium — documents a non-existent action
- **Action taken**: applied (row removed)

#### Finding 4 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: `H` — toggle hidden items
- **Reality**: No toggle-hidden keybinding exists in `keys.go`
- **Severity**: medium
- **Action taken**: applied (row removed)

#### Finding 5 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: `Ctrl+N` / `Ctrl+P` — navigate items
- **Reality**: Not in `keys.go`. Standard `j`/`k` navigation is confirmed; `Ctrl+N`/`Ctrl+P` are not registered.
- **Severity**: low
- **Action taken**: applied (rows removed)

### src/content/docs/using-syllago/collections/loadouts.mdx

#### Finding 6 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: `syllago loadout create <name>` (with positional name argument)
- **Reality**: `cli/cmd/syllago/loadout_cmd.go` — `loadout create` is interactive and takes no arguments. `cobra.Args: cobra.NoArgs`.
- **Severity**: high — running `syllago loadout create my-loadout` returns an error
- **Action taken**: applied (example changed to `syllago loadout create`)

### src/content/docs/using-syllago/collections/index.mdx

#### Finding 7 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: `syllago loadout remove <name>` in the quick-reference table
- **Reality**: Same as above — `loadout remove` takes no args in cobra source
- **Severity**: medium
- **Action taken**: applied (example changed to `syllago loadout remove`)

## Files with no findings
- src/content/docs/using-syllago/format-conversion.mdx — conversion pipeline, provider formats, and compat claims all verified against `docs/cross-provider-conversion-reference.md`
- src/content/docs/using-syllago/syllago-yaml.mdx — all field names, types, and defaults verified against `cli/syllago-yaml-schema.json`
- src/content/docs/using-syllago/collections/library.mdx — verified clean
- src/content/docs/using-syllago/collections/registries.mdx — verified clean
- src/content/docs/using-syllago/content-types/agents.mdx — verified clean
- src/content/docs/using-syllago/content-types/commands.mdx — verified clean
- src/content/docs/using-syllago/content-types/mcp-configs.mdx — verified clean
- src/content/docs/using-syllago/content-types/rules.mdx — verified clean
- src/content/docs/using-syllago/content-types/skills.mdx — verified clean
- src/content/docs/using-syllago/tui.mdx — all confirmed keybindings verified (`j`/`k`, `Enter`, `Esc`, `Tab`/`Shift+Tab`, `i`, `a`)
