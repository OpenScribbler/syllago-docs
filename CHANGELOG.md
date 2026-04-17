# Changelog

All notable changes to the syllago documentation site.

## 2026-04-17

### Added
- `ProviderFeaturesTable.astro` — unified conversion-aware features table that merges canonical mappings and provider extensions into a single view, partitioned into "Fields" (native provider fields) and "Other features" groups, sorted by conversion fate (translated → embedded → dropped → preserved → not-portable). Renders conversion-fate badges with color variants tied to Starlight theme tokens. Handles the `extension_id` merge relationship: canonical mappings linked to an extension absorb its summary and conversion fate.
- `src/test/components/ProviderFeaturesTable.test.ts` — 12 tests covering merge/partition/sort logic, empty state, and conversion-fate ordering

### Changed
- `src/content.config.ts` — `capMappingSchema` gains optional `provider_field` (nullable string) and `extension_id` (string) for canonical-to-extension linkage; `capExtensionSchema` renames `description` → `summary`, adds optional `provider_field` (nullable string), and adds required `conversion` field using the new `conversionEnum` (translated | embedded | dropped | preserved | not-portable)
- `scripts/sync-capabilities.ts` — `CapMapping` and `CapExtension` TypeScript interfaces updated to match new Zod shape (added `provider_field`, `extension_id`, `required`, `value_type`, `summary`, `conversion`, and `examples` fields)
- `ProviderConventions.astro` — rewritten to use `ProviderFeaturesTable` instead of the deprecated `ProviderCanonicalMappings` + `ProviderExtensionsList` pair. New page structure: At-a-glance card (`<dl>` grid replacing prose) → optional Hook events table (for `hooks` content type) → Features (with unified ProviderFeaturesTable) → Sources table at the bottom. `<h2 id="...">` headings now live outside `not-content` wrappers so Starlight's TOC registers them.

### Removed
- `src/components/ProviderCanonicalMappings.astro` — replaced by `ProviderFeaturesTable`
- `src/components/ProviderExtensionsList.astro` — replaced by `ProviderFeaturesTable`
- `src/components/ProviderExtension.astro` — per-extension card superseded by table rows
- `src/styles/provider-badge.css` — three-state Required badge no longer rendered (extensions don't surface as cards anymore); Required field moves into the Fields table via `value_type` and summary columns in a future iteration
- `src/test/components/ProviderCanonicalMappings.test.ts`, `ProviderExtensionsList.test.ts`, `ProviderExtension.test.ts` — tests for removed components
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
