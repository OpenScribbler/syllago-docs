#!/usr/bin/env bun
/**
 * regen-hooks-events.ts — Regenerate the Canonical Event summary block in
 * content-types/hooks.mdx from the per-provider JSON files under
 * src/data/providers/. Local-only counterpart to the writeHooksEventsBlock
 * step inside sync-providers.ts — useful when editing provider JSON by hand
 * without network access.
 *
 * Usage:
 *   bun scripts/regen-hooks-events.ts
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const ROOT_DIR = dirname(import.meta.dir);
const DATA_DIR = join(ROOT_DIR, "src/data/providers");
const HOOKS_MDX_PATH = join(
  ROOT_DIR,
  "src/content/docs/using-syllago/content-types/hooks.mdx"
);

const HOOKS_EVENTS_START_MARKER = "{/* AUTO-GENERATED:HOOKS-EVENTS START";
const HOOKS_EVENTS_END_MARKER = "{/* AUTO-GENERATED:HOOKS-EVENTS END */}";
const FEATURED_SLUGS = ["claude-code", "gemini-cli"];

interface HookEventInfo {
  canonical: string;
  nativeName: string;
  category?: string;
}

interface ProviderData {
  slug: string;
  name: string;
  content: {
    hooks?: {
      supported?: boolean;
      hookEvents?: HookEventInfo[];
    };
  };
}

function loadProviders(): ProviderData[] {
  const files = readdirSync(DATA_DIR).filter(
    (f) => f.endsWith(".json") && f !== "manifest.json"
  );
  return files.map((f) => JSON.parse(readFileSync(join(DATA_DIR, f), "utf-8")));
}

function generate(providers: ProviderData[]): string {
  const featured = FEATURED_SLUGS.map((slug) => {
    const p = providers.find((x) => x.slug === slug);
    if (!p) throw new Error(`Missing provider: ${slug}`);
    return p;
  });

  const eventMaps = featured.map((p) => {
    const m = new Map<string, string>();
    for (const ev of p.content.hooks?.hookEvents ?? []) {
      m.set(ev.canonical, ev.nativeName);
    }
    return m;
  });

  const shared = [...eventMaps[0].keys()]
    .filter((canonical) => eventMaps.every((m) => m.has(canonical)))
    .sort();

  const headers = featured.map((p) => p.name);
  const lines: string[] = [
    `${HOOKS_EVENTS_START_MARKER} — managed by scripts/sync-providers.ts. Do not edit by hand. */}`,
    `| Canonical Event | ${headers.join(" | ")} |`,
    `|${"---|".repeat(headers.length + 1)}`,
  ];
  for (const canonical of shared) {
    const cells = eventMaps.map((m) => `\`${m.get(canonical)}\``);
    lines.push(`| \`${canonical}\` | ${cells.join(" | ")} |`);
  }
  lines.push(HOOKS_EVENTS_END_MARKER);
  return lines.join("\n");
}

function main(): void {
  if (!existsSync(HOOKS_MDX_PATH)) {
    throw new Error(`Not found: ${HOOKS_MDX_PATH}`);
  }
  const providers = loadProviders();
  console.log(`Loaded ${providers.length} providers from ${DATA_DIR}`);

  const current = readFileSync(HOOKS_MDX_PATH, "utf-8");
  const startIdx = current.indexOf(HOOKS_EVENTS_START_MARKER);
  const endIdx = current.indexOf(HOOKS_EVENTS_END_MARKER);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(
      "hooks.mdx is missing AUTO-GENERATED:HOOKS-EVENTS markers."
    );
  }
  const lineStart = current.lastIndexOf("\n", startIdx) + 1;
  const lineEnd = current.indexOf("\n", endIdx + HOOKS_EVENTS_END_MARKER.length);
  if (lineEnd === -1) throw new Error("END marker has no trailing newline");

  const block = generate(providers);
  const updated = current.slice(0, lineStart) + block + current.slice(lineEnd);
  if (updated === current) {
    console.log("Hooks events summary: no changes");
    return;
  }
  writeFileSync(HOOKS_MDX_PATH, updated);
  console.log("Hooks events summary: regenerated");
}

main();
