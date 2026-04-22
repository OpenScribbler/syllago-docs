#!/usr/bin/env bun
/**
 * lint-cli-refs.ts — Catches stale `syllago <command>` references in docs.
 *
 * Valid commands are derived from the file listing under
 *   src/content/docs/using-syllago/cli-reference/*.mdx
 * which is itself regenerated from upstream commands.json by sync-commands.ts.
 *
 * That cli-reference directory is the docs site's source of truth: any
 * `syllago <word>` mention in another .mdx or .astro file must reference a
 * command that has a documented reference page. Mentions of removed or
 * misspelled commands fail the lint.
 *
 * Exit codes:
 *   0 — no stale references found
 *   1 — at least one stale reference found
 *   2 — internal error (e.g. cli-reference dir missing)
 *
 * Usage:
 *   bun scripts/lint-cli-refs.ts
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname, relative } from "path";

const ROOT_DIR = dirname(import.meta.dir);
const CLI_REF_DIR = join(
  ROOT_DIR,
  "src/content/docs/using-syllago/cli-reference"
);
// .astro files are excluded: their JSX template literals look like inline
// code spans to the regex (e.g., backtick-bounded strings containing
// "How syllago works with..."), which produces false positives. Real
// command references in docs live in .mdx prose and code blocks.
const SCAN_GLOB = "src/**/*.mdx";

// Anchored at the start of the (trimmed) inline span or fenced-block line
// to filter out prose-in-code matches like `# Via syllago command` or
// `Source Provider → syllago format → Target Provider`. Real CLI mentions
// always have `syllago` as the first non-whitespace token.
//
// `[a-z][a-z-]+` requires at least two letters and disallows digits, which
// kills the `syllago v0.9.0` (version label) case. No real syllago command
// today is single-letter or contains digits; if that ever changes, relax
// the second character class.
const COMMAND_RE = /^syllago\s+([a-z][a-z-]+)/;

// Inline code spans bounded by single backticks. Avoids matching backtick
// pairs that span lines (rare in markdown). Multi-backtick spans (``…``)
// are uncommon enough to skip — they'd produce false negatives, not
// false positives, which is the safer failure mode for a lint.
const INLINE_CODE_RE = /`([^`\n]+)`/g;

// Fenced code block delimiter. Triple-backticks open and close; the
// language tag (```bash, ```yaml, etc.) doesn't affect our scanning.
const FENCE_RE = /^\s*```/;

interface Finding {
  file: string;
  line: number;
  col: number;
  command: string;
  context: string;
}

// Valid commands = full filename stems under cli-reference/. The dir
// uses `-` for two purposes: (a) flattening subcommand hierarchies
// (`capmon-check.mdx` for `syllago capmon check`) and (b) commands whose
// name itself contains dashes (`sync-and-export.mdx` for the literal
// `syllago sync-and-export`). Both cases produce a useful entry — the
// regex captures `[a-z][a-z0-9-]*` so it'll match either form.
//
// For grouped subcommands, the parent always has its own page too
// (`capmon.mdx` exists alongside `capmon-check.mdx`), so a `syllago
// capmon` mention finds `capmon` in the set even though we never split.
function loadValidCommands(): Set<string> {
  if (!existsSync(CLI_REF_DIR)) {
    console.error(`Error: cli-reference directory not found at ${CLI_REF_DIR}`);
    process.exit(2);
  }
  const stems = readdirSync(CLI_REF_DIR)
    .filter((f) => f.endsWith(".mdx") && f !== "index.mdx")
    .map((f) => f.replace(/\.mdx$/, ""));
  return new Set(stems);
}

// Only checks `syllago <cmd>` mentions that appear inside code spans —
// inline backticks (`syllago add`) or fenced code blocks (```bash …```).
// Prose mentions like "syllago refuses to fall back" are intentionally
// ignored; they're documentation about the program, not command references.
function lintFile(path: string, valid: Set<string>): Finding[] {
  const text = readFileSync(path, "utf8");
  const lines = text.split("\n");
  const findings: Finding[] = [];
  let inFence = false;

  const pushIfStale = (
    cmd: string,
    lineNum: number,
    col: number,
    context: string
  ) => {
    if (!valid.has(cmd)) {
      findings.push({ file: path, line: lineNum, col, command: cmd, context });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      // Skip comment lines inside code fences. Headings like
      // `# Via syllago command` describe the example in plain English,
      // not a literal invocation. `#` covers shell/yaml; `//` covers
      // js/ts examples.
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
        continue;
      }
      // Whole line is code — match against the trimmed start.
      const m = trimmed.match(COMMAND_RE);
      if (m) {
        pushIfStale(m[1], i + 1, line.indexOf(trimmed) + 1, trimmed);
      }
      continue;
    }

    // Prose line — only scan inline code spans, anchored at span start.
    for (const span of line.matchAll(INLINE_CODE_RE)) {
      const spanText = span[1].trim();
      const m = spanText.match(COMMAND_RE);
      if (m) {
        pushIfStale(
          m[1],
          i + 1,
          (span.index ?? 0) + 1,
          line.trim()
        );
      }
    }
  }
  return findings;
}

async function main(): Promise<void> {
  const valid = loadValidCommands();
  const glob = new Bun.Glob(SCAN_GLOB);
  const files: string[] = [];
  for await (const f of glob.scan({ cwd: ROOT_DIR, absolute: true })) {
    files.push(f);
  }

  const all: Finding[] = [];
  for (const file of files) {
    all.push(...lintFile(file, valid));
  }

  if (all.length === 0) {
    console.log(
      `✓ lint-cli-refs: ${files.length} files scanned, no stale CLI references.`
    );
    return;
  }

  console.error("");
  for (const f of all) {
    const rel = relative(ROOT_DIR, f.file);
    console.error(`${rel}:${f.line}:${f.col}  unknown CLI command 'syllago ${f.command}'`);
    console.error(`  → ${f.context}`);
    console.error("");
  }
  console.error(
    `${all.length} stale CLI reference${all.length === 1 ? "" : "s"} found across ${files.length} file${files.length === 1 ? "" : "s"}.`
  );
  console.error(
    `Valid commands come from ${relative(ROOT_DIR, CLI_REF_DIR)}/*.mdx (${valid.size} commands).`
  );
  console.error(
    `If syllago has added a new command, run 'bun scripts/sync-commands.ts' to regenerate the reference pages.`
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("Internal error:", err);
  process.exit(2);
});
