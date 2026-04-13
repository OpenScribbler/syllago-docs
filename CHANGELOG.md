# Changelog

All notable changes to the syllago documentation site.

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
