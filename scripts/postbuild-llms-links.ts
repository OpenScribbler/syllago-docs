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

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";

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

  const content = readFileSync(path, "utf-8");
  let count = 0;

  const rewritten = content.replace(linkPattern, (_match, slug) => {
    count++;
    return `](${BASE}/${slug}.md)`;
  });

  if (count > 0) {
    writeFileSync(path, rewritten);
    totalRewrites += count;
    console.log(`  Rewrote ${count} links in ${file}`);
  } else {
    console.log(`  No links to rewrite in ${file}`);
  }
}

console.log(`  Total: ${totalRewrites} internal links → .md URLs`);

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
