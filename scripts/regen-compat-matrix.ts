#!/usr/bin/env bun
/**
 * regen-compat-matrix.ts — Regenerate only the Provider Compatibility Matrix
 * block in content-types/index.mdx from the per-provider JSON files under
 * src/data/providers/. Intended for local verification of the codegen pattern
 * without re-running the full provider sync (which fetches providers.json
 * from GitHub and rewrites MDX pages).
 *
 * The steady-state path is `bun scripts/sync-providers.ts`, which calls the
 * same writeCompatMatrixBlock helper. This script exists so a doc contributor
 * can regenerate the matrix from existing data after editing provider JSON
 * by hand, without needing network access or a full sync.
 *
 * Usage:
 *   bun scripts/regen-compat-matrix.ts
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const ROOT_DIR = dirname(import.meta.dir);
const DATA_DIR = join(ROOT_DIR, "src/data/providers");
const COMPAT_MATRIX_PATH = join(
  ROOT_DIR,
  "src/content/docs/using-syllago/content-types/index.mdx"
);

// Loadouts are intentionally excluded: they're a syllago-specific bundling
// concept, not an upstream provider content type.
const COMPAT_MATRIX_CT_ORDER = [
  "rules",
  "skills",
  "agents",
  "mcp",
  "hooks",
  "commands",
];
const COMPAT_MATRIX_START_MARKER = "{/* AUTO-GENERATED:COMPAT-MATRIX START";
const COMPAT_MATRIX_END_MARKER = "{/* AUTO-GENERATED:COMPAT-MATRIX END */}";
const COMPAT_MATRIX_SHORT: Record<string, string> = {
  "claude-code": "Claude",
  "gemini-cli": "Gemini",
  "copilot-cli": "Copilot",
  "factory-droid": "Factory",
  "roo-code": "Roo",
};
const CT_DISPLAY: Record<string, string> = {
  rules: "Rules",
  hooks: "Hooks",
  mcp: "MCP Configs",
  skills: "Skills",
  agents: "Agents",
  commands: "Commands",
};

interface ProviderData {
  slug: string;
  name: string;
  content: Record<string, { supported?: boolean }>;
}

function loadProviders(): ProviderData[] {
  const files = readdirSync(DATA_DIR).filter(
    (f) => f.endsWith(".json") && f !== "manifest.json"
  );
  return files.map((f) => JSON.parse(readFileSync(join(DATA_DIR, f), "utf-8")));
}

function label(p: ProviderData): string {
  return COMPAT_MATRIX_SHORT[p.slug] ?? p.name.split(" ")[0];
}

function generate(providers: ProviderData[]): string {
  const sorted = [...providers].sort((a, b) => a.name.localeCompare(b.name));
  const headers = sorted.map(label);
  const lines: string[] = [
    `${COMPAT_MATRIX_START_MARKER} — managed by scripts/sync-providers.ts. Do not edit by hand. */}`,
    `| Content Type | ${headers.join(" | ")} |`,
    `|${"---|".repeat(headers.length + 1)}`,
  ];
  for (const ct of COMPAT_MATRIX_CT_ORDER) {
    const cells = sorted.map((p) => (p.content[ct]?.supported ? "✅" : "—"));
    lines.push(`| ${CT_DISPLAY[ct] ?? ct} | ${cells.join(" | ")} |`);
  }
  lines.push(COMPAT_MATRIX_END_MARKER);
  return lines.join("\n");
}

function main(): void {
  if (!existsSync(COMPAT_MATRIX_PATH)) {
    throw new Error(`Not found: ${COMPAT_MATRIX_PATH}`);
  }
  const providers = loadProviders();
  console.log(`Loaded ${providers.length} providers from ${DATA_DIR}`);

  const current = readFileSync(COMPAT_MATRIX_PATH, "utf-8");
  const startIdx = current.indexOf(COMPAT_MATRIX_START_MARKER);
  const endIdx = current.indexOf(COMPAT_MATRIX_END_MARKER);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(
      "content-types/index.mdx is missing AUTO-GENERATED:COMPAT-MATRIX markers."
    );
  }
  const lineStart = current.lastIndexOf("\n", startIdx) + 1;
  const lineEnd = current.indexOf("\n", endIdx + COMPAT_MATRIX_END_MARKER.length);
  if (lineEnd === -1) throw new Error("END marker has no trailing newline");

  const block = generate(providers);
  const updated = current.slice(0, lineStart) + block + current.slice(lineEnd);
  if (updated === current) {
    console.log("Compat matrix: no changes");
    return;
  }
  writeFileSync(COMPAT_MATRIX_PATH, updated);
  console.log("Compat matrix: regenerated");
}

main();
