#!/usr/bin/env node

/**
 * Patch script for starlight-llms-txt
 *
 * Adds package exports for entryToSimpleMarkdown so our per-page
 * markdown routes can import the conversion function directly.
 *
 * Run: node scripts/patch-starlight-llms-txt.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgJsonFile = path.join(__dirname, '../node_modules/starlight-llms-txt/package.json');

if (!fs.existsSync(pkgJsonFile)) {
  console.log('⏭️  starlight-llms-txt not installed yet, skipping patch.');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgJsonFile, 'utf8'));
const exportKey = './entryToSimpleMarkdown';

if (pkg.exports && pkg.exports[exportKey]) {
  console.log('✅ entryToSimpleMarkdown export already present');
} else {
  if (!pkg.exports) pkg.exports = {};
  pkg.exports[exportKey] = './entryToSimpleMarkdown.ts';
  fs.writeFileSync(pkgJsonFile, JSON.stringify(pkg, null, 2) + '\n');
  console.log('✅ Added entryToSimpleMarkdown to starlight-llms-txt exports');
}
