# Nesco Docs Gap Analysis

*Date: 2026-02-26*
*Sources: 9 CLI/TUI tools, 9 package managers, Starlight plugin ecosystem*

## Research Scope

Deep research across three categories to identify what nesco-docs is missing compared to best-in-class documentation sites:

1. **CLI/TUI tool docs** — Charm, Warp, Starship, lazygit, zoxide, ripgrep, bat, fzf, Atuin
2. **Package manager docs** — Homebrew, Nix, asdf, mise, proto, volta, pipx, cargo, pnpm
3. **Starlight plugin ecosystem** — Available plugins, component overrides, community extensions

---

## What We Already Have

| Feature | Implementation |
|---------|---------------|
| Dark/light mode | Flexoki theme |
| llms.txt / AI-readiness | `starlight-llms-txt` — all 3 tiers (ahead of most tools) |
| Link validation | `starlight-links-validator` |
| D2 diagrams | `astro-d2` with auto-detection |
| Prose linting | Vale + reviewdog CI (non-blocking) |
| Copy page to clipboard | PageActions component |
| Open with AI providers | PageActions "Open with" (Claude, ChatGPT, Gemini, Copilot) |
| Separate sidebar config | `sidebar.ts` |
| Search | Pagefind (Starlight built-in) |
| Responsive design | Starlight default |
| Heading badges | `starlight-heading-badges` (new/deprecated/beta markers) |
| Image zoom | `starlight-image-zoom` |
| .editorconfig | Consistent formatting |
| GitHub Pages deploy | SHA-pinned GitHub Actions workflow |

---

## Gaps — Tier 1: High Impact

These are directly relevant to nesco and should be addressed before or at v1 launch.

### Copy-to-clipboard on code blocks

**Who does it:** fzf, Atuin, Starship — all have checkmark feedback on copy.

**Relevance:** Critical for install commands (`curl | sh`, `brew install`, etc.). Starlight's Expressive Code may already include this — needs verification. If not, it's a quick add.

**Action:** Verify Starlight default behavior. If missing, add via Expressive Code config.

### "5-minute value" quick start

**Who does it:** Every successful tool. asdf gets users to a working state in 6 steps. mise shows value before even activating your shell.

**Relevance:** Our Quick Start page needs to nail this when content is written. The pattern is: install → run one command → see it work → explain what just happened.

**Action:** Content architecture decision. Follow the asdf/mise pattern: show value immediately, explain after.

### FAQ / Concepts page

**Who does it:** Homebrew (28 questions), pnpm (hard links FAQ), Nix (concepts section).

**Relevance:** First-encounter questions like "why nesco vs rulesync?" and "what happens to my files if I stop using nesco?" need a home. FAQs serve dual purpose: answer actual questions AND teach concepts that don't fit elsewhere.

**Action:** Add a FAQ page to the sidebar (Getting Started section). Write content at v1.

### Comparison page

**Who does it:** pipx has explicit "Comparison to Other Tools". Most others frame it implicitly on the homepage.

**Relevance:** Nesco needs an honest "why nesco?" page. Not a feature matrix that claims everything is better — an honest comparison with rulesync and the broader landscape.

**Action:** Add a "Why nesco?" or comparison page. Write content at v1.

### Terminal demo / animated GIFs

**Who does it:** Charm (animated GIFs for every component), Atuin (embedded terminal emulator demo).

**Relevance:** Nesco's TUI is a key differentiator. Static screenshots don't capture the interactive experience. GIF recordings of the TUI in action would be powerful.

**Action:** Record TUI demos using a tool like VHS (by Charm) or asciinema. Add to Getting Started and TUI pages.

---

## Gaps — Tier 2: Medium Impact

Worth adding before v1 launch but not blockers.

### Collapsible code blocks

**Plugin:** `expressive-code-collapsible` (3 stars, recent).

**Relevance:** `.nesco.yaml` examples and config file schemas will be long. Auto-collapse improves readability. Not needed until we have that content.

**Action:** Install when writing config reference content.

### Version badges in docs

**Plugin:** `starlight-versions` (84 stars, active).

**Relevance:** Less critical for v1 launch but will matter quickly once we ship updates. Users on older versions need old docs.

**Action:** Add post-v1 when version drift becomes real.

### Changelog integration

**Who does it:** Most tools link to GitHub releases. Some embed changelogs directly.

**Plugin:** `starlight-changelogs` (16 stars).

**Relevance:** Should at minimum link to GitHub releases from the docs site. Embedded changelog is nice-to-have.

**Action:** Add a "Changelog" link in sidebar pointing to GitHub releases. Consider plugin later.

### Multi-audience separation

**Who does it:** Homebrew explicitly separates Users / Contributors / Plugin Creators.

**Relevance:** Nesco has three audiences: Users, Content Creators, Registry Maintainers. Our sidebar already separates "Using Nesco" from "Creating Content" — this is good. Could be more explicit.

**Action:** Ensure sidebar labels and page intros clearly signal who each section is for.

### Announcement banner

**Plugin:** `starlight-announcement` (5 stars, recent).

**Relevance:** Useful post-launch for deprecation notices, breaking changes, security advisories.

**Action:** Install when needed, not before.

---

## Gaps — Tier 3: Nice to Have, Post-v1

| Gap | What Others Do | Notes |
|-----|---------------|-------|
| Interactive playground | jq has `play.jqlang.org` | A "try nesco" browser sandbox would be cool but too much work for v1 |
| i18n / multilingual | Starship supports 15+ languages | Not relevant for v1 audience size |
| Giscus comments | GitHub-backed page comments | Community feedback on docs — post-launch when there's a community |
| Social cards / OG images | Auto-generated preview images | Nice for launch marketing and social sharing |
| Algolia search | Starship uses Algolia for full-text search | Pagefind is good enough for our scale. Algolia if we outgrow it |
| localStorage nav state | fzf persists menu scroll position | Minor UX improvement, low priority |

---

## Content Architecture Patterns to Follow

These aren't tooling gaps — they're patterns to keep in mind when writing actual content.

### 1. Separate tutorials from reference

Users in "learning mode" vs. "lookup mode" need different things. Our IA already does this (Getting Started vs. CLI Reference). Keep it.

### 2. Task-based guides, not concept-based

"How do I install a Cursor rule into Claude Code?" not "How format conversion works." The Creating Content section should follow this pattern.

### 3. Plugin/provider creation in its own section

Don't overwhelm users with content creator docs. Our separation (Using Nesco vs. Creating Content) is good.

### 4. Progressive configuration

Basic config in Quick Start, full `.nesco.yaml` spec in Reference. Every successful tool (asdf, mise, cargo) does this. Don't front-load complexity.

### 5. Command reference format

Three proven approaches:
- **Man page style** (Homebrew) — familiar to Unix developers, comprehensive
- **Linked CLI tree** (mise) — helps navigate subcommands
- **Task-organized** (asdf) — groups by what users want to do

Nesco should pick one. Task-organized likely fits best since nesco commands map to user goals (install, browse, convert, etc.).

---

## Starlight Plugins — Full Inventory

### Installed

| Plugin | Purpose |
|--------|---------|
| `starlight-theme-flexoki` | Flexoki color theme |
| `starlight-links-validator` | Internal link checking |
| `starlight-llms-txt` | llms.txt generation (3 tiers) |
| `starlight-heading-badges` | Badge markers on headings |
| `starlight-image-zoom` | Click-to-zoom on images |
| `astro-d2` | D2 diagram rendering |

### Consider Later

| Plugin | Stars | Purpose | When to Add |
|--------|-------|---------|-------------|
| `starlight-versions` | 84 | Multi-version docs | Post-v1, when version drift matters |
| `starlight-changelogs` | 16 | Embedded release notes | Post-v1 |
| `expressive-code-collapsible` | 3 | Collapsible code blocks | When writing config reference |
| `starlight-announcement` | 5 | Banner notifications | Post-launch, for breaking changes |
| `starlight-sidebar-topics` | 86 | Independent sidebar sections | If IA outgrows single sidebar |
| `starlight-typedoc` | 107 | Auto-gen API docs from TS | Only if we expose a TS API |
| `starlight-kbd` | 15 | Keyboard shortcut formatting | If documenting TUI keybindings |
| `starlight-videos` | 36 | Embedded video guides | If we create video tutorials |

### Not Relevant

| Plugin | Why Not |
|--------|---------|
| `starlight-blog` | Not a blog site |
| `starlight-obsidian` | No Obsidian integration needed |
| `starlight-openapi` | No OpenAPI spec to document |
| `starlight-auto-sidebar` | We manage sidebar manually |

---

## Research Sources

- **CLI/TUI tools surveyed:** Charm (charm.sh), Warp (warp.dev), Starship (starship.rs), lazygit, zoxide, ripgrep, bat, fzf, Atuin
- **Package managers surveyed:** Homebrew, Nix, asdf, mise, proto, volta, pipx, cargo, pnpm
- **Starlight resources:** Official plugin showcase, awesome-starlight lists (riderx, trueberryless-org), npm registry
