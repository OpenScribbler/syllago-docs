# CLI Reference Architecture — Content Plan

**Goal:** Build the CLI Reference section of nesco-docs with per-command pages auto-generated from nesco's Cobra command tree.

**IA Design:** [docs/plans/2026-02-28-cli-reference-architecture-ia-design.md](./2026-02-28-cli-reference-architecture-ia-design.md)

**Created:** 2026-02-28

**Personas:**

| Persona | Primary Actions | Key Needs |
|---------|-----------------|-----------|
| End users | Use (lookup) | Command syntax, flags, defaults, examples |
| Content creators | Use (lookup) | Publishing workflow commands (import, export, registry) |
| Registry maintainers | Use (lookup) | Registry management commands |
| New evaluators | Use (discovery) | Scan available commands to understand scope |

---

## Summary

| Metric | Count |
|--------|-------|
| Total pages | 31 |
| Reference pages | 31 (all pages are Reference type) |
| Hand-authored pages | 2 (index page + existing cli-reference.mdx replacement) |
| Template-driven pages | 29 (all command/subcommand pages from template) |
| Infrastructure tasks | 7 (pipeline components) |

---

## Writing Order

### Phase 1: Infrastructure (build first)

These tasks create the pipeline that generates all command pages. No content pages can be created until infrastructure is in place.

- [ ] Task 1: Write Go script to generate commands.json from Cobra tree (Medium)
- [ ] Task 2: Add commands.json generation to `make build` target (Small)
- [ ] Task 3: Add CI freshness check for commands.json (Small)
- [ ] Task 4: Add commands.json as release workflow artifact (Small)

### Phase 2: Docs Infrastructure (build after Phase 1)

These tasks create the docs-side pipeline that consumes the JSON manifest.

- [ ] Task 5: Create commands content collection with Zod schema (Medium)
- [ ] Task 6: Write sync script to fetch commands.json and generate MDX (Medium)
- [ ] Task 7: Create per-command page template component (Medium)

### Phase 3: Content Pages (write after Phases 1-2)

These tasks produce the actual pages users see.

- [ ] Task 8: Create CLI Reference index page with grouped layout (Medium)
- [ ] Task 9: Populate Cobra Example fields with comment-formatted examples (Medium)
- [ ] Task 10: Add editLink config to astro.config.mjs (Small)
- [ ] Task 11: Update sidebar.ts with alphabetical CLI Reference structure (Small)

---

## Page Specifications

### Page: CLI Reference Index

**File Path:** `src/content/docs/using-nesco/cli-reference/index.mdx`

**Actions:**
- Primary: Use (discovery — "what commands exist?")

**Type:** Reference

**Audience:**
- All personas: scannable overview of all commands, grouped by workflow

**Sections:**
1. Intro paragraph — what the CLI does, link to Getting Started for new users
2. Core Commands table — import, export, init, info, update, version, completion
3. Registry Management table — registry add, sync, items, list, remove
4. Sandbox table — sandbox run, check, info, allow/deny/list commands
5. Configuration table — config add, list, remove
6. Global Options — flags available on all commands

**Wayfinding:**
- From: Getting Started, sidebar navigation
- To: Every individual command page, Getting Started (for new users)

**Source Material:**
- [x] commands.json manifest (auto-generated)
- [x] Existing cli-reference.mdx (content to migrate/retire)

**Dependencies:** Tasks 5-7 (content collection and sync pipeline must exist)

**Effort:** Medium

---

### Page Template: Leaf Command Pages (24 pages)

**Applies to:** All leaf commands — completion, export, import, info, init, update, version, config add, config list, config remove, registry add, registry items, registry list, registry remove, registry sync, sandbox run, sandbox check, sandbox info, sandbox allow-domain, sandbox deny-domain, sandbox domains, sandbox allow-env, sandbox deny-env, sandbox env, sandbox allow-port, sandbox deny-port, sandbox ports

**File Path Pattern:** `src/content/docs/using-nesco/cli-reference/[slug].mdx` or `src/content/docs/using-nesco/cli-reference/[parent]/[slug].mdx`

**Actions:**
- Primary: Use (lookup — syntax, flags, examples)

**Type:** Reference

**Sections:** (rendered from template + commands.json data)
1. Page title — full command path (e.g., `nesco sandbox allow-domain`)
2. Intro paragraph — from Cobra Long or Short description
3. Synopsis — usage syntax in code block
4. Options — flag table (name, type, default, description)
5. Global Options — inherited flags table
6. Aliases — if any
7. Examples — single code block with comment-per-example (from Cobra Example field)
8. See Also — links to related commands
9. Source link — link to Go source file

**Wayfinding:**
- From: Index page, parent command page, search, how-to guides, terminal --help
- To: Related commands (see also), relevant guides (hand-authored in MDX)

**Source Material:**
- [x] commands.json manifest (all structured data)
- [ ] Cobra Example fields (need to be populated with comment-formatted examples)

**Dependencies:** Tasks 1-7 (full pipeline must exist)

**Effort:** Small per page (template-driven), Medium total (Cobra Example fields need authoring for each command)

---

### Page Template: Parent Command Index Pages (4 pages)

**Applies to:** config, registry, sandbox, nesco (root)

**File Path Pattern:** `src/content/docs/using-nesco/cli-reference/[parent]/index.mdx`

**Actions:**
- Primary: Use (navigation — "what subcommands are available?")

**Type:** Reference

**Sections:**
1. Page title — parent command name (e.g., `nesco registry`)
2. Intro paragraph — from Cobra Long description
3. Available Subcommands table — name, description, link
4. Parent-level flags (if any)
5. Global Options

**Wayfinding:**
- From: CLI Reference index, sidebar, search
- To: All child command pages

**Source Material:**
- [x] commands.json manifest (subcommands list, descriptions)

**Dependencies:** Tasks 1-7 (full pipeline must exist)

**Effort:** Small (template-driven, minimal hand-authored content)

---

## Infrastructure Task Specifications

### Task 1: Write Go script to generate commands.json from Cobra tree

**What:** A Go program (or `main` subcommand) that walks the full Cobra command tree and outputs structured JSON matching the CommandManifest schema defined in the architecture doc.

**Source Material:**
- [x] Architecture doc: `docs/cli-reference-architecture.md` (schema definition)
- [x] Cobra source: `cli/cmd/nesco/*.go` (command definitions)
- [x] Cobra doc package: `github.com/spf13/cobra/doc` (reference for tree walking)

**Output:** `commands.json` file in the repo root or `cli/` directory

**Effort:** Medium

---

### Task 2: Add commands.json generation to `make build` target

**What:** Modify the Makefile so `make build` also regenerates `commands.json`. Should be a dependency of the build target, not a separate target.

**Source Material:**
- [x] Existing Makefile: `Makefile` and `cli/Makefile`

**Effort:** Small

---

### Task 3: Add CI freshness check for commands.json

**What:** Add a step to `ci.yml` that regenerates `commands.json` and runs `git diff --exit-code` to verify the committed version matches.

**Source Material:**
- [x] Existing CI: `.github/workflows/ci.yml`

**Effort:** Small

---

### Task 4: Add commands.json as release workflow artifact

**What:** In the release workflow, after building binaries, generate `commands.json` from the built binary and attach it as a release artifact.

**Source Material:**
- [x] Existing release workflow: `.github/workflows/release.yml`

**Effort:** Small

---

### Task 5: Create commands content collection with Zod schema

**What:** Define an Astro content collection for CLI commands with Zod validation matching the CommandEntry schema. Configure in `src/content/config.ts` (or `content.config.ts`).

**Source Material:**
- [x] Architecture doc: `docs/cli-reference-architecture.md` (schema)
- [x] Astro content collections docs

**Effort:** Medium

---

### Task 6: Write sync script to fetch commands.json and generate MDX

**What:** Prebuild script (adapted from Aembit's `sync-github-content.ts` pattern) that fetches `commands.json` from the latest nesco GitHub release and generates MDX files in the content collection directory.

**Source Material:**
- [x] Aembit pattern: `aembit_docs_astro/aembit-docs/scripts/sync-github-content.ts`
- [x] Aembit config: `aembit_docs_astro/aembit-docs/github-sync.config.ts`

**Effort:** Medium

---

### Task 7: Create per-command page template component

**What:** Astro component/layout that renders auto-generated command data (intro, synopsis, flags table, examples) alongside any hand-authored MDX content. Used by all command pages.

**Source Material:**
- [x] Aembit pattern: `aembit_docs_astro/aembit-docs/src/components/GithubFetchContent.astro`
- [x] Page layout spec from IA design

**Effort:** Medium

---

### Task 8: Create CLI Reference index page with grouped layout

**(See Page Specification above)**

---

### Task 9: Populate Cobra Example fields

**What:** For each nesco command, add a well-formatted `Example` string in the Cobra command definition. Each example block uses single code block with comment-per-example format.

**Source Material:**
- [x] Cobra command files: `cli/cmd/nesco/*.go`
- [ ] Real-world usage patterns (need to define good examples for each command)

**Effort:** Medium (authoring examples for ~30 commands)

---

### Task 10: Add editLink config to astro.config.mjs

**What:** Enable Starlight's built-in `editLink` config pointing to the nesco-docs GitHub repo.

**Source Material:**
- [x] Starlight editLink docs

**Effort:** Small

---

### Task 11: Update sidebar.ts with alphabetical CLI Reference structure

**What:** Update the sidebar configuration to show the new per-command page structure with alphabetical ordering and nesting.

**Source Material:**
- [x] Existing sidebar.ts
- [x] Sidebar structure from IA design

**Effort:** Small

---

## Source Material Checklist

### Existing Documentation
- [x] Current cli-reference.mdx (to retire/replace)
- [x] Architecture doc: docs/cli-reference-architecture.md (schema, pipeline)
- [x] IA design doc: docs/plans/2026-02-28-cli-reference-architecture-ia-design.md

### Code Analysis Required
- [x] Cobra command files: cli/cmd/nesco/*.go (all command definitions)
- [x] Cobra doc package: github.com/spf13/cobra/doc (tree walking API)

### External References
- [x] Aembit GithubFetchContent pattern (sync script, component, config)
- [x] GitHub CLI manual (structure reference)
- [x] mise CLI reference (formatting reference)
- [x] Astro content collections documentation
- [x] Starlight editLink configuration
