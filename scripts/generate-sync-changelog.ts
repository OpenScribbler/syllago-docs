#!/usr/bin/env bun
/**
 * generate-sync-changelog.ts — Insert a `### Synced (syllago vX.Y.Z)` block
 * into CHANGELOG.md based on a classification JSON produced by
 * scripts/classify-sync-diff.ts.
 *
 * Used by the scheduled-sync workflow (D8 in
 * docs/plans/2026-04-28-scheduled-sync-workflow-design.md). The repo's
 * hookify rule blocks commits that touch src/content/docs/ without a
 * CHANGELOG entry, so the sync bot must produce a valid entry or the commit
 * fails.
 *
 * Usage:
 *   bun scripts/generate-sync-changelog.ts \
 *     --classification <path> [--tag <vX.Y.Z>] [--changelog <path>] [--dry-run]
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- bun runtime check */

import { existsSync, readFileSync, writeFileSync } from "fs";

// ---------------------------------------------------------------------------
// Types

export interface Classification {
  cosmetic_files: string[];
  material_files: string[];
  tag: string | null;
  summary_md: string;
}

export interface CliArgs {
  classification: string;
  tag: string | null;
  changelog: string;
  dryRun: boolean;
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)

/**
 * Parse positional + named CLI args. Returns null if --classification is
 * missing or argv is malformed; the caller decides how to error.
 */
export function parseArgs(argv: readonly string[]): CliArgs | null {
  let classification: string | null = null;
  let tag: string | null = null;
  let changelog = "CHANGELOG.md";
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--classification") {
      classification = argv[i + 1] ?? null;
      i++;
    } else if (a === "--tag") {
      tag = argv[i + 1] ?? null;
      i++;
    } else if (a === "--changelog") {
      changelog = argv[i + 1] ?? changelog;
      i++;
    } else if (a === "--dry-run") {
      dryRun = true;
    }
  }

  if (!classification) return null;
  return { classification, tag, changelog, dryRun };
}

/**
 * Normalise a syllago tag to the `vX.Y.Z` form. Accepts `0.10.3` or
 * `v0.10.3` and returns `v0.10.3`. Empty / null inputs return null.
 */
export function normalizeTag(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

/**
 * Group cosmetic files by top-level "category" and produce a short human
 * summary that mirrors the wording in the 2026-04-28 CHANGELOG entry
 * ("canonical-keys version stamps, data-quality timestamps").
 *
 * Categories (in priority order):
 *   - canonical-keys version stamps    (src/content/docs/reference/canonical-keys/)
 *   - data-quality timestamps          (src/data/data-quality/)
 *   - reference page version stamps    (src/content/docs/reference/, excluding canonical-keys)
 *   - sidebar regen                    (src/generated/cli-sidebar.json, sidebar managed blocks)
 *   - everything else                  → name the parent dir
 *
 * Re-derived independently from the classifier (per task spec).
 */
export function summarizeCosmetic(files: readonly string[]): string {
  if (files.length === 0) return "no cosmetic changes";

  const buckets = {
    canonicalKeys: 0,
    dataQuality: 0,
    referenceOther: 0,
    sidebar: 0,
    other: 0,
  };
  const otherDirs = new Set<string>();

  for (const f of files) {
    if (f.startsWith("src/content/docs/reference/canonical-keys/")) {
      buckets.canonicalKeys++;
    } else if (f.startsWith("src/data/data-quality/")) {
      buckets.dataQuality++;
    } else if (f.startsWith("src/content/docs/reference/")) {
      buckets.referenceOther++;
    } else if (
      f === "src/generated/cli-sidebar.json" ||
      f.endsWith("/sidebar.ts")
    ) {
      buckets.sidebar++;
    } else {
      buckets.other++;
      const parent = f.split("/").slice(0, -1).join("/") || f;
      otherDirs.add(parent);
    }
  }

  const parts: { count: number; label: string }[] = [];
  if (buckets.canonicalKeys > 0)
    parts.push({ count: buckets.canonicalKeys, label: "canonical-keys version stamps" });
  if (buckets.dataQuality > 0)
    parts.push({ count: buckets.dataQuality, label: "data-quality timestamps" });
  if (buckets.referenceOther > 0)
    parts.push({ count: buckets.referenceOther, label: "reference page version stamps" });
  if (buckets.sidebar > 0)
    parts.push({ count: buckets.sidebar, label: "sidebar regen" });
  if (buckets.other > 0) {
    if (otherDirs.size === 1) {
      parts.push({ count: buckets.other, label: `${[...otherDirs][0]} updates` });
    } else {
      parts.push({ count: buckets.other, label: "miscellaneous updates" });
    }
  }

  // Take the top 1-2 categories by count (stable order: insertion order on tie).
  parts.sort((a, b) => b.count - a.count);
  const top = parts.slice(0, 2);
  return top.map((p) => p.label).join(", ");
}

/**
 * Build the `### Synced (syllago vX.Y.Z)` block. Returns null if both file
 * lists are empty (defensive — workflow shouldn't call us in that case).
 */
export function renderSyncedBlock(
  classification: Classification,
  tag: string
): string | null {
  const { cosmetic_files, material_files } = classification;
  if (cosmetic_files.length === 0 && material_files.length === 0) {
    return null;
  }
  const lines: string[] = [`### Synced (syllago ${tag})`];
  if (cosmetic_files.length > 0) {
    const summary = summarizeCosmetic(cosmetic_files);
    lines.push(
      `- Cosmetic regen: ${cosmetic_files.length} files (${summary}).`
    );
  }
  if (material_files.length > 0) {
    lines.push(`- Material: ${material_files.join(", ")}`);
  }
  return lines.join("\n");
}

/**
 * Find the index of the first `## YYYY-MM-DD` heading in a CHANGELOG body.
 * Returns -1 if none. Uses split-on-newline to keep offsets simple.
 */
function findFirstDatedHeadingLine(lines: readonly string[]): number {
  const re = /^## (\d{4}-\d{2}-\d{2})\b/;
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i] ?? "")) return i;
  }
  return -1;
}

/**
 * Extract the date string (YYYY-MM-DD) from a `## YYYY-MM-DD ...` heading.
 * Returns null if the line doesn't match.
 */
function dateFromHeading(line: string | undefined): string | null {
  if (!line) return null;
  const m = line.match(/^## (\d{4}-\d{2}-\d{2})\b/);
  return m ? (m[1] ?? null) : null;
}

/**
 * Insert a `### Synced` block into CHANGELOG content. Pure function: takes
 * the current content + block + today's date, returns the new content.
 *
 * Cases:
 *   A. First dated heading == today → insert block right under that heading
 *      (above any existing ### subsections).
 *   B. First dated heading exists but != today → prepend `## <today>\n\n<block>`
 *      above that heading.
 *   C. No dated heading → insert section after the title block.
 */
export function insertBlock(
  current: string,
  block: string,
  today: string
): string {
  // Normalise to LF for processing; preserve a trailing newline if the file
  // had one, otherwise leave as-is.
  const lines = current.split("\n");
  const firstDateIdx = findFirstDatedHeadingLine(lines);

  if (firstDateIdx === -1) {
    return insertNewSectionAfterTitle(lines, block, today);
  }

  const headingDate = dateFromHeading(lines[firstDateIdx]);
  if (headingDate === today) {
    return insertUnderExistingDate(lines, block, firstDateIdx);
  }
  return insertNewSectionBeforeIdx(lines, block, today, firstDateIdx);
}

/**
 * Case A — heading for today already exists. Insert the block immediately
 * after the heading + a blank line, above any existing `### …` subsections.
 *
 * Layout produced under heading:
 *   ## 2026-04-29
 *
 *   <block>            ← inserted
 *
 *   ### <existing>     ← was here
 */
function insertUnderExistingDate(
  lines: readonly string[],
  block: string,
  headingIdx: number
): string {
  // Skip the heading itself + any blank lines that follow it.
  let cursor = headingIdx + 1;
  while (cursor < lines.length && (lines[cursor] ?? "").trim() === "") {
    cursor++;
  }
  // cursor now points to the first content line under the heading. Insert
  // the block + a blank line *before* that line.
  const before = lines.slice(0, cursor);
  const after = lines.slice(cursor);
  // Ensure exactly one blank line precedes the block.
  const trimmedBefore = trimTrailingBlanks(before);
  const newLines = [
    ...trimmedBefore,
    "",
    ...block.split("\n"),
    "",
    ...after,
  ];
  return newLines.join("\n");
}

/**
 * Case B — newest heading is older than today. Prepend a fresh
 * `## <today>` section above it.
 */
function insertNewSectionBeforeIdx(
  lines: readonly string[],
  block: string,
  today: string,
  beforeIdx: number
): string {
  const before = trimTrailingBlanks(lines.slice(0, beforeIdx));
  const after = lines.slice(beforeIdx);
  const newLines = [
    ...before,
    "",
    `## ${today}`,
    "",
    ...block.split("\n"),
    "",
    ...after,
  ];
  return newLines.join("\n");
}

/**
 * Case C — no dated heading at all. Insert after the title block (the first
 * `# ...` heading + any prose lines until a blank line, or just the file
 * head if the title is the only line).
 */
function insertNewSectionAfterTitle(
  lines: readonly string[],
  block: string,
  today: string
): string {
  // Find the first H1 heading.
  let titleIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^#\s/.test(lines[i] ?? "")) {
      titleIdx = i;
      break;
    }
  }

  if (titleIdx === -1) {
    // No title at all — just prepend.
    return [
      `## ${today}`,
      "",
      ...block.split("\n"),
      "",
      ...lines,
    ].join("\n");
  }

  // Skip the title line, then any contiguous non-blank lines (the title's
  // intro paragraph), then any blank lines.
  let cursor = titleIdx + 1;
  while (cursor < lines.length && (lines[cursor] ?? "").trim() !== "") {
    cursor++;
  }
  while (cursor < lines.length && (lines[cursor] ?? "").trim() === "") {
    cursor++;
  }

  const before = trimTrailingBlanks(lines.slice(0, cursor));
  const after = lines.slice(cursor);
  return [
    ...before,
    "",
    `## ${today}`,
    "",
    ...block.split("\n"),
    "",
    ...after,
  ].join("\n");
}

function trimTrailingBlanks(lines: readonly string[]): string[] {
  const out = [...lines];
  while (out.length > 0 && (out[out.length - 1] ?? "").trim() === "") {
    out.pop();
  }
  return out;
}

// ---------------------------------------------------------------------------
// I/O entry point

interface RunOptions {
  args: CliArgs;
  today?: string; // injectable for tests
}

interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function run(opts: RunOptions): RunResult {
  const { args } = opts;
  const today = opts.today ?? new Date().toISOString().slice(0, 10);

  if (!existsSync(args.classification)) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `classification file not found: ${args.classification}\n`,
    };
  }

  let classification: Classification;
  try {
    const raw = readFileSync(args.classification, "utf-8");
    classification = JSON.parse(raw) as Classification;
  } catch (err) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `failed to parse classification JSON: ${(err as Error).message}\n`,
    };
  }

  const tag =
    normalizeTag(args.tag) ?? normalizeTag(classification.tag ?? null);
  if (!tag) {
    return {
      exitCode: 1,
      stdout: "",
      stderr:
        "no tag provided: pass --tag vX.Y.Z or include `tag` in the classification JSON\n",
    };
  }

  const block = renderSyncedBlock(classification, tag);
  if (block === null) {
    return {
      exitCode: 0,
      stdout: "no changes to record (empty cosmetic + material lists)\n",
      stderr: "",
    };
  }

  if (!existsSync(args.changelog)) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `CHANGELOG file not found: ${args.changelog}\n`,
    };
  }
  const current = readFileSync(args.changelog, "utf-8");
  const updated = insertBlock(current, block, today);

  if (args.dryRun) {
    return { exitCode: 0, stdout: updated, stderr: "" };
  }

  writeFileSync(args.changelog, updated);
  return {
    exitCode: 0,
    stdout: `wrote sync entry for syllago ${tag} to ${args.changelog}\n`,
    stderr: "",
  };
}

// ---------------------------------------------------------------------------
// CLI entry

function isMain(): boolean {
  // Bun: `import.meta.main` is true when this file is the entry point.
  // The cast keeps TS strict-mode happy without a `bun-types` import.
  const meta = import.meta as unknown as { main?: boolean };
  return meta.main === true;
}

if (isMain()) {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  if (!args) {
    process.stderr.write(
      "usage: bun scripts/generate-sync-changelog.ts " +
        "--classification <path> [--tag vX.Y.Z] [--changelog <path>] [--dry-run]\n"
    );
    process.exit(1);
  }
  const result = run({ args });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.exitCode);
}
