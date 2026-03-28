#!/usr/bin/env bun
/**
 * sync-providers.ts — Fetches providers.json and generates MDX pages for provider reference.
 *
 * Usage:
 *   bun scripts/sync-providers.ts                                # fetch from latest GitHub release
 *   bun scripts/sync-providers.ts --local path/to/providers.json # use local file
 *   PROVIDERS_JSON_PATH=path/to/providers.json bun scripts/sync-providers.ts
 */

import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { execFileSync } from "child_process";

// ---------------------------------------------------------------------------
// Types (mirrors the Go ProviderManifest schema)
// ---------------------------------------------------------------------------

interface ProviderManifest {
  version: string;
  generatedAt: string;
  syllagoVersion: string;
  providers: ProviderCapEntry[];
  contentTypes: string[];
}

interface ProviderCapEntry {
  name: string;
  slug: string;
  configDir: string;
  content: Record<string, ContentCapability>;
}

interface ContentCapability {
  supported: boolean;
  fileFormat?: string;
  installMethod?: string;
  installPath?: string;
  symlinkSupport: boolean;
  discoveryPaths?: string[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GITHUB_REPO = "OpenScribbler/syllago";
const OUTPUT_DIR = join(
  dirname(import.meta.dir),
  "src/content/docs/using-syllago/providers"
);
const FETCH_TIMEOUT_MS = 15_000;

// Display names for content types (used in tables).
const CT_DISPLAY: Record<string, string> = {
  rules: "Rules",
  hooks: "Hooks",
  mcp: "MCP Configs",
  skills: "Skills",
  agents: "Agents",
  commands: "Commands",
  loadouts: "Loadouts",
};

// The six standard content types shown in the matrix (excludes loadouts).
const MATRIX_TYPES = ["rules", "skills", "agents", "mcp", "hooks", "commands"];

// File format display names.
const FORMAT_DISPLAY: Record<string, string> = {
  md: "Markdown",
  mdc: "MDC (Markdown + frontmatter)",
  json: "JSON",
  jsonc: "JSON with comments",
  yaml: "YAML",
  toml: "TOML",
};

// Install method display names.
const METHOD_DISPLAY: Record<string, string> = {
  filesystem: "Symlink",
  "json-merge": "JSON merge",
  "project-scope": "Project scope",
};

// ---------------------------------------------------------------------------
// GitHub auth (same as sync-commands.ts)
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
// Load providers.json
// ---------------------------------------------------------------------------

async function loadManifest(): Promise<ProviderManifest> {
  const localArgIdx = process.argv.indexOf("--local");
  const localPath =
    localArgIdx !== -1
      ? process.argv[localArgIdx + 1]
      : process.env.PROVIDERS_JSON_PATH;

  if (localPath) {
    if (!existsSync(localPath)) {
      throw new Error(`Local providers.json not found: ${localPath}`);
    }
    console.log(`Loading providers.json from local file: ${localPath}`);
    return JSON.parse(readFileSync(localPath, "utf-8"));
  }

  console.log(
    `Fetching providers.json from latest ${GITHUB_REPO} release...`
  );
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
    const asset = release.assets.find((a) => a.name === "providers.json");
    if (!asset) {
      throw new Error("providers.json not found in latest release assets");
    }

    const jsonRes = await fetch(asset.url, {
      headers: { ...authHeaders, Accept: "application/octet-stream" },
      signal: controller.signal,
    });
    if (!jsonRes.ok) {
      throw new Error(`Failed to fetch providers.json: ${jsonRes.status}`);
    }

    return (await jsonRes.json()) as ProviderManifest;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// MDX generation — Index page
// ---------------------------------------------------------------------------

function generateIndexPage(
  providers: ProviderCapEntry[],
  manifest: ProviderManifest
): string {
  const lines: string[] = [
    "---",
    "title: Providers",
    "description: The AI coding tools syllago integrates with, their supported content types, and how provider detection works.",
    "---",
    "",
    "{/* AUTO-GENERATED — do not edit. Source: providers.json via sync-providers.ts */}",
    "",
    'A **provider** is an AI coding tool that syllago can read from and write to. Each provider has its own configuration format, file locations, and set of supported content types. syllago handles the differences so you can share configuration between them.',
    "",
    "## Checking available providers",
    "",
    "To see the full list of providers and what each one supports:",
    "",
    "```bash",
    "syllago info providers",
    "```",
    "",
    "## Content type support matrix",
    "",
    "Not every provider supports every content type. The matrix below shows what each provider can handle.",
    "",
  ];

  // Build the matrix table.
  const headerCols = MATRIX_TYPES.map((ct) => CT_DISPLAY[ct] || ct);
  lines.push(
    `| Provider | Slug | ${headerCols.join(" | ")} |`
  );
  lines.push(
    `|----------|------|${headerCols.map(() => ":---:").join("|")}|`
  );

  for (const prov of providers) {
    const cells = MATRIX_TYPES.map((ct) => {
      const cap = prov.content[ct];
      return cap?.supported ? "✅" : "—";
    });
    const link = `[${prov.name}](/using-syllago/providers/${prov.slug}/)`;
    lines.push(`| ${link} | \`${prov.slug}\` | ${cells.join(" | ")} |`);
  }

  lines.push(
    "",
    "Every provider supports rules. Beyond that, support varies based on what each tool's configuration format can express.",
    "",
    "## Auto-detection",
    "",
    "When you run `syllago init`, syllago scans your system for installed providers and configures itself to work with the ones it finds. You don't need to manually specify which providers you use.",
    "",
    '## The `--from` and `--to` flags',
    "",
    "When working with content, the `--from` flag tells syllago which provider to read from, and the `--to` flag tells it which provider to write to. Use the provider slug as the value:",
    "",
    "```bash",
    "# Add content from Cursor to your library",
    "syllago add --from cursor",
    "",
    "# Install a rule to Gemini CLI",
    "syllago install my-rule --to gemini-cli",
    "```",
    "",
    "If the source and target providers use different configuration formats, syllago converts automatically. See [Format Conversion](/using-syllago/format-conversion/) for details.",
    "",
    "## Provider compatibility",
    "",
    "Use `syllago compat` to check which providers support a specific content item:",
    "",
    "```bash",
    "syllago compat my-skill",
    "```",
    "",
    "This shows a matrix of which providers can handle the item, with any conversion warnings.",
    "",
    `*Generated from syllago ${manifest.syllagoVersion} on ${manifest.generatedAt.split("T")[0]}.*`,
    ""
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// MDX generation — Per-provider pages
// ---------------------------------------------------------------------------

function generateProviderPage(
  prov: ProviderCapEntry,
  manifest: ProviderManifest
): string {
  const supportedTypes = Object.entries(prov.content)
    .filter(([, cap]) => cap.supported)
    .map(([ct]) => CT_DISPLAY[ct] || ct);

  const lines: string[] = [
    "---",
    `title: ${prov.name}`,
    `description: How syllago works with ${prov.name}.`,
    "---",
    "",
    "{/* AUTO-GENERATED — do not edit. Source: providers.json via sync-providers.ts */}",
    "",
    "## Provider Details",
    "",
    "| Detail | Value |",
    "|--------|-------|",
    `| **Slug** | \`${prov.slug}\` |`,
    `| **Config directory** | \`~/${prov.configDir}\` |`,
    `| **Supported content types** | ${supportedTypes.join(", ")} |`,
    "",
    "## Supported Content Types",
    "",
    "| Content Type | Supported | Install Method |",
    "|-------------|-----------|---------------|",
  ];

  for (const ct of [...MATRIX_TYPES, "loadouts"]) {
    const cap = prov.content[ct];
    if (!cap) continue;
    const name = CT_DISPLAY[ct] || ct;
    const supported = cap.supported ? "Yes" : "No";
    const method = cap.supported
      ? METHOD_DISPLAY[cap.installMethod || ""] || cap.installMethod || "—"
      : "—";
    lines.push(`| ${name} | ${supported} | ${method} |`);
  }

  // File format and location table.
  const hasLocations = Object.values(prov.content).some(
    (cap) => cap.supported && (cap.installPath || cap.discoveryPaths?.length)
  );

  if (hasLocations) {
    lines.push(
      "",
      "## File Format and Location",
      "",
      "| Content Type | Discovery Paths | Global Location | Format |",
      "|-------------|----------------|----------------|--------|"
    );

    for (const ct of [...MATRIX_TYPES, "loadouts"]) {
      const cap = prov.content[ct];
      if (!cap?.supported) continue;
      const name = CT_DISPLAY[ct] || ct;
      const format = FORMAT_DISPLAY[cap.fileFormat || ""] || cap.fileFormat || "—";

      const discovery = cap.discoveryPaths?.length
        ? cap.discoveryPaths
            .map((p) => `\`${p.replace("{project}/", "")}\``)
            .join(", ")
        : "—";

      const global = cap.installPath
        ? `\`${cap.installPath.replace("{home}/", "~/")}\``
        : "—";

      lines.push(`| ${name} | ${discovery} | ${global} | ${format} |`);
    }
  }

  // Discovery paths detail.
  const hasDiscovery = Object.values(prov.content).some(
    (cap) => cap.supported && cap.discoveryPaths?.length
  );

  if (hasDiscovery) {
    lines.push(
      "",
      "## Discovery Paths",
      "",
      "| Content Type | Discovery Paths |",
      "|-------------|----------------|"
    );

    for (const ct of [...MATRIX_TYPES, "loadouts"]) {
      const cap = prov.content[ct];
      if (!cap?.supported || !cap.discoveryPaths?.length) continue;
      const name = CT_DISPLAY[ct] || ct;
      const paths = cap.discoveryPaths
        .map((p) => `\`${p.replace("{project}/", "")}\``)
        .join(", ");
      lines.push(`| ${name} | ${paths} |`);
    }
  }

  // Detection.
  lines.push(
    "",
    "## Detection",
    "",
    `Syllago detects ${prov.name} by checking for the \`~/${prov.configDir}\` directory.`,
    "",
    `## Working with ${prov.name}`,
    "",
    "```bash",
    `# Add content from ${prov.name}`,
    `syllago add --from ${prov.slug}`,
    "",
    `# Install content to ${prov.name}`,
    `syllago install my-rule --to ${prov.slug}`,
    "```",
    "",
    "## See Also",
    "",
    "- [Providers Overview](/using-syllago/providers/)",
    "- [Format Conversion](/using-syllago/format-conversion/)",
    "",
    `*Generated from syllago ${manifest.syllagoVersion} on ${manifest.generatedAt.split("T")[0]}.*`,
    ""
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let manifest: ProviderManifest;
  try {
    manifest = await loadManifest();
  } catch (err: any) {
    if (existsSync(join(OUTPUT_DIR, "index.mdx"))) {
      console.log(`Sync skipped: ${err.message}`);
      console.log("Using existing provider reference files.");
      return;
    }
    throw err;
  }

  console.log(
    `Loaded ${manifest.providers.length} providers from syllago ${manifest.syllagoVersion}`
  );

  // Wipe output directory.
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate index page.
  const indexContent = generateIndexPage(manifest.providers, manifest);
  writeFileSync(join(OUTPUT_DIR, "index.mdx"), indexContent);
  console.log("  Generated: index.mdx");

  // Generate per-provider pages.
  let count = 0;
  for (const prov of manifest.providers) {
    const content = generateProviderPage(prov, manifest);
    writeFileSync(join(OUTPUT_DIR, `${prov.slug}.mdx`), content);
    count++;
  }

  console.log(`  Generated: ${count} provider pages`);
  console.log(`  Total: ${count + 1} files in ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
