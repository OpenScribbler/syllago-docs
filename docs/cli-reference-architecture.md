# CLI Reference Architecture

*Date: 2026-02-27*
*Status: Design finalized*

## Overview

The CLI reference section of syllago-docs uses a **per-command page structure** with auto-generated content from syllago's Cobra command tree, augmented by hand-authored MDX for editorial content.

## Design Decisions

### Page structure
- Every command gets its own page
- Every subcommand gets its own page
- Parent commands (registry, sandbox, config) are index pages that list and link to their subcommands
- Consistent hierarchy throughout — no exceptions for simpler command groups

### Data pipeline

```
syllago repo (Go)                        syllago-docs repo (Astro)
─────────────────                      ────────────────────────
Cobra command tree                     Sync script fetches commands.json
       │                               from latest GitHub release
  make build                                    │
       │                               Generates MDX per command
  Go script walks Cobra tree            in content collection
       │                                        │
  commands.json generated               Hand-authored MDX pages
  as release artifact                   wrap with examples/context
       │                                        │
  CI freshness check                    Renders at build time
  (fails if stale)
```

- **Source of truth:** syllago's Go source (Cobra command definitions)
- **Export format:** `commands.json` — structured JSON manifest of all commands
- **Generation:** Automatic during `make build`, published as a GitHub release artifact alongside binaries
- **Drift prevention:** CI step regenerates JSON and fails if output differs from committed version
- **Docs consumption:** Adapted from the Aembit `GithubFetchContent` pattern — prebuild sync script fetches `commands.json` from the latest syllago release and generates content collection entries

### Content split

**Auto-generated (from commands.json):**
- Command identity (name, display name, synopsis)
- Descriptions (short and long)
- Flags with types, defaults, and descriptions
- Inherited/global flags
- Aliases
- Subcommand lists
- Related commands (see also)
- Examples (with comment-style descriptions)
- Source file link

**Hand-authored (in MDX):**
- Richer prose/context beyond the long description
- "In use" terminal demos (future)
- Cross-links to guides and concepts
- Gotchas and caveats

### Versioning
- **No docs version number.** Continuous deployment — push to main = live.
- Docs always reflect the latest released syllago version.
- Editorial improvements (typo fixes, new guides) publish immediately.
- Version-specific docs (starlight-versions plugin) deferred until syllago has multiple active major versions.

### Examples format
All examples for a command live in a single code block with brief comment descriptions:

```bash
# Export a skill to Claude Code
syllago export my-skill --to claude-code

# Export all skills matching a pattern
syllago export "testing-*" --to cursor

# Export to a specific project directory
syllago export my-skill --to claude-code --dir ~/projects/myapp
```

Examples are authored in Cobra's `Example` field in Go source and included in the JSON manifest.

### Index page grouping
- Derived from the `parent` field — no separate category field
- Parent commands form natural groups: Registry, Sandbox, Config
- Top-level commands without children form the "Core Commands" group
- Follows the Deno-style categorized index pattern

### Formatting reference model
- **Content depth and sections:** GitHub CLI (`gh`) — synopsis, description, options, inherited options, aliases, examples, see also
- **Presentation:** mise — clean code blocks, concise layout
- **Design:** syllago-docs' own Starlight/Flexoki theme (no changes)

---

## Schema

### commands.json manifest

```typescript
interface CommandManifest {
  version: string          // manifest schema version
  generatedAt: string      // ISO timestamp
  syllagoVersion: string     // syllago version that generated this
  commands: CommandEntry[]
}

interface CommandEntry {
  // Identity
  name: string              // "export", "registry sync"
  displayName: string       // "Export Content", "Registry Sync"
  slug: string              // "export", "registry-sync"
  parent: string | null     // null for top-level, "registry" for subcommands

  // Core reference
  synopsis: string          // "syllago export <name> --to <provider> [flags]"
  description: string       // Short description (Cobra Short)
  longDescription: string | null  // Extended description (Cobra Long)
  aliases: string[]         // ["e"] if any

  // Flags
  flags: Flag[]             // Command-specific flags
  inheritedFlags: Flag[]    // Global flags (--json, --verbose, etc.)

  // Relationships
  subcommands: string[]     // ["add", "list", "remove"] for parent commands
  seeAlso: string[]         // ["import", "registry items"]

  // Examples
  examples: string | null   // Raw example block with comments

  // Metadata
  source: string            // "cli/cmd/syllago/export.go"
}

interface Flag {
  name: string              // "--to"
  shorthand: string | null  // "-t"
  type: string              // "string", "bool", "int"
  default: string | null
  required: boolean
  description: string
}
```

### Astro content collection

The content collection schema in syllago-docs mirrors the `CommandEntry` interface above, defined via Astro's `defineCollection()` with Zod validation.

---

## Implementation Tasks

1. **syllago repo:** Write Go script to walk Cobra command tree and output `commands.json`
2. **syllago repo:** Add `commands.json` generation to `make build` target
3. **syllago repo:** Add CI freshness check for `commands.json`
4. **syllago repo:** Add `commands.json` to release workflow as an artifact
5. **syllago-docs repo:** Create `commands` content collection with Zod schema
6. **syllago-docs repo:** Write sync script to fetch `commands.json` and generate MDX entries
7. **syllago-docs repo:** Create command page template (renders auto-generated + hand-authored content)
8. **syllago-docs repo:** Create CLI reference index page with grouped layout
9. **syllago-docs repo:** Add `editLink` config to `astro.config.mjs`
10. **Both repos:** Populate Cobra `Example` fields with comment-formatted examples

## Research references

- [GitHub CLI Manual](https://cli.github.com/manual/) — structure and content depth model
- [mise CLI Reference](https://mise.jdx.dev/cli/) — formatting and presentation model
- [Deno CLI Subcommands](https://docs.deno.com/runtime/reference/cli/) — categorized index model
