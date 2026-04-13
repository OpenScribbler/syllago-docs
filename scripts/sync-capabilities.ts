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
  generateCanonicalKeyPages(manifest);
  generateCapabilitiesMatrix(manifest);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
