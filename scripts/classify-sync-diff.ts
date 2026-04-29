#!/usr/bin/env bun
/**
 * classify-sync-diff.ts — Classify a `bun run sync` diff as cosmetic vs. material.
 *
 * Used by the scheduled sync workflow (D4 of
 * docs/plans/2026-04-28-scheduled-sync-workflow-design.md) to summarize the
 * tracked changes a regen produced. Cosmetic = pure version-stamp /
 * generatedAt timestamp churn. Material = anything else (real content edits,
 * deletions, renames, additions).
 *
 * Output: JSON to stdout
 *   {
 *     "cosmetic_files": [...],
 *     "material_files": [...],
 *     "tag":             "vX.Y.Z" | null,
 *     "summary_md":      "Cosmetic regen: N files (...).\n\nMaterial:\n- ..."
 *   }
 *
 * Usage:
 *   bun scripts/classify-sync-diff.ts                  # uses git diff (staged, else working tree)
 *   bun scripts/classify-sync-diff.ts --diff-file <p>  # parse a saved diff
 *   bun scripts/classify-sync-diff.ts --repo-root <p>  # override CWD for git invocation
 *
 * Stderr: errors and progress messages.
 * Exit codes: 0 = success (incl. empty diff), 1 = malformed input or git failure.
 */

// Allowlist regexes — a line is "cosmetic" iff it matches at least one.
// Kept narrow on purpose: anything outside this set forces the file material.
const COSMETIC_LINE_PATTERNS: readonly RegExp[] = [
  /Generated from syllago [\d.]+ on \d{4}-\d{2}-\d{2}/,
  /"generatedAt":\s*"\d{4}-\d{2}-\d{2}T[\d:.]+Z?"/,
  /Last updated: \d{4}-\d{2}-\d{2}/,
];

// Pulls the upstream tag out of cosmetic stamp lines. Used for the PR title
// and CHANGELOG header. Best-effort: missing → tag is null, never an error.
const TAG_PATTERN = /syllago[\s:]+v?(\d+\.\d+\.\d+)/i;

type ChangeType = "added" | "modified" | "deleted" | "renamed";

interface FileDiff {
  readonly path: string;
  readonly changeType: ChangeType;
  // Added (+) and removed (-) content lines, excluding diff metadata and
  // hunk headers. Pure-whitespace lines are filtered before classification.
  readonly contentLines: readonly string[];
}

interface ClassifyResult {
  readonly cosmetic_files: readonly string[];
  readonly material_files: readonly string[];
  readonly tag: string | null;
  readonly summary_md: string;
}

// --- diff parsing -----------------------------------------------------------

// Parse unified-diff output (`git diff` / `git diff --staged`) into per-file
// records. Handles added/modified/deleted/renamed. Binary diffs are kept as
// material with no content lines (deletion-style).
function parseDiff(diff: string): FileDiff[] {
  const files: FileDiff[] = [];
  const lines = diff.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.startsWith("diff --git ")) {
      i++;
      continue;
    }

    // diff --git a/<path> b/<path>  — paths can be quoted if they contain spaces;
    // we don't bother with that here (no quoted paths in this repo).
    const headerMatch = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (!headerMatch) {
      i++;
      continue;
    }
    const aPath = headerMatch[1];
    const bPath = headerMatch[2];

    // Walk the metadata lines until we hit the first hunk header (@@) or the
    // next file's diff header (rare for renames-without-changes, deletions
    // with no body, or binary diffs).
    let changeType: ChangeType = "modified";
    let path = bPath;
    const contentLines: string[] = [];
    i++;

    while (i < lines.length && !lines[i].startsWith("diff --git ")) {
      const meta = lines[i];

      if (meta.startsWith("new file mode")) {
        changeType = "added";
      } else if (meta.startsWith("deleted file mode")) {
        changeType = "deleted";
        path = aPath;
      } else if (meta.startsWith("rename from")) {
        changeType = "renamed";
      } else if (meta.startsWith("similarity index")) {
        // also indicates a rename/copy; rename from line will set the type
      } else if (meta.startsWith("@@")) {
        // Hunk body follows. Collect +/- lines, skip ' ' context, stop at
        // the next file header or the next hunk header (handled in loop).
        i++;
        while (
          i < lines.length &&
          !lines[i].startsWith("diff --git ") &&
          !lines[i].startsWith("@@")
        ) {
          const body = lines[i];
          if (body.startsWith("+++") || body.startsWith("---")) {
            // file marker inside hunk shouldn't happen, but guard anyway
            i++;
            continue;
          }
          if (body.startsWith("+") || body.startsWith("-")) {
            contentLines.push(body);
          }
          i++;
        }
        continue;
      } else if (meta.startsWith("Binary files ")) {
        // Binary diffs carry no textual content lines — leave contentLines
        // empty so the classifier treats them as material.
      }
      i++;
    }

    files.push({ path, changeType, contentLines });
  }

  return files;
}

// --- classification ---------------------------------------------------------

function isCosmeticLine(line: string): boolean {
  // Strip the leading +/- diff marker before matching.
  const content = line.slice(1);
  if (content.trim() === "") return true; // pure-whitespace lines don't count
  return COSMETIC_LINE_PATTERNS.some((re) => re.test(content));
}

function classifyFile(file: FileDiff): "cosmetic" | "material" {
  // Structural changes are always material, regardless of stamp content.
  if (file.changeType === "deleted" || file.changeType === "renamed") {
    return "material";
  }
  // No content lines on a non-modify/add (e.g., binary diff) → material.
  // For added/modified files, an empty contentLines means nothing was
  // captured (e.g., parse edge case) — treat as material to err on safe side.
  if (file.contentLines.length === 0) {
    return "material";
  }
  return file.contentLines.every(isCosmeticLine) ? "cosmetic" : "material";
}

function detectTag(files: readonly FileDiff[]): string | null {
  for (const file of files) {
    for (const line of file.contentLines) {
      if (!line.startsWith("+")) continue; // only added lines carry the new tag
      const match = line.match(TAG_PATTERN);
      if (match) {
        return `v${match[1]}`;
      }
    }
  }
  return null;
}

// --- summary ---------------------------------------------------------------

// Walk cosmetic file paths, count by top-level src/ subdirectory, and name
// the top 1-2 buckets. Mirrors the format used in CHANGELOG entries like
// "canonical-keys version stamps, data-quality timestamps".
function shortCosmeticSummary(paths: readonly string[]): string {
  if (paths.length < 2) {
    return "timestamp/version stamp updates";
  }

  const buckets = new Map<string, number>();
  for (const p of paths) {
    const bucket = bucketLabel(p);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  const ranked = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, 2).map(([label]) => label);

  if (top.length === 0) return "timestamp/version stamp updates";
  if (top.length === 1) return `${top[0]} updates`;
  return `${top[0]}, ${top[1]}`;
}

// Map a path to a short bucket name. Buckets are intentionally human-readable
// rather than mechanical: a contributor reading the PR body should recognize
// "canonical-keys version stamps" without cross-referencing the tree.
function bucketLabel(path: string): string {
  if (path.includes("reference/canonical-keys/")) {
    return "canonical-keys version stamps";
  }
  if (path.includes("src/data/data-quality/")) {
    return "data-quality timestamps";
  }
  if (path.includes("src/data/canonical-keys/")) {
    return "canonical-keys data timestamps";
  }
  if (path.includes("src/data/providers/")) {
    return "provider data timestamps";
  }
  if (path.includes("src/data/capabilities/")) {
    return "capabilities data timestamps";
  }
  if (path.match(/reference\/[a-z-]+-matrix\.mdx$/)) {
    return "matrix version stamps";
  }
  if (path.includes("using-syllago/cli-reference/")) {
    return "cli-reference version stamps";
  }
  if (path.includes("src/content/docs/errors/")) {
    return "error reference version stamps";
  }
  return "version stamp updates";
}

function buildSummaryMd(
  cosmeticFiles: readonly string[],
  materialFiles: ReadonlyArray<{ path: string; changeType: ChangeType }>
): string {
  if (cosmeticFiles.length === 0 && materialFiles.length === 0) {
    return "";
  }

  const lines: string[] = [];

  if (cosmeticFiles.length > 0) {
    const summary = shortCosmeticSummary(cosmeticFiles);
    lines.push(
      `Cosmetic regen: ${cosmeticFiles.length} file${cosmeticFiles.length === 1 ? "" : "s"} (${summary}).`
    );
  } else {
    lines.push("Cosmetic regen: 0 files.");
  }

  if (materialFiles.length > 0) {
    lines.push("");
    lines.push("Material:");
    for (const m of materialFiles) {
      lines.push(`- ${m.path} (${m.changeType})`);
    }
  }

  return lines.join("\n");
}

// --- top-level orchestration -----------------------------------------------

function classify(diff: string): ClassifyResult {
  const files = parseDiff(diff);
  const cosmetic: string[] = [];
  const material: { path: string; changeType: ChangeType }[] = [];

  for (const file of files) {
    if (classifyFile(file) === "cosmetic") {
      cosmetic.push(file.path);
    } else {
      material.push({ path: file.path, changeType: file.changeType });
    }
  }

  return {
    cosmetic_files: cosmetic,
    material_files: material.map((m) => m.path),
    tag: detectTag(files),
    summary_md: buildSummaryMd(cosmetic, material),
  };
}

// --- CLI entry --------------------------------------------------------------

interface CliArgs {
  readonly diffFile: string | null;
  readonly repoRoot: string;
}

function parseArgs(argv: readonly string[]): CliArgs {
  let diffFile: string | null = null;
  let repoRoot: string = process.cwd();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--diff-file") {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error("--diff-file requires a path argument");
      }
      diffFile = value;
      i++;
    } else if (arg === "--repo-root") {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error("--repo-root requires a path argument");
      }
      repoRoot = value;
      i++;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { diffFile, repoRoot };
}

async function readDiffFromGit(repoRoot: string): Promise<string> {
  // Prefer staged diff if anything is staged, else fall back to working tree.
  // The sync workflow stages files before classifying, so --staged is the
  // common path; the working-tree fallback is for local development.
  const staged = Bun.spawnSync({
    cmd: ["git", "diff", "--staged"],
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (staged.exitCode !== 0) {
    throw new Error(
      `git diff --staged failed: ${new TextDecoder().decode(staged.stderr)}`
    );
  }
  const stagedOut = new TextDecoder().decode(staged.stdout);
  if (stagedOut.trim() !== "") return stagedOut;

  const tree = Bun.spawnSync({
    cmd: ["git", "diff"],
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (tree.exitCode !== 0) {
    throw new Error(
      `git diff failed: ${new TextDecoder().decode(tree.stderr)}`
    );
  }
  return new TextDecoder().decode(tree.stdout);
}

async function main(): Promise<void> {
  const args = parseArgs(Bun.argv.slice(2));

  let diff: string;
  if (args.diffFile !== null) {
    const file = Bun.file(args.diffFile);
    if (!(await file.exists())) {
      throw new Error(`diff file not found: ${args.diffFile}`);
    }
    diff = await file.text();
  } else {
    diff = await readDiffFromGit(args.repoRoot);
  }

  const result = classify(diff);
  console.log(JSON.stringify(result, null, 2));
}

// Exports for vitest. The CLI entrypoint runs only when invoked directly via
// `bun scripts/classify-sync-diff.ts`, leaving import-only consumers
// (the test file) free to call the helpers without side effects.
export {
  classify,
  parseDiff,
  classifyFile,
  detectTag,
  buildSummaryMd,
  isCosmeticLine,
  COSMETIC_LINE_PATTERNS,
};
export type { ClassifyResult, FileDiff, ChangeType };

if (import.meta.main) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`classify-sync-diff: ${message}`);
    process.exit(1);
  });
}
