#!/usr/bin/env bun
/**
 * sync-errors.ts — Generates MDX error reference pages from syllago source.
 *
 * Reads error doc markdown files from cli/internal/errordocs/docs/ and error
 * code constants from cli/internal/output/errors.go in the syllago repo,
 * then generates Starlight-compatible MDX pages in src/content/docs/errors/.
 *
 * Usage:
 *   bun scripts/sync-errors.ts                              # fetch from GitHub API
 *   bun scripts/sync-errors.ts --local ~/src/syllago        # use local checkout
 *   SYLLAGO_REPO_PATH=~/src/syllago bun scripts/sync-errors.ts
 */

import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
import { execFileSync } from "child_process";
import { join, dirname, basename } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GITHUB_REPO = "OpenScribbler/syllago";
const ERRORS_GO_PATH = "cli/internal/output/errors.go";
const ERRORDOCS_DIR = "cli/internal/errordocs/docs";
const OUTPUT_DIR = join(dirname(import.meta.dir), "src/content/docs/errors");
const FETCH_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErrorCodeInfo {
  code: string;      // e.g. "CATALOG_001"
  slug: string;      // e.g. "catalog-001"
  constName: string; // e.g. "ErrCatalogNotFound"
  humanName: string; // e.g. "Catalog Not Found"
  comment: string;   // e.g. "no syllago repo or library found"
  category: string;  // e.g. "Catalog"
}

interface ErrorDoc {
  slug: string;
  content: string;
}

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

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  const token = getGitHubToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ---------------------------------------------------------------------------
// Parse errors.go for code → metadata mapping
// ---------------------------------------------------------------------------

function parseErrorsGo(source: string): Map<string, ErrorCodeInfo> {
  const map = new Map<string, ErrorCodeInfo>();

  // Match lines like:  ErrCatalogNotFound   = "CATALOG_001" // no syllago repo or library found
  const pattern = /^\s*(Err\w+)\s*=\s*"([A-Z]+_\d+)"\s*\/\/\s*(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    const [, constName, code, comment] = match;
    const slug = code.toLowerCase().replace(/_/g, "-");
    const humanName = splitCamelCase(constName.replace(/^Err/, ""));
    const category = humanName.split(" ")[0];

    map.set(slug, { code, slug, constName, humanName, comment: comment.trim(), category });
  }

  return map;
}

/** Split camelCase into words: "CatalogNotFound" → "Catalog Not Found" */
function splitCamelCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")      // camelCase boundary
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2") // consecutive caps → word
    .trim();
}

// ---------------------------------------------------------------------------
// Load sources — local or remote
// ---------------------------------------------------------------------------

async function loadLocal(repoPath: string): Promise<{ errorsGo: string; docs: ErrorDoc[] }> {
  const errorsGoPath = join(repoPath, ERRORS_GO_PATH);
  const docsDir = join(repoPath, ERRORDOCS_DIR);

  if (!existsSync(errorsGoPath)) {
    throw new Error(`errors.go not found at ${errorsGoPath}`);
  }
  if (!existsSync(docsDir)) {
    throw new Error(`Error docs directory not found at ${docsDir}`);
  }

  const errorsGo = readFileSync(errorsGoPath, "utf-8");
  const docs: ErrorDoc[] = readdirSync(docsDir)
    .filter((f) => f.endsWith(".md") && f !== ".gitkeep")
    .map((f) => ({
      slug: basename(f, ".md"),
      content: readFileSync(join(docsDir, f), "utf-8"),
    }));

  return { errorsGo, docs };
}

async function loadRemote(): Promise<{ errorsGo: string; docs: ErrorDoc[] }> {
  const headers = githubHeaders();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Fetch errors.go
    const goRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${ERRORS_GO_PATH}`,
      { headers: { ...headers, Accept: "application/vnd.github.raw+json" }, signal: controller.signal }
    );
    if (!goRes.ok) throw new Error(`Failed to fetch errors.go: ${goRes.status}`);
    const errorsGo = await goRes.text();

    // List error doc files
    const listRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${ERRORDOCS_DIR}`,
      { headers, signal: controller.signal }
    );
    if (!listRes.ok) throw new Error(`Failed to list error docs: ${listRes.status}`);
    const files = (await listRes.json()) as { name: string; download_url: string }[];

    // Fetch each doc file in parallel
    const docs: ErrorDoc[] = await Promise.all(
      files
        .filter((f) => f.name.endsWith(".md") && f.name !== ".gitkeep")
        .map(async (f) => {
          const res = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${ERRORDOCS_DIR}/${f.name}`,
            { headers: { ...headers, Accept: "application/vnd.github.raw+json" }, signal: controller.signal }
          );
          if (!res.ok) throw new Error(`Failed to fetch ${f.name}: ${res.status}`);
          return { slug: basename(f.name, ".md"), content: await res.text() };
        })
    );

    return { errorsGo, docs };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// MDX generation
// ---------------------------------------------------------------------------

function extractDescription(content: string): string {
  // Grab the first paragraph after "## What This Means"
  const match = content.match(/## What This Means\s+([^\n]+)/);
  if (!match) return "";
  // Truncate to ~150 chars for frontmatter description
  const sentence = match[1].trim();
  return sentence.length > 150 ? sentence.slice(0, 147) + "..." : sentence;
}

function generateErrorMdx(doc: ErrorDoc, info: ErrorCodeInfo | undefined): string {
  const code = info?.code ?? doc.slug.toUpperCase().replace(/-/g, "_");
  const humanName = info?.humanName ?? doc.slug;
  const description = extractDescription(doc.content) || info?.comment || "";

  return `---
title: "${code} — ${humanName}"
description: "${description.replace(/"/g, '\\"')}"
sidebar:
  label: "${code}"
---

${doc.content}`;
}

// ---------------------------------------------------------------------------
// Index page generation
// ---------------------------------------------------------------------------

interface CategoryGroup {
  name: string;
  items: { code: string; slug: string; humanName: string; comment: string }[];
}

function generateIndexPage(codeMap: Map<string, ErrorCodeInfo>): string {
  // Group by category
  const groups = new Map<string, CategoryGroup>();

  for (const info of codeMap.values()) {
    let group = groups.get(info.category);
    if (!group) {
      group = { name: info.category, items: [] };
      groups.set(info.category, group);
    }
    group.items.push({
      code: info.code,
      slug: info.slug,
      humanName: info.humanName,
      comment: info.comment,
    });
  }

  // Sort groups by category name, items by code within each group
  const sorted = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const group of sorted) {
    group.items.sort((a, b) => a.code.localeCompare(b.code));
  }

  const sections = sorted.map((group) => {
    const rows = group.items.map(
      (item) =>
        `| [${item.code}](/errors/${item.slug}/) | ${item.humanName} | ${item.comment} |`
    );

    return `## ${group.name} Errors

| Code | Name | Description |
|------|------|-------------|
${rows.join("\n")}`;
  });

  return `---
title: Error Codes
description: Reference for all syllago error codes with explanations and fixes.
---

When syllago encounters an error, it displays a structured error with a code, message, and suggestion. Run \`syllago explain <CODE>\` for offline help, or click any code below for the full reference.

${sections.join("\n\n")}
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Resolve source: --local flag, env var, or remote
  const localArgIdx = process.argv.indexOf("--local");
  const repoPath = localArgIdx !== -1
    ? process.argv[localArgIdx + 1]
    : process.env.SYLLAGO_REPO_PATH;

  let errorsGo: string;
  let docs: ErrorDoc[];

  try {
    if (repoPath) {
      console.log(`Loading error docs from local repo: ${repoPath}`);
      ({ errorsGo, docs } = await loadLocal(repoPath));
    } else {
      console.log(`Fetching error docs from GitHub (${GITHUB_REPO})...`);
      ({ errorsGo, docs } = await loadRemote());
    }
  } catch (err: any) {
    // Graceful skip if source unavailable and we have existing files
    if (existsSync(join(OUTPUT_DIR, "index.mdx"))) {
      console.log(`Sync skipped: ${err.message}`);
      console.log("Using existing error reference files.");
      return;
    }
    throw err;
  }

  const codeMap = parseErrorsGo(errorsGo);
  console.log(`Parsed ${codeMap.size} error codes from errors.go`);
  console.log(`Found ${docs.length} error doc files`);

  // Check for docs without a matching code (indicates drift)
  for (const doc of docs) {
    if (!codeMap.has(doc.slug)) {
      console.warn(`  Warning: ${doc.slug}.md has no matching error code in errors.go`);
    }
  }

  // Wipe and regenerate
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate index
  writeFileSync(join(OUTPUT_DIR, "index.mdx"), generateIndexPage(codeMap));
  console.log("  Generated: index.mdx");

  // Generate per-error pages
  for (const doc of docs) {
    const info = codeMap.get(doc.slug);
    const content = generateErrorMdx(doc, info);
    writeFileSync(join(OUTPUT_DIR, `${doc.slug}.mdx`), content);
  }

  console.log(`  Generated: ${docs.length} error pages`);
  console.log(`  Total: ${docs.length + 1} files in ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
