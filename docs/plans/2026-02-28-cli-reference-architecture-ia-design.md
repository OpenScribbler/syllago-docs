# CLI Reference Architecture — Information Architecture Design

**Goal:** Design the CLI Reference section of syllago-docs as a per-command page structure with auto-generated content from syllago's Cobra command tree.

**Decision Date:** 2026-02-28

---

## Executive Summary

The CLI Reference section is pure Reference documentation (Diataxis). It serves one primary action: **Use** (lookup — syntax, flags, defaults, examples), with limited **Troubleshoot** coverage for validated, obvious issues only. Conceptual content, onboarding, and tutorials live elsewhere in syllago-docs.

The section uses a dual-navigation model: a workflow-grouped index page for discovery, and an alphabetical sidebar for direct lookup. Every command and subcommand gets its own page. Content is auto-generated from syllago's Cobra command tree via a JSON manifest, with hand-authored editorial additions in MDX.

---

## Audience Analysis

### Identified Personas

| Persona | Priority | How They Use CLI Reference |
|---------|----------|---------------------------|
| End users | P1 | Look up command syntax, flags, examples for day-to-day use |
| Content creators | P1 | Reference for publishing workflows (import, export, registry commands) |
| Registry maintainers | P2 | Reference for registry management commands |
| New evaluators | P2 | Scan available commands to understand syllago's scope |

### Action Mapping

| Action | Coverage in CLI Reference | Notes |
|--------|--------------------------|-------|
| **Use** | PRIMARY | Syntax, flags, defaults, examples — the core purpose |
| **Troubleshoot** | LIMITED | Only validated, obvious issues. Not enough user data yet for comprehensive troubleshooting |
| **Onboard** | WAYFINDING ONLY | Link to Getting Started, not covered here |
| **Adopt** | WAYFINDING ONLY | Link to guides, not covered here |
| **Administer** | NOT APPLICABLE | — |
| **Optimize** | NOT APPLICABLE | — |
| **Offboard** | NOT APPLICABLE | — |

---

## Entry Points

Users arrive at CLI Reference pages from all directions. Every page must work as a standalone landing.

| Entry Point | Implication |
|-------------|-------------|
| Sidebar navigation | Alphabetical listing must be scannable |
| Search (Pagefind) | Page titles must include full command name |
| Links from other docs pages | How-to guides link to command pages for full flag details |
| Terminal (`--help` links) | Help output could link to docs URL for each command |

---

## Navigation Structure

### Dual-Navigation Model

**Index page** — Grouped by workflow (what are you trying to do?)
**Sidebar** — Alphabetical with nesting (what command are you looking for?)

### Index Page Layout

Grouped by workflow with table format:

| Group | Commands |
|-------|----------|
| **Core Commands** | import, export, init, info, update, version, completion |
| **Registry Management** | registry add, registry items, registry list, registry remove, registry sync |
| **Sandbox** | sandbox run, sandbox check, sandbox info, sandbox allow-domain, sandbox deny-domain, sandbox domains, sandbox allow-env, sandbox deny-env, sandbox env, sandbox allow-port, sandbox deny-port, sandbox ports |
| **Configuration** | config add, config list, config remove |

### Sidebar Structure

Alphabetical top-level, subcommands nested. Short labels in sidebar, full command name in page title.

```
CLI Reference
├── completion
├── config
│   ├── add
│   ├── list
│   └── remove
├── export
├── import
├── info
├── init
├── registry
│   ├── add
│   ├── items
│   ├── list
│   ├── remove
│   └── sync
├── sandbox
│   ├── allow-domain
│   ├── allow-env
│   ├── allow-port
│   ├── check
│   ├── deny-domain
│   ├── deny-env
│   ├── deny-port
│   ├── domains
│   ├── env
│   ├── info
│   ├── ports
│   └── run
├── update
└── version
```

---

## Per-Command Page Structure

### Diataxis Type: Reference

Every command page follows the same layout:

1. **Title** — Full command path (e.g., `syllago sandbox allow-domain`)
2. **Intro paragraph** — Description text (no separate heading)
3. **Synopsis** — Usage syntax in code block
4. **Options** — Table: flag, type, default, description
5. **Global Options** — Inherited flags (same on every page)
6. **Aliases** — Short names if any
7. **Examples** — Single code block with comment-per-example
8. **See Also** — Links to related commands
9. **Source link** — Link to Go source file on GitHub

### Example Page

```markdown
# syllago export

Export copies content from your local syllago store to a provider's
configuration directory. Syllago handles format conversion automatically.

## Synopsis

\`\`\`
syllago export <name> --to <provider> [flags]
\`\`\`

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--to` `-t` | string | | Target provider (required) |
| `--dir` | string | | Override install directory |
| `--dry-run` | bool | false | Show what would be exported |

## Global Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | bool | false | Output in JSON format |
| `--verbose` `-v` | bool | false | Verbose output |
| `--quiet` `-q` | bool | false | Suppress non-essential output |
| `--no-color` | bool | false | Disable color output |

## Aliases

`syllago e`

## Examples

\`\`\`bash
# Export a skill to Claude Code
syllago export my-skill --to claude-code

# Preview what would be exported
syllago export my-skill --to cursor --dry-run

# Export to a specific directory
syllago export my-skill --to claude-code --dir ~/projects/app
\`\`\`

## See Also

- [syllago import](/cli-reference/import) — Bring content in
- [syllago registry items](/cli-reference/registry/items) — Browse content

---
*Source: [cli/cmd/syllago/export.go](https://github.com/OpenScribbler/syllago/blob/main/cli/cmd/syllago/export.go)*
```

### Parent Command Pages (Index Pages)

Parent commands (config, registry, sandbox) get index pages that:
- Open with a description paragraph
- Show available subcommands in a table
- Link to each subcommand page
- Include the parent command's own flags (if any)

---

## Data Pipeline

Content is auto-generated from syllago's Cobra command tree:

1. **Go script** walks Cobra command tree, outputs `commands.json`
2. **`make build`** auto-regenerates the manifest
3. **CI** verifies freshness (fails if stale)
4. **Release workflow** publishes `commands.json` as a release artifact
5. **syllago-docs prebuild** fetches `commands.json` from latest release
6. **Sync script** generates content collection MDX files
7. **Hand-authored MDX** can wrap/extend auto-generated content

### Schema

See `docs/cli-reference-architecture.md` for the full `commands.json` schema (CommandManifest, CommandEntry, Flag interfaces).

---

## Cross-Linking Strategy

### Wayfinding Out of CLI Reference

| From | Link To | Why |
|------|---------|-----|
| CLI Reference index | Getting Started | New users who landed here first |
| Individual command pages | Related how-to guides | "For a walkthrough, see..." |
| Import/export pages | Content Types page | Explain what types exist |
| Registry commands | Registries guide | How registries work conceptually |
| Sandbox commands | Sandbox guide | Why sandboxing, how it works |

### Wayfinding Into CLI Reference

| From | Link To | Why |
|------|---------|-----|
| Getting Started / Quick Start | Key commands (import, export) | "For full options, see..." |
| How-to guides | Specific command pages | Flag reference after showing task |
| Provider pages | Export command | How to export to that provider |

---

## Formatting Conventions

- **Content depth:** GitHub CLI (`gh`) model — comprehensive per-command pages
- **Presentation:** mise model — clean code blocks, concise layout
- **Design:** syllago-docs Starlight/Flexoki theme (no changes)
- **Examples:** Single code block per command, brief comment above each example
- **Flag tables:** Consistent columns: Flag, Type, Default, Description

---

## Page Count

| Category | Pages |
|----------|-------|
| Index page | 1 |
| Core commands | 7 (completion, export, import, info, init, update, version) |
| Config (index + 3 subcommands) | 4 |
| Registry (index + 5 subcommands) | 6 |
| Sandbox (index + 12 subcommands) | 13 |
| **Total** | **31** |

---

## Open Questions

None — all decisions resolved during brainstorm session.

---

## Next Steps

Ready for content planning with Plan workflow.
