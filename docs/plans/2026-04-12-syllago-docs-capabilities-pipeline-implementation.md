# syllago-docs Capabilities Pipeline (Phase 2) — Implementation Plan

**Feature:** syllago-docs-capabilities-pipeline
**Design doc:** `docs/plans/2026-04-12-syllago-docs-capabilities-pipeline-design.md`
**Date:** 2026-04-12

---

## Overview

Phase 2 lands in the `syllago-docs` repo. It adds a sync script, two Astro data collections, three components, generated canonical key pages, a capabilities matrix page, and provider page enrichment. Phase 1 requires a small prerequisite update in the sibling `syllago` repo (T0) before the docs pipeline can run end-to-end with real data.

Execution order within each task group is sequential. Tasks within the same milestone can proceed in parallel where noted.

---

## Task Index

| ID | Title | Depends On |
|----|-------|-----------|
| T0 | Bundle `canonical_keys` in `_gencapabilities` | — |
| T1 | Scaffold `sync-capabilities.ts` with loader and data-file writer | T0 |
| T2 | Add `capabilities` and `canonical-keys` collections to `content.config.ts` | — |
| T3 | Implement `MetaBox.astro` component | — |
| T4 | Implement `CanonicalSupportTable.astro` component | T2 |
| T5 | Implement `ProviderExtensions.astro` component | T2 |
| T6 | Add canonical key MDX generation to `sync-capabilities.ts` | T1, T3, T4 |
| T7 | Add capabilities matrix MDX generation to `sync-capabilities.ts` | T1 |
| T8 | Extend `sync-providers.ts` to emit `ProviderExtensions` | T1, T5 |
| T9 | Update `package.json` sync and prebuild scripts | T1 |
| T10 | End-to-end validation | T6, T7, T8, T9 |

---

## T0 — Bundle `canonical_keys` in `_gencapabilities`

**Repo:** `/home/hhewett/.local/src/syllago`
**File:** `cli/cmd/syllago/gencapabilities.go`

This is a prerequisite. The current `CapabilitiesManifest` struct has no `canonical_keys` field. `_gencapabilities` already reads `docs/spec/canonical-keys.yaml` for nothing — it doesn't. The design doc requires a new read: parse `docs/spec/canonical-keys.yaml` and embed the result in the top-level JSON output.

### Step 1: Add the YAML input types and JSON output types

In `gencapabilities.go`, add after the existing `capExtensionYAML` struct:

```go
// canonicalKeysYAML is the top-level structure of docs/spec/canonical-keys.yaml.
type canonicalKeysYAML struct {
	ContentTypes map[string]map[string]canonicalKeyEntryYAML `yaml:"content_types"`
}

// canonicalKeyEntryYAML is a single key entry under content_types.<type>.
type canonicalKeyEntryYAML struct {
	Description string `yaml:"description"`
	Type        string `yaml:"type"`
}
```

Add after the existing `CapExtension` struct:

```go
// CanonicalKeyMeta is a single canonical key's metadata in the JSON output.
type CanonicalKeyMeta struct {
	Description string `json:"description"`
	Type        string `json:"type"`
}
```

### Step 2: Add `CanonicalKeys` field to `CapabilitiesManifest`

Change the struct:

```go
type CapabilitiesManifest struct {
	Version      string                                        `json:"version"`
	GeneratedAt  string                                        `json:"generated_at"`
	CanonicalKeys map[string]map[string]CanonicalKeyMeta       `json:"canonical_keys"`
	Providers    map[string]map[string]CapContentType          `json:"providers"`
}
```

### Step 3: Add `loadCanonicalKeys` function

Add before `runGencapabilities`:

```go
// canonicalKeysSpecPath is the path to docs/spec/canonical-keys.yaml.
// Overridable in tests.
var canonicalKeysSpecPath = filepath.Join("..", "docs", "spec", "canonical-keys.yaml")

// loadCanonicalKeys reads canonical-keys.yaml and returns a map of
// content_type → key_name → CanonicalKeyMeta.
func loadCanonicalKeys(specPath string) (map[string]map[string]CanonicalKeyMeta, error) {
	raw, err := os.ReadFile(specPath)
	if err != nil {
		return nil, fmt.Errorf("reading canonical-keys.yaml: %w", err)
	}

	var doc canonicalKeysYAML
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		return nil, fmt.Errorf("parsing canonical-keys.yaml: %w", err)
	}

	result := make(map[string]map[string]CanonicalKeyMeta, len(doc.ContentTypes))
	for ct, keys := range doc.ContentTypes {
		result[ct] = make(map[string]CanonicalKeyMeta, len(keys))
		for keyName, entry := range keys {
			result[ct][keyName] = CanonicalKeyMeta{
				Description: strings.TrimSpace(entry.Description),
				Type:        entry.Type,
			}
		}
	}
	return result, nil
}
```

### Step 4: Call `loadCanonicalKeys` in `runGencapabilities`

Replace the existing `runGencapabilities` body:

```go
func runGencapabilities(_ *cobra.Command, _ []string) error {
	entries, err := loadProviderFormatsDir(capabilitiesProviderFormatsDir)
	if err != nil {
		return fmt.Errorf("loading provider formats: %w", err)
	}

	canonicalKeys, err := loadCanonicalKeys(canonicalKeysSpecPath)
	if err != nil {
		return fmt.Errorf("loading canonical keys: %w", err)
	}

	manifest := CapabilitiesManifest{
		Version:       "1",
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
		CanonicalKeys: canonicalKeys,
		Providers:     entries,
	}

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	return enc.Encode(manifest)
}
```

### Step 5: Build and test

```bash
cd /home/hhewett/.local/src/syllago
make build
syllago _gencapabilities | python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d['canonical_keys'].keys()))"
```

### Success Criteria

- `make build` → pass — binary compiles without errors
- `syllago _gencapabilities | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'canonical_keys' in d, 'missing key'; assert 'skills' in d['canonical_keys'], 'missing skills'; assert 'display_name' in d['canonical_keys']['skills'], 'missing display_name'; print('OK')"` → `OK` — canonical_keys present with correct structure
- `syllago _gencapabilities | python3 -c "import sys,json; d=json.load(sys.stdin); k=d['canonical_keys']['skills']['display_name']; assert k['type']=='string'; assert len(k['description'])>10; print('OK')"` → `OK` — key metadata has description and type

---

## T1 — Scaffold `sync-capabilities.ts` with loader and data-file writer

**Repo:** `syllago-docs`
**File:** `scripts/sync-capabilities.ts` (new)

This task establishes the script skeleton and writes the two data collection directories. It mirrors `sync-providers.ts` exactly in structure: shebang, types mirroring the Go output schema, config constants, GitHub auth helper, `loadManifest()`, data-file writers, and `main()`.

### The complete `sync-capabilities.ts` scaffold

```typescript
#!/usr/bin/env bun
/**
 * sync-capabilities.ts — Fetches capabilities.json and generates:
 *   1. Per-provider-contenttype capability JSON files (src/data/capabilities/)
 *   2. Per-canonical-key JSON files (src/data/canonical-keys/)
 *   3. MDX reference pages (src/content/docs/reference/canonical-keys/*.mdx)
 *   4. Capabilities matrix page (src/content/docs/reference/capabilities-matrix.mdx)
 *
 * Usage:
 *   bun scripts/sync-capabilities.ts                                   # fetch from latest GitHub release
 *   bun scripts/sync-capabilities.ts --local path/to/capabilities.json # use local file
 *   CAPABILITIES_JSON_PATH=path/to/capabilities.json bun scripts/sync-capabilities.ts
 */

import { mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { execFileSync } from "child_process";

// ---------------------------------------------------------------------------
// Types (mirrors the Go CapabilitiesManifest schema)
// ---------------------------------------------------------------------------

interface CapSource {
  uri: string;
  type: string;
  fetched_at: string;
}

interface CapMapping {
  supported: boolean;
  mechanism: string;
  paths?: string[];
}

interface CapExtension {
  id: string;
  name: string;
  description: string;
  source_ref?: string;
}

interface CapContentType {
  status: string;
  last_changed_at: string;
  sources: CapSource[];
  canonical_mappings: Record<string, CapMapping>;
  provider_extensions: CapExtension[];
}

interface CanonicalKeyMeta {
  description: string;
  type: string;
}

interface CapabilitiesManifest {
  version: string;
  generated_at: string;
  canonical_keys: Record<string, Record<string, CanonicalKeyMeta>>;
  providers: Record<string, Record<string, CapContentType>>;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT_DIR = dirname(import.meta.dir);
const GITHUB_REPO = "OpenScribbler/syllago";
const CAPABILITIES_DATA_DIR = join(ROOT_DIR, "src/data/capabilities");
const CANONICAL_KEYS_DATA_DIR = join(ROOT_DIR, "src/data/canonical-keys");
const CANONICAL_KEYS_MDX_DIR = join(ROOT_DIR, "src/content/docs/reference/canonical-keys");
const REFERENCE_DIR = join(ROOT_DIR, "src/content/docs/reference");
const FETCH_TIMEOUT_MS = 15_000;

// GitHub issue URL base for "Report issue" links in MetaBox.
const ISSUE_REPO = "OpenScribbler/syllago";

// ---------------------------------------------------------------------------
// GitHub auth (same pattern as sync-providers.ts)
// ---------------------------------------------------------------------------

function getGitHubToken(): string | undefined {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf-8" }).trim();
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Load capabilities.json
// ---------------------------------------------------------------------------

async function loadManifest(): Promise<CapabilitiesManifest> {
  const localArgIdx = process.argv.indexOf("--local");
  const localPath =
    localArgIdx !== -1
      ? process.argv[localArgIdx + 1]
      : process.env.CAPABILITIES_JSON_PATH;

  if (localPath) {
    if (!existsSync(localPath)) {
      throw new Error(`Local capabilities.json not found: ${localPath}`);
    }
    console.log(`Loading capabilities.json from local file: ${localPath}`);
    return JSON.parse(readFileSync(localPath, "utf-8"));
  }

  console.log(`Fetching capabilities.json from latest ${GITHUB_REPO} release...`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const token = getGitHubToken();
  const authHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) {
    authHeaders.Authorization = `Bearer ${token}`;
  }

  try {
    const releaseRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: authHeaders, signal: controller.signal }
    );
    if (!releaseRes.ok) {
      throw new Error(
        `GitHub API returned ${releaseRes.status}: ${await releaseRes.text()}`
      );
    }

    const release = (await releaseRes.json()) as {
      assets: { name: string; url: string }[];
    };
    const asset = release.assets.find((a) => a.name === "capabilities.json");
    if (!asset) {
      throw new Error("capabilities.json not found in latest release assets");
    }

    const jsonRes = await fetch(asset.url, {
      headers: { ...authHeaders, Accept: "application/octet-stream" },
      signal: controller.signal,
    });
    if (!jsonRes.ok) {
      throw new Error(`Failed to fetch capabilities.json: ${jsonRes.status}`);
    }

    return (await jsonRes.json()) as CapabilitiesManifest;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Data collection output — capabilities files
// (generateCapabilitiesDataFiles and generateCanonicalKeysDataFiles added in T6)
// ---------------------------------------------------------------------------

function writeCapabilitiesDataFiles(
  manifest: CapabilitiesManifest
): void {
  rmSync(CAPABILITIES_DATA_DIR, { recursive: true, force: true });
  mkdirSync(CAPABILITIES_DATA_DIR, { recursive: true });

  let count = 0;
  for (const [providerSlug, contentTypes] of Object.entries(manifest.providers)) {
    for (const [contentType, cap] of Object.entries(contentTypes)) {
      const id = `${providerSlug}-${contentType}`;
      const data = {
        id,
        provider: providerSlug,
        contentType,
        status: cap.status,
        lastChangedAt: cap.last_changed_at,
        sources: cap.sources,
        canonicalMappings: cap.canonical_mappings,
        providerExtensions: cap.provider_extensions,
      };
      writeFileSync(
        join(CAPABILITIES_DATA_DIR, `${id}.json`),
        JSON.stringify(data, null, 2) + "\n"
      );
      count++;
    }
  }

  console.log(`  Data: ${count} capability JSON files in ${CAPABILITIES_DATA_DIR}`);
}

function writeCanonicalKeysDataFiles(
  manifest: CapabilitiesManifest
): void {
  rmSync(CANONICAL_KEYS_DATA_DIR, { recursive: true, force: true });
  mkdirSync(CANONICAL_KEYS_DATA_DIR, { recursive: true });

  // Build per-key provider support maps from all providers.
  // Structure: contentType → keyName → { provider → { supported, mechanism } }
  const keySupport: Record<
    string,
    Record<string, Record<string, { supported: boolean; mechanism: string }>>
  > = {};

  for (const [providerSlug, contentTypes] of Object.entries(manifest.providers)) {
    for (const [contentType, cap] of Object.entries(contentTypes)) {
      if (!keySupport[contentType]) keySupport[contentType] = {};
      for (const [keyName, mapping] of Object.entries(cap.canonical_mappings)) {
        if (!keySupport[contentType][keyName]) keySupport[contentType][keyName] = {};
        keySupport[contentType][keyName][providerSlug] = {
          supported: mapping.supported,
          mechanism: mapping.mechanism,
        };
      }
    }
  }

  let count = 0;
  for (const [contentType, keys] of Object.entries(manifest.canonical_keys)) {
    for (const [keyName, meta] of Object.entries(keys)) {
      const id = `${contentType}-${keyName}`;
      const data = {
        id,
        key: keyName,
        contentType,
        description: meta.description,
        type: meta.type,
        providers: keySupport[contentType]?.[keyName] ?? {},
      };
      writeFileSync(
        join(CANONICAL_KEYS_DATA_DIR, `${id}.json`),
        JSON.stringify(data, null, 2) + "\n"
      );
      count++;
    }
  }

  console.log(`  Data: ${count} canonical key JSON files in ${CANONICAL_KEYS_DATA_DIR}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let manifest: CapabilitiesManifest;
  try {
    manifest = await loadManifest();
  } catch (err: any) {
    // Graceful skip: if MDX pages already exist from a previous sync, keep them
    // and let the build proceed. The script never generates index.mdx, so we
    // check for any .mdx file in the canonical-keys output dir instead.
    const hasPriorOutput =
      existsSync(CANONICAL_KEYS_MDX_DIR) &&
      readdirSync(CANONICAL_KEYS_MDX_DIR).some((f) => f.endsWith(".mdx"));
    if (hasPriorOutput) {
      console.log(`Sync skipped: ${err.message}`);
      console.log("Using existing capabilities reference files.");
      return;
    }
    throw err;
  }

  console.log(
    `Loaded capabilities.json v${manifest.version} generated ${manifest.generated_at.split("T")[0]}`
  );

  writeCapabilitiesDataFiles(manifest);
  writeCanonicalKeysDataFiles(manifest);

  console.log("  MDX generation: not yet implemented (added in T6, T7)");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
```

### Run and verify

```bash
cd /home/hhewett/.local/src/syllago-docs
bun scripts/sync-capabilities.ts --local /tmp/capabilities.json
```

Expected output:
```
Loading capabilities.json from local file: /tmp/capabilities.json
Loaded capabilities.json v1 generated 2026-04-13
  Data: 57 capability JSON files in .../src/data/capabilities
  Data: 12 canonical key JSON files in .../src/data/canonical-keys
  MDX generation: not yet implemented (added in T6, T7)
```

### Success Criteria

- `bun scripts/sync-capabilities.ts --local /tmp/capabilities.json` → pass (exit 0) — script runs without error
- `ls /home/hhewett/.local/src/syllago-docs/src/data/capabilities/ | wc -l` → `57` — one file per provider+contentType combo
- `ls /home/hhewett/.local/src/syllago-docs/src/data/canonical-keys/ | wc -l` → `12` — one file per canonical key (all keys are under `skills` content type in the current spec)
- `cat /home/hhewett/.local/src/syllago-docs/src/data/capabilities/amp-skills.json | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['id']=='amp-skills'; assert d['provider']=='amp'; assert d['contentType']=='skills'; assert 'display_name' in d['canonicalMappings']; print('OK')"` → `OK` — capability file has correct structure with canonical mappings
- `cat /home/hhewett/.local/src/syllago-docs/src/data/canonical-keys/skills-display_name.json | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['id']=='skills-display_name'; assert 'amp' in d['providers']; assert d['providers']['amp']['supported']==True; print('OK')"` → `OK` — canonical key file aggregates provider support correctly

---

## T2 — Add `capabilities` and `canonical-keys` collections to `content.config.ts`

**File:** `src/content.config.ts`

This task adds Zod schemas and registers two new data collections. The existing pattern (glob loader on `src/data/providers/`) is replicated exactly.

### Changes to `content.config.ts`

Add after the existing `providerSchema` definition and before `export const collections`:

```typescript
const capSourceSchema = z.object({
  uri: z.string(),
  type: z.string(),
  fetched_at: z.string(),
});

const capMappingSchema = z.object({
  supported: z.boolean(),
  mechanism: z.string(),
  paths: z.array(z.string()).optional(),
});

const capExtensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  source_ref: z.string().optional(),
});

const capabilitySchema = z.object({
  id: z.string(),
  provider: z.string(),
  contentType: z.string(),
  status: z.string(),
  lastChangedAt: z.string(),
  sources: z.array(capSourceSchema),
  canonicalMappings: z.record(z.string(), capMappingSchema),
  providerExtensions: z.array(capExtensionSchema),
});

const canonicalKeyProviderSupportSchema = z.object({
  supported: z.boolean(),
  mechanism: z.string(),
});

const canonicalKeySchema = z.object({
  id: z.string(),
  key: z.string(),
  contentType: z.string(),
  description: z.string(),
  type: z.string(),
  providers: z.record(z.string(), canonicalKeyProviderSupportSchema),
});
```

Update `export const collections` to add both new collections:

```typescript
export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  providers: defineCollection({
    loader: glob({ pattern: '*.json', base: './src/data/providers' }),
    schema: providerSchema,
  }),
  capabilities: defineCollection({
    loader: glob({ pattern: '*.json', base: './src/data/capabilities' }),
    schema: capabilitySchema,
  }),
  'canonical-keys': defineCollection({
    loader: glob({ pattern: '*.json', base: './src/data/canonical-keys' }),
    schema: canonicalKeySchema,
  }),
  glossary: defineCollection({
    loader: glob({ pattern: '**/*.yaml', base: './src/content/glossary' }),
    schema: z.object({
      term: z.string(),
      slug: z.string(),
      definition: z.string(),
      category: z.enum(['core', 'content-type', 'provider', 'ai-ecosystem', 'format']),
      aliases: z.array(z.string()).optional(),
      abbr: z.string().optional(),
      link: z.string().optional(),
      related: z.array(z.string()).optional(),
    }),
  }),
};
```

Note: T1 must have run first so the data files exist and Astro's type sync succeeds.

### Verify

```bash
cd /home/hhewett/.local/src/syllago-docs
bun astro sync
```

### Success Criteria

- `bun astro sync` → pass (exit 0) — Astro generates types without schema errors
- `bun astro check` → pass (exit 0) — TypeScript sees both new collection types
- `grep -c "canonical-keys" src/content.config.ts` → `1` — collection registered by exact name

---

## T3 — Implement `MetaBox.astro` component

**File:** `src/components/MetaBox.astro` (new)

`MetaBox` is props-driven with no collection queries. It renders an infobox at the top of each canonical key page showing verification date, source count, provider support ratio, and a report link.

### Complete `MetaBox.astro`

```astro
---
/**
 * MetaBox.astro — Capability key metadata infobox.
 *
 * Props-driven; no collection queries. All values are passed inline
 * from the generated MDX page (sync-capabilities.ts has the data at
 * generation time).
 *
 * Props:
 *   lastChangedAt: string    — ISO 8601 date string ("Last verified" date)
 *   sourceCount: number      — Unique sources across all providers for this key
 *   providerSupportCount: number — Providers that support this key
 *   totalProviders: number   — Total providers tracked (for "X of Y" display)
 *   issueUrl: string         — Pre-filled GitHub issue URL
 */

interface Props {
  lastChangedAt: string;
  sourceCount: number;
  providerSupportCount: number;
  totalProviders: number;
  issueUrl: string;
}

const { lastChangedAt, sourceCount, providerSupportCount, totalProviders, issueUrl } =
  Astro.props;

// Format ISO date string as "Apr 11, 2026".
const verifiedDate = new Date(lastChangedAt).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
---

<aside class="meta-box not-content">
  <dl class="meta-box__items">
    <div class="meta-box__item">
      <dt>Last verified</dt>
      <dd>{verifiedDate}</dd>
    </div>
    <div class="meta-box__item">
      <dt>Sources</dt>
      <dd>{sourceCount} across providers</dd>
    </div>
    <div class="meta-box__item">
      <dt>Support</dt>
      <dd>{providerSupportCount} of {totalProviders} providers</dd>
    </div>
    <div class="meta-box__item meta-box__item--action">
      <a href={issueUrl} target="_blank" rel="noopener noreferrer" class="meta-box__report-link">
        Report issue
      </a>
    </div>
  </dl>
</aside>

<style>
  .meta-box {
    background-color: var(--sl-color-bg-nav);
    border: 1px solid var(--sl-color-hairline-light);
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
    margin-bottom: 1.5rem;
  }

  .meta-box__items {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 2rem;
    margin: 0;
  }

  .meta-box__item {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .meta-box__item dt {
    font-size: var(--sl-text-xs);
    color: var(--sl-color-gray-3);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .meta-box__item dd {
    font-size: var(--sl-text-sm);
    color: var(--sl-color-text);
    margin: 0;
  }

  .meta-box__item--action {
    justify-content: flex-end;
    margin-left: auto;
  }

  .meta-box__report-link {
    font-size: var(--sl-text-sm);
    color: var(--sl-color-text-accent);
    text-decoration: none;
    border: 1px solid var(--sl-color-text-accent);
    border-radius: 0.25rem;
    padding: 0.25rem 0.625rem;
    transition: background-color 0.15s;
  }

  .meta-box__report-link:hover {
    background-color: var(--sl-color-text-accent);
    color: var(--sl-color-white);
  }

  @media (max-width: 50rem) {
    .meta-box__item--action {
      margin-left: 0;
      width: 100%;
    }
  }
</style>
```

### Success Criteria

- `bun astro check` → pass (exit 0) — component type-checks without errors (requires at least a stub MDX that imports it, or just check passes without any page referencing it yet)
- Visual check after T6: MetaBox renders on any canonical key page at `/reference/canonical-keys/<key>/` with date, source count, support count, and "Report issue" link that opens a GitHub new-issue URL — pass

---

## T4 — Implement `CanonicalSupportTable.astro` component

**File:** `src/components/CanonicalSupportTable.astro` (new)

Queries the `capabilities` collection at build time and renders the support table for a single canonical key. Requires T2 (collections registered) and T1 (data files exist).

### Complete `CanonicalSupportTable.astro`

```astro
---
/**
 * CanonicalSupportTable.astro — Provider support table for a canonical key.
 *
 * Queries the 'capabilities' collection at build time and renders:
 *   Provider | Supported | Mechanism
 *
 * Rows sorted: supported providers first (alphabetical), then unsupported
 * (alphabetical). Support shown as checkmark; unsupported as cross.
 *
 * Props:
 *   keyName: string      — e.g., "display_name"
 *   contentType: string  — e.g., "skills"
 */
import { getCollection } from 'astro:content';

interface Props {
  keyName: string;
  contentType: string;
}

const { keyName, contentType } = Astro.props;

// Load all capability entries for this content type.
const allCapabilities = await getCollection('capabilities');
const relevant = allCapabilities.filter(
  (entry) => entry.data.contentType === contentType
);

// Build rows: one per provider that has an entry for this contentType.
interface Row {
  provider: string;
  supported: boolean;
  mechanism: string;
}

const rows: Row[] = relevant.map((entry) => {
  const mapping = entry.data.canonicalMappings[keyName];
  return {
    provider: entry.data.provider,
    supported: mapping?.supported ?? false,
    mechanism: mapping?.mechanism ?? "not documented",
  };
});

// Sort: supported first, then unsupported; alphabetical within each group.
rows.sort((a, b) => {
  if (a.supported !== b.supported) return a.supported ? -1 : 1;
  return a.provider.localeCompare(b.provider);
});
---

{rows.length === 0 ? (
  <p>No provider support data available for <code>{keyName}</code>.</p>
) : (
  <table>
    <thead>
      <tr>
        <th>Provider</th>
        <th>Supported</th>
        <th>Mechanism</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr>
          <td><a href={`/using-syllago/providers/${row.provider}/`}>{row.provider}</a></td>
          <td class={row.supported ? "support-yes" : "support-no"}>
            {row.supported ? "✓" : "✗"}
          </td>
          <td>{row.mechanism}</td>
        </tr>
      ))}
    </tbody>
  </table>
)}

<style>
  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--sl-color-hairline-light);
  }

  th {
    font-size: var(--sl-text-sm);
    color: var(--sl-color-gray-3);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .support-yes {
    color: var(--sl-color-green);
    font-weight: 600;
  }

  .support-no {
    color: var(--sl-color-red);
    font-weight: 600;
  }

  tr:last-child td {
    border-bottom: none;
  }
</style>
```

### Success Criteria

- `bun astro check` → pass (exit 0) — component type-checks; `getCollection('capabilities')` resolves correctly
- Visual check after T6: table on any canonical key page shows providers with checkmarks for supported, crosses for unsupported, sorted supported-first — pass
- `grep -c "getCollection('capabilities')" src/components/CanonicalSupportTable.astro` → `1` — component queries the correct collection name

---

## T5 — Implement `ProviderExtensions.astro` component

**File:** `src/components/ProviderExtensions.astro` (new)

Queries the `capabilities` collection for a single provider+contentType and renders provider extensions as a styled list. Requires T2.

### Complete `ProviderExtensions.astro`

```astro
---
/**
 * ProviderExtensions.astro — Provider-specific extension list.
 *
 * Queries the 'capabilities' collection for the given provider+contentType
 * and renders providerExtensions as a styled definition list. Each entry
 * shows name, description, and an optional source link.
 *
 * Only rendered in provider MDX pages when extensions exist
 * (sync-providers.ts conditionally emits this component call).
 *
 * Props:
 *   provider: string     — e.g., "claude-code"
 *   contentType: string  — e.g., "skills"
 */
import { getCollection } from 'astro:content';

interface Props {
  provider: string;
  contentType: string;
}

const { provider, contentType } = Astro.props;

const allCapabilities = await getCollection('capabilities');
const entry = allCapabilities.find(
  (e) => e.data.provider === provider && e.data.contentType === contentType
);

const extensions = entry?.data.providerExtensions ?? [];
---

{extensions.length > 0 && (
  <dl class="provider-extensions not-content">
    {extensions.map((ext) => (
      <div class="provider-extensions__item">
        <dt class="provider-extensions__name">
          {ext.source_ref ? (
            <a href={ext.source_ref} target="_blank" rel="noopener noreferrer">
              {ext.name}
            </a>
          ) : (
            ext.name
          )}
        </dt>
        <dd class="provider-extensions__description">{ext.description}</dd>
      </div>
    ))}
  </dl>
)}

<style>
  .provider-extensions {
    margin: 0;
  }

  .provider-extensions__item {
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--sl-color-hairline-light);
  }

  .provider-extensions__item:last-child {
    border-bottom: none;
  }

  .provider-extensions__name {
    font-weight: 600;
    font-size: var(--sl-text-sm);
    color: var(--sl-color-text);
    margin-bottom: 0.25rem;
  }

  .provider-extensions__name a {
    color: var(--sl-color-text-accent);
    text-decoration: none;
  }

  .provider-extensions__name a:hover {
    text-decoration: underline;
  }

  .provider-extensions__description {
    font-size: var(--sl-text-sm);
    color: var(--sl-color-gray-2);
    margin: 0;
    line-height: 1.5;
  }
</style>
```

### Success Criteria

- `bun astro check` → pass (exit 0) — component type-checks
- Visual check after T8: provider pages for providers with extensions (e.g., `amp`, `claude-code`) show `## Skills Extensions` section with the extensions list — pass
- `grep -c "getCollection('capabilities')" src/components/ProviderExtensions.astro` → `1` — queries correct collection

---

## T6 — Add canonical key MDX generation to `sync-capabilities.ts`

**Depends on:** T1 (script exists), T3 (MetaBox exists), T4 (CanonicalSupportTable exists), T2 (collections registered so `bun astro sync` passes)

This task adds MDX generation to `sync-capabilities.ts`. The function `generateCanonicalKeyPages` replaces the placeholder `console.log` in `main()`.

### The issue URL builder

Add this helper after the config constants in `sync-capabilities.ts`:

```typescript
// ---------------------------------------------------------------------------
// Issue URL builder
// ---------------------------------------------------------------------------

function buildIssueUrl(
  keyName: string,
  contentType: string,
  generatedAt: string
): string {
  const title = encodeURIComponent(`[capmon] Incorrect capability data: ${contentType}/${keyName}`);
  const body = encodeURIComponent(
    `**Canonical key:** \`${keyName}\`\n` +
    `**Content type:** \`${contentType}\`\n` +
    `**Data generated:** ${generatedAt.split("T")[0]}\n\n` +
    `**What is incorrect:**\n\n` +
    `<!-- Describe the incorrect data and provide a source URL if available -->`
  );
  return `https://github.com/${ISSUE_REPO}/issues/new?title=${title}&body=${body}&labels=capmon`;
}
```

### The `generateCanonicalKeyPages` function

Add this function before `main()` in `sync-capabilities.ts`:

```typescript
// ---------------------------------------------------------------------------
// MDX generation — Canonical key pages
// ---------------------------------------------------------------------------

function generateCanonicalKeyPage(
  keyName: string,
  contentType: string,
  meta: CanonicalKeyMeta,
  manifest: CapabilitiesManifest
): string {
  // Compute MetaBox props from the manifest data.
  const allProviderSlugs = Object.keys(manifest.providers);
  const totalProviders = allProviderSlugs.length;

  let providerSupportCount = 0;
  const uniqueSourceUris = new Set<string>();
  let mostRecentDate = "";

  for (const [, contentTypes] of Object.entries(manifest.providers)) {
    const cap = contentTypes[contentType];
    if (!cap) continue;

    const mapping = cap.canonical_mappings[keyName];
    if (mapping?.supported) providerSupportCount++;

    for (const src of cap.sources) {
      uniqueSourceUris.add(src.uri);
    }

    if (!mostRecentDate || cap.last_changed_at > mostRecentDate) {
      mostRecentDate = cap.last_changed_at;
    }
  }

  const sourceCount = uniqueSourceUris.size;
  const lastChangedAt = mostRecentDate || manifest.generated_at;
  const issueUrl = buildIssueUrl(keyName, contentType, manifest.generated_at);

  // Human-readable title from key name: "display_name" → "display_name"
  // (keep as-is; the key name is the canonical identifier).
  const title = keyName;
  const description = meta.description.split(".")[0].trim(); // first sentence

  const lines: string[] = [
    "---",
    `title: ${title}`,
    `description: ${description}`,
    "---",
    "",
    "{/* AUTO-GENERATED — do not edit. Source: capabilities.json via sync-capabilities.ts */}",
    "",
    `import MetaBox from '../../../../components/MetaBox.astro';`,
    `import CanonicalSupportTable from '../../../../components/CanonicalSupportTable.astro';`,
    "",
    `<MetaBox`,
    `  lastChangedAt="${lastChangedAt}"`,
    `  sourceCount={${sourceCount}}`,
    `  providerSupportCount={${providerSupportCount}}`,
    `  totalProviders={${totalProviders}}`,
    `  issueUrl="${issueUrl}"`,
    `/>`,
    "",
    meta.description,
    "",
    `**Type:** \`${meta.type}\`  **Content type:** \`${contentType}\``,
    "",
    "## Provider Support",
    "",
    `<CanonicalSupportTable keyName="${keyName}" contentType="${contentType}" />`,
    "",
  ];

  return lines.join("\n");
}

function generateCanonicalKeyPages(manifest: CapabilitiesManifest): void {
  rmSync(CANONICAL_KEYS_MDX_DIR, { recursive: true, force: true });
  mkdirSync(CANONICAL_KEYS_MDX_DIR, { recursive: true });

  let count = 0;
  for (const [contentType, keys] of Object.entries(manifest.canonical_keys)) {
    for (const [keyName, meta] of Object.entries(keys)) {
      const slug = keyName.replace(/_/g, "-");
      const content = generateCanonicalKeyPage(keyName, contentType, meta, manifest);
      writeFileSync(join(CANONICAL_KEYS_MDX_DIR, `${slug}.mdx`), content);
      count++;
    }
  }

  console.log(`  MDX: ${count} canonical key pages in ${CANONICAL_KEYS_MDX_DIR}`);
}
```

### Update `main()` to call the new functions

Replace the placeholder `console.log` line in `main()`:

```typescript
  writeCapabilitiesDataFiles(manifest);
  writeCanonicalKeysDataFiles(manifest);
  generateCanonicalKeyPages(manifest);
  // generateCapabilitiesMatrixPage added in T7
```

### Run and verify

```bash
cd /home/hhewett/.local/src/syllago-docs
bun scripts/sync-capabilities.ts --local /tmp/capabilities.json
ls src/content/docs/reference/canonical-keys/
```

Expected files: `display-name.mdx`, `description.mdx`, `license.mdx`, `compatibility.mdx`, `metadata-map.mdx`, `disable-model-invocation.mdx`, `user-invocable.mdx`, `version.mdx`, `project-scope.mdx`, `global-scope.mdx`, `shared-scope.mdx`, `canonical-filename.mdx`, `custom-filename.mdx` (one per key in canonical-keys.yaml).

```bash
bun astro build 2>&1 | tail -20
```

### Success Criteria

- `bun scripts/sync-capabilities.ts --local /tmp/capabilities.json` → pass (exit 0) — script runs and logs key page count
- `ls src/content/docs/reference/canonical-keys/*.mdx | wc -l` → count matches number of canonical keys in `/tmp/capabilities.json canonical_keys` section (after T0 adds it) — pass
- `grep "MetaBox" src/content/docs/reference/canonical-keys/display-name.mdx` → pass — MetaBox import and component call present
- `grep "CanonicalSupportTable" src/content/docs/reference/canonical-keys/display-name.mdx` → pass — CanonicalSupportTable component call present
- `bun astro build` → pass (exit 0) — site builds without MDX or Zod errors

---

## T7 — Add capabilities matrix MDX generation to `sync-capabilities.ts`

**Depends on:** T1 (script exists)

This task adds the `generateCapabilitiesMatrix` function and calls it from `main()`. The matrix page is a static markdown table — no component needed.

### The `generateCapabilitiesMatrix` function

Add after `generateCanonicalKeyPages` in `sync-capabilities.ts`:

```typescript
// ---------------------------------------------------------------------------
// MDX generation — Capabilities matrix page
// ---------------------------------------------------------------------------

function generateCapabilitiesMatrix(manifest: CapabilitiesManifest): void {
  const providerSlugs = Object.keys(manifest.providers).sort();

  const lines: string[] = [
    "---",
    "title: Capabilities Matrix",
    "description: Cross-provider support matrix for canonical skill frontmatter keys.",
    "---",
    "",
    "{/* AUTO-GENERATED — do not edit. Source: capabilities.json via sync-capabilities.ts */}",
    "",
    "This matrix shows which providers support each canonical skill key and where to find details. Each key name links to a detail page with the mechanism each provider uses.",
    "",
    `*Generated from capabilities.json on ${manifest.generated_at.split("T")[0]}.*`,
    "",
  ];

  // One table per content type.
  for (const [contentType, keys] of Object.entries(manifest.canonical_keys)) {
    const keyNames = Object.keys(keys).sort();

    lines.push(`## ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`, "");

    // Header row.
    const providerCols = providerSlugs.join(" | ");
    lines.push(`| Key | ${providerCols} |`);
    lines.push(`|-----|${providerSlugs.map(() => ":---:").join("|")}|`);

    for (const keyName of keyNames) {
      const slug = keyName.replace(/_/g, "-");
      const keyLink = `[${keyName}](/reference/canonical-keys/${slug}/)`;

      const cells = providerSlugs.map((provSlug) => {
        const cap = manifest.providers[provSlug]?.[contentType];
        if (!cap) return "—";
        const mapping = cap.canonical_mappings[keyName];
        if (!mapping) return "—";
        return mapping.supported ? "✓" : "✗";
      });

      lines.push(`| ${keyLink} | ${cells.join(" | ")} |`);
    }

    lines.push("");
  }

  lines.push(
    "## See Also",
    "",
    "- [Providers Overview](/using-syllago/providers/)",
    "- [Compare Providers](/reference/compare-providers/)",
    ""
  );

  const outputPath = join(REFERENCE_DIR, "capabilities-matrix.mdx");
  writeFileSync(outputPath, lines.join("\n"));
  console.log("  MDX: reference/capabilities-matrix.mdx");
}
```

### Update `main()` to call it

Add after `generateCanonicalKeyPages(manifest)`:

```typescript
  generateCapabilitiesMatrix(manifest);
```

### Success Criteria

- `bun scripts/sync-capabilities.ts --local /tmp/capabilities.json` → pass (exit 0)
- `test -f src/content/docs/reference/capabilities-matrix.mdx` → pass — file exists
- `grep "display_name" src/content/docs/reference/capabilities-matrix.mdx` → pass — key appears as a link in the matrix
- `bun astro build` → pass (exit 0) — matrix page renders without errors

---

## T8 — Extend `sync-providers.ts` to emit `ProviderExtensions`

**Depends on:** T1 (capabilities data files exist), T5 (ProviderExtensions component exists)

`sync-providers.ts` runs after `sync-capabilities.ts`. It reads the capabilities data files written by T1 and conditionally adds a `## Skills Extensions` section (and `## <ContentType> Extensions` for each type with extensions) to each provider MDX page.

### Changes to `sync-providers.ts`

#### Step 1: Add types for the capabilities data shape

Add after the existing `ProviderManifest` interface in `sync-providers.ts`:

```typescript
// Capabilities data shape (written by sync-capabilities.ts).
interface CapDataExtension {
  id: string;
  name: string;
  description: string;
  source_ref?: string;
}

interface CapDataEntry {
  id: string;
  provider: string;
  contentType: string;
  providerExtensions: CapDataExtension[];
}
```

#### Step 2: Add `loadCapabilitiesData` function

Add after the `DATA_OUTPUT_DIR` constant in `sync-providers.ts`:

```typescript
// ---------------------------------------------------------------------------
// Load capabilities data (written by sync-capabilities.ts)
// ---------------------------------------------------------------------------

const CAPABILITIES_DATA_DIR = join(ROOT_DIR, "src/data/capabilities");

function loadCapabilitiesData(): Map<string, CapDataEntry> {
  // Map key: "<provider>-<contentType>"
  const result = new Map<string, CapDataEntry>();

  if (!existsSync(CAPABILITIES_DATA_DIR)) {
    console.log("  Capabilities data not found — skipping extensions enrichment.");
    return result;
  }

  const files = readdirSync(CAPABILITIES_DATA_DIR).filter((f) =>
    f.endsWith(".json")
  );

  for (const file of files) {
    const raw = readFileSync(join(CAPABILITIES_DATA_DIR, file), "utf-8");
    const entry = JSON.parse(raw) as CapDataEntry;
    result.set(entry.id, entry);
  }

  console.log(`  Loaded ${result.size} capability entries for extensions enrichment.`);
  return result;
}
```

Add `readdirSync` to the existing `import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync }` import at the top of `sync-providers.ts`.

#### Step 3: Add extensions section generator

Add this function before `generateProviderPage` in `sync-providers.ts`:

```typescript
// ---------------------------------------------------------------------------
// Extensions section generator
// ---------------------------------------------------------------------------

function generateExtensionsSections(
  providerSlug: string,
  capabilitiesData: Map<string, CapDataEntry>
): { imports: string[]; sections: string[] } {
  const imports: string[] = [];
  const sections: string[] = [];

  // Content types to check for extensions, in display order.
  const contentTypesOrdered = [
    "skills", "rules", "agents", "commands", "hooks", "mcp",
  ];

  let needsImport = false;

  for (const contentType of contentTypesOrdered) {
    const entry = capabilitiesData.get(`${providerSlug}-${contentType}`);
    if (!entry || entry.providerExtensions.length === 0) continue;

    needsImport = true;
    const ctTitle =
      CT_DISPLAY[contentType] || contentType.charAt(0).toUpperCase() + contentType.slice(1);

    sections.push(
      `## ${ctTitle} Extensions`,
      "",
      `Provider-specific ${ctTitle.toLowerCase()} behaviors and configuration options beyond the canonical keys.`,
      "",
      `<ProviderExtensions provider="${providerSlug}" contentType="${contentType}" />`,
      ""
    );
  }

  if (needsImport) {
    imports.push("import ProviderExtensions from '../../../../components/ProviderExtensions.astro';");
  }

  return { imports, sections };
}
```

#### Step 4: Thread capabilities data through `main()` and `generateProviderPage`

In `main()`, load capabilities data before the provider page loop:

```typescript
  // Load capabilities data for extensions enrichment.
  const capabilitiesData = loadCapabilitiesData();
```

Change the `generateProviderPage` signature to accept capabilities data:

```typescript
function generateProviderPage(
  prov: ProviderCapEntry,
  manifest: ProviderManifest,
  capabilitiesData: Map<string, CapDataEntry>
): string {
```

In the per-provider loop in `main()`, update the call:

```typescript
    const content = generateProviderPage(prov, manifest, capabilitiesData);
```

#### Step 5: Emit extensions sections in `generateProviderPage`

In `generateProviderPage`, before the `## Detection` section (just before the `lines.push("", "## Detection"` call), add:

```typescript
  // --- Extensions enrichment ---
  const { imports: extImports, sections: extSections } = generateExtensionsSections(
    prov.slug,
    capabilitiesData
  );

  if (extSections.length > 0) {
    lines.push(...extSections);
  }
```

And update the frontmatter + import block at the top of `generateProviderPage` to include any extension imports. Find the block that starts with `"---"` and ends with `""` (after the auto-generated comment), and insert after the existing lines:

The existing `generateProviderPage` emits the auto-generated comment at line index 5 (`"{/* AUTO-GENERATED... */}"`). After that comment and the blank line, insert the extension imports. The cleanest approach is to build the imports list first and splice them in. In practice, the function builds `lines[]` incrementally, so add the import insertion right after `lines.push("", "{/* AUTO-GENERATED... */}", "")`:

```typescript
  // Insert extension component imports (computed early, emitted at top of MDX).
  if (extImports.length > 0) {
    lines.push(...extImports, "");
  }
```

Note: To do this cleanly, `generateExtensionsSections` must be called before the lines array starts being built, or the imports must be inserted at a known index. The cleanest approach: compute extensions at the top of `generateProviderPage`, before any `lines.push` calls, then conditionally push the import after the auto-generated comment.

The full modified beginning of `generateProviderPage`:

```typescript
function generateProviderPage(
  prov: ProviderCapEntry,
  manifest: ProviderManifest,
  capabilitiesData: Map<string, CapDataEntry>
): string {
  // Compute extensions first so we can emit imports at the top.
  const { imports: extImports, sections: extSections } = generateExtensionsSections(
    prov.slug,
    capabilitiesData
  );

  const supportedTypes = Object.entries(prov.content)
    .filter(([, cap]) => cap.supported)
    .map(([ct]) => CT_DISPLAY[ct] || ct);

  const lines: string[] = [
    "---",
    `title: ${prov.name}`,
    `description: How syllago works with ${prov.name} — supported content types, file locations, hook events, MCP configuration, and format details.`,
    "---",
    "",
    "{/* AUTO-GENERATED — do not edit. Source: providers.json via sync-providers.ts */}",
    "",
  ];

  // Extension component imports (only present when provider has extensions).
  if (extImports.length > 0) {
    lines.push(...extImports, "");
  }

  // ... rest of the function unchanged until before ## Detection ...
```

### Run and verify

```bash
cd /home/hhewett/.local/src/syllago-docs
bun scripts/sync-providers.ts --local /tmp/providers.json
grep -l "ProviderExtensions" src/content/docs/using-syllago/providers/*.mdx
```

At least `amp.mdx` and `claude-code.mdx` should contain `ProviderExtensions`.

### Success Criteria

- `bun scripts/sync-providers.ts --local /tmp/providers.json` → pass (exit 0)
- `grep "ProviderExtensions" src/content/docs/using-syllago/providers/amp.mdx` → pass — amp has extensions across multiple content types
- `grep "ProviderExtensions" src/content/docs/using-syllago/providers/cursor.mdx` → pass — cursor has skills extensions (it has a `cursor-skills` entry with extensions in capabilities.json)
- `bun astro build` → pass (exit 0) — provider pages with extensions render without errors

---

## T9 — Update `package.json` sync and prebuild scripts

**Depends on:** T1 (script exists and runs cleanly)

The design requires `sync-capabilities.ts` to run before all other sync scripts (since `sync-providers.ts` depends on its output). Update both the `sync` and `prebuild` scripts.

### Changes to `package.json`

Current `sync` script:
```json
"sync": "bun scripts/sync-commands.ts && bun scripts/sync-errors.ts && bun scripts/sync-providers.ts && bun scripts/sync-telemetry.ts"
```

New `sync` script:
```json
"sync": "bun scripts/sync-capabilities.ts && bun scripts/sync-commands.ts && bun scripts/sync-errors.ts && bun scripts/sync-providers.ts && bun scripts/sync-telemetry.ts"
```

Current `prebuild` script:
```json
"prebuild": "bun scripts/sync-commands.ts && bun scripts/sync-errors.ts && bun scripts/sync-providers.ts && bun scripts/sync-telemetry.ts"
```

New `prebuild` script:
```json
"prebuild": "bun scripts/sync-capabilities.ts && bun scripts/sync-commands.ts && bun scripts/sync-errors.ts && bun scripts/sync-providers.ts && bun scripts/sync-telemetry.ts"
```

Add a dedicated sync script entry:
```json
"sync:capabilities": "bun scripts/sync-capabilities.ts"
```

The full updated `scripts` block:

```json
"scripts": {
  "dev": "astro dev",
  "start": "astro dev",
  "sync": "bun scripts/sync-capabilities.ts && bun scripts/sync-commands.ts && bun scripts/sync-errors.ts && bun scripts/sync-providers.ts && bun scripts/sync-telemetry.ts",
  "sync:capabilities": "bun scripts/sync-capabilities.ts",
  "sync:telemetry": "bun scripts/sync-telemetry.ts",
  "sync:commands": "bun scripts/sync-commands.ts",
  "sync:errors": "bun scripts/sync-errors.ts",
  "sync:providers": "bun scripts/sync-providers.ts",
  "postinstall": "node scripts/patch-starlight-llms-txt.js",
  "prebuild": "bun scripts/sync-capabilities.ts && bun scripts/sync-commands.ts && bun scripts/sync-errors.ts && bun scripts/sync-providers.ts && bun scripts/sync-telemetry.ts",
  "build": "astro build",
  "postbuild": "bun scripts/postbuild-llms-links.ts",
  "preview": "astro preview",
  "astro": "astro"
}
```

### Success Criteria

- `bun run sync:capabilities --local /tmp/capabilities.json` → pass (exit 0) — dedicated script entry works (pass `--local` via env: `CAPABILITIES_JSON_PATH=/tmp/capabilities.json bun run sync:capabilities`)
- `grep "sync-capabilities" package.json | wc -l` → `3` — script appears in sync, sync:capabilities, and prebuild
- Order verification: `grep -A1 '"sync":' package.json | grep "sync-capabilities"` → pass — capabilities appears first in sync chain

---

## T10 — End-to-end validation

**Depends on:** T6, T7, T8, T9 (all implementation complete)

This task runs the full pipeline from a local `capabilities.json` and verifies all success criteria from the design doc.

### Step 1: Full sync run

```bash
cd /home/hhewett/.local/src/syllago-docs
CAPABILITIES_JSON_PATH=/tmp/capabilities.json bun run sync
```

All five sync scripts run in order. `sync-capabilities.ts` runs first with the local file via env var.

### Step 2: Astro build

```bash
bun run build 2>&1 | tee /tmp/build-output.txt
echo "Exit: $?"
```

### Step 3: Dev server spot-check

```bash
bun run dev &
DEV_PID=$!
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/reference/capabilities-matrix/ ; echo
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/reference/canonical-keys/display-name/ ; echo
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/using-syllago/providers/amp/ ; echo
kill $DEV_PID
```

### Step 4: Update CHANGELOG.md

Add an entry under today's date following the project CLAUDE.md changelog rules. This pipeline adds pages under `src/content/docs/reference/`, so a changelog entry is required.

```
## YYYY-MM-DD

### Added
- Canonical key reference pages at `/reference/canonical-keys/<key>/` — one page per canonical
  frontmatter key, showing provider support, mechanism details, and a pre-filled issue report link.
- Capabilities matrix page at `/reference/capabilities-matrix/` — cross-provider support grid
  linking to canonical key detail pages.
- Provider Extensions sections on provider pages for providers that define capabilities beyond
  the canonical key set.
```

### Full Success Criteria Checklist

All criteria from the design doc's "Success Criteria" section:

1. `bun scripts/sync-capabilities.ts --local /tmp/capabilities.json` → pass (exit 0) — script runs without error
2. `test -d src/data/capabilities && ls src/data/capabilities/*.json | wc -l` → `57` — capability data files written
3. `test -d src/data/canonical-keys && ls src/data/canonical-keys/*.json | wc -l` → `12` (or count of keys in canonical_keys section) — canonical key data files written
4. `bun astro sync` → pass (exit 0) — Zod validation passes for both new collections
5. `bun run build` → pass (exit 0) — site builds without errors
6. `curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/reference/canonical-keys/display-name/` → `200` — canonical key pages render
7. `curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/reference/capabilities-matrix/` → `200` — matrix page renders
8. `grep "ProviderExtensions" src/content/docs/using-syllago/providers/amp.mdx` → pass — provider pages with extensions have the component call
9. `grep "MetaBox" src/content/docs/reference/canonical-keys/display-name.mdx` → pass — MetaBox in generated canonical key page
10. `grep "CanonicalSupportTable" src/content/docs/reference/canonical-keys/display-name.mdx` → pass — CanonicalSupportTable in generated canonical key page

---

## File Map

All new or modified files:

| File | Action |
|------|--------|
| `/home/hhewett/.local/src/syllago/cli/cmd/syllago/gencapabilities.go` | Modified (T0) |
| `/home/hhewett/.local/src/syllago-docs/scripts/sync-capabilities.ts` | New (T1, T6, T7) |
| `/home/hhewett/.local/src/syllago-docs/src/content.config.ts` | Modified (T2) |
| `/home/hhewett/.local/src/syllago-docs/src/components/MetaBox.astro` | New (T3) |
| `/home/hhewett/.local/src/syllago-docs/src/components/CanonicalSupportTable.astro` | New (T4) |
| `/home/hhewett/.local/src/syllago-docs/src/components/ProviderExtensions.astro` | New (T5) |
| `/home/hhewett/.local/src/syllago-docs/src/content/docs/reference/canonical-keys/*.mdx` | Generated (T6) |
| `/home/hhewett/.local/src/syllago-docs/src/content/docs/reference/capabilities-matrix.mdx` | Generated (T7) |
| `/home/hhewett/.local/src/syllago-docs/scripts/sync-providers.ts` | Modified (T8) |
| `/home/hhewett/.local/src/syllago-docs/package.json` | Modified (T9) |
| `/home/hhewett/.local/src/syllago-docs/src/data/capabilities/*.json` | Generated (T1) |
| `/home/hhewett/.local/src/syllago-docs/src/data/canonical-keys/*.json` | Generated (T1) |

---

## Commit Plan

Each task maps to one commit. Commit after each task's success criteria pass.

| Task | Commit message |
|------|---------------|
| T0 | `feat(gencapabilities): bundle canonical_keys metadata in capabilities.json` |
| T1 | `feat: add sync-capabilities.ts — data file generation for capabilities and canonical-keys` |
| T2 | `feat(content.config): add capabilities and canonical-keys Zod schemas and collections` |
| T3 | `feat: add MetaBox.astro component` |
| T4 | `feat: add CanonicalSupportTable.astro component` |
| T5 | `feat: add ProviderExtensions.astro component` |
| T6 | `feat: generate canonical key MDX pages from capabilities.json` |
| T7 | `feat: generate capabilities matrix MDX page from capabilities.json` |
| T8 | `feat(sync-providers): emit ProviderExtensions sections from capabilities data` |
| T9 | `chore: add sync-capabilities to sync and prebuild scripts` |
| T10 | `docs: changelog entry for capabilities pipeline Phase 2` |
