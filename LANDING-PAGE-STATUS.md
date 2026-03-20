# Landing Page — Status & Tracking

## What's Done

### Custom Landing Page (`src/pages/index.astro`)
- Standalone Astro page that shadows Starlight's index route at `/syllago-docs/`
- **Header:** "syllago" logo + Docs / GitHub nav links
- **Hero:** Tagline ("Because AI coding tools can't agree on anything."), subtitle, terminal GIF `<img>`, and two CTAs (Get Started, View on GitHub)
- **Features:** 3-column grid — providers, format conversion, team registries
- **Provider Grid:** All 11 providers as pill badges (verified against `syllago info` v0.6.1)
- **Footer CTA:** "Ready to get started?" + doc/GitHub links
- **Theming:** Flexoki palette via CSS custom properties, dark/light mode via `prefers-color-scheme`
- **Responsive:** Single-column stacking below 768px
- **Build passes** cleanly — `bun run build` produces 77 pages, all links valid

### Docs Overview (`src/content/docs/index.mdx`)
- Converted from `template: splash` hero to a standard Starlight page with 4 LinkCards
- Now serves as the "docs home" when clicking "Docs" from the landing page header

### VHS Tape Script (`src/assets/demo.tape`)
- Declarative VHS recording script for reproducible GIF generation
- Current settings: 960x600, Catppuccin Mocha theme, 18px font, `syll` alias
- **Commands in the demo flow:**
  1. `syll import --from claude-code --type skills`
  2. `syll export --to gemini-cli --type skills`
  3. `syll import --from copilot-cli --type agents`
  4. `syll export --to claude-code --type agents`
  5. `syll loadout apply my-stack --preview`

### Installed Tools
- **VHS** v0.10.0 (via Homebrew) — terminal GIF recorder
- **ffmpeg** (via Homebrew) — VHS dependency
- **ttyd** v1.7.7 (via Homebrew) — VHS dependency
- **syll** symlinked to `~/.local/src/syllago/cli/syllago` in Homebrew bin (on PATH)

---

## What's NOT Done (Blockers for Terminal GIF)

### 1. VHS `Hide`/`Show` doesn't work (v0.10.0)
The demo requires hidden setup (seeding files, suppressing stderr warnings). VHS `Hide`/`Show` commands were supposed to let us silently set up the environment, but they don't actually hide anything in v0.10.0 — all "hidden" commands appear in the recording.

**Options to investigate:**
- Check if newer VHS versions fix `Hide`/`Show`
- Use `Set Env BASH_ENV` to auto-source a setup script on shell init
- Create a composite wrapper: run a setup script, then invoke VHS with the visible-commands-only tape
- Record with a different tool (asciinema + agg, or svg-term)

### 2. syllago builtin warnings pollute export/list/inspect output
Every command that loads the full catalog prints ~6 lines of warnings about missing README.md files in builtin example content:
```
warning: rules/claude-code/example-kitchen-sink-rules missing README.md
warning: rules/cursor/example-kitchen-sink-rules missing README.md
...
```
These come from syllago's embedded example content, not user content. `--quiet` does not suppress them. The only workaround is redirecting stderr (`2>/dev/null`), which is fine in a script but looks bad typed out in a terminal recording.

**Commands affected:** `export`, `list`, `inspect`, `loadout list`, `loadout apply`
**Commands that are clean:** `info`, `import`, `version`

**Options:**
- Fix in syllago (upstream): suppress warnings for builtin example content, or respect `--quiet`
- Wrapper script approach: replace the `syll` symlink with a shell script that redirects stderr (was attempted — works but requires careful management of the symlink)
- Accept warnings in the GIF (they scroll fast at 18px)

### 3. VHS `Type` chokes on special characters
VHS's `Type` command can't handle escaped quotes, `$@`, or other bash special chars. This blocked the approach of typing a wrapper function directly in the tape.

---

## Current GIF Status

There's a GIF at `public/hero-demo.gif` (352K) and `src/assets/hero-demo.gif`, but it has issues:
- The `source .syll-wrapper.sh` setup command is visible (Hide didn't work)
- Previous versions either had wrong font size, wrong window width, or missing commands

**The landing page currently references the GIF** — it will display whatever is at `public/hero-demo.gif`. To use a placeholder instead, swap the `<img>` tag for the placeholder `<div>` (see git history for the original placeholder markup).

---

## Files Changed (not yet committed)

| File | Status | Notes |
|------|--------|-------|
| `src/pages/index.astro` | **New** | Custom landing page |
| `src/content/docs/index.mdx` | **Modified** | Splash → docs overview |
| `src/assets/demo.tape` | **New** | VHS recording script |
| `src/assets/hero-demo.gif` | **New** | Generated GIF (needs re-recording) |
| `public/hero-demo.gif` | **New** | Served copy of GIF |

---

## Recommended Next Steps

1. **Fix the GIF recording** — either:
   - Get VHS `Hide` working (check docs/newer version)
   - Write a shell wrapper script that does setup → calls VHS → copies output
   - Or switch to asciinema + agg for more control

2. **Decide on warning suppression strategy** — either:
   - File an issue on syllago to fix `--quiet` behavior for builtin warnings
   - Use a syll wrapper script permanently (simple, but means the symlink is a script not a link)
   - Accept warnings in the recording

3. **Swap GIF for placeholder until recording is ready** — the landing page itself is solid; only the GIF needs work. Could temporarily revert to the text placeholder.

4. **Visual review in browser** — `bun run preview` to check dark/light modes, responsive behavior, CTA links.

5. **Consider the demo story** — the planned flow (import Claude skill → export to Gemini → import Copilot agent → export to Claude → loadout preview) tells a compelling cross-provider story. The commands themselves are correct and tested.

---

## Design Decisions Made

- **`src/pages/` over enhanced MDX:** Gives total layout control. Astro's route priority means `src/pages/index.astro` automatically shadows Starlight's content collection index.
- **Flexoki colors embedded in `<style>`:** No dependency on Starlight's theme system for the landing page. Both pages use Flexoki but independently.
- **GIF in `public/` not `src/assets/`:** GIFs can't be optimized by sharp, and a standalone `.astro` page can't use Astro's `<Image>` component without importing. `public/` gives a clean static URL.
- **Provider list from `syllago info`:** Verified against the actual v0.6.1 binary, not the plan doc (which had stale provider names like Aider, Amazon Q, Amp).
