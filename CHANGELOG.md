# Changelog

All notable changes to the syllago documentation site.

## 2026-04-21 (hooks canonical-event summary codegen)

### Added
- `scripts/sync-providers.ts` — new `generateHooksEventsBlock` and `writeHooksEventsBlock` functions regenerate the Canonical Event summary table in `using-syllago/content-types/hooks.mdx` on every sync. The row set is derived from the intersection of canonical events supported by both featured providers (Claude Code and Gemini CLI) via the `HOOKS_SUMMARY_PROVIDER_SLUGS` map, so new shared events flow through on the next sync without hand editing. Bead syllago-docs-5rm.
- `scripts/regen-hooks-events.ts` — standalone regenerator that reads the per-provider JSON files under `src/data/providers/` and updates only the hooks summary block. Mirrors `regen-compat-matrix.ts` for local use without a network sync.
- `src/content/docs/using-syllago/content-types/hooks.mdx` — `{/* AUTO-GENERATED:HOOKS-EVENTS START */}` / `END` markers wrap the Canonical Event table so the codegen has a managed-block target.

### Changed
- `src/content/docs/using-syllago/content-types/hooks.mdx` — Canonical Event table is now codegen output. Row set expanded from the previous 6 events to 8 (adds `before_compact` and `notification` — both already supported by Claude Code and Gemini CLI). A pointer to the full [Hook Event Matrix](/reference/hook-events/) was added so readers can jump to the complete cross-provider view. Native names are sourced from `content.hooks.hookEvents[*].nativeName` in each provider's JSON, replacing the hand-maintained values that had gone stale once before.

## 2026-04-21 (site-wide table overflow + ProviderCompare mobile rewrite)

### Added
- `scripts/remark-wrap-tables.mjs` — new remark plugin that wraps every markdown `<table>` in a `<div class="table-wrap">` as an MDX JSX flow element. Wired into `astro.config.mjs` as `markdown.remarkPlugins`. The wrapper becomes the scroll container for wide and tall tables, keeping tables inside the site's content width on mobile and desktop. Bead syllago-docs-bgt.
- `src/styles/tables.css` — `.table-wrap` rules: `max-height: 40rem` (≈20 rows at current line-height), `overflow: auto`, `border`, `border-radius`. Sticky header (`thead th { position: sticky; top: 0 }`) keeps column labels visible during vertical scroll; sticky first column (`tbody tr :is(th, td):first-child { position: sticky; left: 0 }`) keeps row labels visible during horizontal scroll. The top-left corner cell uses `z-index: 3` so it stacks above both sticky layers. Per-row background overrides (default / striped / hover) on the sticky cells prevent content bleed-through during scroll.
- `src/components/ProviderCompare.astro` — new mobile tabbed view for viewports ≤600px. Selected providers become a tab strip; the active tab renders a vertical `<dl>` feature list grouped by section (General / Content Type Support / Hooks / MCP / Rules). Desktop keeps the existing side-by-side matrix. Both views render from the same state via a new `renderAll()` entry point. Media query in `tables.css` decides which view is visible; both remain in the DOM so no re-render is needed on resize.

### Changed
- `src/styles/tables.css` — the global `.sl-markdown-content table` rule is unchanged for custom components (CanonicalSupportTable, DataQualityTable, ProviderConventions, etc.) that render raw tables outside the remark pipeline. New sticky/border/radius styles are scoped to `.table-wrap > table` so custom components keep their existing styling.
- `src/components/ProviderCompare.astro` — dropped the Loadouts row from the compare feature list (both the SSR template and the client-side renderer). Same rationale as the earlier Provider Compatibility Matrix cleanup: loadouts are syllago-specific bundling, not an upstream provider content type, so they don't belong in a cross-provider view.

## 2026-04-21 (compat-matrix codegen + MOAT docs rewrite)

### Added
- `scripts/sync-providers.ts` — new `generateCompatMatrixBlock` and `writeCompatMatrixBlock` functions regenerate the Provider Compatibility Matrix on `content-types/index.mdx` from `src/data/providers/*.json` on every sync. Columns sort alphabetically by provider name for stable output; rows follow the canonical content-type order (Rules → Skills → Agents → MCP Configs → Hooks → Commands). Mirrors the `writeProvidersSidebarBlock` pattern (commit 576dd6c). Bead syllago-docs-xzw.
- `scripts/regen-compat-matrix.ts` — standalone regenerator that reads the per-provider JSON files and updates only the matrix block. Lets a doc contributor refresh the matrix from local provider data without fetching providers.json from GitHub or rewriting other generated output.
- `src/content/docs/using-syllago/content-types/index.mdx` — `{/* AUTO-GENERATED:COMPAT-MATRIX START */}` / `END` markers wrap the matrix table so the codegen has a managed-block target.

### Changed
- `src/content/docs/using-syllago/content-types/index.mdx` — Provider Compatibility Matrix column order changed from historical insertion order to alphabetical by provider name (Amp, Claude, Cline, Codex, Copilot, Crush, Cursor, Factory, Gemini, Kiro, OpenCode, Pi, Roo, Windsurf, Zed). Every data cell is unchanged — this is purely a one-time column re-order to establish a stable, predictable order now that the table is generated. Claude Code is now labeled **Claude** (previously abbreviated **CC**) since the two-letter form wasn't decipherable. Short labels are set in the `COMPAT_MATRIX_SHORT` map in `sync-providers.ts`.
- `src/content/docs/using-syllago/content-types/index.mdx` — Loadouts row removed from the matrix. Loadouts are a syllago-specific bundling concept, not an upstream provider content type, so the row doesn't belong in a cross-provider compatibility view. The Loadouts entry in the **Content Type Reference** list below the table is unchanged.

## 2026-04-21 (MOAT docs — rewrite + protocol-name fix)

### Added
- `src/content/docs/moat/index.mdx` — **MOAT overview page** written against upstream v0.6.x Draft. Briefly frames MOAT (Model for Origin Attestation and Trust) and why syllago adopts it, then describes the pieces syllago implements: trust tiers + five-outcome install gate (Proceed / HardBlock / PublisherWarn / PrivatePrompt / TierBelowPolicy), registry signing-identity pinning, trusted-root lifecycle (`syllago moat trust status` exit 0/1/2), registry sync with the four non-interactive exit codes (10 TOFU / 11 profile-change / 12 publisher-revocation / 13 stale), the TUI Trust Inspector modal in both item and registry scopes, and the MOAT_* structured error band. Matter-of-fact voice — describes behavior that exists today without "coming soon" framing.
- `src/content/docs/moat/trust-tiers.mdx` — **Trust Tiers reference page**. Covers the three MOAT tiers (Unsigned / Signed / Dual-Attested) with the field-presence derivation rules from `cli/internal/moat/manifest.go` including the `attestation_hash_mismatch` downgrade path; syllago's catalog-layer `Unknown` label for non-MOAT content; three-state badge collapse (`Verified` `✓` / `Recalled` `R` / none) with an Aside explaining why the recall glyph is ASCII `R` rather than `✗` (cross-context overloading with the converter compat matrix); Trust Inspector field lists for both scopes; revocation two-tier contract (registry hard-block vs publisher warn-with-exit-12); private-repo prompt semantics; and the tier-policy floor.

### Fixed
- `src/content/docs/moat/registry-add-signing-identity.mdx` — corrected the MOAT protocol name from "Manifest-Oriented Attestation Transport" to "Model for Origin Attestation and Trust" on line 8. The earlier wording was an interpolation that never matched the upstream spec.

## 2026-04-20 (MOAT sidebar wiring + sync-errors MDX fix)

### Added
- `sidebar.ts` — new top-level **MOAT** section with Overview, Trust Tiers, and Registry Signing Identity. The existing `registry-add-signing-identity.mdx` page was previously orphaned from the sidebar; this wires it in alongside the two new pages. Placed after Advanced and before Error Codes so it groups with security-adjacent content without overloading Advanced.

### Fixed
- `scripts/sync-errors.ts` — added `sanitizeForMdx` step that strips CommonMark autolink wrappers (`<https://...>`) from upstream error-doc markdown before it lands in generated MDX. MDX reserves `<tag>` for components and rejects `/` inside the tag name, which broke `astro build` once upstream added `moat-001.md` containing an autolinked docs URL. `remark-gfm` autolinks bare URLs, so the fix drops the angle brackets and preserves clickability without rewriting to explicit `[text](url)` form. Applies to every upstream error doc generated through the sync pipeline.

## 2026-04-18 (conversion badges + canonical-keys sidebar)

### Added
- `src/components/ConversionBadge.astro` — new reusable component for the five conversion fates (`translated`, `embedded`, `dropped`, `preserved`, `not-portable`). Renders a flexoki-colored pill with a hover/focus **popover** containing (1) a "Conversion type: [Badge]" title line, (2) the fate description, and (3) a "Learn more →" link that deep-links to the relevant anchor on `/using-syllago/format-conversion/`. The badge itself is a non-interactive focusable label; the link lives inside the popover so readers can dismiss the tooltip without navigating away. Popover is positioned below the badge to avoid clipping by the ancestor table's `overflow: hidden` rule, and uses `:hover` / `:focus-within` on a wrapper span plus a `padding-top` hover bridge so the popover stays clickable while the user moves into it.
- `sidebar.ts` — **Canonical Keys** now expands into a nested section: an Overview entry plus six alphabetized content-type groups (Agents, Commands, Hooks, MCP, Rules, Skills) with 44 individual key entries linking directly to each detail page. Section is wrapped in `// AUTO-GENERATED:CANONICAL-KEYS START` / `END` markers.
- `scripts/sync-capabilities.ts` — new `generateCanonicalKeysSidebarBlock` and `writeCanonicalKeysSidebarBlock` functions regenerate the Canonical Keys sidebar section from `capabilities.json` on every sync. Mirrors the `sync-providers.ts` managed-block pattern so the sidebar cannot drift from the manifest. Sorting matches `generateCanonicalKeysIndex` byte-for-byte (content types alphabetical, keys alphabetical within each group).

### Changed
- `src/components/ProviderFeaturesTable.astro` — refactored to import and use `ConversionBadge` in both the Fields and Other features tables. Inline `<span class="conv conv-*">` markup, the `CONVERSION_LABEL` map, and all six `.conv-*` CSS blocks moved into `ConversionBadge.astro`. Every provider features page now has interactive conversion badges instead of static pills.

## 2026-04-17 (audit punch list)

### Fixed
- `src/content/docs/getting-started/core-concepts.mdx` — replaced `syllago publish --registry` with `syllago share --to <registry>` (the `publish` command no longer exists; `share` is the unified entry point).
- `src/content/docs/using-syllago/collections/registries.mdx` — same replacement; consolidated the publish/share split into a single `share` workflow with `--to` for registries.
- `src/content/docs/advanced/team-setup.mdx` — same `publish` → `share --to` purge in Contributing back + Related sections.
- `src/content/docs/advanced/registry-privacy.mdx` — Four Gates table: G1 now references `syllago share --to <registry>` (was `syllago publish`); See Also link updated.
- `src/content/docs/using-syllago/collections/index.mdx` — Registries section description updated to `syllago share --to <registry>`.
- `src/pages/index.astro` — landing page command example switched from `syllago publish ... --registry` to `syllago share ... --to`.
- `src/content/docs/using-syllago/content-types/agents.mdx`, `skills.mdx`, `commands.mdx` — `effort` enum corrected from `min`/`moderate`/`large`/`max` to canonical `low`/`medium`/`high`/`max` (matches `cli/internal/converter/commands.go`).
- `src/content/docs/using-syllago/content-types/agents.mdx` — Kiro agents section rewritten from "JSON-based steering files" to accurate "Markdown with rich YAML frontmatter" (`name`, `description`, `model`, `tools`, `allowedTools`, `mcpServers`, `hooks`, etc.).
- `src/content/docs/using-syllago/content-types/skills.mdx` — Kiro skills line corrected: Markdown steering files in `.kiro/steering/`, not JSON-wrapped.
- `src/content/docs/using-syllago/content-types/commands.mdx` — replaced fictional TOML Codex command example with a Claude Code-style Markdown-with-frontmatter example. Codex commands are `.md`, not `.toml`. `source_format` corrected from `toml` to `md` in the catalog example.
- `src/content/docs/using-syllago/content-types/rules.mdx` — replaced incorrect "OpenCode (YAML format)" section with accurate "OpenCode (Markdown)" — OpenCode reads rules from `AGENTS.md`/`CLAUDE.md` at the project root, not custom YAML.
- `src/content/docs/using-syllago/content-types/hooks.mdx` — Gemini CLI hook event names corrected to match upstream (v0.9.0): `BeforeTool`/`AfterTool`/`BeforeAgent`/`AfterAgent` (was old hypothetical `before_tool_call`/`after_tool_call`/`before_send`/`on_complete`).
- `src/content/docs/using-syllago/content-types/index.mdx` — Provider Compatibility Matrix updated: added Factory Droid, Pi, Crush columns (3 new providers from v0.8.0 that hadn't been added to this matrix); fixed cells: Cline Skills + Commands → ✅, Roo Code Commands → ✅, Amp Hooks → ✅, Windsurf Commands → ✅.
- `src/content/docs/getting-started/core-concepts.mdx` — provider list extended with Factory Droid, Crush, Pi (was missing the v0.8.0 additions).
- `src/content/docs/using-syllago/collections/loadouts.mdx` — top note rewritten from "currently emit configuration for Claude Code only" to clarify `--to <provider>` works for any target (Claude Code is the default).
- `src/content/docs/using-syllago/format-conversion.mdx` — Compatibility Matrix loadouts row updated: "Multi-provider (Claude Code default)" with note about `--to <provider>`.
- `src/content/docs/using-syllago/syllago-yaml.mdx` — removed `promoted_at` and `pr_branch` rows from Lifecycle timestamps table (legacy fields tied to the removed `syllago promote` command; struct retains them for backward-compat reads but they're never written).
- `src/content/docs/errors/privacy-001.mdx` — full page rewrite from `publish` → `share` throughout (title, description, What This Means, Common Causes, How to Fix steps, Example Output). Earlier surgical edit had only caught the `syllago publish` command references and was reverted by a linter for inconsistency with surrounding prose; this pass covers every "publish/published/publishing" verb and the simulated CLI error message.

## 2026-04-17 (provider overview tweaks)

### Changed
- `ProviderOverview.astro` — Provider Details table now includes a **Detection** row ("Filesystem check — `~/{configDir}` exists") and the standalone "Detection" h2/paragraph below the tables has been removed (folded into the table for scannability).

### Removed
- `ProviderOverview.astro` — **Supported content types** row from the Provider Details table. Redundant with the Supported Content Types section/table immediately below it.

## 2026-04-17 (sidebar codegen)

### Added
- `scripts/sync-providers.ts` — automated provider sidebar generation. New `generateProvidersSidebarBlock` and `writeProvidersSidebarBlock` functions regenerate the Supported Providers section of `sidebar.ts` between `// AUTO-GENERATED:PROVIDERS START` / `END` markers on every sync. Provider entries are sorted alphabetically; content type entries follow the canonical order (Skills → Hooks → Rules → MCP Configs → Commands → Agents) and only appear when `content[ct].supported === true` in the manifest. Prevents future drift between sidebar and provider data.
- `sidebar.ts` — `// AUTO-GENERATED:PROVIDERS START` / `END` managed-block markers wrapping the provider entries.

### Fixed
- `sidebar.ts` — restored missing sidebar entries that had drifted from the v0.8.0/v0.9.0 manifest data:
  - **Cursor**: added Hooks, Rules, MCP Configs, Commands, Agents (was Skills-only)
  - **OpenCode**: added Rules, MCP Configs, Commands, Agents (was Skills-only)
  - **Roo Code**: added Rules, MCP Configs, Commands, Agents (was Skills-only)
  - **Gemini CLI**: added Agents (added to the manifest in v0.9.0; codegen catch)
  - **Windsurf**: removed stale Agents entry (Windsurf does not support agents)
  - **Zed**: replaced incorrect Skills entry with Rules + MCP Configs (Zed's actual supported types)

## 2026-04-17 (v0.9.0 sync)

### Changed
- Synced data from syllago 0.9.0 release. Provider capability updates reflect the upstream provider-coverage-reconciliation work:
  - **Amp**: `hooks` now supported (JSON merge into `.amp/settings.json` under `amp.hooks`, hook type `command`); `amp hooks` file format reported as `json` (was incorrectly `md`)
  - **Cline**: `commands` now supported (Workflows; install to `.clinerules/workflows/` project or `~/Documents/Cline/Workflows/` global, symlink, md); `skills` now supported (install to `~/.cline/skills/<slug>/SKILL.md`, symlink, md, frontmatter `name`+`description`)
  - **Windsurf**: `commands` now supported (Cascade Workflows; install to `.windsurf/workflows/` project or `~/.codeium/windsurf/global_workflows/` global, symlink, md)
  - **Roo Code**: `commands` now supported (install to `.roo/commands/`, symlink, md)
  - **Cursor**: capability data filled in for all 6 supported content types (previously skills-only)
- 4 provider JSONs updated (amp, cline, roo-code, windsurf); 27 capability/data-quality JSONs refreshed; 44 canonical-key pages and all 7 content-type matrix pages regenerated from the new manifest.

## 2026-04-17

### Added
- `ProviderFeaturesTable.astro` — unified conversion-aware features table that merges canonical mappings and provider extensions into a single view, partitioned into "Fields" (native provider fields) and "Other features" groups, sorted by conversion fate (translated → embedded → dropped → preserved → not-portable). Renders conversion-fate badges with color variants tied to Starlight theme tokens. Handles the `extension_id` merge relationship: canonical mappings linked to an extension absorb its summary and conversion fate.
- `src/test/components/ProviderFeaturesTable.test.ts` — 12 tests covering merge/partition/sort logic, empty state, and conversion-fate ordering
- `src/content/docs/reference/canonical-keys/index.mdx` — new Reference-section landing page grouping all canonical keys by content type (Agents, Commands, Hooks, MCP, Rules, Skills) with a sortable description table per group. Each key links to its detail page. Auto-generated by `sync-capabilities.ts` on every sync so it stays in lockstep with the manifest.
- `sidebar.ts` — new "Canonical Keys" entry in the Reference section pointing at `/reference/canonical-keys/`
- `scripts/sync-capabilities.ts` — `generateCanonicalKeysIndex` function and shared `contentTypeHeading` helper (normalizes `mcp` → `MCP`) now applied consistently to both the canonical-keys index and the capabilities matrix
- Three new providers from syllago 0.8.0: **Crush** (Skills, Rules, MCP Configs), **Factory Droid** (full content-type coverage: Skills, Hooks, Rules, MCP Configs, Commands, Agents), and **Pi** (Skills, Hooks, Rules, Commands). Inserted alphabetically into the Supported Providers sidebar; provider/capability JSONs and per-CT pages flowed through the standard `sync-providers.ts` + `sync-capabilities.ts` pipeline.

### Changed
- `sidebar.ts` — Supported Providers list reordered alphabetically (was favoring Claude Code, Cursor, Windsurf at the top). New order: Amp, Claude Code, Cline, Codex, Copilot CLI, Crush, Cursor, Factory Droid, Gemini CLI, Kiro, OpenCode, Pi, Roo Code, Windsurf, Zed.
- Synced data from syllago 0.8.0 release: 15 providers (was 12 publicly visible), 57 capability files (was 55), 14 data-quality entries (was 12), 44 canonical-key pages.
- `src/content.config.ts` — `capMappingSchema` gains optional `provider_field` (nullable string) and `extension_id` (string) for canonical-to-extension linkage; `capExtensionSchema` renames `description` → `summary`, adds optional `provider_field` (nullable string), and adds required `conversion` field using the new `conversionEnum` (translated | embedded | dropped | preserved | not-portable)
- `scripts/sync-capabilities.ts` — `CapMapping` and `CapExtension` TypeScript interfaces updated to match new Zod shape (added `provider_field`, `extension_id`, `required`, `value_type`, `summary`, `conversion`, and `examples` fields)
- `ProviderConventions.astro` — rewritten to use `ProviderFeaturesTable` instead of the deprecated `ProviderCanonicalMappings` + `ProviderExtensionsList` pair. New page structure: At-a-glance card (`<dl>` grid replacing prose) → optional Hook events table (for `hooks` content type) → Features (with unified ProviderFeaturesTable) → Sources table at the bottom. `<h2 id="...">` headings now live outside `not-content` wrappers so Starlight's TOC registers them. Removed the "At a glance" heading (redundant card title that added vertical spacing), added "Direct copy" as an additional install method for all content types except `hooks` and `mcp`, and restored gray-background inline-code styling inside the card (lost when the grid moved into `not-content`).
- `scripts/sync-capabilities.ts` — `EXCLUDED_PROVIDERS` emptied (formerly `{"factory-droid", "pi"}`). These providers now flow through matrix pages, MetaBox counts, and canonical-key provider maps as soon as upstream supplies their data; docs no longer gate their visibility.

### Removed
- `src/components/ProviderCanonicalMappings.astro` — replaced by `ProviderFeaturesTable`
- `src/components/ProviderExtensionsList.astro` — replaced by `ProviderFeaturesTable`
- `src/components/ProviderExtension.astro` — per-extension card superseded by table rows
- `src/styles/provider-badge.css` — three-state Required badge no longer rendered (extensions don't surface as cards anymore); Required field moves into the Fields table via `value_type` and summary columns in a future iteration
- `src/test/components/ProviderCanonicalMappings.test.ts`, `ProviderExtensionsList.test.ts`, `ProviderExtension.test.ts` — tests for removed components
- `src/test/components/SourcesTable.test.ts` — helpers it tested were removed when SourcesTable was simplified to a single-column URL display
- `astro.config.mjs` — dropped `./src/styles/provider-badge.css` from `customCss` (orphaned by component removal)

## 2026-04-16

### Added
- Design spec for provider convention pages redesign (`docs/plans/2026-04-16-provider-convention-pages-redesign.md`) — schema contract, upstream/downstream plans, edge case survey, decision log

### Changed
- `format-conversion.mdx` — rewrote to explain the three conversion fates (translated, embedded as prose, dropped with warning), argument substitution translation, conversion notes mechanism, and the "preserved but may not work" distinction; restructured around conversion behavior rather than feature lists

## 2026-04-15

### Added
- `data-quality` Astro content collection — per-provider extension completeness data (total extensions, unspecified required/value_type/examples counts, generated-at timestamp), synced from the CLI's `data_quality` manifest block
- `DataQualityBadge.astro` — compact percentage badge showing field-specification completeness for a provider; supports `required`, `valueType`, `examples`, or `overall` modes with color-coded tiers
- `DataQualityTable.astro` — full provider comparison table showing extension counts and per-field specification percentages, sorted by data volume
- Provider exclude filter in `sync-capabilities.ts` — `factory-droid` and `pi` are excluded from capabilities matrix, MetaBox counts, and canonical-key provider maps (capability JSONs stay on disk)

### Changed
- `SourcesTable.astro` — redesigned as two-column table (Source + Used for) with human-readable type labels instead of the old single-column or section-based layouts
- `sidebar.ts` — fixed 15 broken links to content type pages with no capability data (Cursor, OpenCode, Roo Code, Zed, Gemini CLI); added missing links for Cline (skills, commands), Windsurf (commands, agents), and Amp (hooks)
- `content.config.ts` — removed unused `section` field from `capSourceSchema`
- `sync-capabilities.ts` — extended to parse the `data_quality` manifest block and write per-provider JSON files to `src/data/data-quality/`; added `DataQualityEntry` type mirroring the Go struct; `CapabilitiesManifest` interface now includes optional `data_quality` field
- `content.config.ts` — added `dataQualitySchema` (Zod) and `data-quality` collection definition

## 2026-04-14

### Added
- Dynamic provider overview pages at `/using-syllago/providers/<slug>/` (12 routes, one per supported provider) — replaces generated MDX
- Dynamic per-content-type conventions pages at `/using-syllago/providers/<slug>/<ct>/` (~70 routes filtered by each provider's supported content types)
- `SourcesTable.astro` — consolidated sources table at the top of each per-CT page, with optional per-section scoping (D9)
- `ProviderOverview.astro` — provider identity, detection, and supported content-type summary on the overview page (D6)
- `ProviderConventions.astro` — per-(provider, CT) orchestrator combining SourcesTable, Native Format prose, canonical mappings, and extensions (D11)
- `ProviderCanonicalMappings.astro` — canonical key → mechanism table linking to canonical-key pages
- `ProviderExtension.astro` — individual extension card with structured examples (D10), value-type display, and three-state Required/Optional/Unspecified badge (D12)
- `ProviderExtensionsList.astro` — iterates ProviderExtension cards for a (provider, CT) pair
- `src/styles/provider-badge.css` — three-state required badge styles (dashed border for Unspecified per D12)
- Vitest test suite — 58 tests covering schema validation, component helpers, and display maps
- `vitest@^4.1.4` devDependency

### Changed
- `src/content.config.ts` — `capSourceSchema` gains optional `name` and `section` fields (D9); `capExtensionSchema` gains optional `required` (nullable boolean for Required/Optional/Unspecified tri-state, D12), `value_type` (D12), and structured `examples` array (D10)
- `sidebar.ts` — "Supported Providers" section restructured from flat to nested: one collapsible group per provider, each with Overview and per-CT children filtered against each provider's `content.<ct>.supported` flag (e.g., cline omits Skills/Commands/Agents; zed only lists Rules/MCP). Switched from `slug:` to `link:` form because routes are now served by `src/pages/` dynamic routes instead of content collection entries
- `scripts/sync-providers.ts` — removed per-provider MDX generation (600+ lines of `generateProviderPage`, `generateContentTypeConventions`, and MDX-escape helpers); retains JSON data writing, index page, hook-event matrix, and content-type matrix generation
- `astro.config.mjs` — swapped `provider-extensions.css` → `provider-badge.css` in `customCss`; added `starlight-links-validator` exclude patterns for `/using-syllago/providers/*` and `/using-syllago/providers/*/*` (validator can't follow custom pages)

### Fixed
- `sidebar.ts` SidebarItem type import — derived locally from `StarlightUserConfig["sidebar"]` since Starlight 0.37.6 does not publicly re-export the `SidebarItem` schema type from `@astrojs/starlight/types`

### Removed
- `scripts/seed-provider-extensions.ts` and `src/content/provider-extensions/` seed MDX stubs — superseded by inline `providerExtensions` data in `src/data/capabilities/*.json`
- 12 generated per-provider MDX pages in `src/content/docs/using-syllago/providers/` (amp, claude-code, cline, codex, copilot-cli, cursor, gemini-cli, kiro, opencode, roo-code, windsurf, zed) — replaced by dynamic routes. `index.mdx` preserved.
- `src/styles/provider-extensions.css` — replaced by `provider-badge.css`

## 2026-04-13

### Added
- Canonical keys expanded to all content types: 31 new reference pages for rules (5), hooks (9), agents (7), mcp (8), and commands (2) — up from 13 skills-only keys
- Per-content-type "Conventions" sections on provider pages: Skills, Hook, Rule, MCP Config, Command, and Agent Conventions each with three subsections — Native Format (format, paths, install method, native fields, and hook events table for hooks), Mappings to Canonical (linked canonical-key table with mechanism detail), and `<Provider>`-specific (inline definition list explaining items that haven't been mapped to canonical keys yet, with a graduation note)
- `src/styles/provider-extensions.css` — styles for the provider-specific definition list, registered via Starlight `customCss`
- `@types/bun` devDependency — resolves `import.meta.dir` TypeScript diagnostics in the sync scripts

### Changed
- Provider page layout restructured: flat cross-cutting tables (File Format and Location, Hook Events, MCP Configuration, Rules Format) replaced with per-content-type sections that link from the Supported Content Types overview
- "Install Method" column renamed to "Syllago Install Method" on provider pages to clarify that the value is how syllago installs content, not a native provider mechanism
- Supported Content Types table now lists only supported types, with a Symlink column, and each row links to its section on the page
- Loadouts removed from the Supported Content Types table (syllago-specific, not a comparable provider content type)

### Removed
- `ProviderExtensions.astro` component — provider-specific details are now rendered inline as HTML `<dl class="provider-extensions not-content">` by `sync-providers.ts`, reading directly from `capabilities/*.json`

### Fixed
- MDX brace escaping in canonical key page generator — descriptions containing code syntax like `{{args}}` or `${@:N}` no longer break the build
- MDX angle-bracket and pipe escaping in canonical mappings table — mechanism strings containing placeholder syntax like `<name>` or `<skill-name>` are now HTML-entity-escaped before being rendered into Markdown table cells, preventing MDX from parsing them as unclosed JSX tags; pipe characters are also escaped as `\|` to prevent table column splits
- Canonical-key links now slugify `_` to `-` to match the filenames `sync-capabilities.ts` writes (e.g., `/reference/canonical-keys/canonical-filename/` not `/reference/canonical-keys/canonical_filename/`)

## 2026-04-12

### Added
- Capabilities pipeline: `sync-capabilities.ts` fetches `capabilities.json` from GitHub releases, generates Astro data collections and reference pages
- 13 canonical key reference pages (`/reference/canonical-keys/<key>/`) — per-key detail with provider support table, metadata infobox, and pre-filled issue reporting
- Capabilities matrix page (`/reference/capabilities-matrix/`) — cross-provider grid showing which providers support each canonical skill key
- `MetaBox.astro` component — props-driven metadata infobox showing verification date, source count, and provider support ratio
- `CanonicalSupportTable.astro` component — build-time table querying capabilities collection for per-key provider support
- `ProviderExtensions.astro` component — build-time list querying capabilities collection for provider-specific extensions
- `capabilities` and `canonical-keys` Astro data collections with Zod schemas in `content.config.ts`
- `sync:capabilities` npm script and added to `sync`/`prebuild` pipelines (runs first in chain)

### Changed
- `sync-providers.ts` now reads capabilities data from `src/data/capabilities/` and emits `<ProviderExtensions>` sections on provider pages for content types with provider-specific extensions

## 2026-04-04

### Added
- Telemetry reference page (`/reference/telemetry/`) — auto-generated from `telemetry.json` with event catalog, property tables, and privacy guarantees
- `sync-telemetry.ts` script — fetches `telemetry.json` from GitHub releases or local file, generates MDX
- `sync:telemetry` npm script and added to `sync`/`prebuild` pipelines

## 2026-03-29

### Added
- Provider data collection: per-provider JSON data files (`src/data/providers/*.json`) with hook events, MCP transports, config locations, and frontmatter fields
- Enriched provider pages with hook events tables, MCP config sections, and rules format sections — all driven from data
- Hook Event Matrix reference page (`/reference/hook-events/`) — cross-provider comparison of 27 canonical hook events across 6 providers, grouped by category
- Interactive provider comparison page (`/reference/compare-providers/`) — dropdown-based side-by-side comparison of 2-3 providers with content types, hooks, MCP, and rules details
- `ProviderCompare.astro` component — SSR with progressive enhancement via vanilla JS, no framework dependency
- Content type comparison matrices — rules, skills, agents, MCP, commands — each showing format, install method, discovery paths, and frontmatter field support across providers
- Category context descriptions on hook event matrix sections
- Modern table styling with Flexoki palette: full-width, rounded borders, row striping, hover states
- Reference section in sidebar with 7 pages

### Changed
- Synced CLI reference pages to match current commands.json (removed deleted commands, added export/import/promote/promote-to-registry)
- Extended `sync-providers.ts` to generate Astro data collection and hook event matrix
- Added `providers` content collection with Zod schema in `content.config.ts`

## 2026-03-28

### Added
- Glossary content collection with Zod schema (`src/content.config.ts`)
- 48 glossary term stubs across 5 categories: core, content-type, provider, ai-ecosystem, format

### Fixed
- Removed stale "nesco" reference from changelog

## 2026-03-23

### Added
- Error docs pipeline (`sync-errors.ts`) — generates 49 error reference pages from syllago CLI source, replacing 18 manually-maintained pages
- Provider logo carousel on landing page
- Pixel-art SVG logo in site title with hover animation
- Theme toggle on landing page header
- Deep-dive content sections on landing page (replacing footer CTA)
- Per-page `.md` source URLs via upgraded PageActions component
- llms.txt directive: `<link rel="alternate">` in head + visually hidden body link near top of every Starlight page
- Postbuild script to rewrite internal links in llms-full.txt and llms-small.txt to `.md` URLs
- Project CLAUDE.md with changelog-update rule

### Fixed
- Broken links to CLI commands not yet in commands.json release (`add`, `install`, `publish`, `share`, `compat`, `registry create`)
- Provider carousel dark mode — use actual fills instead of currentColor
- Logo color consistency across themes (mint green + light purple)
- Internal links in llms-full.txt now point to `.md` URLs instead of HTML pages

### Changed
- Regenerated CLI reference from latest commands.json
- Removed hardcoded provider counts across all pages

## 2026-03-22

### Added
- Registry privacy guide
- Hook interchange format specification (embedded reference)
- Amp provider page (new)

### Changed
- All 11 provider pages updated with deep detail
- Content type pages updated with new fields and provider support matrix
- CLI reference overhaul — new commands, deprecations, updated index
- Getting started, landing, collections, and format conversion pages refreshed

## 2026-03-20

### Added
- Full documentation authoring pass:
  - Core Concepts page (providers, content types, collections, format conversion)
  - Installation page with all install methods
  - Quick Start with two onboarding paths
  - Content type deep-dives (rules, skills, agents, MCP, hooks, commands)
  - Collection deep-dives (library, registries, loadouts)
  - All 11 provider pages + `.syllago.yaml` reference
  - Advanced pages (sandbox, team setup, troubleshooting)
  - Overview pages for Content Types, Collections, and Providers
  - TUI page
- Custom landing page with hero demo GIF
- Error code reference pages
- Project meta files (AGENTS.md, README, VS Code config)

### Changed
- Restructured docs IA — added Content Types and Collections sections
- CLI reference updated for Cobra migration
- VHS demo tape updated for registry + convert workflow

## 2026-03-19

### Changed
- Regenerated CLI reference for Cobra migration

## 2026-03-01

### Added
- CLI reference pipeline (`sync-commands.ts`) with D2 diagram support
- GitHub Action SHA validation and Dependabot config
- CLI reference IA design and content plan

### Fixed
- GitHub Actions pinned SHA corrections
- Line ending fix for install-d2.sh
- Renamed project to syllago

## 2026-02-27

### Changed
- Gap analysis updated with best practices research
- Replaced Divio framework with Diataxis

## 2026-02-26

### Added
- Initial Astro Starlight scaffold with Flexoki theme and full IA
- Docs tooling, PageActions component, and LLM resources page
- starlight-heading-badges and starlight-image-zoom plugins
- Gap analysis from CLI/TUI and package manager docs research

### Fixed
- GitHub Actions pinned to full commit SHAs
