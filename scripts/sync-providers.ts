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

import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
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

// Capabilities data shape (written by sync-capabilities.ts).
interface CapDataExtension {
  id: string;
  name: string;
  description: string;
  source_ref?: string;
}

interface CapDataMapping {
  supported: boolean;
  mechanism: string;
  paths?: string[];
}

interface CapDataEntry {
  id: string;
  provider: string;
  contentType: string;
  canonicalMappings?: Record<string, CapDataMapping>;
  providerExtensions: CapDataExtension[];
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
const FETCH_TIMEOUT_MS = 15_000;

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

// Order of the per-content-type "Conventions" sections on a provider page.
// The slug is stable (derived from the section title) so the Supported
// Content Types table can link to each section by anchor.
const CT_SECTION_ORDER = ["skills", "hooks", "rules", "mcp", "commands", "agents"];

// Section title and anchor slug for each content type's Conventions section.
const CT_SECTION_INFO: Record<string, { title: string; slug: string }> = {
  skills: { title: "Skills Conventions", slug: "skills-conventions" },
  hooks: { title: "Hook Conventions", slug: "hook-conventions" },
  rules: { title: "Rule Conventions", slug: "rule-conventions" },
  mcp: { title: "MCP Config Conventions", slug: "mcp-config-conventions" },
  commands: { title: "Command Conventions", slug: "command-conventions" },
  agents: { title: "Agent Conventions", slug: "agent-conventions" },
};

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
// Load capabilities data (written by sync-capabilities.ts)
// ---------------------------------------------------------------------------

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
// MDX-safe text escape — provider extension descriptions may contain `{`, `<`,
// `&` etc. that MDX would otherwise interpret as JSX. This escape is used only
// for user-facing text inserted into raw HTML blocks (not URLs or code spans).
// ---------------------------------------------------------------------------

function escapeMdxInline(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;")
    .replace(/\|/g, "\\|");
}

// ---------------------------------------------------------------------------
// Pretty-print helpers for native-format bullets.
// ---------------------------------------------------------------------------

function formatPath(p: string): string {
  return `\`${p.replace("{project}/", "").replace("{home}/", "~/")}\``;
}

function formatFormat(fmt?: string): string {
  return FORMAT_DISPLAY[fmt || ""] || fmt || "—";
}

function formatMethod(method?: string): string {
  return METHOD_DISPLAY[method || ""] || method || "—";
}

// ---------------------------------------------------------------------------
// Per-content-type Conventions section
// ---------------------------------------------------------------------------

function generateContentTypeConventions(
  ct: string,
  prov: ProviderCapEntry,
  capEntry: CapDataEntry | undefined
): string[] {
  const cap = prov.content[ct];
  if (!cap?.supported) return [];

  const info = CT_SECTION_INFO[ct];
  if (!info) return [];

  const lines: string[] = [];
  const ctDisplay = CT_DISPLAY[ct] || ct;

  lines.push(`## ${info.title}`, "");

  // ----- Native Format -----
  lines.push("### Native Format", "");

  const nativeBullets: string[] = [];
  if (cap.fileFormat) {
    nativeBullets.push(`- **File format:** ${formatFormat(cap.fileFormat)}`);
  }
  if (cap.discoveryPaths?.length) {
    const paths = cap.discoveryPaths.map(formatPath).join(", ");
    nativeBullets.push(`- **Discovery paths:** ${paths}`);
  }
  if (cap.installPath) {
    nativeBullets.push(`- **Global install path:** ${formatPath(cap.installPath)}`);
  }
  if (cap.installMethod) {
    nativeBullets.push(`- **Syllago install method:** ${formatMethod(cap.installMethod)}`);
  }
  nativeBullets.push(`- **Symlink support:** ${cap.symlinkSupport ? "Yes" : "No"}`);

  // CT-specific native fields.
  if (ct === "hooks") {
    if (cap.configLocation) {
      nativeBullets.push(`- **Config file:** \`${cap.configLocation}\``);
    }
    if (cap.hookTypes?.length) {
      const types = cap.hookTypes.map((t) => `\`${t}\``).join(", ");
      nativeBullets.push(`- **Handler types:** ${types}`);
    }
    if (cap.hookEvents?.length) {
      nativeBullets.push(`- **Hook events:** ${cap.hookEvents.length}`);
    }
  } else if (ct === "mcp") {
    if (cap.configLocation) {
      nativeBullets.push(`- **Config file:** \`${cap.configLocation}\``);
    }
    if (cap.mcpTransports?.length) {
      const transports = cap.mcpTransports.map((t) => `\`${t}\``).join(", ");
      nativeBullets.push(`- **Transports:** ${transports}`);
    }
  } else if (ct === "rules" && prov.emitPath) {
    nativeBullets.push(`- **Primary file:** \`${prov.emitPath.replace("{project}/", "")}\``);
  }

  if (cap.frontmatterFields?.length) {
    const fields = cap.frontmatterFields.map((f) => `\`${f}\``).join(", ");
    nativeBullets.push(`- **Native frontmatter fields:** ${fields}`);
  }

  lines.push(...nativeBullets, "");

  // Hooks get the canonical ↔ native event table inside Native Format.
  if (ct === "hooks") {
    if (cap.hookEvents?.length) {
      lines.push(
        "| Canonical Event | Native Name | Category |",
        "|-----------------|-------------|----------|"
      );
      for (const ev of cap.hookEvents) {
        const cat = ev.category ? CATEGORY_DISPLAY[ev.category] || ev.category : "—";
        lines.push(`| \`${ev.canonical}\` | \`${ev.nativeName}\` | ${cat} |`);
      }
      lines.push("");
    } else {
      lines.push(
        `${prov.name} supports hooks, but syllago does not yet map its hook event names. Hook conversion to and from ${prov.name} is best-effort.`,
        ""
      );
    }
  }

  // ----- Mappings to Canonical -----
  const mappings = capEntry?.canonicalMappings;
  if (mappings && Object.keys(mappings).length > 0) {
    lines.push("### Mappings to Canonical", "");
    lines.push(
      `How ${prov.name}'s native ${ctDisplay.toLowerCase()} features map to syllago's canonical keys. See the [capabilities matrix](/reference/capabilities-matrix/) for the full vocabulary.`,
      "",
      "| Canonical Key | Mechanism |",
      "|---------------|-----------|"
    );
    const keys = Object.keys(mappings).sort();
    for (const key of keys) {
      const m = mappings[key];
      if (!m.supported) continue;
      const slug = key.replace(/_/g, "-");
      lines.push(`| [\`${key}\`](/reference/canonical-keys/${slug}/) | ${escapeMdxInline(m.mechanism)} |`);
    }
    lines.push("");
  }

  // ----- Provider-specific details -----
  const extensions = capEntry?.providerExtensions ?? [];
  if (extensions.length > 0) {
    lines.push(`### ${prov.name}-specific ${ctDisplay}`, "");
    lines.push(
      `These are ${prov.name}-specific ${ctDisplay.toLowerCase()} behaviors and configuration options that haven't been mapped to canonical keys yet. When a canonical key covers one of these, the corresponding item graduates there.`,
      "",
      '<dl class="provider-extensions not-content">'
    );
    for (const ext of extensions) {
      const safeName = escapeMdxInline(ext.name);
      const safeDesc = escapeMdxInline(ext.description);
      const nameHtml = ext.source_ref
        ? `<a href="${ext.source_ref}" target="_blank" rel="noopener noreferrer">${safeName}</a>`
        : safeName;
      lines.push(
        '  <div class="provider-extensions__item">',
        `    <dt class="provider-extensions__name">${nameHtml}</dt>`,
        `    <dd class="provider-extensions__description">${safeDesc}</dd>`,
        "  </div>"
      );
    }
    lines.push("</dl>", "");
  }

  return lines;
}

// ---------------------------------------------------------------------------
// MDX generation — Per-provider pages (enriched)
// ---------------------------------------------------------------------------

function generateProviderPage(
  prov: ProviderCapEntry,
  manifest: ProviderManifest,
  capabilitiesData: Map<string, CapDataEntry>
): string {
  // Supported content types, in section order, for the linked overview table.
  const supportedInOrder = CT_SECTION_ORDER.filter(
    (ct) => prov.content[ct]?.supported
  );

  const supportedTypesSummary = supportedInOrder
    .map((ct) => {
      const info = CT_SECTION_INFO[ct];
      const display = CT_DISPLAY[ct] || ct;
      return info ? `[${display}](#${info.slug})` : display;
    })
    .join(", ");

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
    `| **Supported content types** | ${supportedTypesSummary || "—"} |`,
  ];

  if (prov.emitPath) {
    lines.push(
      `| **Emit path** | \`${prov.emitPath.replace("{project}/", "")}\` |`
    );
  }

  lines.push(
    "",
    "## Supported Content Types",
    "",
    "| Content Type | Syllago Install Method | Symlink |",
    "|--------------|------------------------|:-------:|"
  );

  for (const ct of CT_SECTION_ORDER) {
    const cap = prov.content[ct];
    if (!cap?.supported) continue;
    const info = CT_SECTION_INFO[ct];
    const display = CT_DISPLAY[ct] || ct;
    const name = info ? `[${display}](#${info.slug})` : display;
    const method = formatMethod(cap.installMethod);
    const symlink = cap.symlinkSupport ? "Yes" : "No";
    lines.push(`| ${name} | ${method} | ${symlink} |`);
  }

  lines.push("");

  // Per-content-type Conventions sections.
  for (const ct of CT_SECTION_ORDER) {
    const capEntry = capabilitiesData.get(`${prov.slug}-${ct}`);
    const sectionLines = generateContentTypeConventions(ct, prov, capEntry);
    if (sectionLines.length > 0) {
      lines.push(...sectionLines);
    }
  }

  lines.push(
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

  // 2. Generate MDX pages.
  rmSync(MDX_OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(MDX_OUTPUT_DIR, { recursive: true });

  // Load capabilities data for extensions enrichment.
  const capabilitiesData = loadCapabilitiesData();

  const indexContent = generateIndexPage(manifest.providers, manifest);
  writeFileSync(join(MDX_OUTPUT_DIR, "index.mdx"), indexContent);
  console.log("  MDX: index.mdx");

  let count = 0;
  for (const prov of manifest.providers) {
    const content = generateProviderPage(prov, manifest, capabilitiesData);
    writeFileSync(join(MDX_OUTPUT_DIR, `${prov.slug}.mdx`), content);
    count++;
  }

  console.log(`  MDX: ${count} provider pages`);

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

  console.log(`  Total: ${count + 1 + refCount} MDX + ${manifest.providers.length} JSON`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
