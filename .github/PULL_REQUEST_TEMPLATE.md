## Summary

<!-- 1-2 sentences: what changed and why. -->

## Bead

<!-- Link to the bead that tracked this work, if applicable. -->
<!-- Example: syllago-docs-d5c1 -->

N/A

## Checklist

- [ ] `bun run build` (site builds, links validate, sync scripts succeed)
- [ ] `bun run lint:cli-refs` (no stale syllago CLI references)
- [ ] Vale passes — if `src/content/docs/` changed
- [ ] `CHANGELOG.md` updated — if `src/content/docs/` changed
- [ ] Auto-generated content left untouched — provider/capability/command/error/telemetry pages come from `bun run sync`, not hand edits
- [ ] Tested manually — if navigation, search, theme, or interactive components changed
