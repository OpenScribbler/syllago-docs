# syllago-docs

Documentation site for [syllago](https://github.com/OpenScribbler/syllago) -- the package manager for AI coding tool content.

Built with [Astro](https://astro.build/) and [Starlight](https://starlight.astro.build/), themed with [Flexoki](https://stephango.com/flexoki).

## Development

```bash
npm install
npm run dev        # local dev server at localhost:4321
npm run build      # production build to ./dist/
npm run preview    # preview the production build
```

## CLI Reference Generation

CLI reference pages are auto-generated from syllago's `commands.json` release asset:

```bash
bun scripts/sync-commands.ts                              # fetch from latest GitHub release
bun scripts/sync-commands.ts --local path/to/commands.json # use a local file
```

Do not edit files in `src/content/docs/using-syllago/cli-reference/` directly -- they will be overwritten on the next sync.

## Deployment

Deployed to GitHub Pages via GitHub Actions on push to `main`. The site is available at [openscribbler.github.io/syllago-docs](https://openscribbler.github.io/syllago-docs/).

## License

Apache 2.0 -- see [LICENSE](LICENSE) for full text.
