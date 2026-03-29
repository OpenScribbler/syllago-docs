#!/usr/bin/env bun
/**
 * sync-providers.ts — Fetches providers.json and generates:
 *   1. Per-provider JSON data files (src/data/providers/*.json) for Astro data collection
 *   2. MDX documentation pages (src/content/docs/using-syllago/providers/*.mdx)
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

interface HookEventInfo {
  canonical: string;
  nativeName: string;
  category?: string;
}

interface ContentCapability {
  supported: boolean;
  fileFormat?: string;
  installMethod?: string;
  installPath?: string;
  symlinkSupport: boolean;
  discoveryPaths?: string[];
  // Enrichment fields
  hookEvents?: HookEventInfo[];
  hookTypes?: string[];
  configLocation?: string;
  mcpTransports?: string[];
  frontmatterFields?: string[];
}

interface ProviderCapEntry {
  name: string;
  slug: string;
  configDir: string;
  emitPath?: string;
  content: Record<string, ContentCapability>;
}

interface ProviderManifest {
  version: string;
  generatedAt: string;
  syllagoVersion: string;
  providers: ProviderCapEntry[];
  contentTypes: string[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT_DIR = dirname(import.meta.dir);
const GITHUB_REPO = "OpenScribbler/syllago";
const MDX_OUTPUT_DIR = join(ROOT_DIR, "src/content/docs/using-syllago/providers");
const DATA_OUTPUT_DIR = join(ROOT_DIR, "src/data/providers");
const REFERENCE_DIR = join(ROOT_DIR, "src/content/docs/reference");
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

// Hook event category display names.
const CATEGORY_DISPLAY: Record<string, string> = {
  tool: "Tool",
  lifecycle: "Lifecycle",
  context: "Context",
  output: "Output",
  security: "Security",
  config: "Config",
  workspace: "Workspace",
  interaction: "Interaction",
  collaboration: "Collaboration",
  model: "Model",
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
// Data collection output — Per-provider JSON files
// ---------------------------------------------------------------------------

function writeProviderDataFiles(providers: ProviderCapEntry[]): void {
  rmSync(DATA_OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(DATA_OUTPUT_DIR, { recursive: true });

  for (const prov of providers) {
    // Write provider data with slug as the JSON id field for Astro's glob loader.
    const data = { id: prov.slug, ...prov };
    writeFileSync(
      join(DATA_OUTPUT_DIR, `${prov.slug}.json`),
      JSON.stringify(data, null, 2) + "\n"
    );
  }

  console.log(`  Data: ${providers.length} JSON files in ${DATA_OUTPUT_DIR}`);
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

  // Build the matrix table with hooks count and MCP transports columns.
  const headerCols = MATRIX_TYPES.map((ct) => CT_DISPLAY[ct] || ct);
  lines.push(
    `| Provider | Slug | ${headerCols.join(" | ")} | Hook Events | MCP Transports |`
  );
  lines.push(
    `|----------|------|${headerCols.map(() => ":---:").join("|")}|:---:|:---:|`
  );

  for (const prov of providers) {
    const cells = MATRIX_TYPES.map((ct) => {
      const cap = prov.content[ct];
      return cap?.supported ? "✅" : "—";
    });
    const link = `[${prov.name}](/using-syllago/providers/${prov.slug}/)`;

    // Hook events count.
    const hookEvents = prov.content.hooks?.hookEvents?.length ?? 0;
    const hookCell = hookEvents > 0 ? `${hookEvents}` : "—";

    // MCP transports.
    const mcpTransports = prov.content.mcp?.mcpTransports ?? [];
    const mcpCell = mcpTransports.length > 0 ? mcpTransports.join(", ") : "—";

    lines.push(`| ${link} | \`${prov.slug}\` | ${cells.join(" | ")} | ${hookCell} | ${mcpCell} |`);
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
    `*Generated from syllago ${manifest.syllagoVersion} on ${manifest.generatedAt.split("T")[0]}.*`,
    ""
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// MDX generation — Per-provider pages (enriched)
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
    `description: How syllago works with ${prov.name} — supported content types, file locations, hook events, MCP configuration, and format details.`,
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
  ];

  // Emit path.
  if (prov.emitPath) {
    lines.push(
      `| **Emit path** | \`${prov.emitPath.replace("{project}/", "")}\` |`
    );
  }

  lines.push(
    "",
    "## Supported Content Types",
    "",
    "| Content Type | Supported | Install Method |",
    "|-------------|-----------|---------------|"
  );

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
      const format =
        FORMAT_DISPLAY[cap.fileFormat || ""] || cap.fileFormat || "—";

      const discovery = cap.discoveryPaths?.length
        ? cap.discoveryPaths
            .map((p) => `\`${p.replace("{project}/", "").replace("{home}/", "~/")}\``)
            .join(", ")
        : "—";

      const global = cap.installPath
        ? `\`${cap.installPath.replace("{home}/", "~/")}\``
        : "—";

      lines.push(`| ${name} | ${discovery} | ${global} | ${format} |`);
    }
  }

  // --- Enrichment: Hook events ---
  const hooksCap = prov.content.hooks;
  if (hooksCap?.supported && hooksCap.hookEvents?.length) {
    lines.push(
      "",
      "## Hook Events",
      "",
      `${prov.name} supports **${hooksCap.hookEvents.length} hook events** with handler types: ${(hooksCap.hookTypes ?? ["command"]).map((t) => `\`${t}\``).join(", ")}.`,
      ""
    );

    if (hooksCap.configLocation) {
      lines.push(`Hooks are configured in \`${hooksCap.configLocation}\`.`, "");
    }

    lines.push(
      "| Event | Native Name | Category |",
      "|-------|------------|----------|"
    );

    for (const ev of hooksCap.hookEvents) {
      const cat = ev.category
        ? CATEGORY_DISPLAY[ev.category] || ev.category
        : "—";
      lines.push(
        `| \`${ev.canonical}\` | \`${ev.nativeName}\` | ${cat} |`
      );
    }
  } else if (hooksCap?.supported) {
    // Supports hooks but no event mappings yet (e.g. Windsurf, Codex).
    lines.push(
      "",
      "## Hooks",
      "",
      `${prov.name} supports hooks, but syllago does not yet map its hook event names. Hook conversion to and from ${prov.name} is best-effort.`,
      ""
    );
    if (hooksCap.configLocation) {
      lines.push(`Hooks are configured in \`${hooksCap.configLocation}\`.`, "");
    }
  }

  // --- Enrichment: MCP configuration ---
  const mcpCap = prov.content.mcp;
  if (mcpCap?.supported && mcpCap.mcpTransports?.length) {
    lines.push(
      "",
      "## MCP Configuration",
      "",
      "| Detail | Value |",
      "|--------|-------|",
      `| **Transports** | ${mcpCap.mcpTransports.map((t) => `\`${t}\``).join(", ")} |`
    );
    if (mcpCap.configLocation) {
      lines.push(
        `| **Config file** | \`${mcpCap.configLocation}\` |`
      );
    }
    lines.push("");
  }

  // --- Enrichment: Rules format ---
  const rulesCap = prov.content.rules;
  if (rulesCap?.supported && rulesCap.frontmatterFields?.length) {
    lines.push(
      "",
      "## Rules Format",
      "",
      "| Detail | Value |",
      "|--------|-------|",
      `| **File format** | ${FORMAT_DISPLAY[rulesCap.fileFormat || ""] || rulesCap.fileFormat || "Markdown"} |`,
      `| **Frontmatter fields** | ${rulesCap.frontmatterFields.map((f) => `\`${f}\``).join(", ")} |`
    );
    if (prov.emitPath) {
      lines.push(
        `| **Primary file** | \`${prov.emitPath.replace("{project}/", "")}\` |`
      );
    }
    lines.push("");
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
// MDX generation — Hook Event Matrix page
// ---------------------------------------------------------------------------

function generateHookEventMatrix(
  providers: ProviderCapEntry[],
  manifest: ProviderManifest
): string {
  // Collect providers that have hook event mappings.
  const mappedProviders = providers.filter(
    (p) => p.content.hooks?.supported && (p.content.hooks.hookEvents?.length ?? 0) > 0
  );

  // Providers that support hooks but have no event mappings.
  const unmappedProviders = providers.filter(
    (p) => p.content.hooks?.supported && (p.content.hooks.hookEvents?.length ?? 0) === 0
  );

  // Build a map: canonical event → { category, providers: { slug → nativeName } }.
  const eventMap = new Map<string, { category: string; providers: Map<string, string> }>();

  for (const prov of mappedProviders) {
    for (const ev of prov.content.hooks!.hookEvents!) {
      if (!eventMap.has(ev.canonical)) {
        eventMap.set(ev.canonical, {
          category: ev.category ?? "",
          providers: new Map(),
        });
      }
      eventMap.get(ev.canonical)!.providers.set(prov.slug, ev.nativeName);
    }
  }

  // Group events by category, sorted alphabetically within each group.
  const categories = [...new Set([...eventMap.values()].map((e) => e.category))].sort();
  const eventsByCategory = new Map<string, string[]>();
  for (const cat of categories) {
    const events = [...eventMap.entries()]
      .filter(([, e]) => e.category === cat)
      .map(([canonical]) => canonical)
      .sort();
    eventsByCategory.set(cat, events);
  }

  const provCols = mappedProviders.map((p) => p.name);
  const provSlugs = mappedProviders.map((p) => p.slug);

  const lines: string[] = [
    "---",
    "title: Hook Event Matrix",
    "description: Cross-provider comparison of hook events — which canonical events each provider supports and their native names.",
    "---",
    "",
    "{/* AUTO-GENERATED — do not edit. Source: providers.json via sync-providers.ts */}",
    "",
    "Syllago maps each provider's native hook event names to **canonical events** — a shared vocabulary that makes hooks portable across tools. This page shows which events each provider supports and what they call them.",
    "",
    "## How to read this table",
    "",
    "- **Canonical name**: The syllago-standard event name used in `.syllago.yaml`",
    "- **Provider columns**: The native event name each provider uses, or `—` if unsupported",
    "- **Category**: Groups related events (lifecycle, tool, context, etc.)",
    "",
  ];

  // Render one table per category.
  for (const cat of categories) {
    const catDisplay = CATEGORY_DISPLAY[cat] || cat || "Other";
    const events = eventsByCategory.get(cat)!;

    lines.push(`## ${catDisplay}`, "");
    lines.push(`| Canonical Event | ${provCols.join(" | ")} |`);
    lines.push(`|-----------------|${provCols.map(() => "---").join("|")}|`);

    for (const canonical of events) {
      const entry = eventMap.get(canonical)!;
      const cells = provSlugs.map((slug) => {
        const native = entry.providers.get(slug);
        return native ? `\`${native}\`` : "—";
      });
      lines.push(`| \`${canonical}\` | ${cells.join(" | ")} |`);
    }
    lines.push("");
  }

  // Summary stats.
  lines.push(
    "## Coverage Summary",
    "",
    "| Provider | Hook Events | Hook Types |",
    "|----------|:-----------:|------------|"
  );

  for (const prov of mappedProviders) {
    const hooksCap = prov.content.hooks!;
    const count = hooksCap.hookEvents!.length;
    const types = (hooksCap.hookTypes ?? ["command"]).map((t) => `\`${t}\``).join(", ");
    const link = `[${prov.name}](/using-syllago/providers/${prov.slug}/)`;
    lines.push(`| ${link} | ${count} | ${types} |`);
  }

  if (unmappedProviders.length > 0) {
    lines.push("");
    lines.push(
      `**Hooks supported, event mappings pending:** ${unmappedProviders.map((p) => `[${p.name}](/using-syllago/providers/${p.slug}/)`).join(", ")}. These providers support hooks, but syllago does not yet map their event names. Hook conversion is best-effort.`
    );
  }

  lines.push(
    "",
    "## See Also",
    "",
    "- [Hooks Content Type](/using-syllago/content-types/hooks/)",
    "- [Providers Overview](/using-syllago/providers/)",
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
    if (existsSync(join(MDX_OUTPUT_DIR, "index.mdx"))) {
      console.log(`Sync skipped: ${err.message}`);
      console.log("Using existing provider reference files.");
      return;
    }
    throw err;
  }

  console.log(
    `Loaded ${manifest.providers.length} providers from syllago ${manifest.syllagoVersion}`
  );

  // 1. Write per-provider JSON data files for Astro data collection.
  writeProviderDataFiles(manifest.providers);

  // 2. Generate MDX pages.
  rmSync(MDX_OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(MDX_OUTPUT_DIR, { recursive: true });

  const indexContent = generateIndexPage(manifest.providers, manifest);
  writeFileSync(join(MDX_OUTPUT_DIR, "index.mdx"), indexContent);
  console.log("  MDX: index.mdx");

  let count = 0;
  for (const prov of manifest.providers) {
    const content = generateProviderPage(prov, manifest);
    writeFileSync(join(MDX_OUTPUT_DIR, `${prov.slug}.mdx`), content);
    count++;
  }

  console.log(`  MDX: ${count} provider pages`);

  // 3. Generate hook event matrix page.
  mkdirSync(REFERENCE_DIR, { recursive: true });
  const matrixContent = generateHookEventMatrix(manifest.providers, manifest);
  writeFileSync(join(REFERENCE_DIR, "hook-events.mdx"), matrixContent);
  console.log("  MDX: reference/hook-events.mdx");

  console.log(`  Total: ${count + 2} MDX + ${manifest.providers.length} JSON`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
