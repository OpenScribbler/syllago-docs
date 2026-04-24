# Provider Convention Pages Redesign

**Date:** 2026-04-16
**Status:** Design complete, ready for implementation
**Scope:** Upstream (syllago CLI) + Downstream (syllago-docs)

---

## Problem Statement

The per-provider, per-content-type convention pages (e.g., `/using-syllago/providers/claude-code/rules/`) are poorly structured and don't answer the questions users actually have. Specific problems:

1. **Wall-of-text descriptions.** Provider extensions render multi-paragraph descriptions as single `<p>` tags with no internal structure. The descriptions try to be standalone documentation, replicating content that already exists at the source URL.

2. **Wrong organizational model.** The page is organized around data categories from the schema (Native Format, Mappings to Canonical, Provider-Specific Extensions) rather than around user questions. The section names reflect internal concepts, not user needs.

3. **Canonical mappings table is confusing.** A two-column table (canonical key | mechanism paragraph) is the worst of both worlds — not scannable like a matrix, not readable like prose. The "mechanism" field does double duty: carrying both the native field name and the behavioral explanation.

4. **Artificial separation.** Canonical mappings and provider extensions describe the same thing — features of the provider's content type — but are rendered in completely separate sections. The distinction between "canonicalized" and "not yet canonicalized" is an internal concern, not a user concern.

5. **No sidebar TOC.** All component sections use the `not-content` CSS class, which excludes them from Starlight's automatic "On this page" sidebar. Users can't navigate within the page.

6. **No conversion fate.** The page doesn't answer "what happens to this feature when I convert?" — which is the core question for a format conversion tool's documentation.

---

## The Three User Questions

Through design discussion, we identified three questions that someone visiting `/using-syllago/providers/claude-code/rules/` is actually trying to answer:

1. **"How do I get my Claude Code rules into syllago?"** — Where do files live, what format are they in, how does syllago find them.

2. **"What happens to my rules when syllago converts them?"** — What's preserved, what's translated, what's lost, what generates warnings.

3. **"What's different about this provider's rules?"** — Provider-specific features, quirks, things that don't map cleanly to the canonical vocabulary.

The current page structure doesn't answer any of these well. The matrix pages (`rules-matrix.mdx`, `capabilities-matrix.mdx`) already answer "does this provider support X?" at a cross-provider level, so the per-provider page shouldn't re-answer that. Its job is the depth view: the full feature landscape and the conversion story.

---

## What We Learned from the Syllago Source

We examined the syllago Go CLI source at `../syllago/` to understand the actual conversion behavior. Key files: `skills.go`, `rules.go`, `commands.go`, `embed.go`, `compat.go`, `toolmap.go`, `frontmatter_registry.go`.

### The Three Conversion Fates

Every field and feature has one of three fates during conversion:

**Translated.** The field has a canonical equivalent. Syllago actively maps it to/from the target provider's equivalent. Field names may change, data types may adapt, polarity may flip — but the semantic value is preserved. Example: Claude Code `name` → canonical `display_name` → Codex `name`.

**Embedded as prose.** The field has no canonical equivalent. Syllago appends it to the content body in a conversion notes block marked with `<!-- syllago:converted from="provider-slug" -->`. These blocks are stripped automatically during re-conversion (`StripConversionNotes()`) to prevent layering. This ensures no silent data loss.

**Dropped with warning.** The field can't be meaningfully preserved. Syllago removes it and emits a human-readable warning string. The `Warnings` array in the converter result is always populated when something can't be preserved.

### Content Syntax Translation

Argument substitution syntax is **actively translated** between providers:
- `$ARGUMENTS` (Claude Code) ↔ `{{args}}` (Gemini CLI) ↔ `${input:args}` (VS Code Copilot) ↔ `$1` (Cursor)
- Providers without placeholder support (Windsurf, Cline) receive literal text + warning
- VS Code Copilot named variables (`${input:firstName}`) collapse to `$ARGUMENTS` — lossy, warning generated

Shell injection syntax (`` !`command` ``, ` ```! ` fenced blocks) is **preserved as literal text** but not translated. Target may not execute it. Info-level warning generated.

Provider-specific variables (`${CLAUDE_SKILL_DIR}`, `${CLAUDE_SESSION_ID}`) are **preserved as literal text**. Target will not expand them.

### Core Guarantee

Syllago has a "no silent data loss" guarantee. Every field either maps to canonical, embeds as prose, or generates a warning. Nothing disappears without the user knowing.

---

## Completed Work: Format Conversion Page Rewrite

We rewrote `src/content/docs/using-syllago/format-conversion.mdx` to clearly explain the conversion system. The rewrite adds:

- The three conversion fates (translated, embedded as prose, dropped with warning)
- Argument substitution translation table
- Conversion notes mechanism (`<!-- syllago:converted -->` blocks, auto-stripping)
- "Preserved but may not work" distinction for content syntax
- The no-silent-data-loss guarantee

This page is now the authoritative reference that provider convention tables link to. Key section anchors: `#the-three-conversion-fates`, `#conversion-notes`, `#preserved-but-may-not-work`, `#portability-warnings`.

---

## Schema Contract

This is the interface between the upstream syllago CLI (which generates capability JSON) and the downstream docs site (which renders it). Both repos implement against this contract.

### Changes to `capMappingSchema` (canonicalMappings entries)

**Current shape:**
```json
{
  "supported": true,
  "mechanism": "yaml frontmatter key: name (optional, falls back to directory name)",
  "paths": ["~/.claude/skills/<skill-name>/SKILL.md"]
}
```

**New shape:**
```json
{
  "supported": true,
  "mechanism": "Optional; falls back to directory name",
  "provider_field": "name",
  "extension_id": "display_name_ext",
  "paths": [".claude/skills/<skill-name>/SKILL.md"]
}
```

**New fields:**

- **`provider_field`** (string, optional) — The actual native field name when this canonical mapping corresponds to a specific frontmatter key, config key, or TOML field. Examples: `"name"`, `"description"`, `"user-invocable"`, `"policy.allow_implicit_invocation"` (nested dot-notation for Codex). Null/omitted when the mapping is structural or behavioral (like `hierarchical_loading` or `project_scope`).

- **`extension_id`** (string, optional) — The `id` of a providerExtension entry that describes the same concept in provider-specific detail. Used to merge overlapping entries in the UI. When present, the component renders one unified row using the extension's name/summary but linking to the canonical key detail page. This field lives on the canonical side (not the extension side) because the canonical mapping is the authority — the extension is the detail.

**Changes to existing fields:**

- **`mechanism`** — No longer needs to carry the native field name (that's in `provider_field` now). Should be a short behavioral note: "Optional; falls back to directory name" rather than "yaml frontmatter key: name (optional, falls back to directory name)".

### Changes to `capExtensionSchema` (providerExtensions entries)

**Current shape:**
```json
{
  "id": "allowed_tools",
  "name": "Allowed Tools Pre-Approval",
  "description": "Frontmatter field allowed-tools grants permission for the listed tools while the skill is active, so Claude can use them without prompting the user for per-use approval. It does not restrict which tools are available — all tools remain callable. Accepts a space-separated string or a YAML list. Individual tool calls can be scoped using parenthetical syntax (e.g., Bash(git commit *)).",
  "source_ref": "https://code.claude.com/docs/en/skills.md#pre-approve-tools-for-a-skill",
  "required": null,
  "value_type": "string | string[]",
  "examples": [
    {
      "title": "Example",
      "lang": "yaml",
      "code": "allowed-tools: Read Grep Bash(git commit *)",
      "note": "Scoped Bash permission for git commits only."
    }
  ]
}
```

**New shape:**
```json
{
  "id": "allowed_tools",
  "name": "Allowed Tools Pre-Approval",
  "summary": "Pre-approve tools so Claude can use them without per-use prompts.",
  "source_ref": "https://code.claude.com/docs/en/skills.md#pre-approve-tools-for-a-skill",
  "required": null,
  "value_type": "string | string[]",
  "examples": [...],
  "provider_field": "allowed-tools",
  "conversion": "embedded"
}
```

**Renamed fields:**

- **`description` → `summary`** — One sentence, ~150 characters max. The page links to `source_ref` for deep dives; the summary's job is to tell you what the feature is, not to teach you how to use it. This is a breaking rename, but the migration cost is absorbed by the broader enrichment pass (all 57 files are being updated for the new fields anyway).

**New fields:**

- **`provider_field`** (string, optional) — The actual native field name when this extension describes a frontmatter key, config key, or TOML field. Examples: `"allowed-tools"`, `"trigger"`, `"model"`, `"policy.allow_implicit_invocation"`. Null/omitted when the extension describes a structural convention or behavioral feature. This field also serves as the UI grouping signal: entries with `provider_field` appear in the "fields" group; entries without it appear in "other."

- **`conversion`** (string enum, required) — What happens to this feature during format conversion. One of:
  - `"translated"` — Maps to a canonical key, actively converted between providers. Only used on extensions that overlap with a canonical mapping (linked via `extension_id` on the canonical side).
  - `"embedded"` — No canonical equivalent. Appended to content body as a conversion notes block during conversion. No silent data loss.
  - `"dropped"` — Removed during conversion. Portability warning emitted. Used when the feature can't be meaningfully preserved (e.g., provider-specific toggle with no target equivalent).
  - `"preserved"` — Content syntax that survives in the body text but the target may not interpret it. Used for shell injection syntax, provider-specific variables, template directives.
  - `"not-portable"` — Feature is inherently tied to the provider's runtime/environment and cannot meaningfully exist in another context. Used for things like nested directory auto-discovery, plugin namespace scoping, bundled skill behavior.

**Removed fields:**

- `description` — Replaced by `summary`. See rationale above.

**Unchanged fields:**

- `id`, `name`, `source_ref`, `required`, `value_type`, `examples` — No changes.

### Fields we considered and rejected

- **`category`** (`"field"` | `"structure"` | `"behavior"`) — Rejected after review. The boundaries between categories are ambiguous in practice: `shell_command_injection` is both a behavior (runtime execution) and a field (it has a `disableSkillShellExecution` policy toggle). `nested_directory_discovery` is both structure and behavior. Rather than forcing a classification that will rot, we derive grouping from `provider_field` presence: if it has a native field name, it's a field; if not, it's everything else. Simpler, and the component doesn't need a three-way enum to render two groups.

- **`canonical_key`** (on extensions, pointing to the canonical mapping) — Rejected in favor of `extension_id` on the canonical mapping side. The canonical mapping is the authority; the extension is the provider-specific detail. The authority should point to the detail, not the other way around. This also means fewer entries to maintain (canonical mappings are the smaller set).

### Decision rationale: Steinberger and Karpathy review

We ran the schema proposal through two reviewer personas:

**Steinberger** (data architect) said:
- `provider_field` and `conversion` are solid, ship them.
- Don't rename `description` → `summary` as a breaking change; add `summary` alongside.
- Drop `category` — it's underspecified and will rot. Derive grouping from `provider_field` presence.
- Move the cross-reference to canonical mappings as `extension_id` (authority points to detail).

**Karpathy** (systems thinker) said:
- The split is right — independent dimensions.
- `conversion` is the riskiest field (~80% LLM accuracy initially). Mitigate with source citations.
- `canonical_key` linking will rot as providers grow; treat as advisory.
- `summary` replacing `description` is correct.
- `required: null` is rarely used; consider removing.

**What we adopted:**
- Steinberger's `category` rejection — derive grouping from `provider_field` instead.
- Steinberger's `extension_id` on canonical side — correct dependency direction.
- Karpathy's endorsement of `conversion` with the note about LLM accuracy.
- Holden's original instinct to drop `description` entirely (not keep both). The 57-file migration is happening anyway; clean cut is better than gradual.

**What we noted but deferred:**
- Karpathy's suggestion to make `source_ref` mandatory and citation-specific for `conversion` values. Good idea for accuracy, can be added later.
- Karpathy's note about `required: null` being rarely used. Existing field, out of scope for this change.

---

## Full Example: Claude Code Skills (After Enrichment)

This shows what a complete capability JSON file looks like after all schema changes are applied.

```json
{
  "id": "claude-code-skills",
  "provider": "claude-code",
  "contentType": "skills",
  "status": "supported",
  "lastChangedAt": "2026-04-11T00:00:00Z",
  "sources": [
    {
      "uri": "https://code.claude.com/docs/en/skills.md",
      "type": "documentation",
      "fetched_at": "2026-04-11T21:49:46Z"
    }
  ],
  "canonicalMappings": {
    "canonical_filename": {
      "supported": true,
      "mechanism": "Fixed filename SKILL.md required inside skill directory",
      "provider_field": null
    },
    "custom_filename": {
      "supported": true,
      "mechanism": "Directory name is the skill identifier",
      "provider_field": null,
      "paths": [".claude/skills/<name>/SKILL.md"]
    },
    "description": {
      "supported": true,
      "mechanism": "Recommended",
      "provider_field": "description"
    },
    "disable_model_invocation": {
      "supported": true,
      "mechanism": "Bool, default false",
      "provider_field": "disable-model-invocation"
    },
    "display_name": {
      "supported": true,
      "mechanism": "Optional; falls back to directory name",
      "provider_field": "name"
    },
    "global_scope": {
      "supported": true,
      "mechanism": "User home directory",
      "provider_field": null,
      "paths": ["~/.claude/skills/<skill-name>/SKILL.md"]
    },
    "project_scope": {
      "supported": true,
      "mechanism": "Committed to version control",
      "provider_field": null,
      "paths": [".claude/skills/<skill-name>/SKILL.md"]
    },
    "shared_scope": {
      "supported": true,
      "mechanism": "Managed settings deployment for organization-wide distribution",
      "provider_field": null
    },
    "user_invocable": {
      "supported": true,
      "mechanism": "Bool, default true",
      "provider_field": "user-invocable"
    }
  },
  "providerExtensions": [
    {
      "id": "allowed_tools",
      "name": "Allowed Tools Pre-Approval",
      "summary": "Pre-approve tools so Claude can use them without per-use prompts.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#pre-approve-tools-for-a-skill",
      "required": null,
      "value_type": "string | string[]",
      "provider_field": "allowed-tools",
      "conversion": "embedded"
    },
    {
      "id": "model_override",
      "name": "Per-Skill Model Override",
      "summary": "Override the session model for the duration of this skill.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#frontmatter-reference",
      "provider_field": "model",
      "conversion": "embedded"
    },
    {
      "id": "effort_override",
      "name": "Per-Skill Effort Level",
      "summary": "Override session effort level (low/medium/high/max) during this skill.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#frontmatter-reference",
      "provider_field": "effort",
      "conversion": "embedded"
    },
    {
      "id": "argument_hint",
      "name": "Argument Hint",
      "summary": "Hint string shown during autocomplete (e.g., '[issue-number]').",
      "source_ref": "https://code.claude.com/docs/en/skills.md#frontmatter-reference",
      "provider_field": "argument-hint",
      "conversion": "dropped"
    },
    {
      "id": "subagent_execution",
      "name": "Subagent Execution",
      "summary": "Run the skill in an isolated subagent via context: fork.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#run-skills-in-a-subagent",
      "provider_field": "context",
      "conversion": "embedded"
    },
    {
      "id": "skill_scoped_hooks",
      "name": "Skill-Scoped Lifecycle Hooks",
      "summary": "Attach hooks scoped to this skill's lifecycle events.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#frontmatter-reference",
      "provider_field": "hooks",
      "conversion": "embedded"
    },
    {
      "id": "path_activation_filter",
      "name": "Path-Based Activation Filter",
      "summary": "Glob patterns that limit when Claude auto-activates this skill.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#frontmatter-reference",
      "provider_field": "paths",
      "conversion": "embedded"
    },
    {
      "id": "shell_selection",
      "name": "Per-Skill Shell Selection",
      "summary": "Select bash or powershell for inline command execution blocks.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#frontmatter-reference",
      "provider_field": "shell",
      "conversion": "dropped"
    },
    {
      "id": "argument_substitution",
      "name": "Argument and Session Variable Substitution",
      "summary": "$ARGUMENTS and positional $N expand in skill content at invocation time.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#available-string-substitutions",
      "provider_field": null,
      "conversion": "translated"
    },
    {
      "id": "shell_command_injection",
      "name": "Shell Command Injection",
      "summary": "!`command` and ```! blocks execute at load time; output replaces the placeholder.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#inject-dynamic-context",
      "provider_field": null,
      "conversion": "preserved"
    },
    {
      "id": "supporting_files",
      "name": "Supporting Files",
      "summary": "Additional files in the skill directory loaded on demand via ${CLAUDE_SKILL_DIR}.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#add-supporting-files",
      "required": false,
      "value_type": "path",
      "provider_field": null,
      "conversion": "not-portable"
    },
    {
      "id": "nested_directory_discovery",
      "name": "Nested Directory Auto-Discovery",
      "summary": "Skills in subdirectory .claude/skills/ dirs auto-load when editing nearby files.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#automatic-discovery-from-nested-directories",
      "provider_field": null,
      "conversion": "not-portable"
    },
    {
      "id": "plugin_scope",
      "name": "Plugin Scope Namespace",
      "summary": "Plugin skills use plugin-name:skill-name namespace to prevent conflicts.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#where-skills-live",
      "provider_field": null,
      "conversion": "not-portable"
    },
    {
      "id": "skill_content_lifecycle",
      "name": "Skill Content Lifecycle and Compaction",
      "summary": "Skill content persists for the session; re-attached after compaction (5K tokens each, 25K total budget).",
      "source_ref": "https://code.claude.com/docs/en/skills.md#skill-content-lifecycle",
      "provider_field": null,
      "conversion": "not-portable"
    },
    {
      "id": "description_context_budget",
      "name": "Skill Description Context Budget",
      "summary": "Descriptions capped at 250 chars in context; total budget is 1% of context window.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#skill-descriptions-are-cut-short",
      "provider_field": null,
      "conversion": "not-portable"
    },
    {
      "id": "bundled_skills",
      "name": "Bundled Skills",
      "summary": "Built-in prompt-based skills (/simplify, /batch, /debug, etc.) available in every session.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#bundled-skills",
      "provider_field": null,
      "conversion": "not-portable"
    },
    {
      "id": "skill_permission_rules",
      "name": "Skill Permission Rules",
      "summary": "Control Claude's skill access via Skill(name) permission rules in settings.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#restrict-claudes-skill-access",
      "provider_field": null,
      "conversion": "not-portable"
    },
    {
      "id": "disable_skill_shell_execution_policy",
      "name": "Organization Policy: Disable Shell Execution",
      "summary": "disableSkillShellExecution in managed settings blocks !`command` for non-bundled skills.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#inject-dynamic-context",
      "provider_field": null,
      "conversion": "not-portable"
    },
    {
      "id": "open_standard_compliance",
      "name": "Agent Skills Open Standard",
      "summary": "Skills follow the agentskills.io open standard with Claude Code-specific extensions.",
      "source_ref": "https://code.claude.com/docs/en/skills.md",
      "provider_field": null,
      "conversion": "not-portable"
    },
    {
      "id": "add_dir_skills_loading",
      "name": "Additional Directory Skills with Live Reload",
      "summary": "--add-dir skills auto-load and support live change detection during sessions.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#skills-from-additional-directories",
      "provider_field": null,
      "conversion": "not-portable"
    },
    {
      "id": "auto_invocation",
      "name": "Description-Based Auto-Invocation",
      "summary": "Claude reads skill descriptions at session start and auto-invokes matching skills.",
      "source_ref": "https://code.claude.com/docs/en/skills.md#control-who-invokes-a-skill",
      "provider_field": null,
      "conversion": "not-portable"
    }
  ]
}
```

---

## Edge Cases from Provider Survey

We surveyed all 57 capability JSON files across 14 providers and 6 content types. These edge cases must be handled by both the upstream generator and the downstream components.

### Data shape edge cases

1. **Empty providerExtensions.** 3 files have zero extensions (cursor-skills, roo-code-skills, zed-skills). 5+ files have only 2-3. The downstream component must degrade gracefully — no empty table headings, no "Provider-specific" section with nothing in it.

2. **No frontmatter fields.** Windsurf, Amp, and Factory Droid rules use plain markdown with no frontmatter. The "fields" group in the table will be empty for these providers. The component renders only the "other" group.

3. **Nested field paths.** Codex uses TOML with dot-notation: `policy.allow_implicit_invocation`. The `provider_field` value must support dot-notation strings.

4. **`supported: false` is common.** Nearly every file has 1-8 unsupported canonical mappings. Decision: these do NOT appear in the unified table. The capabilities matrix page already shows cross-provider support gaps. The per-provider page shows what EXISTS, not what's missing.

5. **Examples are rare.** Only 1 file (claude-code-skills) has structured `examples` arrays. The component should render them when present but not reserve space for them.

### Content-type-specific edge cases

6. **Hooks have event mapping tables.** Hooks content types have `hookEvents` arrays in the provider data (canonical event → native name → category). This is a different kind of mapping that doesn't fit the field/conversion table. The component should render hook events as a separate sub-table, as the current implementation already does.

7. **MCP configs are JSON-based.** Column labels should say "Config key" rather than "Provider field" when rendering MCP content types.

8. **Agents use 3 formats.** Markdown+YAML (Claude Code, Factory Droid), JSON (Kiro, Copilot CLI), and TOML (Codex). The `provider_field` value reflects the native format (YAML key, JSON key, or TOML key).

9. **Overlapping IDs across canonical and extensions.** 8 files have the same concept in both sections. The `extension_id` field on canonical mappings handles this — the component merges them into one row.

### Provider-specific edge cases

10. **Cross-provider recognition.** Pi loads other providers' skill directories. Windsurf reads AGENTS.md from other providers. Factory Droid's `/import-subagent` converts Claude Code agents. These are `conversion: "not-portable"` behavioral features.

11. **Location-based activation without frontmatter.** Windsurf AGENTS.md infers scope from file location (root = always-on, subdirectory = glob-scoped to that subtree). This is a `provider_field: null` behavioral feature.

12. **Provider precedence inversions.** Factory Droid agents: Project > Personal (opposite of most). Kiro agents: Global > Project. These are behavioral notes captured in `mechanism` or `summary`, not structural schema concerns.

---

## Upstream Plan (syllago repo)

This is the work that happens in the syllago Go CLI repo.

### 1. Update the capabilities.json generator

The Go code that generates capability JSON files needs to emit the new fields:

**On canonicalMappings entries:**
- `provider_field` — Derive from `frontmatter_registry.go` (which already knows field names per provider via reflection on YAML/TOML struct tags) and from the converter functions that map fields.
- `extension_id` — Populated when the generator knows an extension describes the same concept. Can be derived during the capability monitoring run by matching IDs.

**On providerExtensions entries:**
- `summary` — Replace `description`. The LLM generating capability data during capmon runs writes one sentence (~150 chars) instead of a paragraph.
- `provider_field` — Populated when the extension describes a specific frontmatter/config field. The LLM should identify this from the source documentation.
- `conversion` — Derived from the converter functions and compat maps. The LLM should cite the specific converter function or compat map entry that justifies each value. This is the riskiest field for accuracy (~80% initial accuracy expected); source citations help catch errors.

### 2. Update the capability JSON schema

Add the new fields to whatever schema definition the CLI uses for validation.

### 3. Enrich all 57 capability JSON files

Run a capmon enrichment pass across all providers and content types with the new schema. This populates `provider_field`, `conversion`, and `summary` on all extensions, and `provider_field` / `extension_id` on canonical mappings.

**Accuracy concern:** The `conversion` field requires understanding syllago's actual converter behavior for each feature. The LLM should reference specific functions:
- `skills.go` for skill conversion fates
- `rules.go` for rule conversion fates
- `commands.go` for command conversion and argument substitution
- `embed.go` for the embedding mechanism
- `compat.go` for feature support and degradation levels

### 4. Shorten `mechanism` text

With `provider_field` as a separate field, `mechanism` no longer needs to carry the native field name. Shorten mechanism strings to just the behavioral note. Example: `"yaml frontmatter key: name (optional, falls back to directory name)"` → `"Optional; falls back to directory name"`.

---

## Downstream Plan (syllago-docs repo)

This is the work that happens in the syllago-docs Astro site.

### 1. Update Zod schema in `content.config.ts`

Update `capMappingSchema`:
```typescript
const capMappingSchema = z.object({
  supported: z.boolean(),
  mechanism: z.string(),
  paths: z.array(z.string()).optional(),
  provider_field: z.string().nullable().optional(),
  extension_id: z.string().optional(),
});
```

Update `capExtensionSchema`:
```typescript
const capExtensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  source_ref: z.string().optional(),
  required: z.boolean().nullable().optional(),
  value_type: z.string().optional(),
  examples: z.array(z.object({
    title: z.string().optional(),
    lang: z.string(),
    code: z.string().min(1),
    note: z.string().optional(),
  })).optional(),
  provider_field: z.string().nullable().optional(),
  conversion: z.enum(['translated', 'embedded', 'dropped', 'preserved', 'not-portable']),
});
```

### 2. Update `sync-capabilities.ts` if needed

The sync script may need changes to handle the renamed field (`description` → `summary`) or to validate the new enum values.

### 3. Rebuild components

**Replace the current four-component stack:**
- `ProviderConventions.astro` (orchestrator)
- `ProviderCanonicalMappings.astro` (canonical key → mechanism table)
- `ProviderExtensionsList.astro` (extensions list wrapper)
- `ProviderExtension.astro` (individual extension card)

**With a new structure:**

**`ProviderConventions.astro`** (rebuilt orchestrator) — Three sections:
1. At-a-glance metadata card (format, discovery paths, install method)
2. Unified features table
3. Sources footer (moved from top to bottom)

**`ProviderFeaturesTable.astro`** (new) — Single table combining canonical mappings and extensions:
- Merges entries linked by `extension_id`
- Groups: entries with `provider_field` first (the "fields" group), then entries without (the "other" group)
- Within each group, sorted by conversion fate: `translated` first, then `embedded`/`dropped`, then `preserved`/`not-portable`
- Columns: Provider field (or name), Conversion status, Canonical key (linked), Summary
- Content-type-specific column labels (e.g., "Config key" for MCP)
- Graceful empty state (no section rendered if group is empty)
- `supported: false` canonical mappings are excluded (matrix pages cover gaps)

**Keep `SourcesTable.astro`** — Move to bottom of page, no structural changes needed.

**Keep hook events sub-table** — Hooks content type renders the existing event mapping table (canonical event → native name → category) as a separate section within the new layout.

### 4. Fix sidebar TOC

The current `not-content` CSS class on all sections excludes them from Starlight's "On this page" sidebar. Fix by either:
- Using Starlight's heading registration API in `StarlightPage`
- Rendering section headings outside the `not-content` wrapper
- Switching to markdown-compatible heading elements that Starlight's TOC can pick up

### 5. Update page route

`src/pages/using-syllago/providers/[provider]/[ct].astro` — Update to pass the new data shape to the rebuilt components. The route generation logic (filtering by `prov.content[ct].supported`) stays the same.

### 6. Link to format conversion page

Add a footnote or legend under the Conversion column header linking to `/using-syllago/format-conversion/#the-three-conversion-fates` so users can understand what "embedded," "translated," etc. mean.

---

## New Page Structure (Visual)

For a page like "Claude Code — Skills":

```
Claude Code — Skills
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─ At a Glance ──────────────────────────┐
│ Format: Markdown (YAML frontmatter)    │
│ Discovery: .claude/skills/<name>/      │
│ Global: ~/.claude/skills/<name>/       │
│ Install: Symlink                       │
└────────────────────────────────────────┘

## Features

How each feature converts to syllago's canonical format.
See [format conversion](/using-syllago/format-conversion/#the-three-conversion-fates)
for what these statuses mean.

### Fields
┌──────────────────────┬────────────┬────────────────────┬─────────────────┐
│ Provider field       │ Conversion │ Canonical key      │ Summary         │
├──────────────────────┼────────────┼────────────────────┼─────────────────┤
│ name                 │ Translated │ display_name →     │ Optional; falls │
│ description          │ Translated │ description →      │ Recommended     │
│ user-invocable       │ Translated │ user_invocable →   │ Bool, default   │
│ disable-model-invoc… │ Translated │ disable_model_… →  │ Bool, default   │
│                      │            │                    │                 │
│ allowed-tools        │ Embedded   │ —                  │ Pre-approve     │
│ model                │ Embedded   │ —                  │ Override model  │
│ effort               │ Embedded   │ —                  │ Override effort │
│ context              │ Embedded   │ —                  │ fork for sub…   │
│ hooks                │ Embedded   │ —                  │ Skill-scoped    │
│ paths                │ Embedded   │ —                  │ Glob activation │
│ shell                │ Dropped    │ —                  │ bash/powershell │
│ argument-hint        │ Dropped    │ —                  │ Autocomplete    │
└──────────────────────┴────────────┴────────────────────┴─────────────────┘

### Other features
┌──────────────────────┬────────────┬─────────────────────────────────────┐
│ Feature              │ Conversion │ Summary                             │
├──────────────────────┼────────────┼─────────────────────────────────────┤
│ Argument substitut…  │ Translated │ $ARGUMENTS and $N expand at invoc…  │
│ Shell command inj…   │ Preserved  │ !`cmd` blocks execute at load; …    │
│ Supporting files     │ Not port…  │ Additional files loaded via ${CL…   │
│ Nested dir discov…   │ Not port…  │ Subdirectory skills auto-load …    │
│ Plugin scope         │ Not port…  │ plugin-name:skill-name namespace    │
│ ...                  │            │                                     │
└──────────────────────┴────────────┴─────────────────────────────────────┘

## Sources
┌────────────┬──────────────┐
│ Source      │ Used for     │
├────────────┼──────────────┤
│ Skills →   │ Documentation│
└────────────┴──────────────┘
```

---

## Open Questions

1. **Should `conversion` be required or optional on extensions?** If required, the enrichment pass must populate it for all ~300+ extensions across 57 files. If optional, components need a fallback rendering for missing values. Recommendation: required. The whole point is to answer "what happens during conversion" — an unanswered row defeats the purpose.

2. **How to handle hook events?** The current hook events sub-table (canonical event → native name → category) is useful and doesn't fit the field/conversion model. Keep it as a separate section within the page, rendered only for hooks content types.

3. **Should the "At a glance" card pull from provider JSON or capability JSON?** Currently the data lives in `src/data/providers/<slug>.json` (in the `content.<ct>` object). The capability JSON doesn't duplicate it. The component should continue reading from the provider collection for this section.

4. **Migration strategy for the 57 files.** All files need `description` → `summary` rename + new fields. This can be done in one capmon enrichment pass or split into batches. Recommendation: one pass, since partial migration means the Zod schema needs to accept both shapes temporarily.
