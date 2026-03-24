#!/usr/bin/env bun
/**
 * sync-commands.ts — Fetches commands.json and generates MDX pages for CLI reference.
 *
 * Usage:
 *   bun scripts/sync-commands.ts                          # fetch from latest GitHub release
 *   bun scripts/sync-commands.ts --local path/to/commands.json  # use local file
 *   COMMANDS_JSON_PATH=path/to/commands.json bun scripts/sync-commands.ts
 */

import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

// ---------------------------------------------------------------------------
// Types (mirrors the Go CommandManifest schema)
// ---------------------------------------------------------------------------

interface CommandManifest {
  version: string;
  generatedAt: string;
  syllagoVersion: string;
  commands: CommandEntry[];
}

interface CommandEntry {
  name: string;
  displayName: string;
  slug: string;
  parent: string | null;
  synopsis: string;
  description: string;
  longDescription: string | null;
  aliases: string[];
  flags: Flag[];
  inheritedFlags: Flag[];
  subcommands: string[];
  seeAlso: string[];
  examples: string | null;
  source: string;
}

interface Flag {
  name: string;
  shorthand: string | null;
  type: string;
  default: string | null;
  required: boolean;
  description: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GITHUB_REPO = "OpenScribbler/syllago";
const OUTPUT_DIR = join(dirname(import.meta.dir), "src/content/docs/using-syllago/cli-reference");
const FETCH_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// GitHub auth
// ---------------------------------------------------------------------------

/** Get a GitHub token for API access (needed for private repos). */
function getGitHubToken(): string | undefined {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const { execSync } = require("child_process");
    return execSync("gh auth token", { encoding: "utf-8" }).trim();
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Load commands.json
// ---------------------------------------------------------------------------

async function loadManifest(): Promise<CommandManifest> {
  // Check CLI args first
  const localArgIdx = process.argv.indexOf("--local");
  const localPath = localArgIdx !== -1
    ? process.argv[localArgIdx + 1]
    : process.env.COMMANDS_JSON_PATH;

  if (localPath) {
    if (!existsSync(localPath)) {
      throw new Error(`Local commands.json not found: ${localPath}`);
    }
    console.log(`Loading commands.json from local file: ${localPath}`);
    return JSON.parse(readFileSync(localPath, "utf-8"));
  }

  // Fetch from GitHub releases API.
  // Requires auth for private repos: GITHUB_TOKEN env var or `gh auth token`.
  console.log(`Fetching commands.json from latest ${GITHUB_REPO} release...`);
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
      throw new Error(`GitHub API returned ${releaseRes.status}: ${await releaseRes.text()}`);
    }

    const release = (await releaseRes.json()) as { assets: { name: string; url: string }[] };
    const asset = release.assets.find((a) => a.name === "commands.json");
    if (!asset) {
      throw new Error("commands.json not found in latest release assets");
    }

    // Use the API URL with Accept header to get the raw asset (works for private repos)
    const jsonRes = await fetch(asset.url, {
      headers: { ...authHeaders, Accept: "application/octet-stream" },
      signal: controller.signal,
    });
    if (!jsonRes.ok) {
      throw new Error(`Failed to fetch commands.json: ${jsonRes.status}`);
    }

    return (await jsonRes.json()) as CommandManifest;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// MDX generation
// ---------------------------------------------------------------------------

function escapeForMdx(text: string): string {
  // Escape characters that MDX interprets as JSX: { } < >
  return text
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Format a long description for MDX. Cobra uses tab-indented lines for
 * code examples in help text. We convert those to fenced code blocks
 * so MDX doesn't try to parse shell syntax as JSX.
 */
function formatLongDescription(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isIndented = line.startsWith("\t") || line.startsWith("    ");

    if (isIndented && !inCodeBlock) {
      // Start a code block
      result.push("```bash");
      inCodeBlock = true;
      result.push(line.replace(/^\t/, "").replace(/^    /, ""));
    } else if (!isIndented && inCodeBlock) {
      // End the code block
      result.push("```");
      inCodeBlock = false;
      result.push(escapeForMdx(line));
    } else if (inCodeBlock) {
      result.push(line.replace(/^\t/, "").replace(/^    /, ""));
    } else {
      result.push(escapeForMdx(line));
    }
  }

  if (inCodeBlock) {
    result.push("```");
  }

  return result.join("\n");
}

function generateFlagsTable(flags: Flag[], heading: string): string {
  if (flags.length === 0) return "";

  const rows = flags.map((f) => {
    const nameCol = f.shorthand ? `\`${f.shorthand}\`, \`${f.name}\`` : `\`${f.name}\``;
    const defaultCol = f.default ? `\`${f.default}\`` : "—";
    const reqCol = f.required ? "Yes" : "No";
    const desc = escapeForMdx(f.description);
    return `| ${nameCol} | \`${f.type}\` | ${defaultCol} | ${reqCol} | ${desc} |`;
  });

  return `## ${heading}

| Flag | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
${rows.join("\n")}`;
}

function generateLeafPage(cmd: CommandEntry): string {
  const sections: string[] = [];

  // Synopsis
  sections.push(`## Synopsis

\`\`\`
${cmd.synopsis}
\`\`\``);

  // Description
  if (cmd.longDescription) {
    sections.push(`## Description

${formatLongDescription(cmd.longDescription)}`);
  }

  // Aliases
  if (cmd.aliases.length > 0) {
    sections.push(`## Aliases

${cmd.aliases.map((a) => `\`${a}\``).join(", ")}`);
  }

  // Flags
  const flagsTable = generateFlagsTable(cmd.flags, "Options");
  if (flagsTable) sections.push(flagsTable);

  // Inherited flags
  const inheritedTable = generateFlagsTable(cmd.inheritedFlags, "Global Options");
  if (inheritedTable) sections.push(inheritedTable);

  // Examples
  if (cmd.examples) {
    sections.push(`## Examples

\`\`\`bash
${cmd.examples}
\`\`\``);
  }

  // See also
  if (cmd.seeAlso.length > 0) {
    const links = cmd.seeAlso.map((name) => {
      const slug = name.replace(/ /g, "-");
      return `- [syllago ${name}](/using-syllago/cli-reference/${slug}/)`;
    });
    sections.push(`## See Also

${links.join("\n")}`);
  }

  // Source link
  sections.push(`---

<small>[Source](https://github.com/${GITHUB_REPO}/blob/main/${cmd.source})</small>`);

  return sections.join("\n\n");
}

function generateParentPage(cmd: CommandEntry, allCommands: CommandEntry[]): string {
  const sections: string[] = [];

  // Description
  if (cmd.longDescription) {
    sections.push(formatLongDescription(cmd.longDescription));
  }

  // Subcommands table
  if (cmd.subcommands.length > 0) {
    const rows = cmd.subcommands.map((subName) => {
      const subCmd = allCommands.find(
        (c) => c.parent === cmd.name && c.name.endsWith(subName)
      );
      const fullSlug = `${cmd.slug}-${subName}`;
      const desc = subCmd ? escapeForMdx(subCmd.description) : "";
      return `| [\`${subName}\`](/using-syllago/cli-reference/${fullSlug}/) | ${desc} |`;
    });

    sections.push(`## Subcommands

| Command | Description |
|---------|-------------|
${rows.join("\n")}`);
  }

  // Flags (parent commands can have their own flags)
  const flagsTable = generateFlagsTable(cmd.flags, "Options");
  if (flagsTable) sections.push(flagsTable);

  // Inherited flags
  const inheritedTable = generateFlagsTable(cmd.inheritedFlags, "Global Options");
  if (inheritedTable) sections.push(inheritedTable);

  // Source link
  sections.push(`---

<small>[Source](https://github.com/${GITHUB_REPO}/blob/main/${cmd.source})</small>`);

  return sections.join("\n\n");
}

function generateCommandMdx(cmd: CommandEntry, allCommands: CommandEntry[]): string {
  const isParent = cmd.subcommands.length > 0;
  const body = isParent
    ? generateParentPage(cmd, allCommands)
    : generateLeafPage(cmd);

  return `---
title: "syllago ${cmd.name}"
description: "${cmd.description.replace(/"/g, '\\"')}"
---

${body}
`;
}

// ---------------------------------------------------------------------------
// Index page generation
// ---------------------------------------------------------------------------

/** Group labels for parent commands. Top-level commands without children go to "Core Commands". */
function generateIndexPage(commands: CommandEntry[], manifest: CommandManifest): string {
  // Build groups:
  // 1. Commands with parent=null and no subcommands → "Core Commands"
  // 2. Commands with parent=null and subcommands → their own group
  // 3. Skip commands with parent (they're listed under their parent group)

  interface Group {
    label: string;
    slug: string | null; // null for "Core Commands" pseudo-group
    description: string | null;
    items: { name: string; slug: string; description: string }[];
  }

  const groups: Group[] = [];
  const coreItems: Group["items"] = [];

  for (const cmd of commands) {
    if (cmd.parent !== null) continue; // handled under parent groups

    if (cmd.subcommands.length > 0) {
      // Parent command → own group with children as items
      const children = commands
        .filter((c) => c.parent === cmd.name)
        .map((c) => ({
          name: `syllago ${c.name}`,
          slug: c.slug,
          description: c.description,
        }));

      groups.push({
        label: cmd.displayName,
        slug: cmd.slug,
        description: cmd.description,
        items: children,
      });
    } else {
      // Top-level leaf → "Core Commands"
      coreItems.push({
        name: `syllago ${cmd.name}`,
        slug: cmd.slug,
        description: cmd.description,
      });
    }
  }

  // Core Commands first, then parent groups alphabetically
  const allGroups: Group[] = [];
  if (coreItems.length > 0) {
    allGroups.push({
      label: "Core Commands",
      slug: null,
      description: null,
      items: coreItems,
    });
  }
  allGroups.push(...groups.sort((a, b) => a.label.localeCompare(b.label)));

  // Render
  const sections = allGroups.map((group) => {
    const rows = group.items.map(
      (item) =>
        `| [\`${item.name}\`](/using-syllago/cli-reference/${item.slug}/) | ${escapeForMdx(item.description)} |`
    );

    const heading = group.slug
      ? `[\`syllago ${group.slug}\`](/using-syllago/cli-reference/${group.slug}/)`
      : group.label;

    return `### ${heading}

${group.description ? escapeForMdx(group.description) + "\n\n" : ""}| Command | Description |
|---------|-------------|
${rows.join("\n")}`;
  });

  return `---
title: CLI Reference
description: Complete reference for all syllago commands and flags.
---

Auto-generated from syllago ${manifest.syllagoVersion} on ${manifest.generatedAt.split("T")[0]}.

${sections.join("\n\n")}
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let manifest: CommandManifest;
  try {
    manifest = await loadManifest();
  } catch (err: any) {
    // If no source is available, skip gracefully.
    // This allows CI to work with committed MDX files before
    // a syllago release with commands.json exists.
    if (existsSync(join(OUTPUT_DIR, "index.mdx"))) {
      console.log(`Sync skipped: ${err.message}`);
      console.log("Using existing CLI reference files.");
      return;
    }
    throw err;
  }

  console.log(
    `Loaded ${manifest.commands.length} commands from syllago ${manifest.syllagoVersion}`
  );

  // Wipe output directory
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate index
  const indexContent = generateIndexPage(manifest.commands, manifest);
  writeFileSync(join(OUTPUT_DIR, "index.mdx"), indexContent);
  console.log("  Generated: index.mdx");

  // Generate per-command pages
  let count = 0;
  for (const cmd of manifest.commands) {
    const content = generateCommandMdx(cmd, manifest.commands);
    const filePath = join(OUTPUT_DIR, `${cmd.slug}.mdx`);

    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
    count++;
  }

  console.log(`  Generated: ${count} command pages`);
  console.log(`  Total: ${count + 1} files in ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
