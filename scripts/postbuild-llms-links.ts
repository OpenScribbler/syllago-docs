#!/usr/bin/env bun
/**
 * postbuild-llms-links.ts — Post-build fixups for afdocs compliance.
 *
 * 1. Rewrites internal links in llms-full.txt and llms-small.txt from
 *    HTML URLs (/syllago-docs/page/) to markdown (/syllago-docs/page.md).
 * 2. Creates .md copies of llms-full.txt and llms-small.txt so afdocs
 *    can discover markdown alternatives for the llms.txt links.
 * 3. Creates a sitemap.xml alias for sitemap-index.xml (Astro generates
 *    sitemap-index.xml but tools look for sitemap.xml).
 *
 * Runs as a postbuild step after `astro build`.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname, relative } from "path";

const DIST_DIR = join(dirname(import.meta.dir), "dist");
const BASE = "/syllago-docs";

// --- 1. Rewrite internal links in llms*.txt ---

const files = ["llms-full.txt", "llms-small.txt"];

// Match markdown links like [text](/syllago-docs/path/to/page/)
// but NOT links to .txt files, anchors, or external URLs
const linkPattern = new RegExp(
  `\\]\\(${BASE.replace("/", "\\/")}\/([^)]+?)\\/\\)`,
  "g"
);

let totalRewrites = 0;

for (const file of files) {
  const path = join(DIST_DIR, file);
  if (!existsSync(path)) {
    console.log(`  Skipped: ${file} (not found)`);
    continue;
  }

  let content = readFileSync(path, "utf-8");

  // Rewrite HTML links to .md
  let count = 0;
  content = content.replace(linkPattern, (_match, slug) => {
    count++;
    return `](${BASE}/${slug}.md)`;
  });
  if (count > 0) {
    totalRewrites += count;
    console.log(`  Rewrote ${count} links in ${file}`);
  }

  // Strip Starlight heading anchor boilerplate
  const before = content.length;
  content = content
    .replace(/\n\[Section titled \u201c[^\u201d]*\u201d\]\(#[^)]*\)\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  const stripped = before - content.length;
  if (stripped > 0) console.log(`  Stripped heading anchors in ${file} (saved ${stripped} chars)`);

  writeFileSync(path, content);
}

console.log(`  Total: ${totalRewrites} internal links → .md URLs`);

// --- 2. Inject source URLs into page sections ---
// The plugin generates # Title sections without page URLs. afdocs needs URL
// references to match against the sitemap. Build a title→URL map from the
// per-page .md files, then inject a Source link after each section header.

function collectMdFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectMdFiles(full));
    } else if (entry.endsWith(".md") && !entry.startsWith("llms")) {
      results.push(full);
    }
  }
  return results;
}

const titleToUrl = new Map<string, string>();
for (const mdFile of collectMdFiles(DIST_DIR)) {
  const firstLine = readFileSync(mdFile, "utf-8").split("\n")[0];
  if (!firstLine.startsWith("# ")) continue;
  const title = firstLine.slice(2).trim();
  // Convert dist path to site URL: dist/path/to/page.md → /syllago-docs/path/to/page/
  const rel = relative(DIST_DIR, mdFile).replace(/\.md$/, "");
  const url = rel === "index" ? `${BASE}/` : `${BASE}/${rel}/`;
  titleToUrl.set(title, url);
}

let totalInjected = 0;
for (const file of files) {
  const path = join(DIST_DIR, file);
  if (!existsSync(path)) continue;

  const content = readFileSync(path, "utf-8");
  let injected = 0;

  // Match page sections: # Title\n\n> Description\n\n (description optional)
  const result = content.replace(
    /^(# (.+)\n\n(?:> .+\n\n)?)/gm,
    (match, full, title) => {
      const url = titleToUrl.get(title.trim());
      if (!url) return match;
      injected++;
      return `${full}Source: ${url}\n\n`;
    }
  );

  if (injected > 0) {
    writeFileSync(path, result);
    totalInjected += injected;
    console.log(`  Injected ${injected} source URLs in ${file}`);
  }
}

console.log(`  Total: ${totalInjected} source URLs injected`);

// --- 2. Create .md copies of llms doc sets ---
// afdocs checks llms.txt links for markdown alternatives (.md URLs).
// The llms-full.txt and llms-small.txt are already markdown content,
// so we copy them with .md extensions.

for (const file of files) {
  const src = join(DIST_DIR, file);
  const dest = join(DIST_DIR, file.replace(".txt", ".md"));
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`  Created ${file.replace(".txt", ".md")}`);
  }
}

// --- 3. Create sitemap.xml alias ---
// Astro generates sitemap-index.xml but many tools look for sitemap.xml.

const sitemapIndex = join(DIST_DIR, "sitemap-index.xml");
const sitemapAlias = join(DIST_DIR, "sitemap.xml");
if (existsSync(sitemapIndex) && !existsSync(sitemapAlias)) {
  copyFileSync(sitemapIndex, sitemapAlias);
  console.log("  Created sitemap.xml alias");
}
