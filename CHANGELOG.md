# Changelog

All notable changes to the syllago documentation site.

## 2026-03-23

### Added
- Error docs pipeline (`sync-errors.ts`) — generates 49 error reference pages from syllago CLI source, replacing 18 manually-maintained pages
- Provider logo carousel on landing page
- Pixel-art SVG logo in site title with hover animation
- Theme toggle on landing page header
- Deep-dive content sections on landing page (replacing footer CTA)
- Per-page `.md` source URLs via upgraded PageActions component
- llms.txt `<link rel="alternate">` directive on all Starlight pages for agent discoverability
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
- Renamed from nesco to syllago

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
