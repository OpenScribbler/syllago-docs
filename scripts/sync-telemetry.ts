#!/usr/bin/env bun
/**
 * sync-telemetry.ts — Fetches telemetry.json and generates an MDX telemetry reference page.
 *
 * Usage:
 *   bun scripts/sync-telemetry.ts                                # fetch from latest GitHub release
 *   bun scripts/sync-telemetry.ts --local path/to/telemetry.json # use local file
 *   TELEMETRY_JSON_PATH=path/to/telemetry.json bun scripts/sync-telemetry.ts
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { execFileSync } from "child_process";

// ---------------------------------------------------------------------------
// Types (mirrors the Go TelemetryManifest schema)
// ---------------------------------------------------------------------------

interface TelemetryManifest {
  version: string;
  generatedAt: string;
  syllagoVersion: string;
  events: EventDef[];
  standardProperties: PropertyDef[];
  neverCollected: PrivacyEntry[];
}

interface EventDef {
  name: string;
  description: string;
  firedWhen: string;
  properties: PropertyDef[];
}

interface PropertyDef {
  name: string;
  type: string;
  description: string;
  example: unknown;
  commands: string[];
}

interface PrivacyEntry {
  category: string;
  examples: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GITHUB_REPO = "OpenScribbler/syllago";
const OUTPUT_DIR = join(dirname(import.meta.dir), "src/content/docs/reference");
const OUTPUT_FILE = join(OUTPUT_DIR, "telemetry.mdx");
const FETCH_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// GitHub auth (same pattern as sync-commands.ts)
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
// Load telemetry.json
// ---------------------------------------------------------------------------

async function loadManifest(): Promise<TelemetryManifest> {
  const localArgIdx = process.argv.indexOf("--local");
  const localPath =
    localArgIdx !== -1
      ? process.argv[localArgIdx + 1]
      : process.env.TELEMETRY_JSON_PATH;

  if (localPath) {
    if (!existsSync(localPath)) {
      throw new Error(`Local telemetry.json not found: ${localPath}`);
    }
    console.log(`Loading telemetry.json from local file: ${localPath}`);
    return JSON.parse(readFileSync(localPath, "utf-8"));
  }

  console.log(`Fetching telemetry.json from latest ${GITHUB_REPO} release...`);
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
    const asset = release.assets.find((a) => a.name === "telemetry.json");
    if (!asset) {
      throw new Error("telemetry.json not found in latest release assets");
    }

    const jsonRes = await fetch(asset.url, {
      headers: { ...authHeaders, Accept: "application/octet-stream" },
      signal: controller.signal,
    });
    if (!jsonRes.ok) {
      throw new Error(`Failed to fetch telemetry.json: ${jsonRes.status}`);
    }

    return (await jsonRes.json()) as TelemetryManifest;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// MDX generation
// ---------------------------------------------------------------------------

function formatExample(example: unknown): string {
  if (typeof example === "string") return `\`"${example}"\``;
  if (typeof example === "boolean") return `\`${example}\``;
  if (typeof example === "number") return `\`${example}\``;
  return `\`${JSON.stringify(example)}\``;
}

function generateTelemetryPage(manifest: TelemetryManifest): string {
  const lines: string[] = [
    "---",
    "title: Telemetry",
    "description: What syllago collects, how it works, and what it never collects. Full event catalog with every property documented.",
    "---",
    "",
    "{/* AUTO-GENERATED — do not edit. Source: telemetry.json via sync-telemetry.ts */}",
    "",
    "Syllago collects anonymous usage telemetry to understand which commands and features are used. Telemetry is **opt-out** — you can disable it at any time.",
    "",
    "## Opting out",
    "",
    "Any of these methods will disable telemetry:",
    "",
    "```bash",
    "# Via syllago command",
    "syllago telemetry off",
    "",
    "# Via environment variable (respects console.do standard)",
    "export DO_NOT_TRACK=1",
    "```",
    "",
    "## What we collect",
    "",
    "Every event includes these standard properties:",
    "",
    "| Property | Type | Description | Example |",
    "|----------|------|-------------|---------|",
  ];

  for (const prop of manifest.standardProperties) {
    lines.push(
      `| \`${prop.name}\` | \`${prop.type}\` | ${prop.description} | ${formatExample(prop.example)} |`
    );
  }

  lines.push("");

  // Events
  for (const event of manifest.events) {
    lines.push(
      `## \`${event.name}\``,
      "",
      event.description + ".",
      "",
      `**When:** ${event.firedWhen}`,
      "",
      "| Property | Type | Description | Example | Commands |",
      "|----------|------|-------------|---------|----------|"
    );

    for (const prop of event.properties) {
      const cmds =
        prop.commands.length === 1 && prop.commands[0] === "*"
          ? "all"
          : prop.commands.map((c) => `\`${c}\``).join(", ");
      lines.push(
        `| \`${prop.name}\` | \`${prop.type}\` | ${prop.description} | ${formatExample(prop.example)} | ${cmds} |`
      );
    }

    lines.push("");
  }

  // Privacy guarantees
  lines.push(
    "## What we never collect",
    "",
    "These categories of data are **never** included in telemetry events, regardless of configuration:",
    "",
    "| Category | Examples |",
    "|----------|----------|"
  );

  for (const entry of manifest.neverCollected) {
    lines.push(`| **${entry.category}** | ${entry.examples} |`);
  }

  lines.push(
    "",
    "## Implementation",
    "",
    "- Telemetry is sent to PostHog via their batch API",
    "- A random anonymous ID is generated on first run and stored locally",
    "- No cookies, fingerprinting, or cross-device tracking",
    "- All telemetry code is in [`cli/internal/telemetry/`](https://github.com/OpenScribbler/syllago/tree/main/cli/internal/telemetry)",
    "- The event catalog source of truth is [`catalog.go`](https://github.com/OpenScribbler/syllago/blob/main/cli/internal/telemetry/catalog.go)",
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
  let manifest: TelemetryManifest;
  try {
    manifest = await loadManifest();
  } catch (err: any) {
    if (existsSync(OUTPUT_FILE)) {
      console.log(`Sync skipped: ${err.message}`);
      console.log("Using existing telemetry reference file.");
      return;
    }
    throw err;
  }

  console.log(
    `Loaded ${manifest.events.length} events from syllago ${manifest.syllagoVersion}`
  );

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const content = generateTelemetryPage(manifest);
  writeFileSync(OUTPUT_FILE, content);
  console.log(`  Generated: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
