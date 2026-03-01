# Phase B Analysis: cli-reference-architecture

Generated: 2026-02-28
Tasks analyzed: 11

## Dependencies Identified

| Writing Task | Blocked By | Reason |
|-------------|------------|--------|
| romasyllago-jcsx: Make build integration | romasyllago-0o2k: Go script | Can't integrate what doesn't exist yet |
| romasyllago-nogj: CI freshness check | romasyllago-0o2k: Go script | CI checks the Go script's output |
| romasyllago-nl2g: Release artifact | romasyllago-0o2k: Go script | Release publishes the Go script's output |
| romasyllago-305j: Sync script | romasyllago-3zjp: Content collection, romasyllago-nl2g: Release artifact | Needs schema to validate against, needs artifact location to fetch from |
| romasyllago-oslo: Page template | romasyllago-3zjp: Content collection | Template renders collection entries |
| romasyllago-vt5d: Index page | romasyllago-oslo: Template, romasyllago-305j: Sync script | Index page uses the same rendering pipeline |
| romasyllago-a058: Sidebar update | romasyllago-oslo: Template | Sidebar needs to know final page paths |

## Task 1: Go script to generate commands.json (romasyllago-0o2k)

- [x] Content deps: None - can start immediately. This is the foundation task.
- [x] Source availability: All sources accessible (cli/cmd/syllago/*.go, Cobra doc package)
- [x] Framework compliance: N/A (infrastructure, not documentation content)
- [x] Cross-page conflicts: None
- [x] Success criteria: Running the script produces valid JSON matching the CommandManifest schema with all ~30 commands included

**Actions taken:**
- None required — this is the root of the dependency tree

## Task 2: Make build integration (romasyllago-jcsx)

- [x] Content deps: Depends on Task 1 (Go script must exist)
- [x] Source availability: Makefile accessible
- [x] Framework compliance: N/A (infrastructure)
- [x] Cross-page conflicts: None
- [x] Success criteria: `make build` regenerates commands.json alongside the binary

**Actions taken:**
- Added dependency: `bd dep add romasyllago-jcsx romasyllago-0o2k`

## Task 3: CI freshness check (romasyllago-nogj)

- [x] Content deps: Depends on Task 1 (Go script must exist)
- [x] Source availability: ci.yml accessible
- [x] Framework compliance: N/A (infrastructure)
- [x] Cross-page conflicts: None
- [x] Success criteria: CI fails when commands.json is stale, passes when fresh

**Actions taken:**
- Added dependency: `bd dep add romasyllago-nogj romasyllago-0o2k`

## Task 4: Release workflow artifact (romasyllago-nl2g)

- [x] Content deps: Depends on Task 1 (Go script must exist)
- [x] Source availability: release.yml accessible
- [x] Framework compliance: N/A (infrastructure)
- [x] Cross-page conflicts: None
- [x] Success criteria: commands.json appears as a release artifact on GitHub releases

**Actions taken:**
- Added dependency: `bd dep add romasyllago-nl2g romasyllago-0o2k`

## Task 5: Content collection with Zod schema (romasyllago-3zjp)

- [x] Content deps: None - can start immediately (parallel with Task 1)
- [x] Source availability: Architecture doc schema accessible, Astro docs available
- [x] Framework compliance: N/A (infrastructure)
- [x] Cross-page conflicts: None
- [x] Success criteria: Zod schema validates commands.json entries correctly, content collection configured in Astro

**Actions taken:**
- None required — can start in parallel with syllago-repo work

## Task 6: Sync script (romasyllago-305j)

- [x] Content deps: Depends on Task 5 (schema) and Task 4 (release artifact exists to fetch)
- [x] Source availability: Aembit pattern accessible as reference
- [x] Framework compliance: N/A (infrastructure)
- [x] Cross-page conflicts: None
- [x] Success criteria: Script fetches commands.json from GitHub release and generates valid MDX files in the content collection

**Actions taken:**
- Added dependency: `bd dep add romasyllago-305j romasyllago-3zjp`
- Added dependency: `bd dep add romasyllago-305j romasyllago-nl2g`

## Task 7: Per-command page template (romasyllago-oslo)

- [x] Content deps: Depends on Task 5 (content collection must exist)
- [x] Source availability: All sources accessible
- [x] Framework compliance: Clean Reference structure — page template enforces consistent layout (synopsis, options table, examples, see also)
- [x] Cross-page conflicts: None — template ensures all pages are consistent by design
- [x] Success criteria: Template renders all command page sections correctly from collection data

**Actions taken:**
- Added dependency: `bd dep add romasyllago-oslo romasyllago-3zjp`

## Task 8: CLI Reference index page (romasyllago-vt5d)

- [x] Content deps: Depends on Tasks 6-7 (pipeline must work to know which commands exist)
- [x] Source availability: All sources accessible
- [x] Framework compliance: Clean Reference structure — index page serves Use (discovery) action
- [x] Cross-page conflicts: None
- [x] Success criteria: Index page shows all commands grouped by workflow, links work to individual pages

**Actions taken:**
- Added dependency: `bd dep add romasyllago-vt5d romasyllago-oslo`
- Added dependency: `bd dep add romasyllago-vt5d romasyllago-305j`

## Task 9: Populate Cobra Example fields (romasyllago-g35v)

- [x] Content deps: None - can start immediately (parallel with all infrastructure). Task 1 needs the Go script, but examples are written in the command files themselves.
- [x] Source availability: All command Go files accessible
- [x] Framework compliance: N/A (code-side content, not doc pages)
- [x] Cross-page conflicts: None
- [x] Success criteria: Every command has a well-formatted Example string with comment-per-example format

**Actions taken:**
- None required — can start in parallel with infrastructure work

## Task 10: editLink config (romasyllago-b69c)

- [x] Content deps: None - can start immediately
- [x] Source availability: astro.config.mjs accessible
- [x] Framework compliance: N/A (configuration)
- [x] Cross-page conflicts: None
- [x] Success criteria: "Edit this page" link appears on all doc pages pointing to correct GitHub URL

**Actions taken:**
- None required — fully independent task

## Task 11: Update sidebar.ts (romasyllago-a058)

- [x] Content deps: Depends on Task 7 (need to know final page paths from template)
- [x] Source availability: sidebar.ts accessible
- [x] Framework compliance: N/A (navigation configuration)
- [x] Cross-page conflicts: None — replaces existing single cli-reference page
- [x] Success criteria: Sidebar shows alphabetical command listing with proper nesting

**Actions taken:**
- Added dependency: `bd dep add romasyllago-a058 romasyllago-oslo`

## Shared Content Decisions

| Content | Decision | Used By |
|---------|----------|---------|
| Global Options table | Rendered from commands.json inheritedFlags — same on every page | All 31 command pages |
| Source link format | GitHub permalink pattern: `cli/cmd/syllago/{file}.go` | All command pages |
| Example format | Single code block, comment-per-example | All command pages (from Cobra Example field) |

## Wayfinding Plan

| From Page | Link Type | To Page | Notes |
|-----------|-----------|---------|-------|
| CLI Reference index | Command links | All individual command pages | Primary navigation |
| Individual command pages | See Also | Related command pages | Cross-command discovery |
| Individual command pages | Context links | Relevant guides (Getting Started, etc.) | Hand-authored in MDX |
| Getting Started / Quick Start | "Full options" links | Key command pages (import, export) | From tutorials to reference |
| How-to guides | Flag reference links | Specific command pages | "For all options, see..." |
| Provider pages | Export reference | syllago export page | How to export to that provider |

## Summary

- Total tasks: 11
- Dependencies added: 8
- Shared content items: 3
- Wayfinding links planned: 6 patterns
- Independent tasks (can start now): 4 (Task 1, Task 5, Task 9, Task 10)
- Parallelism: Tasks 1+5+9+10 can all run concurrently as the first wave
