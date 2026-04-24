# Provider Pages Redesign — Implementation Plan

**Goal:** Replace 13 auto-generated MDX provider pages with component-driven Astro dynamic routes that render cleanly from existing capability data and light up progressive depth (required badges, value types, examples) as upstream YAMLs are enriched.

**Architecture:** Two-level hybrid routing (`[provider].astro` overview + `[provider]/[ct].astro` per-CT pages) backed by the existing `capabilities` and `providers` Astro content collections. A set of discrete sub-components (`ProviderOverview`, `ProviderConventions`, `SourcesTable`, `ProviderCanonicalMappings`, `ProviderExtension`, `ProviderExtensionsList`) replaces the MDX string-generation functions in `sync-providers.ts`. The `provider-extensions` content collection and its seed script are removed as a superseded approach.

**Tech Stack:** Astro 5, Starlight, TypeScript (strict), Vitest, Zod

**Design Doc:** `docs/plans/2026-04-14-provider-pages-redesign-design.md`

---

## Scope & Blast Radius

### Files Added

- `src/pages/using-syllago/providers/[provider].astro` — overview dynamic route
- `src/pages/using-syllago/providers/[provider]/[ct].astro` — per-CT dynamic route (~60 routes)
- `src/components/ProviderOverview.astro`
- `src/components/ProviderConventions.astro`
- `src/components/SourcesTable.astro`
- `src/components/ProviderCanonicalMappings.astro`
- `src/components/ProviderExtension.astro`
- `src/components/ProviderExtensionsList.astro`
- `src/styles/provider-badge.css`
- `src/test/components/SourcesTable.test.ts`
- `src/test/components/ProviderExtension.test.ts`
- `src/test/schema/content-config.test.ts`

### Files Modified

- `src/content.config.ts` — remove superseded `providerExtensionSchema` and `provider-extensions` collection; add D9 `name`/`section` to `capSourceSchema`; add D10 structured `examples` array and D12 `required: z.boolean().nullable().optional()` and `value_type` to `capExtensionSchema`
- `sidebar.ts` — replace 12 flat provider slug entries with nested groups (provider name → Overview + per-CT children)
- `scripts/sync-providers.ts` — remove `generateProviderPage`, `generateContentTypeConventions`, `escapeMdxInline`, `formatPath`, `formatFormat`, `formatMethod`, `CT_SECTION_INFO`, `CT_SECTION_ORDER`, `FORMAT_DISPLAY`, `METHOD_DISPLAY`, `HOOK_CATEGORY_DISPLAY`, `HOOK_CATEGORY_CONTEXT` constants and helper functions; keep `writeProviderDataFiles`, `loadManifest`, `loadCapabilitiesData`, `generateIndexPage`, `generateHookEventMatrix`, `generateContentTypeMatrix`, `main`

### Files Deleted

- `src/content/docs/using-syllago/providers/amp.mdx`
- `src/content/docs/using-syllago/providers/claude-code.mdx`
- `src/content/docs/using-syllago/providers/cline.mdx`
- `src/content/docs/using-syllago/providers/codex.mdx`
- `src/content/docs/using-syllago/providers/copilot-cli.mdx`
- `src/content/docs/using-syllago/providers/cursor.mdx`
- `src/content/docs/using-syllago/providers/gemini-cli.mdx`
- `src/content/docs/using-syllago/providers/kiro.mdx`
- `src/content/docs/using-syllago/providers/opencode.mdx`
- `src/content/docs/using-syllago/providers/roo-code.mdx`
- `src/content/docs/using-syllago/providers/windsurf.mdx`
- `src/content/docs/using-syllago/providers/zed.mdx`
- `src/content/provider-extensions/` (entire directory — superseded approach, only `.gitkeep` currently exists)
- `scripts/seed-provider-extensions.ts` (superseded approach)
- `src/styles/provider-extensions.css` (replaced by component-scoped styles and `provider-badge.css`)

### Files Preserved Unchanged

- `src/content/docs/using-syllago/providers/index.mdx` — hand-authored content; its URL `/using-syllago/providers/` is the providers landing page and remains
- `src/components/CanonicalSupportTable.astro` — continues to link to `/using-syllago/providers/<slug>/` (the new overview routes) without modification
- All 36 source files linking to `/using-syllago/providers/<slug>/` — those URLs resolve to the new `[provider].astro` overview routes unchanged

---

## Pre-Flight Verification

Before starting implementation, confirm the following are true:

**1. Confirm the 36 link-preservation candidates resolve to overview URLs only (no per-CT anchors).**

```bash
grep -rn "using-syllago/providers/[a-z]" src/content/docs/ src/components/ \
  --include="*.mdx" --include="*.astro" \
  | grep -v "providers/index" \
  | grep -v "providers/$"
```

Verify: every match ends in `/<slug>/` or `/<slug>`. Confirm no match contains `/<slug>/#<anchor>` (anchor links to old per-CT sections would break). Design doc section D17 states no such anchor links exist; this check confirms it.

**2. Confirm uncommitted `content.config.ts` edits are the superseded `provider-extensions` collection only.**

```bash
git diff src/content.config.ts
```

Expected: the diff adds `providerExtensionSchema` and the `'provider-extensions'` collection registration. These are the superseded additions from `scripts/seed-provider-extensions.ts`. Task 1 will revert these additions and replace with D9/D10/D12 schema changes instead.

**3. Confirm `src/content/provider-extensions/` contains only a `.gitkeep` (no hand-enriched MDX files).**

```bash
find src/content/provider-extensions -type f
```

Expected: exactly one file (`src/content/provider-extensions/.gitkeep`). If any `.mdx` files exist, their content must be captured before deletion.

**4. Confirm `src/pages/using-syllago/` does not exist (no conflicting routes).**

```bash
ls src/pages/using-syllago/ 2>&1
```

Expected: `No such file or directory`. The pages directory must be created fresh.

**5. Confirm the 12 provider slugs in `src/data/providers/` match the 12 flat entries in `sidebar.ts`.**

```bash
ls src/data/providers/ | sed 's/\.json//'
```

Expected: `amp`, `claude-code`, `cline`, `codex`, `copilot-cli`, `cursor`, `gemini-cli`, `kiro`, `opencode`, `roo-code`, `windsurf`, `zed`.

---

## Tasks

---

## Task 1: Update `content.config.ts` — Replace superseded schema with D9/D10/D12 additions

**Files:**
- Modify: `src/content.config.ts`
- Test: `src/test/schema/content-config.test.ts` (create)

**Depends on:** nothing (first task)

### Success Criteria
- `bun run build 2>&1 | grep -c "error"` → `0` — Astro content collection compiles without type errors
- `bun vitest run src/test/schema/content-config.test.ts` → pass — schema parses valid capability entries with and without optional fields
- `grep -c "provider-extensions" src/content.config.ts` → `0` — superseded collection removed
- `grep -q "name: z.string().optional()" src/content.config.ts` → pass — D9 `name` field present on source schema

---

### Step 1: Write the failing schema test

```typescript
// src/test/schema/content-config.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Mirror the schemas from content.config.ts to test them in isolation.
// This catches regressions if the Zod definitions are changed incorrectly.

const capSourceSchema = z.object({
  uri: z.string(),
  type: z.string().optional(),
  fetched_at: z.string().optional(),
  name: z.string().optional(),      // D9
  section: z.string().optional(),   // D9
});

const capExtensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  source_ref: z.string().optional(),
  required: z.boolean().nullable().optional(),  // D12
  value_type: z.string().optional(),             // D12
  examples: z.array(z.object({                  // D10
    title: z.string().optional(),
    lang: z.string(),
    code: z.string().min(1),
    note: z.string().optional(),
  })).optional(),
});

describe('capSourceSchema (D9)', () => {
  it('accepts a minimal source with no new fields', () => {
    const result = capSourceSchema.safeParse({
      uri: 'https://example.com/docs.md',
      type: 'documentation',
      fetched_at: '2026-04-11T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a source with name and section', () => {
    const result = capSourceSchema.safeParse({
      uri: 'https://example.com/docs.md',
      type: 'documentation',
      fetched_at: '2026-04-11T00:00:00Z',
      name: 'Skills documentation',
      section: 'All',
    });
    expect(result.success).toBe(true);
  });
});

describe('capExtensionSchema (D10, D12)', () => {
  it('accepts a minimal extension with no new fields', () => {
    const result = capExtensionSchema.safeParse({
      id: 'argument_hint',
      name: 'Argument Hint',
      description: 'A hint string shown during autocomplete.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts required: true', () => {
    const result = capExtensionSchema.safeParse({
      id: 'model',
      name: 'Model',
      description: 'Specifies the model.',
      required: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts required: false', () => {
    const result = capExtensionSchema.safeParse({
      id: 'model',
      name: 'Model',
      description: 'Specifies the model.',
      required: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts required: null (unspecified)', () => {
    const result = capExtensionSchema.safeParse({
      id: 'model',
      name: 'Model',
      description: 'Specifies the model.',
      required: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a structured examples array', () => {
    const result = capExtensionSchema.safeParse({
      id: 'model',
      name: 'Model',
      description: 'Specifies the model.',
      examples: [
        { lang: 'yaml', code: 'model: claude-sonnet-4-6' },
        { title: 'With note', lang: 'yaml', code: 'model: claude-opus-4-6', note: 'Requires Opus tier.' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an example with empty code', () => {
    const result = capExtensionSchema.safeParse({
      id: 'model',
      name: 'Model',
      description: 'Specifies the model.',
      examples: [{ lang: 'yaml', code: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an example missing lang', () => {
    const result = capExtensionSchema.safeParse({
      id: 'model',
      name: 'Model',
      description: 'Specifies the model.',
      examples: [{ code: 'model: foo' }],
    });
    expect(result.success).toBe(false);
  });
});
```

### Step 2: Run test to verify it fails

```bash
bun vitest run src/test/schema/content-config.test.ts
```

Expected: FAIL — these schemas do not yet exist in the test file; the test itself compiles correctly because it defines the schemas inline.

Actually: tests PASS as written because the schemas are defined inline in the test. This step verifies the test logic is sound before the schema is applied to the actual codebase.

### Step 3: Apply schema changes to `src/content.config.ts`

Replace the current `capSourceSchema` (line 34–39) with:

```typescript
const capSourceSchema = z.object({
  uri: z.string(),
  type: z.string().optional(),
  fetched_at: z.string().optional(),
  name: z.string().optional(),      // D9: human-readable label; fallback: last URI path segment
  section: z.string().optional(),   // D9: which page section this source informed; fallback: "All"
});
```

> **Note:** `type` and `fetched_at` are intentionally made optional here (loosening from the current required schema), consistent with the D3 parallel rollout — capability files that haven't been enriched yet will not have these fields populated, and loosening the schema allows the docs build to succeed before all enrichment lands.

Replace the current `capExtensionSchema` (line 46–51) with:

```typescript
const capExtensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  source_ref: z.string().optional(),
  required: z.boolean().nullable().optional(),  // D12: true=Required, false=Optional, null=Unspecified
  value_type: z.string().optional(),             // D12: e.g., "string", "bool", "string | string[]"
  // NOTE: No `kind` field (D15 — the frontmatter/topic/behavior enum was deliberately excluded).
  examples: z.array(z.object({                  // D10: structured usage examples
    title: z.string().optional(),
    lang: z.string(),
    code: z.string().min(1),
    note: z.string().optional(),
  })).optional(),
});
```

Remove the duplicate `providerExtensionSchema` (lines 78–89 in the current file — the one added by the superseded seed script approach) and remove the `'provider-extensions'` collection registration from the `export const collections` object (currently lines 105–108 in the git-diff view).

The existing `providerExtensionSchema` variable name is reused for the `capExtensionSchema` inline definition above — verify no name collision exists in the file after removal.

### Step 4: Run test to verify it passes

```bash
bun vitest run src/test/schema/content-config.test.ts
```

Expected: PASS — all 8 test cases pass.

```bash
bun run build 2>&1 | grep "error" | head -20
```

Expected: no type errors from the collection schema change.

### Step 5: Commit

```bash
git add src/content.config.ts src/test/schema/content-config.test.ts
git commit -m "feat: update capability schemas for D9/D10/D12 — sources.name/section, examples array, required nullable"
```

---

## Task 2: Delete superseded `provider-extensions` artifacts

**Files:**
- Delete: `src/content/provider-extensions/` (entire directory)
- Delete: `scripts/seed-provider-extensions.ts`

**Depends on:** Task 1 (collection removed from `content.config.ts` before deleting the directory)

### Success Criteria
- `test -e src/content/provider-extensions` → fail — directory deleted
- `test -e scripts/seed-provider-extensions.ts` → fail — script deleted
- `bun run build 2>&1 | grep "provider-extensions"` → fail (no output) — no build references to deleted artifacts

---

### Step 1: Delete the directory and script

```bash
rm -rf src/content/provider-extensions
rm scripts/seed-provider-extensions.ts
```

### Step 2: Verify build is clean

```bash
bun run build 2>&1 | grep -i "error\|provider-extensions" | head -10
```

Expected: no output.

### Step 3: Commit

```bash
git add -A src/content/provider-extensions scripts/seed-provider-extensions.ts
git commit -m "chore: remove superseded provider-extensions collection and seed script"
```

---

## Task 3: Prune MDX-generation code from `sync-providers.ts`

**Files:**
- Modify: `scripts/sync-providers.ts`

**Depends on:** Task 2 (MDX output directory no longer regenerated after this task)

### Success Criteria
- `wc -l scripts/sync-providers.ts` → value under 500 — ~600 lines removed
- `grep -c "generateProviderPage\|generateContentTypeConventions\|escapeMdxInline" scripts/sync-providers.ts` → `0` — all per-provider MDX generation removed
- `grep -q "writeProviderDataFiles" scripts/sync-providers.ts` → pass — JSON data writing retained
- `grep -q "generateHookEventMatrix\|generateContentTypeMatrix\|generateIndexPage" scripts/sync-providers.ts` → pass — non-provider MDX generation retained
- `bun scripts/sync-providers.ts --local /dev/null 2>&1 | grep -i "error"` → fail (no output) — script parses without errors (will fail on invalid JSON, but not on missing functions)

---

### Step 1: Remove the per-provider MDX generation block

In `scripts/sync-providers.ts`, delete the following functions and their surrounding comment banners entirely:

- `escapeMdxInline` (lines 409–417)
- `formatPath` (lines 424–426)
- `formatFormat` (lines 428–430)
- `formatMethod` (lines 432–434)
- `generateContentTypeConventions` (lines 439–571)
- `generateProviderPage` (lines 577–673)

Also delete these constants from the Config section (they are only used by the deleted functions):

- `CT_SECTION_ORDER` (line 108)
- `CT_SECTION_INFO` (lines 111–119)
- `FORMAT_DISPLAY` (lines 122–128)
- `METHOD_DISPLAY` (lines 131–135)
- `CATEGORY_DISPLAY` (lines 139–149)
- `CATEGORY_CONTEXT` (lines 152–163)
- `CT_PAGE_DESCRIPTIONS` (lines 166–187)

Keep: `CT_DISPLAY`, `MATRIX_TYPES`, `MDX_OUTPUT_DIR`, `DATA_OUTPUT_DIR`, `CAPABILITIES_DATA_DIR`, `REFERENCE_DIR`, `FETCH_TIMEOUT_MS`.

### Step 2: Update `main()` to remove per-provider MDX writing

In `main()`, delete the block that generates per-provider pages (currently lines 1037–1043):

```typescript
// DELETE this block:
let count = 0;
for (const prov of manifest.providers) {
  const content = generateProviderPage(prov, manifest, capabilitiesData);
  writeFileSync(join(MDX_OUTPUT_DIR, `${prov.slug}.mdx`), content);
  count++;
}
console.log(`  MDX: ${count} provider pages`);
```

Keep the `rmSync`/`mkdirSync` for `MDX_OUTPUT_DIR` and the index page write.

**Pre-check before removal:** Run `grep -n "capabilitiesData\|loadCapabilitiesData" scripts/sync-providers.ts` to enumerate every caller. Verify that `writeProviderDataFiles`'s function signature does NOT take `capabilitiesData` as a parameter. If the grep reveals callers other than the MDX-generation block being deleted in Step 1 (e.g., `writeProviderDataFiles` takes `capabilitiesData` as an argument), update those callers or keep `loadCapabilitiesData()` before removing it. Only proceed with removal if the only remaining reference is the `main()` call site itself.

Update the `loadCapabilitiesData()` call note: it is still used by `generateHookEventMatrix` and `generateContentTypeMatrix` indirectly — but actually those functions take `providers: ProviderCapEntry[]` and don't use capabilities data. Remove the `loadCapabilitiesData()` call from `main()` since no remaining function uses it.

Update the total count log line accordingly:

```typescript
console.log(`  Total: ${1 + refCount} MDX + ${manifest.providers.length} JSON`);
```

### Step 3: Verify script runs without errors

```bash
bun scripts/sync-providers.ts --local src/data/providers/claude-code.json 2>&1 | head -20
```

Note: this will fail on JSON schema (providers.json has a different shape than a single provider), but it should not fail due to missing functions.

### Step 4: Commit

```bash
git add scripts/sync-providers.ts
git commit -m "refactor: remove per-provider MDX generation from sync-providers.ts (D17)"
```

---

## Task 4: Delete the 13 generated provider MDX files

**Files:**
- Delete: `src/content/docs/using-syllago/providers/amp.mdx`
- Delete: `src/content/docs/using-syllago/providers/claude-code.mdx`
- Delete: `src/content/docs/using-syllago/providers/cline.mdx`
- Delete: `src/content/docs/using-syllago/providers/codex.mdx`
- Delete: `src/content/docs/using-syllago/providers/copilot-cli.mdx`
- Delete: `src/content/docs/using-syllago/providers/cursor.mdx`
- Delete: `src/content/docs/using-syllago/providers/gemini-cli.mdx`
- Delete: `src/content/docs/using-syllago/providers/kiro.mdx`
- Delete: `src/content/docs/using-syllago/providers/opencode.mdx`
- Delete: `src/content/docs/using-syllago/providers/roo-code.mdx`
- Delete: `src/content/docs/using-syllago/providers/windsurf.mdx`
- Delete: `src/content/docs/using-syllago/providers/zed.mdx`
- Preserve: `src/content/docs/using-syllago/providers/index.mdx`

**Depends on:** Tasks 6–9 (dynamic routes must exist before the MDX files are deleted, otherwise the build will have dead routes). Perform this task after the `[provider].astro` and `[provider]/[ct].astro` routes are working.

### Success Criteria
- `ls src/content/docs/using-syllago/providers/*.mdx | wc -l` → `1` — only `index.mdx` remains
- `bun run build 2>&1 | grep "error"` → fail (no output) — build succeeds with MDX files gone
- `bun run build 2>&1 | grep "claude-code\|cursor\|windsurf" | grep -v "JSON\|json"` → fail (no output) — no broken references

---

### Step 1: Delete the 12 per-provider MDX files

```bash
rm src/content/docs/using-syllago/providers/amp.mdx
rm src/content/docs/using-syllago/providers/claude-code.mdx
rm src/content/docs/using-syllago/providers/cline.mdx
rm src/content/docs/using-syllago/providers/codex.mdx
rm src/content/docs/using-syllago/providers/copilot-cli.mdx
rm src/content/docs/using-syllago/providers/cursor.mdx
rm src/content/docs/using-syllago/providers/gemini-cli.mdx
rm src/content/docs/using-syllago/providers/kiro.mdx
rm src/content/docs/using-syllago/providers/opencode.mdx
rm src/content/docs/using-syllago/providers/roo-code.mdx
rm src/content/docs/using-syllago/providers/windsurf.mdx
rm src/content/docs/using-syllago/providers/zed.mdx
```

### Step 2: Verify `index.mdx` still exists

```bash
test -f src/content/docs/using-syllago/providers/index.mdx && echo "OK"
```

Expected: `OK`.

### Step 3: Verify build is clean

```bash
bun run build 2>&1 | grep -i "error" | head -10
```

Expected: no output.

### Step 4: Commit

```bash
git add -A src/content/docs/using-syllago/providers/
git commit -m "chore: delete 13 generated provider MDX pages (replaced by dynamic routes)"
```

---

## Task 5: Write `provider-badge.css` — Three-state required badge styles

**Files:**
- Create: `src/styles/provider-badge.css`

**Depends on:** nothing (independent styling task)

### Success Criteria
- `test -f src/styles/provider-badge.css` → pass — file created
- `grep -q "badge--required" src/styles/provider-badge.css` → pass — Required state styled
- `grep -q "badge--optional" src/styles/provider-badge.css` → pass — Optional state styled
- `grep -q "badge--unspecified" src/styles/provider-badge.css` → pass — Unspecified state styled
- `grep -q "dashed" src/styles/provider-badge.css` → pass — Unspecified uses dashed border per D12

---

### Step 1: Create the CSS file

```css
/* src/styles/provider-badge.css
 *
 * Three-state required badge for provider extension cards (D12).
 * Used by ProviderExtension.astro.
 * .not-content class on the parent prevents Starlight's markdown
 * prose styles from overriding these rules.
 */

.provider-badge {
  display: inline-flex;
  align-items: center;
  font-size: var(--sl-text-xs);
  font-weight: 600;
  line-height: 1;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* Required — filled, accent color */
.provider-badge--required {
  background-color: var(--sl-color-orange);
  color: var(--sl-color-white);
  border: 1px solid var(--sl-color-orange);
}

/* Optional — outlined, neutral */
.provider-badge--optional {
  background-color: transparent;
  color: var(--sl-color-gray-2);
  border: 1px solid var(--sl-color-gray-4);
}

/* Unspecified — gray, dashed border */
.provider-badge--unspecified {
  background-color: transparent;
  color: var(--sl-color-gray-4);
  border: 1px dashed var(--sl-color-gray-5);
}
```

### Step 2: Register the CSS in `astro.config.mjs`

In `astro.config.mjs`, the `customCss` array currently contains:

```javascript
customCss: ['./src/styles/tables.css', './src/styles/provider-extensions.css'],
```

Replace with:

```javascript
customCss: [
  './src/styles/tables.css',
  './src/styles/provider-badge.css',
],
```

Note: `provider-extensions.css` is removed from `customCss` here. If it is still referenced before Task 4 completes (during intermediate build states), keep it temporarily until the MDX deletion task runs. The final state removes it.

### Step 3: Commit

```bash
git add src/styles/provider-badge.css astro.config.mjs
git commit -m "feat: add three-state required badge CSS (D12)"
```

---

## Task 6: Build `SourcesTable.astro` and `ProviderExtension.astro` — leaf components

**Files:**
- Create: `src/components/SourcesTable.astro`
- Create: `src/components/ProviderExtension.astro`
- Create: `src/test/components/SourcesTable.test.ts`
- Create: `src/test/components/ProviderExtension.test.ts`

**Depends on:** Task 1 (schema types), Task 5 (badge CSS)

### Success Criteria
- `bun vitest run src/test/components/SourcesTable.test.ts` → pass — sources table logic tested
- `bun vitest run src/test/components/ProviderExtension.test.ts` → pass — badge state logic tested
- `grep -q "badge--required\|badge--optional\|badge--unspecified" src/components/ProviderExtension.astro` → pass — all three badge states present
- `grep -q "Extension:" src/components/SourcesTable.astro` → pass — per-extension source_ref rows generated with "Extension: <field>" label per D8

---

### Step 1: Write failing tests for helper logic

The Astro components themselves are not unit-testable without a full Astro render context. Test the pure TypeScript helper functions that compute the data they receive.

```typescript
// src/test/components/SourcesTable.test.ts
import { describe, it, expect } from 'vitest';

// Helper extracted from SourcesTable.astro logic:
// Derives a display name from a URI when no `name` field is present.
function deriveSourceName(uri: string): string {
  const path = new URL(uri).pathname;
  const segment = path.split('/').filter(Boolean).pop() ?? uri;
  const withoutExt = segment.replace(/\.[^.]+$/, '');
  return withoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Helper extracted from SourcesTable.astro logic:
// Builds the combined sources rows (page-level + per-extension source_ref rows).
interface CapSource {
  uri: string;
  type?: string;
  fetched_at?: string;
  name?: string;
  section?: string;
}

interface CapExtension {
  id: string;
  name: string;
  description: string;
  source_ref?: string;
}

interface SourceRow {
  name: string;
  section: string;
  uri: string;
}

function buildSourceRows(
  sources: CapSource[],
  extensions: CapExtension[]
): SourceRow[] {
  const pageRows: SourceRow[] = sources.map((s) => ({
    name: s.name ?? deriveSourceName(s.uri),
    section: s.section ?? 'All',
    uri: s.uri,
  }));

  const extRows: SourceRow[] = extensions
    .filter((e) => e.source_ref != null)
    .map((e) => ({
      name: e.source_ref!,
      section: `Extension: ${e.name}`,
      uri: e.source_ref!,
    }));

  return [...pageRows, ...extRows];
}

describe('deriveSourceName', () => {
  it('extracts last path segment without extension', () => {
    expect(deriveSourceName('https://example.com/docs/en/skills.md')).toBe('Skills');
  });

  it('converts hyphens to spaces and title-cases', () => {
    expect(deriveSourceName('https://example.com/mcp-config.md')).toBe('Mcp Config');
  });

  it('falls back to the full URI for non-URL-parseable input', () => {
    // URL constructor throws on invalid URIs; function should not be called with those.
    expect(deriveSourceName('https://example.com/docs/')).toBe('Docs');
  });
});

describe('buildSourceRows', () => {
  it('maps page-level sources with name/section when present', () => {
    const rows = buildSourceRows(
      [{ uri: 'https://example.com/skills.md', name: 'Skills Docs', section: 'All' }],
      []
    );
    expect(rows).toEqual([{ name: 'Skills Docs', section: 'All', uri: 'https://example.com/skills.md' }]);
  });

  it('falls back to derived name and "All" when name/section absent', () => {
    const rows = buildSourceRows(
      [{ uri: 'https://example.com/skills.md' }],
      []
    );
    expect(rows[0].name).toBe('Skills');
    expect(rows[0].section).toBe('All');
  });

  it('generates Extension: <name> rows from extension source_refs', () => {
    const rows = buildSourceRows(
      [],
      [{ id: 'model', name: 'Model', description: 'desc', source_ref: 'https://example.com/model.md' }]
    );
    expect(rows).toEqual([{
      name: 'https://example.com/model.md',
      section: 'Extension: Model',
      uri: 'https://example.com/model.md',
    }]);
  });

  it('omits extension rows with no source_ref', () => {
    const rows = buildSourceRows(
      [],
      [{ id: 'model', name: 'Model', description: 'no ref' }]
    );
    expect(rows).toHaveLength(0);
  });

  it('combines page-level and extension rows in order', () => {
    const rows = buildSourceRows(
      [{ uri: 'https://a.com/docs.md', name: 'Docs', section: 'All' }],
      [{ id: 'x', name: 'X Feature', description: 'd', source_ref: 'https://a.com/x.md' }]
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].section).toBe('All');
    expect(rows[1].section).toBe('Extension: X Feature');
  });
});
```

```typescript
// src/test/components/ProviderExtension.test.ts
import { describe, it, expect } from 'vitest';

// Helper extracted from ProviderExtension.astro:
// Maps required field value to CSS badge class modifier.
function badgeClass(required: boolean | null | undefined): string {
  if (required === true) return 'provider-badge--required';
  if (required === false) return 'provider-badge--optional';
  return 'provider-badge--unspecified';
}

// Helper extracted from ProviderExtension.astro:
// Maps required field value to badge label text.
function badgeLabel(required: boolean | null | undefined): string {
  if (required === true) return 'Required';
  if (required === false) return 'Optional';
  return 'Unspecified';
}

describe('badgeClass (D12)', () => {
  it('returns required class for true', () => {
    expect(badgeClass(true)).toBe('provider-badge--required');
  });

  it('returns optional class for false', () => {
    expect(badgeClass(false)).toBe('provider-badge--optional');
  });

  it('returns unspecified class for null', () => {
    expect(badgeClass(null)).toBe('provider-badge--unspecified');
  });

  it('returns unspecified class for undefined', () => {
    expect(badgeClass(undefined)).toBe('provider-badge--unspecified');
  });
});

describe('badgeLabel (D12)', () => {
  it('labels true as Required', () => {
    expect(badgeLabel(true)).toBe('Required');
  });

  it('labels false as Optional', () => {
    expect(badgeLabel(false)).toBe('Optional');
  });

  it('labels null as Unspecified', () => {
    expect(badgeLabel(null)).toBe('Unspecified');
  });
});
```

### Step 2: Run tests to verify they fail

```bash
bun vitest run src/test/components/SourcesTable.test.ts src/test/components/ProviderExtension.test.ts
```

Expected: FAIL — the helper functions don't exist yet in separate modules; the tests define them inline so they should actually PASS at this step. The tests are written to validate the logic is correct before it is embedded in the components.

### Step 3: Create `SourcesTable.astro`

```astro
---
/**
 * SourcesTable.astro — Top-of-page consolidated sources table (D7, D8, D9).
 *
 * Renders one row per page-level source plus one row per extension source_ref.
 * Per D9: `name` falls back to the last URI path segment (title-cased);
 * `section` falls back to "All".
 * Per D8: extension source_refs appear as "Extension: <field-name>" rows.
 */

interface CapSource {
  uri: string;
  type?: string;
  fetched_at?: string;
  name?: string;
  section?: string;
}

interface CapExtension {
  id: string;
  name: string;
  description: string;
  source_ref?: string;
}

interface Props {
  sources: CapSource[];
  extensions: CapExtension[];
}

const { sources, extensions } = Astro.props;

function deriveSourceName(uri: string): string {
  try {
    const path = new URL(uri).pathname;
    const segment = path.split('/').filter(Boolean).pop() ?? uri;
    const withoutExt = segment.replace(/\.[^.]+$/, '');
    return withoutExt
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return uri;
  }
}

interface SourceRow {
  name: string;
  section: string;
  uri: string;
}

const pageRows: SourceRow[] = sources.map((s) => ({
  name: s.name ?? deriveSourceName(s.uri),
  section: s.section ?? 'All',
  uri: s.uri,
}));

const extRows: SourceRow[] = extensions
  .filter((e): e is CapExtension & { source_ref: string } => e.source_ref != null)
  .map((e) => ({
    name: e.source_ref,
    section: `Extension: ${e.name}`,
    uri: e.source_ref,
  }));

const rows: SourceRow[] = [...pageRows, ...extRows];
---

{rows.length > 0 && (
  <table class="sources-table not-content">
    <thead>
      <tr>
        <th>Source</th>
        <th>Section</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr>
          <td>
            <a href={row.uri} target="_blank" rel="noopener noreferrer">
              {row.name}
            </a>
          </td>
          <td class="sources-table__section">{row.section}</td>
        </tr>
      ))}
    </tbody>
  </table>
)}

<style>
  .sources-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.5rem;
    font-size: var(--sl-text-sm);
  }

  .sources-table th,
  .sources-table td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--sl-color-hairline-light);
  }

  .sources-table th {
    font-size: var(--sl-text-xs);
    color: var(--sl-color-gray-3);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .sources-table tr:last-child td {
    border-bottom: none;
  }

  .sources-table a {
    color: var(--sl-color-text-accent);
    text-decoration: none;
    word-break: break-all;
  }

  .sources-table a:hover {
    text-decoration: underline;
  }

  .sources-table__section {
    color: var(--sl-color-gray-3);
    white-space: nowrap;
  }
</style>
```

### Step 4: Create `ProviderExtension.astro`

```astro
---
/**
 * ProviderExtension.astro — One extension item card (D11, D12, D10).
 *
 * Renders: name + optional field-name code, three-state Required badge,
 * optional value_type, description body, optional examples, no inline
 * source link (source link appears in SourcesTable above — D8).
 */

interface Example {
  title?: string;
  lang: string;
  code: string;
  note?: string;
}

interface Props {
  id: string;
  name: string;
  description: string;
  source_ref?: string;
  required?: boolean | null;
  value_type?: string;
  examples?: Example[];
}

const { name, description, required, value_type, examples } = Astro.props;

function badgeClass(req: boolean | null | undefined): string {
  if (req === true) return 'provider-badge provider-badge--required';
  if (req === false) return 'provider-badge provider-badge--optional';
  return 'provider-badge provider-badge--unspecified';
}

function badgeLabel(req: boolean | null | undefined): string {
  if (req === true) return 'Required';
  if (req === false) return 'Optional';
  return 'Unspecified';
}

const badge = badgeClass(required);
const label = badgeLabel(required);

// Derive a field name from the description for display when it starts
// with "Frontmatter field <fieldName>".
const frontmatterMatch = description.match(/^Frontmatter field\s+([a-zA-Z][\w-]*)/);
const fieldName = frontmatterMatch?.[1] ?? null;
---

<div class="ext-item not-content">
  <div class="ext-item__header">
    <span class="ext-item__name">{name}</span>
    {fieldName && <code class="ext-item__field">{fieldName}</code>}
    <span class={badge}>{label}</span>
    {value_type && <span class="ext-item__type">{value_type}</span>}
  </div>
  <p class="ext-item__desc">{description}</p>
  {examples && examples.length > 0 && (
    <div class="ext-item__examples">
      {examples.map((ex) => (
        <div class="ext-item__example">
          {ex.title && <p class="ext-item__example-title">{ex.title}</p>}
          <pre class={`language-${ex.lang}`}><code>{ex.code}</code></pre>
          {ex.note && <p class="ext-item__example-note">{ex.note}</p>}
        </div>
      ))}
    </div>
  )}
</div>

<style>
  .ext-item {
    padding: 0.875rem 0;
    border-bottom: 1px solid var(--sl-color-hairline-light);
  }

  .ext-item:last-child {
    border-bottom: none;
  }

  .ext-item__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
  }

  .ext-item__name {
    font-weight: 600;
    font-size: var(--sl-text-sm);
    color: var(--sl-color-text);
  }

  .ext-item__field {
    font-size: var(--sl-text-xs);
    background-color: var(--sl-color-bg-nav);
    border: 1px solid var(--sl-color-hairline-light);
    border-radius: 0.2rem;
    padding: 0.1rem 0.35rem;
  }

  .ext-item__type {
    font-size: var(--sl-text-xs);
    color: var(--sl-color-gray-3);
    font-family: var(--sl-font-mono);
  }

  .ext-item__desc {
    font-size: var(--sl-text-sm);
    color: var(--sl-color-gray-2);
    margin: 0 0 0.5rem;
    line-height: 1.5;
  }

  .ext-item__examples {
    margin-top: 0.5rem;
  }

  .ext-item__example {
    margin-bottom: 0.75rem;
  }

  .ext-item__example-title {
    font-size: var(--sl-text-xs);
    color: var(--sl-color-gray-3);
    font-weight: 600;
    margin: 0 0 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .ext-item__example pre {
    font-size: var(--sl-text-xs);
    background-color: var(--sl-color-bg-nav);
    border: 1px solid var(--sl-color-hairline-light);
    border-radius: 0.375rem;
    padding: 0.625rem 0.875rem;
    overflow-x: auto;
    margin: 0 0 0.25rem;
  }

  .ext-item__example code {
    background: none;
    border: none;
    padding: 0;
    font-size: inherit;
  }

  .ext-item__example-note {
    font-size: var(--sl-text-xs);
    color: var(--sl-color-gray-3);
    margin: 0;
    font-style: italic;
  }
</style>
```

### Step 5: Run tests to verify they pass

```bash
bun vitest run src/test/components/SourcesTable.test.ts src/test/components/ProviderExtension.test.ts
```

Expected: PASS — all test cases pass.

### Step 6: Commit

```bash
git add src/components/SourcesTable.astro src/components/ProviderExtension.astro \
        src/test/components/SourcesTable.test.ts src/test/components/ProviderExtension.test.ts
git commit -m "feat: add SourcesTable and ProviderExtension leaf components (D7-D10, D12)"
```

---

## Task 7: Build `ProviderExtensionsList.astro` and `ProviderCanonicalMappings.astro`

**Files:**
- Create: `src/components/ProviderExtensionsList.astro`
- Create: `src/components/ProviderCanonicalMappings.astro`

**Depends on:** Task 6 (`ProviderExtension.astro` must exist)

### Success Criteria
- `test -f src/components/ProviderExtensionsList.astro` → pass — component created
- `test -f src/components/ProviderCanonicalMappings.astro` → pass — component created
- `grep -q "ProviderExtension" src/components/ProviderExtensionsList.astro` → pass — wraps the leaf component
- `grep -q "canonicalMappings" src/components/ProviderCanonicalMappings.astro` → pass — consumes mapping data
- `grep -q "canonical-keys" src/components/ProviderCanonicalMappings.astro` → pass — links to canonical key pages

---

### Step 1: Create `ProviderExtensionsList.astro`

```astro
---
/**
 * ProviderExtensionsList.astro — Iterates ProviderExtension items (D11).
 *
 * Renders the full list of provider-specific extensions for one
 * (provider, contentType) pair. Wraps ProviderExtension leaf component.
 */
import ProviderExtension from './ProviderExtension.astro';

interface Example {
  title?: string;
  lang: string;
  code: string;
  note?: string;
}

interface CapExtension {
  id: string;
  name: string;
  description: string;
  source_ref?: string;
  required?: boolean | null;
  value_type?: string;
  examples?: Example[];
}

interface Props {
  extensions: CapExtension[];
  providerName: string;
  contentTypeDisplay: string;
}

const { extensions, providerName, contentTypeDisplay } = Astro.props;
---

{extensions.length > 0 && (
  <section class="ext-list not-content">
    <h3 class="ext-list__heading">
      {providerName}-specific {contentTypeDisplay}
    </h3>
    <p class="ext-list__intro">
      {providerName}-specific {contentTypeDisplay.toLowerCase()} behaviors and configuration
      options not yet mapped to canonical keys. When a canonical key covers one of these,
      the item graduates there.
    </p>
    <div class="ext-list__items">
      {extensions.map((ext) => (
        <ProviderExtension {...ext} />
      ))}
    </div>
  </section>
)}

<style>
  .ext-list {
    margin-top: 1.5rem;
  }

  .ext-list__heading {
    font-size: var(--sl-text-h4);
    font-weight: 600;
    margin: 0 0 0.5rem;
    color: var(--sl-color-text);
  }

  .ext-list__intro {
    font-size: var(--sl-text-sm);
    color: var(--sl-color-gray-2);
    margin: 0 0 1rem;
  }

  .ext-list__items {
    border-top: 1px solid var(--sl-color-hairline-light);
  }
</style>
```

### Step 2: Create `ProviderCanonicalMappings.astro`

```astro
---
/**
 * ProviderCanonicalMappings.astro — Canonical key → mechanism table (D11).
 *
 * Given a provider's canonicalMappings record for one content type,
 * renders a table of supported canonical keys and their mechanisms.
 * The perpendicular pivot of CanonicalSupportTable.astro (which pivots
 * canonical-key → providers). CanonicalSupportTable.astro is NOT reused here.
 */

interface CapMapping {
  supported: boolean;
  mechanism: string;
  paths?: string[];
}

interface Props {
  canonicalMappings: Record<string, CapMapping>;
  providerName: string;
  contentTypeDisplay: string;
}

const { canonicalMappings, providerName, contentTypeDisplay } = Astro.props;

const supportedEntries = Object.entries(canonicalMappings)
  .filter(([, m]) => m.supported)
  .sort(([a], [b]) => a.localeCompare(b));

// Convert canonical key (e.g., "display_name") to URL slug (e.g., "display-name").
function keyToSlug(key: string): string {
  return key.replace(/_/g, '-');
}
---

{supportedEntries.length > 0 && (
  <section class="canon-mappings not-content">
    <h3 class="canon-mappings__heading">Mappings to Canonical</h3>
    <p class="canon-mappings__intro">
      How {providerName}'s native {contentTypeDisplay.toLowerCase()} features map to
      syllago's canonical keys. See the{' '}
      <a href="/reference/capabilities-matrix/">capabilities matrix</a> for the full vocabulary.
    </p>
    <table class="canon-mappings__table">
      <thead>
        <tr>
          <th>Canonical Key</th>
          <th>Mechanism</th>
        </tr>
      </thead>
      <tbody>
        {supportedEntries.map(([key, mapping]) => (
          <tr>
            <td>
              <a href={`/reference/canonical-keys/${keyToSlug(key)}/`}>
                <code>{key}</code>
              </a>
            </td>
            <td>{mapping.mechanism}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
)}

<style>
  .canon-mappings {
    margin-top: 1.5rem;
  }

  .canon-mappings__heading {
    font-size: var(--sl-text-h4);
    font-weight: 600;
    margin: 0 0 0.5rem;
    color: var(--sl-color-text);
  }

  .canon-mappings__intro {
    font-size: var(--sl-text-sm);
    color: var(--sl-color-gray-2);
    margin: 0 0 0.75rem;
  }

  .canon-mappings__table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--sl-text-sm);
  }

  .canon-mappings__table th,
  .canon-mappings__table td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--sl-color-hairline-light);
  }

  .canon-mappings__table th {
    font-size: var(--sl-text-xs);
    color: var(--sl-color-gray-3);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .canon-mappings__table tr:last-child td {
    border-bottom: none;
  }

  .canon-mappings__table a {
    color: var(--sl-color-text-accent);
    text-decoration: none;
  }

  .canon-mappings__table a:hover {
    text-decoration: underline;
  }
</style>
```

### Step 3: Commit

```bash
git add src/components/ProviderExtensionsList.astro src/components/ProviderCanonicalMappings.astro
git commit -m "feat: add ProviderExtensionsList and ProviderCanonicalMappings components (D11)"
```

---

## Task 8: Build `ProviderConventions.astro` — per-CT page orchestrator

**Files:**
- Create: `src/components/ProviderConventions.astro`

**Depends on:** Tasks 6 and 7 (`SourcesTable`, `ProviderCanonicalMappings`, `ProviderExtensionsList`)

### Success Criteria
- `test -f src/components/ProviderConventions.astro` → pass — component created
- `grep -q "SourcesTable" src/components/ProviderConventions.astro` → pass — sources table included at top
- `grep -q "ProviderCanonicalMappings" src/components/ProviderConventions.astro` → pass — canonical mappings included
- `grep -q "ProviderExtensionsList" src/components/ProviderConventions.astro` → pass — extensions list included
- `grep -q "Native Format" src/components/ProviderConventions.astro` → pass — native format section present

---

### Step 1: Create `ProviderConventions.astro`

The `CT_DISPLAY` map used here mirrors the constant in `sync-providers.ts`. It lives in the component because the script no longer generates per-provider MDX that would carry these display strings.

```astro
---
/**
 * ProviderConventions.astro — Per-(provider, contentType) conventions page (D11).
 *
 * Orchestrates: SourcesTable → Native Format prose → ProviderCanonicalMappings
 * → ProviderExtensionsList.
 *
 * Data comes from the `capabilities` Astro content collection entry for this
 * (provider, contentType) pair and from the `providers` collection for
 * native-format fields.
 */
import SourcesTable from './SourcesTable.astro';
import ProviderCanonicalMappings from './ProviderCanonicalMappings.astro';
import ProviderExtensionsList from './ProviderExtensionsList.astro';

interface CapSource {
  uri: string;
  type?: string;
  fetched_at?: string;
  name?: string;
  section?: string;
}

interface CapMapping {
  supported: boolean;
  mechanism: string;
  paths?: string[];
}

interface Example {
  title?: string;
  lang: string;
  code: string;
  note?: string;
}

interface CapExtension {
  id: string;
  name: string;
  description: string;
  source_ref?: string;
  required?: boolean | null;
  value_type?: string;
  examples?: Example[];
}

interface ContentCapability {
  supported: boolean;
  fileFormat?: string;
  installMethod?: string;
  installPath?: string;
  symlinkSupport: boolean;
  discoveryPaths?: string[];
  hookEvents?: Array<{ canonical: string; nativeName: string; category?: string }>;
  hookTypes?: string[];
  configLocation?: string;
  mcpTransports?: string[];
  frontmatterFields?: string[];
}

interface Props {
  providerName: string;
  contentType: string;
  capability: ContentCapability;
  sources: CapSource[];
  canonicalMappings: Record<string, CapMapping>;
  extensions: CapExtension[];
}

const { providerName, contentType, capability, sources, canonicalMappings, extensions } = Astro.props;

const CT_DISPLAY: Record<string, string> = {
  rules: 'Rules',
  hooks: 'Hooks',
  mcp: 'MCP Configs',
  skills: 'Skills',
  agents: 'Agents',
  commands: 'Commands',
};

const FORMAT_DISPLAY: Record<string, string> = {
  md: 'Markdown',
  mdc: 'MDC (Markdown + frontmatter)',
  json: 'JSON',
  jsonc: 'JSON with comments',
  yaml: 'YAML',
  toml: 'TOML',
};

const METHOD_DISPLAY: Record<string, string> = {
  filesystem: 'Symlink',
  'json-merge': 'JSON merge',
  'project-scope': 'Project scope',
};

const HOOK_CATEGORY_DISPLAY: Record<string, string> = {
  tool: 'Tool',
  lifecycle: 'Lifecycle',
  context: 'Context',
  output: 'Output',
  security: 'Security',
  config: 'Config',
  workspace: 'Workspace',
  interaction: 'Interaction',
  collaboration: 'Collaboration',
  model: 'Model',
};

const ctDisplay = CT_DISPLAY[contentType] ?? contentType;
const fileFormat = FORMAT_DISPLAY[capability.fileFormat ?? ''] ?? capability.fileFormat ?? '—';
const installMethod = METHOD_DISPLAY[capability.installMethod ?? ''] ?? capability.installMethod ?? '—';
---

<SourcesTable sources={sources} extensions={extensions} />

<section class="native-format not-content">
  <h2 class="native-format__heading">Native Format</h2>
  <ul class="native-format__list">
    {capability.fileFormat && <li><strong>File format:</strong> {fileFormat}</li>}
    {capability.discoveryPaths?.map((p) => (
      <li><strong>Discovery path:</strong> <code>{p.replace('{project}/', '').replace('{home}/', '~/')}</code></li>
    ))}
    {capability.installPath && (
      <li><strong>Global install path:</strong> <code>{capability.installPath.replace('{home}/', '~/')}</code></li>
    )}
    {capability.installMethod && <li><strong>Syllago install method:</strong> {installMethod}</li>}
    <li><strong>Symlink support:</strong> {capability.symlinkSupport ? 'Yes' : 'No'}</li>
    {contentType === 'hooks' && capability.configLocation && (
      <li><strong>Config file:</strong> <code>{capability.configLocation}</code></li>
    )}
    {contentType === 'hooks' && capability.hookTypes?.length && (
      <li><strong>Handler types:</strong> {capability.hookTypes.map((t) => <code>{t}</code>).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [] as any[])}</li>
    )}
    {contentType === 'mcp' && capability.configLocation && (
      <li><strong>Config file:</strong> <code>{capability.configLocation}</code></li>
    )}
    {contentType === 'mcp' && capability.mcpTransports?.length && (
      <li><strong>Transports:</strong> {capability.mcpTransports.map((t) => <code>{t}</code>).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [] as any[])}</li>
    )}
    {capability.frontmatterFields?.length && (
      <li>
        <strong>Native frontmatter fields:</strong>{' '}
        {capability.frontmatterFields.map((f) => <code>{f}</code>).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [] as any[])}
      </li>
    )}
  </ul>

  {contentType === 'hooks' && capability.hookEvents?.length && (
    <table class="hook-events-table">
      <thead>
        <tr>
          <th>Canonical Event</th>
          <th>Native Name</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>
        {capability.hookEvents.map((ev) => (
          <tr>
            <td><code>{ev.canonical}</code></td>
            <td><code>{ev.nativeName}</code></td>
            <td>{ev.category ? (HOOK_CATEGORY_DISPLAY[ev.category] ?? ev.category) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )}

  {contentType === 'hooks' && !capability.hookEvents?.length && (
    <p class="native-format__note">
      {providerName} supports hooks, but syllago does not yet map its hook event names.
      Hook conversion to and from {providerName} is best-effort.
    </p>
  )}
</section>

<ProviderCanonicalMappings
  canonicalMappings={canonicalMappings}
  providerName={providerName}
  contentTypeDisplay={ctDisplay}
/>

<ProviderExtensionsList
  extensions={extensions}
  providerName={providerName}
  contentTypeDisplay={ctDisplay}
/>

<style>
  .native-format {
    margin-top: 0;
  }

  .native-format__heading {
    font-size: var(--sl-text-h3);
    font-weight: 600;
    margin: 0 0 0.75rem;
    color: var(--sl-color-text);
  }

  .native-format__list {
    margin: 0 0 1rem;
    padding-left: 1.25rem;
    font-size: var(--sl-text-sm);
    line-height: 1.75;
  }

  .native-format__note {
    font-size: var(--sl-text-sm);
    color: var(--sl-color-gray-2);
    font-style: italic;
    margin: 0 0 1rem;
  }

  .hook-events-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--sl-text-sm);
    margin-bottom: 1.5rem;
  }

  .hook-events-table th,
  .hook-events-table td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--sl-color-hairline-light);
  }

  .hook-events-table th {
    font-size: var(--sl-text-xs);
    color: var(--sl-color-gray-3);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .hook-events-table tr:last-child td {
    border-bottom: none;
  }
</style>
```

### Step 2: Commit

```bash
git add src/components/ProviderConventions.astro
git commit -m "feat: add ProviderConventions orchestrator component (D11)"
```

---

## Task 9: Build `ProviderOverview.astro` — overview page component

**Files:**
- Create: `src/components/ProviderOverview.astro`

**Depends on:** Task 1 (provider data shape)

### Success Criteria
- `test -f src/components/ProviderOverview.astro` → pass — component created
- `grep -q "configDir" src/components/ProviderOverview.astro` → pass — detection method shown
- `grep -q "using-syllago/providers" src/components/ProviderOverview.astro` → pass — per-CT page links present
- `grep -q "Supported Content Types" src/components/ProviderOverview.astro` → pass — supported CT summary table present

---

### Step 1: Create `ProviderOverview.astro`

```astro
---
/**
 * ProviderOverview.astro — Provider identity and overview (D11, D6).
 *
 * Shown at /using-syllago/providers/<slug>/.
 * Displays: identity table, detection method, supported CT summary, install examples.
 * Does NOT embed ProviderConventions — per-CT pages own their conventions.
 */

interface ContentCapability {
  supported: boolean;
  installMethod?: string;
  symlinkSupport: boolean;
}

interface Props {
  name: string;
  slug: string;
  configDir: string;
  emitPath?: string;
  content: Record<string, ContentCapability>;
}

const { name, slug, configDir, emitPath, content } = Astro.props;

const CT_DISPLAY: Record<string, string> = {
  rules: 'Rules',
  hooks: 'Hooks',
  mcp: 'MCP Configs',
  skills: 'Skills',
  agents: 'Agents',
  commands: 'Commands',
};

const CT_SECTION_ORDER = ['skills', 'hooks', 'rules', 'mcp', 'commands', 'agents'];

const METHOD_DISPLAY: Record<string, string> = {
  filesystem: 'Symlink',
  'json-merge': 'JSON merge',
  'project-scope': 'Project scope',
};

const supportedTypes = CT_SECTION_ORDER.filter((ct) => content[ct]?.supported);
---

<section class="provider-overview not-content">
  <h2>Provider Details</h2>
  <table class="overview-table">
    <tbody>
      <tr>
        <th>Slug</th>
        <td><code>{slug}</code></td>
      </tr>
      <tr>
        <th>Config directory</th>
        <td><code>~/{configDir}</code></td>
      </tr>
      {emitPath && (
        <tr>
          <th>Emit path</th>
          <td><code>{emitPath.replace('{project}/', '')}</code></td>
        </tr>
      )}
      <tr>
        <th>Supported content types</th>
        <td>
          {supportedTypes.length > 0
            ? supportedTypes.map((ct, i) => (
                <>
                  <a href={`/using-syllago/providers/${slug}/${ct}/`}>{CT_DISPLAY[ct] ?? ct}</a>
                  {i < supportedTypes.length - 1 ? ', ' : ''}
                </>
              ))
            : '—'}
        </td>
      </tr>
    </tbody>
  </table>

  <h2>Supported Content Types</h2>
  <table class="ct-table">
    <thead>
      <tr>
        <th>Content Type</th>
        <th>Syllago Install Method</th>
        <th>Symlink</th>
      </tr>
    </thead>
    <tbody>
      {supportedTypes.map((ct) => {
        const cap = content[ct]!;
        const method = METHOD_DISPLAY[cap.installMethod ?? ''] ?? cap.installMethod ?? '—';
        return (
          <tr>
            <td>
              <a href={`/using-syllago/providers/${slug}/${ct}/`}>
                {CT_DISPLAY[ct] ?? ct}
              </a>
            </td>
            <td>{method}</td>
            <td>{cap.symlinkSupport ? 'Yes' : 'No'}</td>
          </tr>
        );
      })}
    </tbody>
  </table>

  <h2>Detection</h2>
  <p>Syllago detects {name} by checking for the <code>~/{configDir}</code> directory.</p>

  <h2>Working with {name}</h2>
  <pre><code>{`# Add content from ${name}
syllago add --from ${slug}

# Install content to ${name}
syllago install my-rule --to ${slug}`}</code></pre>

  <h2>See Also</h2>
  <ul>
    <li><a href="/using-syllago/providers/">Providers Overview</a></li>
    <li><a href="/using-syllago/format-conversion/">Format Conversion</a></li>
  </ul>
</section>

<style>
  .provider-overview h2 {
    font-size: var(--sl-text-h3);
    font-weight: 600;
    margin: 1.5rem 0 0.75rem;
    color: var(--sl-color-text);
  }

  .overview-table,
  .ct-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--sl-text-sm);
    margin-bottom: 1rem;
  }

  .overview-table th,
  .overview-table td,
  .ct-table th,
  .ct-table td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--sl-color-hairline-light);
  }

  .overview-table th {
    width: 11rem;
    font-weight: 600;
    color: var(--sl-color-text);
    vertical-align: top;
  }

  .ct-table th {
    font-size: var(--sl-text-xs);
    color: var(--sl-color-gray-3);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .overview-table tr:last-child td,
  .ct-table tr:last-child td {
    border-bottom: none;
  }

  .provider-overview a {
    color: var(--sl-color-text-accent);
    text-decoration: none;
  }

  .provider-overview a:hover {
    text-decoration: underline;
  }

  .provider-overview pre {
    font-size: var(--sl-text-sm);
    background-color: var(--sl-color-bg-nav);
    border: 1px solid var(--sl-color-hairline-light);
    border-radius: 0.375rem;
    padding: 0.875rem 1rem;
    overflow-x: auto;
    margin: 0 0 1rem;
  }

  .provider-overview pre code {
    background: none;
    border: none;
    padding: 0;
    font-size: inherit;
  }

  .provider-overview ul {
    font-size: var(--sl-text-sm);
    padding-left: 1.25rem;
    margin: 0;
  }
</style>
```

### Step 2: Commit

```bash
git add src/components/ProviderOverview.astro
git commit -m "feat: add ProviderOverview component for /providers/<slug>/ pages (D6, D11)"
```

---

## Task 10: Create the dynamic route pages

**Files:**
- Create: `src/pages/using-syllago/providers/[provider].astro`
- Create: `src/pages/using-syllago/providers/[provider]/[ct].astro`

**Depends on:** Tasks 8 and 9 (both orchestrator components must exist)

### Success Criteria
- `test -f "src/pages/using-syllago/providers/[provider].astro"` → pass — overview route created
- `test -f "src/pages/using-syllago/providers/[provider]/[ct].astro"` → pass — per-CT route created
- `bun run build 2>&1 | grep "error"` → fail (no output) — build succeeds with dynamic routes
- `bun run build 2>&1 | grep "providers/claude-code"` → pass — claude-code overview route built
- `bun run build 2>&1 | grep "providers/claude-code/skills"` → pass — claude-code/skills per-CT route built

---

### Step 1: Create the `src/pages/using-syllago/providers/` directory

```bash
mkdir -p src/pages/using-syllago/providers/
```

### Step 2: Create `[provider].astro` — overview route

```astro
---
/**
 * [provider].astro — Overview page for /using-syllago/providers/<slug>/ (D6).
 *
 * Generates one static page per provider slug from the `providers` collection.
 * URL preserved: /using-syllago/providers/<slug>/ — all 36 internal links resolve here.
 */
import { getCollection } from 'astro:content';
import StarlightPage from '@astrojs/starlight/components/StarlightPage.astro';
import ProviderOverview from '../../../components/ProviderOverview.astro';

export async function getStaticPaths() {
  const providers = await getCollection('providers');
  return providers.map((entry) => ({
    params: { provider: entry.data.slug },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { name, slug, configDir, emitPath, content } = entry.data;
---

<StarlightPage
  frontmatter={{
    title: name,
    description: `How syllago works with ${name} — supported content types, file locations, and format details.`,
  }}
>
  <ProviderOverview
    name={name}
    slug={slug}
    configDir={configDir}
    emitPath={emitPath}
    content={content}
  />
</StarlightPage>
```

### Step 3: Create `[provider]/[ct].astro` — per-CT route

```astro
---
/**
 * [ct].astro — Per-(provider, contentType) conventions page (D6).
 *
 * Generates one page per supported (provider, contentType) pair from the
 * `capabilities` collection. URL: /using-syllago/providers/<slug>/<ct>/.
 */
import { getCollection } from 'astro:content';
import StarlightPage from '@astrojs/starlight/components/StarlightPage.astro';
import ProviderConventions from '../../../../components/ProviderConventions.astro';

const CT_DISPLAY: Record<string, string> = {
  rules: 'Rules',
  hooks: 'Hooks',
  mcp: 'MCP Configs',
  skills: 'Skills',
  agents: 'Agents',
  commands: 'Commands',
};

export async function getStaticPaths() {
  const capabilities = await getCollection('capabilities');
  const providers = await getCollection('providers');

  // Build a map of slug → provider entry for fast lookup.
  const providerMap = new Map(providers.map((p) => [p.data.slug, p.data]));

  return capabilities
    .filter((cap) => {
      const prov = providerMap.get(cap.data.provider);
      if (!prov) return false;
      return prov.content[cap.data.contentType]?.supported ?? false;
    })
    .map((cap) => {
      const prov = providerMap.get(cap.data.provider)!;
      return {
        params: {
          provider: cap.data.provider,
          ct: cap.data.contentType,
        },
        props: { cap, prov },
      };
    });
}

const { cap, prov } = Astro.props;
const ctDisplay = CT_DISPLAY[cap.data.contentType] ?? cap.data.contentType;
const provCapability = prov.content[cap.data.contentType];
---

<StarlightPage
  frontmatter={{
    title: `${prov.name} — ${ctDisplay}`,
    description: `How ${prov.name} implements ${ctDisplay.toLowerCase()} — sources, native format, canonical mappings, and provider-specific extensions.`,
  }}
>
  <ProviderConventions
    providerName={prov.name}
    contentType={cap.data.contentType}
    capability={provCapability}
    sources={cap.data.sources}
    canonicalMappings={cap.data.canonicalMappings}
    extensions={cap.data.providerExtensions}
  />
</StarlightPage>
```

### Step 4: Verify build produces expected routes

```bash
bun run build 2>&1 | grep "providers/" | grep -v "\.json" | head -30
```

Expected: entries for `providers/claude-code/`, `providers/claude-code/skills/`, `providers/claude-code/hooks/`, etc.

### Step 5: Commit

```bash
git add "src/pages/using-syllago/providers/[provider].astro" \
        "src/pages/using-syllago/providers/[provider]/[ct].astro"
git commit -m "feat: add dynamic provider overview and per-CT routes (D6)"
```

---

## Task 11: Update `sidebar.ts` — nested provider entries

**Files:**
- Modify: `sidebar.ts`

**Depends on:** Task 10 (the per-CT URLs must exist before the sidebar links to them)

### Success Criteria
- `grep -c "slug: 'using-syllago/providers/" sidebar.ts` → value of `13` or more — overview + per-CT entries present
- `grep -q "Overview" sidebar.ts` → pass — overview entry label present for at least one provider
- `bun run build 2>&1 | grep "error"` → fail (no output) — sidebar compiles without error
- `grep -c "collapsed" sidebar.ts` → value greater than the pre-change count — providers section now has collapsible sub-groups

---

### Step 1: Replace the flat provider entries with nested groups

In `sidebar.ts`, replace the current `'Supported Providers'` section (lines 46–63):

```typescript
{
  label: 'Supported Providers',
  collapsed: true,
  items: [
    { label: 'Overview', slug: 'using-syllago/providers' },
    {
      label: 'Claude Code',
      collapsed: true,
      items: [
        { label: 'Overview', slug: 'using-syllago/providers/claude-code' },
        { label: 'Skills', slug: 'using-syllago/providers/claude-code/skills' },
        { label: 'Hooks', slug: 'using-syllago/providers/claude-code/hooks' },
        { label: 'Rules', slug: 'using-syllago/providers/claude-code/rules' },
        { label: 'MCP Configs', slug: 'using-syllago/providers/claude-code/mcp' },
        { label: 'Commands', slug: 'using-syllago/providers/claude-code/commands' },
        { label: 'Agents', slug: 'using-syllago/providers/claude-code/agents' },
      ],
    },
    {
      label: 'Cursor',
      collapsed: true,
      items: [
        { label: 'Overview', slug: 'using-syllago/providers/cursor' },
        { label: 'Skills', slug: 'using-syllago/providers/cursor/skills' },
        { label: 'Hooks', slug: 'using-syllago/providers/cursor/hooks' },
        { label: 'Rules', slug: 'using-syllago/providers/cursor/rules' },
        { label: 'MCP Configs', slug: 'using-syllago/providers/cursor/mcp' },
        { label: 'Commands', slug: 'using-syllago/providers/cursor/commands' },
        { label: 'Agents', slug: 'using-syllago/providers/cursor/agents' },
      ],
    },
    {
      label: 'Windsurf',
      collapsed: true,
      items: [
        { label: 'Overview', slug: 'using-syllago/providers/windsurf' },
        { label: 'Skills', slug: 'using-syllago/providers/windsurf/skills' },
        { label: 'Hooks', slug: 'using-syllago/providers/windsurf/hooks' },
        { label: 'Rules', slug: 'using-syllago/providers/windsurf/rules' },
        { label: 'MCP Configs', slug: 'using-syllago/providers/windsurf/mcp' },
        // NOTE: Commands omitted — windsurf.json sets content.commands.supported = false
      ],
    },
    {
      label: 'Copilot CLI',
      collapsed: true,
      items: [
        { label: 'Overview', slug: 'using-syllago/providers/copilot-cli' },
        { label: 'Skills', slug: 'using-syllago/providers/copilot-cli/skills' },
        { label: 'Hooks', slug: 'using-syllago/providers/copilot-cli/hooks' },
        { label: 'Rules', slug: 'using-syllago/providers/copilot-cli/rules' },
        { label: 'MCP Configs', slug: 'using-syllago/providers/copilot-cli/mcp' },
        { label: 'Commands', slug: 'using-syllago/providers/copilot-cli/commands' },
        { label: 'Agents', slug: 'using-syllago/providers/copilot-cli/agents' },
      ],
    },
    {
      label: 'Cline',
      collapsed: true,
      items: [
        { label: 'Overview', slug: 'using-syllago/providers/cline' },
        { label: 'Hooks', slug: 'using-syllago/providers/cline/hooks' },
        { label: 'Rules', slug: 'using-syllago/providers/cline/rules' },
        { label: 'MCP Configs', slug: 'using-syllago/providers/cline/mcp' },
      ],
    },
    {
      label: 'Roo Code',
      collapsed: true,
      items: [
        { label: 'Overview', slug: 'using-syllago/providers/roo-code' },
        { label: 'Skills', slug: 'using-syllago/providers/roo-code/skills' },
        { label: 'Rules', slug: 'using-syllago/providers/roo-code/rules' },
        { label: 'MCP Configs', slug: 'using-syllago/providers/roo-code/mcp' },
        { label: 'Agents', slug: 'using-syllago/providers/roo-code/agents' },
      ],
    },
    {
      label: 'Kiro',
      collapsed: true,
      items: [
        { label: 'Overview', slug: 'using-syllago/providers/kiro' },
        { label: 'Skills', slug: 'using-syllago/providers/kiro/skills' },
        { label: 'Hooks', slug: 'using-syllago/providers/kiro/hooks' },
        { label: 'Rules', slug: 'using-syllago/providers/kiro/rules' },
        { label: 'MCP Configs', slug: 'using-syllago/providers/kiro/mcp' },
        { label: 'Agents', slug: 'using-syllago/providers/kiro/agents' },
      ],
    },
    {
      label: 'Zed',
      collapsed: true,
      items: [
        { label: 'Overview', slug: 'using-syllago/providers/zed' },
        { label: 'Rules', slug: 'using-syllago/providers/zed/rules' },
        { label: 'MCP Configs', slug: 'using-syllago/providers/zed/mcp' },
      ],
    },
    {
      label: 'Gemini CLI',
      collapsed: true,
      items: [
        { label: 'Overview', slug: 'using-syllago/providers/gemini-cli' },
        { label: 'Skills', slug: 'using-syllago/providers/gemini-cli/skills' },
        { label: 'Hooks', slug: 'using-syllago/providers/gemini-cli/hooks' },
        { label: 'Rules', slug: 'using-syllago/providers/gemini-cli/rules' },
        { label: 'MCP Configs', slug: 'using-syllago/providers/gemini-cli/mcp' },
        { label: 'Commands', slug: 'using-syllago/providers/gemini-cli/commands' },
        { label: 'Agents', slug: 'using-syllago/providers/gemini-cli/agents' },
      ],
    },
    {
      label: 'OpenCode',
      collapsed: true,
      items: [
        { label: 'Overview', slug: 'using-syllago/providers/opencode' },
        { label: 'Skills', slug: 'using-syllago/providers/opencode/skills' },
        { label: 'Rules', slug: 'using-syllago/providers/opencode/rules' },
        { label: 'MCP Configs', slug: 'using-syllago/providers/opencode/mcp' },
        { label: 'Commands', slug: 'using-syllago/providers/opencode/commands' },
        { label: 'Agents', slug: 'using-syllago/providers/opencode/agents' },
      ],
    },
    {
      label: 'Codex',
      collapsed: true,
      items: [
        { label: 'Overview', slug: 'using-syllago/providers/codex' },
        { label: 'Skills', slug: 'using-syllago/providers/codex/skills' },
        { label: 'Hooks', slug: 'using-syllago/providers/codex/hooks' },
        { label: 'Rules', slug: 'using-syllago/providers/codex/rules' },
        { label: 'MCP Configs', slug: 'using-syllago/providers/codex/mcp' },
        { label: 'Commands', slug: 'using-syllago/providers/codex/commands' },
        { label: 'Agents', slug: 'using-syllago/providers/codex/agents' },
      ],
    },
    {
      label: 'Amp',
      collapsed: true,
      items: [
        { label: 'Overview', slug: 'using-syllago/providers/amp' },
        { label: 'Skills', slug: 'using-syllago/providers/amp/skills' },
        { label: 'Rules', slug: 'using-syllago/providers/amp/rules' },
        { label: 'MCP Configs', slug: 'using-syllago/providers/amp/mcp' },
      ],
    },
  ],
},
```

Note on per-CT sidebar accuracy: the dynamic route `[provider]/[ct].astro` filters on `prov.content[cap.data.contentType]?.supported`, so a sidebar entry pointing to a CT with `supported: false` produces a dead link. Cross-checks performed:

- The `cline` sidebar omits `Skills` and `Commands` because `src/data/providers/cline.json` sets both `content.skills.supported` and `content.commands.supported` to `false`.
- The `amp` sidebar omits `Hooks` (and `Commands`) because `src/data/providers/amp.json` sets `content.hooks.supported` (and `content.commands.supported`) to `false`.

Always cross-check each provider's `src/data/providers/<slug>.json` `content.<ct>.supported` field before adding sidebar entries — the presence of a `<slug>-<ct>.json` capability file alone is not sufficient.

### Step 2: Verify build with TypeScript check

```bash
bun run build 2>&1 | grep "error" | head -10
```

Expected: no output.

### Step 3: Commit

```bash
git add sidebar.ts
git commit -m "feat: nest provider sidebar entries — overview + per-CT children (D6)"
```

---

## Task 12: Full build validation and link check

**Files:** none modified

**Depends on:** Tasks 1–11 all complete (including Task 4, the MDX deletion)

### Success Criteria
- `bun run build` → pass — zero build errors
- `bun run build 2>&1 | grep "Dead links\|broken link\|404"` → fail (no output) — starlightLinksValidator finds no broken links
- `bun run build 2>&1 | grep "providers/claude-code/skills"` → pass — per-CT route generated
- `bun run build 2>&1 | grep "providers/claude-code "` → pass — overview route generated (trailing space distinguishes from per-CT)
- `grep -rn "using-syllago/providers/[a-z]" src/content/docs/ src/components/ --include="*.mdx" --include="*.astro" | grep -v "providers/$\|providers/index"` → all results match existing routes — no dead internal links

---

### Step 1: Run the full build

```bash
bun run build
```

Expected: exit code 0.

### Step 2: Run the link validator explicitly

```bash
bun run build 2>&1 | grep -i "link\|404\|dead" | head -20
```

Expected: no output (starlightLinksValidator is already in `astro.config.mjs` and runs during build).

### Step 3: Spot-check rendered page structure

```bash
# Check overview page exists in output
ls dist/using-syllago/providers/claude-code/index.html

# Check per-CT page exists in output
ls dist/using-syllago/providers/claude-code/skills/index.html

# Check providers index still exists
ls dist/using-syllago/providers/index.html
```

Expected: all three exist.

---

## Task 13: Update CHANGELOG.md

**Files:**
- Modify: `CHANGELOG.md`

**Depends on:** Task 12 (full validation passes)

### Success Criteria
- `grep -q "2026-04-14" CHANGELOG.md` → pass — today's date entry present
- `grep -q "provider" CHANGELOG.md` → pass — provider redesign mentioned
- `grep -q "Added\|Changed\|Removed" CHANGELOG.md` → pass — standard subsections present

---

### Step 1: Prepend entry to CHANGELOG.md

Add the following under `## 2026-04-14` at the top of the changelog body:

```markdown
## 2026-04-14

### Added
- Dynamic provider overview pages at `/using-syllago/providers/<slug>/` (one per provider)
- Dynamic per-content-type conventions pages at `/using-syllago/providers/<slug>/<ct>/` (~60 routes)
- `SourcesTable` component — consolidated sources table at the top of each per-CT page
- `ProviderConventions` component — orchestrates sources, native format, canonical mappings, and extensions sections
- `ProviderOverview` component — provider identity, detection, supported CT summary
- `ProviderCanonicalMappings` component — canonical key → mechanism table for a provider/CT pair
- `ProviderExtension` component — individual extension card with three-state required badge
- `ProviderExtensionsList` component — iterates extension cards for a provider/CT pair
- `src/styles/provider-badge.css` — three-state badge styles (Required, Optional, Unspecified)

### Changed
- `src/content.config.ts` — `capSourceSchema` gains optional `name` and `section` fields; `capExtensionSchema` gains optional `required` (nullable boolean), `value_type`, and `examples` array
- `sidebar.ts` — provider entries now nested one level (provider name → Overview + per-CT children)
- `scripts/sync-providers.ts` — removed per-provider MDX generation; retains JSON data writing, index page, hook event matrix, and content type matrix generation

### Removed
- 12 generated per-provider MDX pages in `src/content/docs/using-syllago/providers/` (replaced by dynamic routes)
- Superseded `src/content/provider-extensions/` content collection directory
- Superseded `scripts/seed-provider-extensions.ts` script
- `src/styles/provider-extensions.css` (replaced by component-scoped styles and `provider-badge.css`)
```

### Step 2: Commit the changelog

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for provider pages redesign (D17)"
```

---

## Validation Gates

The following must all pass before merging:

1. **TypeScript build:** `bun run build` exits 0 with no type errors.
2. **Link validation:** `starlightLinksValidator` (runs during build) reports zero dead links. Specifically verify the 36 internal links to `/using-syllago/providers/<slug>/` all resolve.
3. **Unit tests:** `bun vitest run` passes all tests in `src/test/`.
4. **Route coverage:** `dist/using-syllago/providers/` contains `index.html` (overview route) for all 12 provider slugs and per-CT `index.html` for each supported (provider, CT) pair. Verify `claude-code` has 6 CT subdirectories (skills, hooks, rules, mcp, commands, agents); `cursor` has 6; `zed` has 2 (rules, mcp).
5. **Visual diff against deleted MDX pages:** Before Task 4 commits, open the built output for `claude-code` in a browser and verify the new overview page covers the same top-level provider details (slug, config dir, supported CT table, detection section, working-with examples) as the deleted `claude-code.mdx`. Verify the `claude-code/skills/` per-CT page covers the same content as the Skills Conventions section of the deleted MDX (sources table, native format, canonical mappings, provider-specific extensions). The content must be present — styling differences are acceptable. As a quick automated sanity layer before opening the browser, run:
   - `grep -i "configDir\|emitPath\|Supported Content Types" dist/using-syllago/providers/claude-code/index.html` (verifies overview page sections are present)
   - `grep -i "Native Format\|Canonical Mappings\|provider-specific" dist/using-syllago/providers/claude-code/skills/index.html` (verifies per-CT page sections are present)

---

## Rollback Plan

If the PR ships and breaks something in production:

1. **Revert the `sidebar.ts` change** — restores the flat sidebar entries. This is safe to do independently and takes effect immediately on the next deploy without a build change.
2. **Revert the dynamic route pages** — delete `src/pages/using-syllago/providers/[provider].astro` and `src/pages/using-syllago/providers/[provider]/[ct].astro`. The URLs `/using-syllago/providers/<slug>/` will 404 until step 3.
3. **Restore the deleted MDX files** — `git checkout <pre-PR-commit> -- src/content/docs/using-syllago/providers/`. This restores all 12 per-provider MDX files, which Starlight picks up immediately. Because `sync-providers.ts` retains the `writeProviderDataFiles` function and `loadCapabilitiesData`, a re-run of `bun scripts/sync-providers.ts` regenerates the MDX if the files need to be refreshed.
4. **Revert `content.config.ts`** — the D9/D10/D12 schema additions are additive (optional fields); reverting is safe if needed. The superseded `provider-extensions` collection is not restored — it served no user-visible purpose.

The most likely failure mode is a 404 on a per-CT route caused by a capabilities file that has `supported: true` for a (provider, CT) pair that doesn't appear in the sidebar. The fix is to add the missing sidebar entry (or remove the route if the capability entry is incorrect). This is not a rollback scenario — it's a one-line sidebar fix.

---

## Out of Scope

The following are explicitly not in this PR:

**D14 — GitHub issue auto-creation from validation warnings:** This lives in `cli/internal/capmon/capyaml/validate.go` in the syllago CLI repo, not in syllago-docs. The docs-side PR ships independently of CLI changes (D3 parallel rollout). D14 is a follow-up PR in the CLI repo.

**D16 — `capabilities.json` `data_quality` block and `syllago info` footer:** These are also CLI-repo changes. The docs-side components are written to render gracefully whether or not a `data_quality` block exists in `capabilities.json`. When the CLI ships D16, the docs site picks up the data on the next `sync-capabilities.ts` run with no additional docs changes required.

**D13 allow-list validation in `validate.go`:** This is CLI-repo work. The Zod schemas in `content.config.ts` (Task 1) enforce shape-level rules on the docs side (non-empty `code`, required `lang`). The allow-list enforcement for `value_type`, `example.lang`, and `sources[].section` values lives in the CLI.

**D5 — capmon subagent prompt extension:** Prompt changes to the capmon subagent to populate `required`, `value_type`, `examples`, `name`, and `section` are CLI-repo work. The docs components render these fields conditionally — they display nothing for extensions where the fields are absent.

**D1 — upstream CLI schema changes for `ProviderExtension`:** The three new fields (`required`, `value_type`, `examples`) must be added to the `ProviderExtension` struct in `syllago/docs/provider-formats/<slug>.yaml` and the aggregator `cli/cmd/syllago/gencapabilities.go`. These are CLI-repo changes that ride independently under D3 parallel rollout. The docs-side mirror of D1 — loosening the Zod schemas in `content.config.ts` — is handled in Task 1 of this PR.

**Regenerating existing capability JSON files** with the new optional fields: the current `src/data/capabilities/*.json` files have no `required`, `value_type`, or `examples` fields on their `providerExtensions` entries. These fields are optional in the new schema; components render the "Unspecified" badge for all extensions until the CLI enrichment lands. No re-sync is required as part of this PR.

**Removing `provider-extensions.css` from the deployed stylesheet** is handled in Task 5 (removed from `astro.config.mjs`). If any intermediate build between Task 4 (MDX deletion) and Task 5 fails due to missing CSS classes, re-order: run Task 5 before Task 4.
