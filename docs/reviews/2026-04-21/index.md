# Docs Accuracy Review — 2026-04-21

Verified all manually-authored content in `src/content/docs/` against `/home/hhewett/.local/src/syllago`. Codegen files skipped (confirmed marker present). 9 sub-agents ran; reports written from transcript extraction after rate limit interrupted report-writing.

## Summary

| Section | Reviewed | Applied | Flagged | Design | Critical |
|---------|----------|---------|---------|--------|----------|
| [errors/](errors.md) | 60 | 2 | 0 | 0 | 0 |
| [root/](root.md) | 2 | 0 | 1 | 1 | 0 |
| [advanced/](advanced.md) | 4 | 0 | 2 | 0 | 0 |
| [getting-started/](getting-started.md) | 3 | 1 | 0 | 1 | 0 |
| [moat/](moat.md) | 3 | 0 | 0 | 1 | 0 |
| [reference/](reference.md) | 2 | 5 | 3 | 1 | 1 |
| [using-syllago/ (non-CLI)](using-syllago.md) | 12 | 5 | 0 | 0 | 0 |
| [cli-reference a–l](cli-reference-a-l.md) | 47 | 0 | 0 | 2 | 0 |
| [cli-reference m–z](cli-reference-m-z.md) | 37 | 10 | 0 | 1 | 0 |
| **Total** | **170** | **22** | **6** | **7** | **1** |

## Obvious fixes applied (22 total)

- **errors/moat-001.mdx** — URL bracketing fix
- **getting-started/installation.mdx** — Go version 1.25 → 1.26 (3 occurrences)
- **reference/hooks-v1.mdx** — spec version `1.0.0-draft` → `0.1.0`; `hooks/1.0` → `hooks/0.1`; `osx` → `darwin`; handler type description; `timeout_action` + `status_message` fields added
- **using-syllago/tui.mdx** — `u`→`x` (uninstall), `r`→`d` (remove); removed non-existent `c` (copy), `H` (toggle hidden), `Ctrl+N/Ctrl+P` keys
- **using-syllago/collections/loadouts.mdx** — `syllago loadout create <name>` → `syllago loadout create` (interactive, no arg)
- **using-syllago/collections/index.mdx** — `syllago loadout remove <name>` → `syllago loadout remove`
- **cli-reference/sandbox.mdx** — `env` subcommand description: "Add an env var" → "List allowed env vars"
- **cli-reference/ (9 files)** — stale source footer links corrected (moat-trust-status, remove, rename, share, sync-and-export, uninstall, update, version)

## Design decisions for Holden

1. **advanced/registry-privacy.mdx** — `syllago loadout publish` doesn't exist; the correct command is `syllago share --to <registry-name>` but surrounding prose needs rewriting
2. **advanced/registry-privacy.mdx** — `syllago inspect my-skill --json` → must use `<type>/<name>` syntax: `syllago inspect skills/my-skill --json`
3. **getting-started/core-concepts.mdx** — uses "syllago format" throughout; project convention is "canonical format"
4. **moat/index.mdx** — `syllago registry approve <name>` referenced in recovery steps for exit 11 but the command is NOT implemented (only appears in error message strings). Needs actual recovery path.
5. **reference/compare-providers.mdx** — loadouts listed as content type in cross-provider matrix; project memory says they should never appear there. Requires removing the row.
6. **reference/compare-providers.mdx** — `agent_stop` copilot-cli shows `—` but providers.json says `agentStop`; `before_model`/`after_model`/`before_tool_selection` listed as Gemini-only but Cursor also supports them; `file_saved` should be `file_changed` for kiro
7. **cli-reference/update.mdx** — two `update` cobra commands exist (self-update in main.go AND content-update in update_content_cmd.go); ambiguous which wins; likely needs a rename

## Out-of-scope notes

- **syllago source bug**: `self-update` appears in 7+ Suggestion strings but the cobra command is `update` — users following Suggestion strings will hit "unknown command"
- **Missing error docs**: MOAT_008 and MOAT_009 exist in source with embedded markdown but have no `.mdx` pages and are absent from errors/index.mdx
- **Missing CLI doc**: `capmon backfill` exists in source and commands.json but has no docs page and isn't listed in capmon.mdx subcommands table
