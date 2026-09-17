# syllago-docs

Documentation site for [syllago](https://github.com/OpenScribbler/syllago) -- the package manager for AI coding tool content.

Built with [Astro](https://astro.build/) and [Starlight](https://starlight.astro.build/), themed with [Flexoki](https://stephango.com/flexoki).

## Development

```bash
bun install
bun run dev        # local dev server at localhost:4321
bun run build      # production build to ./dist/
bun run preview    # preview the production build
```

## Experimental semantic style check

The repository currently uses the published Google Vale package for
deterministic checks while the custom Syllago style is commented out in
`.vale.ini`. The Jev demo complements Vale with five semantic checks: actor
clarity, contextual jargon, paragraph focus, placement of critical information,
and descriptive headings. It scans up to 12 prose paragraphs from one
hand-authored Markdown or MDX file and batches all judgments into one TypeSafe
request.

Preview the request without an account or network call:

```bash
bun run style:jev -- src/content/docs/getting-started/why-syllago.mdx --dry-run
```

For a live evaluation, create a TypeSafe API key and either export it in your
shell or put it in a gitignored `.env.local` file, then run the same command
without `--dry-run`:

```bash
export TYPESAFE_API_KEY="ts_..."
bun run style:jev -- src/content/docs/getting-started/why-syllago.mdx
```

The demo reports likely violations at `0.85` and review candidates at `0.50`.
These are trial thresholds, not validated quality gates. Run it against a small
labeled set and tune the rules and thresholds before considering CI use.
`--help` shows the available options, including `--json`, `--max-blocks`, and
`--fail-on-flag`.

Run the deterministic Google rules separately:

```bash
vale sync
bun run lint:vale
```

See the [initial Google style trial](docs/reviews/2026-09-17-google-style-trial.md)
for baseline results and known limitations.

## CLI Reference Generation

CLI reference pages are auto-generated from syllago's `commands.json` release asset:

```bash
bun scripts/sync-commands.ts                              # fetch from latest GitHub release
bun scripts/sync-commands.ts --local path/to/commands.json # use a local file
```

Do not edit files in `src/content/docs/using-syllago/cli-reference/` directly -- they will be overwritten on the next sync.

## Deployment

Deployed to GitHub Pages via GitHub Actions on push to `main`. The site is available at [syllago.dev](https://syllago.dev/).

## License

Apache 2.0 -- see [LICENSE](LICENSE) for full text.
