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
const CAPABILITIES_DATA_DIR = join(ROOT_DIR, "src/data/capabilities");
const REFERENCE_DIR = join(ROOT_DIR, "src/content/docs/reference");
const SIDEBAR_PATH = join(ROOT_DIR, "sidebar.ts");
const FETCH_TIMEOUT_MS = 15_000;

// Canonical content type order in the sidebar (Skills first, Agents last).
const SIDEBAR_CT_ORDER = ["skills", "hooks", "rules", "mcp", "commands", "agents"];
const SIDEBAR_START_MARKER = "// AUTO-GENERATED:PROVIDERS START";
const SIDEBAR_END_MARKER = "// AUTO-GENERATED:PROVIDERS END";

// Display names for content types (used in tables).
const CT_DISPLAY: Record<string, string> = {
  rules: "Rules",
  hooks: "Hooks",
  mcp: "MCP Configs",
  skills: "Skills",
  agents: "Agents",
  commands: "Commands",
};

// The six standard content types shown in the matrix.
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

// Hook event category descriptions — shown below each category heading.
const CATEGORY_CONTEXT: Record<string, string> = {
  tool: "Fired before and after tool/function calls. Use these to validate, log, or transform tool inputs and outputs.",
  lifecycle: "Session and agent lifecycle boundaries — start, stop, errors, subagents, and task completion.",
  context: "Events related to context management — compaction, instruction loading, and context window maintenance.",
  output: "Events for agent output like notifications and status messages.",
  security: "Permission and authorization checkpoints. Fires when the agent requests elevated permissions.",
  config: "Configuration file change detection. Fires when settings files are modified during a session.",
  workspace: "Git worktree creation and removal. Fires when the agent manages isolated working copies.",
  interaction: "User-facing prompts and dialogs. Fires when the agent asks questions or presents choices.",
  collaboration: "Multi-agent coordination events. Fires when teammate agents become idle or available.",
  model: "Model invocation boundaries. Fires before/after LLM calls and tool selection decisions.",
};

// Content type page descriptions.
const CT_PAGE_DESCRIPTIONS: Record<string, { title: string; intro: string }> = {
  rules: {
    title: "Rules Comparison",
    intro: "Rules are the most universal content type — every provider supports them. But the format, frontmatter fields, and file locations vary. This matrix shows how rules work across providers so you know what converts cleanly and what gets adjusted.",
  },
  skills: {
    title: "Skills Comparison",
    intro: "Skills are reusable prompt-driven capabilities that can be invoked by name. Not every provider supports them — and those that do vary in what frontmatter fields they recognize.",
  },
  agents: {
    title: "Agents Comparison",
    intro: "Agent definitions configure autonomous sub-processes with specific tools, models, and behaviors. Providers vary significantly in agent format and capability.",
  },
  mcp: {
    title: "MCP Comparison",
    intro: "MCP (Model Context Protocol) configs define external tool servers. Every provider supports MCP, but they differ in config file location, format, and supported transports.",
  },
  commands: {
    title: "Commands Comparison",
    intro: "Commands are user-invokable shortcuts (like slash commands). Only some providers support them, and frontmatter fields differ substantially.",
  },
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
// Sidebar generation — Providers section
// ---------------------------------------------------------------------------

// Renders the providers block as it appears between AUTO-GENERATED markers in
// sidebar.ts. Indentation matches the surrounding Starlight config: 10 spaces
// for marker + provider entry braces, 12 for entry properties, 14 for items.
function generateProvidersSidebarBlock(providers: ProviderCapEntry[]): string {
  const sorted = [...providers].sort((a, b) => a.name.localeCompare(b.name));
  const lines: string[] = [
    `          ${SIDEBAR_START_MARKER} — managed by scripts/sync-providers.ts. Do not edit by hand.`,
  ];
  for (const prov of sorted) {
    const safeName = prov.name.replace(/'/g, "\\'");
    lines.push(
      `          {`,
      `            label: '${safeName}',`,
      `            collapsed: true,`,
      `            items: [`,
      `              { label: 'Overview', link: '/using-syllago/providers/${prov.slug}/' },`,
    );
    for (const ct of SIDEBAR_CT_ORDER) {
      if (prov.content[ct]?.supported) {
        const label = CT_DISPLAY[ct] ?? ct;
        lines.push(
          `              { label: '${label}', link: '/using-syllago/providers/${prov.slug}/${ct}/' },`,
        );
      }
    }
    lines.push(`            ],`, `          },`);
  }
  lines.push(`          ${SIDEBAR_END_MARKER}`);
  return lines.join("\n");
}

function writeProvidersSidebarBlock(providers: ProviderCapEntry[]): void {
  if (!existsSync(SIDEBAR_PATH)) {
    throw new Error(`sidebar.ts not found at ${SIDEBAR_PATH}`);
  }
  const current = readFileSync(SIDEBAR_PATH, "utf-8");
  const startIdx = current.indexOf(SIDEBAR_START_MARKER);
  const endIdx = current.indexOf(SIDEBAR_END_MARKER);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(
      `sidebar.ts is missing AUTO-GENERATED:PROVIDERS markers. ` +
      `Add the START/END comment block inside the 'Supported Providers' items array.`
    );
  }
  // Replace from start of the marker line through end of the END marker line.
  const lineStart = current.lastIndexOf("\n", startIdx) + 1;
  const lineEnd = current.indexOf("\n", endIdx + SIDEBAR_END_MARKER.length);
  if (lineEnd === -1) {
    throw new Error(`sidebar.ts END marker has no trailing newline`);
  }
  const block = generateProvidersSidebarBlock(providers);
  const updated = current.slice(0, lineStart) + block + current.slice(lineEnd);
  if (updated === current) {
    console.log("  Sidebar: no changes");
    return;
  }
  writeFileSync(SIDEBAR_PATH, updated);
  console.log("  Sidebar: providers section regenerated");
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
    const catContext = CATEGORY_CONTEXT[cat];
    const events = eventsByCategory.get(cat)!;

    lines.push(`## ${catDisplay}`, "");
    if (catContext) {
      lines.push(catContext, "");
    }
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
// MDX generation — Content Type Matrix pages
// ---------------------------------------------------------------------------

function generateContentTypeMatrix(
  contentType: string,
  providers: ProviderCapEntry[],
  manifest: ProviderManifest
): string {
  const pageInfo = CT_PAGE_DESCRIPTIONS[contentType];
  if (!pageInfo) return "";

  // Providers that support this content type.
  const supported = providers.filter((p) => p.content[contentType]?.supported);
  const unsupported = providers.filter((p) => !p.content[contentType]?.supported);

  const provNames = supported.map((p) => p.name);
  const provSlugs = supported.map((p) => p.slug);

  const lines: string[] = [
    "---",
    `title: ${pageInfo.title}`,
    `description: Cross-provider comparison of ${CT_DISPLAY[contentType] || contentType} support — formats, install methods, discovery paths, and frontmatter fields.`,
    "---",
    "",
    "{/* AUTO-GENERATED — do not edit. Source: providers.json via sync-providers.ts */}",
    "",
    pageInfo.intro,
    "",
  ];

  // Overview table: format, install method, symlink support.
  lines.push(
    "## Format and Install Method",
    "",
    `How each provider stores and installs ${CT_DISPLAY[contentType]?.toLowerCase() || contentType}.`,
    "",
    `| Provider | Format | Install Method | Symlink |`,
    `|----------|--------|---------------|:-------:|`
  );

  for (const prov of supported) {
    const cap = prov.content[contentType]!;
    const link = `[${prov.name}](/using-syllago/providers/${prov.slug}/)`;
    const fmt = FORMAT_DISPLAY[cap.fileFormat || ""] || cap.fileFormat || "—";
    const method = METHOD_DISPLAY[cap.installMethod || ""] || cap.installMethod || "—";
    const symlink = cap.symlinkSupport ? "Yes" : "No";
    lines.push(`| ${link} | ${fmt} | ${method} | ${symlink} |`);
  }
  lines.push("");

  // Discovery paths table.
  const hasDiscovery = supported.some(
    (p) => p.content[contentType]?.discoveryPaths?.length
  );

  if (hasDiscovery) {
    lines.push(
      "## Discovery Paths",
      "",
      `Where each provider looks for ${CT_DISPLAY[contentType]?.toLowerCase() || contentType} files. Paths with \`~/\` are relative to the user's home directory; others are relative to the project root.`,
      "",
      `| Provider | Discovery Paths | Global Install Path |`,
      `|----------|----------------|-------------------|`
    );

    for (const prov of supported) {
      const cap = prov.content[contentType]!;
      const link = `[${prov.name}](/using-syllago/providers/${prov.slug}/)`;
      const discovery = cap.discoveryPaths?.length
        ? cap.discoveryPaths
            .map(
              (p) =>
                `\`${p.replace("{project}/", "").replace("{home}/", "~/")}\``
            )
            .join(", ")
        : "—";
      const global = cap.installPath
        ? `\`${cap.installPath.replace("{home}/", "~/")}\``
        : "—";
      lines.push(`| ${link} | ${discovery} | ${global} |`);
    }
    lines.push("");
  }

  // Frontmatter fields matrix — only if any provider has fields.
  const allFields = new Set<string>();
  for (const prov of supported) {
    const cap = prov.content[contentType];
    for (const f of cap?.frontmatterFields ?? []) {
      allFields.add(f);
    }
  }

  if (allFields.size > 0) {
    const sortedFields = [...allFields].sort();

    lines.push(
      "## Frontmatter Fields",
      "",
      `Which frontmatter fields each provider recognizes in ${CT_DISPLAY[contentType]?.toLowerCase() || contentType} files. A checkmark means the provider parses and uses that field during conversion.`,
      "",
      `| Field | ${provNames.join(" | ")} |`,
      `|-------|${provNames.map(() => ":---:").join("|")}|`
    );

    for (const field of sortedFields) {
      const cells = provSlugs.map((slug) => {
        const prov = supported.find((p) => p.slug === slug)!;
        const cap = prov.content[contentType];
        return cap?.frontmatterFields?.includes(field) ? "✓" : "—";
      });
      lines.push(`| \`${field}\` | ${cells.join(" | ")} |`);
    }
    lines.push("");
  }

  // Config location — for hooks and MCP.
  const hasConfig = supported.some(
    (p) => p.content[contentType]?.configLocation
  );

  if (hasConfig) {
    lines.push(
      "## Config Location",
      "",
      `| Provider | Config File |`,
      `|----------|------------|`
    );

    for (const prov of supported) {
      const cap = prov.content[contentType]!;
      const link = `[${prov.name}](/using-syllago/providers/${prov.slug}/)`;
      const config = cap.configLocation
        ? `\`${cap.configLocation}\``
        : "—";
      lines.push(`| ${link} | ${config} |`);
    }
    lines.push("");
  }

  // MCP-specific: transports.
  if (contentType === "mcp") {
    const hasTransports = supported.some(
      (p) => p.content.mcp?.mcpTransports?.length
    );
    if (hasTransports) {
      // Collect all transports.
      const allTransports = new Set<string>();
      for (const prov of supported) {
        for (const t of prov.content.mcp?.mcpTransports ?? []) {
          allTransports.add(t);
        }
      }
      const sortedTransports = [...allTransports].sort();

      lines.push(
        "## Transport Support",
        "",
        "Which MCP transports each provider supports for communicating with tool servers.",
        "",
        `| Transport | ${provNames.join(" | ")} |`,
        `|-----------|${provNames.map(() => ":---:").join("|")}|`
      );

      for (const transport of sortedTransports) {
        const cells = provSlugs.map((slug) => {
          const prov = supported.find((p) => p.slug === slug)!;
          return prov.content.mcp?.mcpTransports?.includes(transport)
            ? "✓"
            : "—";
        });
        lines.push(`| \`${transport}\` | ${cells.join(" | ")} |`);
      }
      lines.push("");
    }
  }

  // Unsupported providers note.
  if (unsupported.length > 0) {
    lines.push(
      `**Not supported by:** ${unsupported.map((p) => `[${p.name}](/using-syllago/providers/${p.slug}/)`).join(", ")}.`,
      ""
    );
  }

  lines.push(
    "## See Also",
    "",
    `- [${CT_DISPLAY[contentType] || contentType} Content Type](/using-syllago/content-types/${contentType === "mcp" ? "mcp-configs" : contentType}/)`,
    "- [Providers Overview](/using-syllago/providers/)",
    "- [Compare Providers](/reference/compare-providers/)",
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

  // 2. Regenerate the providers section of sidebar.ts (managed-block codegen).
  writeProvidersSidebarBlock(manifest.providers);

  // 3. Generate MDX pages.
  rmSync(MDX_OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(MDX_OUTPUT_DIR, { recursive: true });

  const indexContent = generateIndexPage(manifest.providers, manifest);
  writeFileSync(join(MDX_OUTPUT_DIR, "index.mdx"), indexContent);
  console.log("  MDX: index.mdx");

  // 3. Generate reference pages.
  mkdirSync(REFERENCE_DIR, { recursive: true });

  const matrixContent = generateHookEventMatrix(manifest.providers, manifest);
  writeFileSync(join(REFERENCE_DIR, "hook-events.mdx"), matrixContent);
  console.log("  MDX: reference/hook-events.mdx");

  // 4. Generate content type comparison pages.
  let refCount = 1; // hook-events already counted
  const CT_MATRIX_TYPES = ["rules", "skills", "agents", "mcp", "commands"];
  for (const ct of CT_MATRIX_TYPES) {
    const ctContent = generateContentTypeMatrix(ct, manifest.providers, manifest);
    if (ctContent) {
      const slug = ct === "mcp" ? "mcp-configs" : ct;
      writeFileSync(join(REFERENCE_DIR, `${slug}-matrix.mdx`), ctContent);
      console.log(`  MDX: reference/${slug}-matrix.mdx`);
      refCount++;
    }
  }

  console.log(`  Total: ${1 + refCount} MDX + ${manifest.providers.length} JSON`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
