# syllago-docs Capabilities Pipeline (Phase 2) - Design Document

**Goal:** Fetch capabilities.json from the syllago GitHub release and generate queryable Astro data collections, canonical key reference pages, a capabilities matrix page, and provider page enrichment with extensions.

**Decision Date:** 2026-04-12

---

## Problem Statement

The syllago CLI now generates a `capabilities.json` release artifact (Phase 1) that describes which providers support which canonical keys, with what mechanism, and from what sources. This data is not yet surfaced to readers of the syllago-docs site. Readers cannot:

- Look up which providers support a given canonical key (e.g., `display_name`)
- See when capability data was last verified and from which sources
- Report stale or incorrect capability information
- Browse provider-specific extensions beyond canonical keys

## Proposed Solution

A sync script (`sync-capabilities.ts`) fetches `capabilities.json` from the latest GitHub release, writes Astro data collection files, and generates MDX documentation pages. Two Astro components (`CanonicalSupportTable`, `ProviderExtensions`) query the data collections at build time. A third component (`MetaBox`) receives data as props and renders an info card on each canonical key page.

## Architecture

### Data Flow

```
capabilities.json (GitHub release or --local)
        |
sync-capabilities.ts
        |
   +----+------------------------+
   |                             |
   v                             v
src/data/capabilities/       src/data/canonical-keys/
  <provider>-<type>.json       <key>.json
        |                             |
        |                             v
        |              CanonicalSupportTable.astro
        |              (queries capabilities collection)
        |                             |
        v                             v
sync-providers.ts reads      sync-capabilities.ts generates:
capabilities data and        - /reference/canonical-keys/<key>.mdx
enriches provider pages        (with MetaBox + CanonicalSupportTable)
with extensions sections     - /reference/capabilities-matrix.mdx
                               (overview grid)
```

### Script Execution Order

Package.json `sync` and `prebuild` scripts run in this order:

1. `sync-capabilities.ts` — writes data files + canonical key MDX + matrix page
2. `sync-commands.ts` — unchanged
3. `sync-errors.ts` — unchanged
4. `sync-providers.ts` — reads capabilities data, enriches provider pages with extensions
5. `sync-telemetry.ts` — unchanged

sync-capabilities.ts runs first because sync-providers.ts depends on its data output.

### Components

| Component | Data Source | Placement |
|-----------|-----------|-----------|
| `MetaBox.astro` | Props (from generated MDX) | Top of each canonical key page |
| `CanonicalSupportTable.astro` | `getCollection('capabilities')` | Body of each canonical key page |
| `ProviderExtensions.astro` | `getCollection('capabilities')` | Provider MDX pages (emitted by sync-providers.ts) |

## Key Decisions

| # | Decision | Choice | Reasoning |
|---|----------|--------|-----------|
| D1 | Data file location | `src/data/capabilities/` and `src/data/canonical-keys/` | Consistent with existing `src/data/providers/` pattern |
| D2 | Canonical key page rendering | Script-generated MDX (sync-capabilities.ts) | Proven pattern from sync-providers.ts, auto-sidebar via Starlight |
| D3 | MetaBox data source | Props passed inline in generated MDX | Simple, explicit, no collection queries needed in the component |
| D4 | CanonicalSupportTable data source | Astro component querying `capabilities` collection at build time | Self-contained component, table formatting lives in one place |
| D5 | Provider extensions display | ProviderExtensions.astro component on provider pages | Consistent with other capability components, maintainable separately |
| D6 | Extensions integration | sync-providers.ts reads capabilities data files | Natural dependency order, sync-capabilities.ts runs first |
| D7 | Issue report link | Pre-filled GitHub issue URL in MetaBox | Better UX, includes key name + data summary + source links |
| D8 | Capabilities matrix page | Included in Phase 2 scope | Natural entry point for canonical key detail pages |
| D9 | Canonical key metadata | Bundled in capabilities.json (requires _gencapabilities update) | One fetch gets everything, no separate canonical-keys.yaml dependency |

## Data Schemas

### capabilities collection: `src/data/capabilities/<provider>-<content-type>.json`

```json
{
  "id": "claude-code-skills",
  "provider": "claude-code",
  "contentType": "skills",
  "status": "supported",
  "lastChangedAt": "2026-04-11T00:00:00Z",
  "sources": [
    { "uri": "https://docs.anthropic.com/...", "type": "documentation", "fetchedAt": "2026-04-11T21:00:00Z" }
  ],
  "canonicalMappings": {
    "display_name": { "supported": true, "mechanism": "YAML frontmatter key: name" }
  },
  "providerExtensions": [
    { "id": "disable_model_invocation", "name": "Disable Model Invocation", "description": "...", "sourceRef": "https://..." }
  ]
}
```

### canonical-keys collection: `src/data/canonical-keys/<key>.json`

```json
{
  "id": "display_name",
  "description": "Human-readable display name for the skill. If omitted, the directory name is used.",
  "type": "string",
  "contentType": "skills",
  "providers": {
    "claude-code": { "supported": true, "mechanism": "YAML frontmatter key: name" },
    "cursor": { "supported": true, "mechanism": "frontmatter name field" },
    "windsurf": { "supported": false, "mechanism": "not documented" }
  }
}
```

### capabilities.json update (Phase 1 addition)

`_gencapabilities` reads `docs/spec/canonical-keys.yaml` and includes a `canonical_keys` top-level section:

```json
{
  "version": "1",
  "generated_at": "...",
  "canonical_keys": {
    "skills": {
      "display_name": { "description": "Human-readable display name...", "type": "string" },
      "description": { "description": "What the skill does...", "type": "string" }
    }
  },
  "providers": { "...existing structure..." }
}
```

Backward-compatible addition — existing consumers ignore unknown top-level keys.

## Component Details

### MetaBox.astro

Props-driven infobox. No collection queries.

```typescript
interface Props {
  lastChangedAt: string;        // ISO 8601 — "Last verified" date
  sourceCount: number;          // Unique sources across all providers for this key
  providerSupportCount: number; // Providers that support this key
  totalProviders: number;       // Total provider count (for "X of Y" display)
  issueUrl: string;             // Pre-filled GitHub issue URL
}
```

Renders:
- "Last verified: Apr 11, 2026"
- "Sources: 8 across providers"
- "Support: 10 of 14 providers"
- "Report issue" link

### CanonicalSupportTable.astro

Queries `capabilities` collection at build time.

```typescript
interface Props {
  keyName: string;      // e.g., "display_name"
  contentType: string;  // e.g., "skills"
}
```

Renders a table: Provider | Supported | Mechanism. Rows sorted: supported providers first, then unsupported, alphabetically within each group. Supported shows checkmark, unsupported shows cross.

### ProviderExtensions.astro

Queries `capabilities` collection at build time.

```typescript
interface Props {
  provider: string;     // e.g., "claude-code"
  contentType: string;  // e.g., "skills"
}
```

Renders the `providerExtensions` array as a styled list with name, description, and optional source link. Only rendered when extensions exist (sync-providers.ts conditionally emits the component call).

## Page Generation

### Canonical key pages

sync-capabilities.ts generates one MDX file per canonical key into `src/content/docs/reference/canonical-keys/`:

- Filename: `<key-with-hyphens>.mdx` (e.g., `display-name.mdx`)
- Frontmatter: title = key name, description from canonical key metadata
- Body: MetaBox component call, description text, type badge, CanonicalSupportTable component call

### Capabilities matrix page

sync-capabilities.ts generates `src/content/docs/reference/capabilities-matrix.mdx`:

- Grid: rows = canonical keys (grouped by content type), columns = providers
- Cells: checkmark/cross for supported/unsupported
- Key names link to their detail pages
- Generated as a markdown table (static data, no component needed)

### Provider page enrichment

sync-providers.ts gains logic to:
1. Read `src/data/capabilities/*.json` at startup
2. For each provider+contentType combo with extensions, emit `<ProviderExtensions provider="..." contentType="..." />` in the provider MDX page
3. Import statement for ProviderExtensions added at top of generated MDX when needed

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No capabilities.json available (no release, no --local) | Script exits with clear error message, build continues without capabilities data |
| capabilities.json has unknown fields | Zod schema strips unknowns — forward compatible |
| Provider in capabilities.json not in providers data | Capabilities data file written anyway — independent data source |
| Empty canonical_mappings for a content type | Canonical key pages still generated; providers with no mapping show as unsupported |
| Provider has no extensions | sync-providers.ts skips ProviderExtensions component call for that provider+type |

## Success Criteria

1. `bun scripts/sync-capabilities.ts --local /tmp/capabilities.json` runs without error
2. Data files written: `src/data/capabilities/*.json` and `src/data/canonical-keys/*.json`
3. Zod validation passes at build time (no schema errors in content.config.ts)
4. Canonical key pages render at `/reference/canonical-keys/<key>/`
5. Capabilities matrix renders at `/reference/capabilities-matrix/`
6. Provider pages show extensions sections for providers that have them
7. MetaBox shows correct counts and working pre-filled issue-report link
8. CanonicalSupportTable shows correct provider support data
9. `astro build` completes without errors
10. `astro dev` serves all pages without runtime errors

## Resolved During Design

| Question | Decision | Reasoning |
|----------|----------|-----------|
| Where do capabilities data files live? | `src/data/` (not `src/content/`) | Consistent with existing providers data in `src/data/providers/` |
| MDX generation vs dynamic routing for canonical key pages? | Script-generated MDX | Proven pattern from sync-providers.ts, auto-sidebar, no new routing setup |
| MetaBox: component with collection query or props? | Props inline in generated MDX | Simpler component, sync script already has all the data |
| CanonicalSupportTable: MDX table or component? | Astro component querying collection | Table formatting in one place, clean generated MDX |
| Provider extensions: subsection or standalone pages? | Subsection via ProviderExtensions component on provider pages | Keeps related info together, no page proliferation |
| How do extensions get into provider pages? | sync-providers.ts reads capabilities data | Natural dependency order, capabilities sync runs first |
| Issue report link format? | Pre-filled GitHub issue URL | Better UX with key name, data summary, source links pre-filled |
| Include capabilities matrix page? | Yes, in Phase 2 scope | Natural entry point for canonical key detail pages |
| How to get canonical key metadata (descriptions, types)? | Bundle in capabilities.json (_gencapabilities update) | One fetch, no separate dependency on canonical-keys.yaml |

---

## Next Steps

1. Update `_gencapabilities` in the syllago repo to bundle `canonical_keys` section (small Phase 1 addition)
2. Implementation planning with Plan skill for the syllago-docs work
3. Phases: sync-capabilities.ts → content.config.ts → components → page generation → sync-providers.ts enrichment → package.json
