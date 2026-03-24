#!/usr/bin/env bun
/**
 * postbuild-llms-links.ts — Rewrites internal links in llms*.txt to use .md URLs.
 *
 * The starlight-llms-txt plugin generates llms-full.txt and llms-small.txt with
 * internal links pointing to HTML pages (e.g., /syllago-docs/page/). The
 * Agent-Friendly Docs spec requires these to point to markdown alternatives
 * (e.g., /syllago-docs/page.md).
 *
 * Runs as a postbuild step after `astro build`.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const DIST_DIR = join(dirname(import.meta.dir), "dist");
const BASE = "/syllago-docs";

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
