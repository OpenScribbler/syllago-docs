# Contributing to syllago-docs

Thank you for wanting to contribute. This repo follows the same contribution model as [syllago](https://github.com/OpenScribbler/syllago) itself: **your thinking is the contribution**.

## How contributions work

The most valuable contributions are **ideas, not code**. You don't need to write a single line to make a meaningful impact.

When you open an issue, you'll be guided through a structured set of questions depending on what you're bringing:

- **Bug Report** — Something in the docs is wrong, broken, or misleading
- **Feature Idea** — A new page, guide, tutorial, or capability that should exist but doesn't
- **Improvement** — Content that exists but could be clearer, more accurate, or better organized
- **Content Request** — A specific topic you want covered (a how-to, reference page, concept explainer, etc.)

Each template walks you through the right questions. Just follow the prompts.

## What we're looking for

- **Describe the what and why.** What's confusing, missing, or wrong? Who's affected and when does it bite them?
- **Explain the how in your own words.** If you have ideas about how something should be documented or restructured, walk us through your thinking. Explain it like you're talking to a teammate.
- **No code required.** Your description is the contribution — we'll handle the writing.

## Code contributions

syllago-docs accepts pull requests from **vouched contributors**, using the same [Vouch](https://github.com/mitchellh/vouch) system as the main repo. PRs from unvouched users are automatically closed.

### How to get vouched

1. **Start with an issue.** Open a bug report, feature idea, or improvement. Show us what you're thinking.
2. **Engage with the project.** Participate in discussions, help reproduce issues, or provide feedback.
3. **Get vouched.** Once a maintainer is familiar with your work, they can vouch for you by commenting `!vouch` on one of your issues.

After you're vouched, your pull requests will be accepted for review.

### Why this model?

syllago is maintained using an AI-augmented development workflow where a small team handles design, writing, and implementation together. The vouch system lets us welcome contributions from people we trust while keeping the signal-to-noise ratio high. It's not about gatekeeping — it's about building relationships before building content.

## About the docs site

This site documents the [syllago CLI](https://github.com/OpenScribbler/syllago). Some pages are hand-authored; others are generated from the CLI source. Both paths have to stay in sync:

- **Hand-authored pages** live under `src/content/docs/` and are maintained alongside feature changes in syllago.
- **Generated pages** (provider capabilities, command reference, error catalog, telemetry schema) are synced from syllago via `bun run sync`. Don't edit them by hand — changes belong in the CLI source.

If you notice a hand-authored page and a generated page disagreeing, that's a bug worth reporting.

## Development

### Requirements

- [Bun](https://bun.sh) (the project standard for TypeScript execution)
- Node.js (for the Astro toolchain)

### Setup

```bash
bun install
```

### Common tasks

```bash
bun run dev              # Start the dev server
bun run build            # Full production build (runs sync + Astro build)
bun run preview          # Preview the production build locally
bun run sync             # Regenerate all auto-synced content from syllago
bun run lint:cli-refs    # Catch stale syllago CLI references in docs
```

### Running a subset of sync scripts

If you only need to refresh one kind of auto-generated content:

```bash
bun run sync:capabilities   # Provider capability matrices
bun run sync:commands       # CLI command reference
bun run sync:errors         # Error catalog
bun run sync:providers      # Provider metadata
bun run sync:telemetry      # Telemetry schema
```

### Linting and style

- **Vale** runs in CI against `src/content/docs/` and posts inline review comments on PRs. Run locally with the Vale CLI to check your prose against the project's style rules (`vale/` directory).
- **GitHub Actions** are pinned to commit SHAs. `.github/scripts/validate-actions.sh` enforces this; CI will fail if you introduce an unpinned action.
- **Link validation** is provided by [`starlight-links-validator`](https://github.com/HiDeoo/starlight-links-validator) during `bun run build` — broken internal links fail the build.

### Changelog

When you add, modify, or delete files under `src/content/docs/`, update `CHANGELOG.md` before committing. Add entries under today's date (`## YYYY-MM-DD`) using **Added**, **Changed**, **Fixed**, or **Removed** subsections. Write concise human-readable summaries, not raw commit messages.

### Testing

There's no browser-level test suite in this repo. The relevant quality gates are:

1. `bun run build` succeeds (catches broken links, schema errors, sync failures).
2. `bun run lint:cli-refs` passes (catches stale CLI references).
3. Vale passes in CI.
4. Manual smoke check: spin up `bun run dev` and click through pages you changed.

## Getting started

1. Check [existing issues](https://github.com/OpenScribbler/syllago-docs/issues) to see if someone has already raised your idea
2. Pick the right template when opening a new issue
3. Answer the questions — be as specific as you can
4. That's it. We'll take it from there.
