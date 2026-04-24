# Top-level Syllago Docs Review — 2026-04-21

**Scope:** Manually-authored root files under `src/content/docs/`:

- `src/content/docs/index.mdx`
- `src/content/docs/for-ai-assistants.mdx`

**Source-of-truth repo:** `/home/hhewett/.local/src/syllago` (read-only).

## Summary

- **Total findings:** 2
- **OBVIOUS-FIX-APPLIED:** 0
- **OBVIOUS-FIX-FLAGGED:** 1
- **DESIGN-DECISION:** 1
- **Critical:** 0
- **Broken links:** 0

Both files are short and almost entirely navigational. Neither hard-codes a
provider list, content-type list, version number, or CLI command catalog —
so the stale-source risks that exist on richer pages are absent here.

The single non-trivial issue is one example command that is macOS-only
without flagging the platform, plus one positioning observation about the
homepage tagline relative to the upstream README.

## Findings

### `src/content/docs/index.mdx`

| Severity | Category | Item |
|----------|----------|------|
| low | DESIGN-DECISION | Tagline divergence from upstream README |

**Detail — DESIGN-DECISION (line 3):** The homepage description reads
`The package manager for AI coding tool content.`. This matches the
docs-site description in `astro.config.mjs:40` exactly, so the page is
internally consistent.

The upstream `README.md:11` (in the syllago repo) frames the project as
**"Convert, bundle, and share AI coding tool content across providers."**
The two framings are not contradictory — "package manager" is a higher-level
metaphor; "convert, bundle, and share" is functional — but they are
different value-prop verbs. No action taken; flagging because homepage
positioning is sensitive and the docs-site/README divergence may be
intentional or may want reconciliation. **No edit applied.**

**Links walked (all OK):**

- `/getting-started/installation/` → `src/content/docs/getting-started/installation.mdx` (exists)
- `/getting-started/quick-start/` → `src/content/docs/getting-started/quick-start.mdx` (exists)
- `/using-syllago/cli-reference/` → `src/content/docs/using-syllago/cli-reference/index.mdx` (exists)
- `/using-syllago/providers/` → `src/pages/using-syllago/providers/[provider].astro` + dynamically built index at `dist/using-syllago/providers/index.html` (exists)

**Other claims to verify:** none. The page makes no factual claims about
providers, content types, versions, or CLI commands — it is purely a
4-card navigation landing.

### `src/content/docs/for-ai-assistants.mdx`

| Severity | Category | Item |
|----------|----------|------|
| low | OBVIOUS-FIX-FLAGGED | Example command uses `pbcopy` without noting macOS-only |

**Detail — OBVIOUS-FIX-FLAGGED (lines 27–33):**

```bash
# Feed syllago docs to Claude Code
curl -s https://syllago.dev/llms-full.txt | pbcopy
```

`pbcopy` is macOS-only. Linux and Windows readers running this verbatim
will get `command not found`. The fix is a one-line clarifying comment
(`# macOS — use xclip on Linux, Set-Clipboard on Windows`) or rewriting
the example to be platform-neutral (e.g., piping to a file). Flagged
rather than auto-applied because the right framing (footnote vs. inline
note vs. swap example) is a small editorial call.

**URL claims verified:**

- `https://syllago.dev/...` — site URL matches `astro.config.mjs:89`
  (`site: 'https://syllago.dev'`) and `public/CNAME`. Correct.
- `/llms.txt`, `/llms-small.txt`, `/llms-full.txt` — produced by the
  `starlight-llms-txt` plugin enabled in `astro.config.mjs:47`. All three
  artifacts present in `dist/` after build. Correct.
- `https://llmstxt.org/` — external standard reference, well-known.

**No embedded canonical schema, naming conventions, or invocation patterns.**
This file describes machine-readable artifacts, not the syllago canonical
format itself, so the doubly-important accuracy bar for AI-consumed pages
is fully met.

## Broken links

None.

## Files with no findings

None — both files in scope produced at least one observation, though
neither rises above low severity.

## Notes / observations (non-actionable)

- Both files are stable: they reference site-level constructs (llms.txt,
  navigation routes) rather than provider lists or CLI catalogs, so they
  are inherently low-maintenance against syllago source drift.
- `cli/providers.json` currently lists 16 providers and 7 content types
  (`skills`, `agents`, `mcp`, `rules`, `hooks`, `commands`, `loadouts`)
  at `syllagoVersion: 0.9.0` — neither file references this data, so no
  reconciliation needed here.
