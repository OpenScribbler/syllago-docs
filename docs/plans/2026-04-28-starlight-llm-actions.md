# starlight-llm-actions — Implementation Plan

> Status: Draft  ·  Owner: Holden + Maive  ·  Created: 2026-04-28
> Plugin repo: `/home/hhewett/.local/src/starlight-llm-actions` (to be created)
> Consumer: `syllago-docs` (replaces `src/components/PageActions.astro`)

## 1. Overview

Build a publishable Astro Starlight plugin, **`starlight-llm-actions`**, that
adds a "Page Actions" dropdown to every doc page with:

- **Copy as Markdown** — fetches the page's markdown source and writes to clipboard
- **View as Markdown** — opens the markdown source URL in a new tab
- **Save as PDF** — triggers `window.print()`
- **Open with `<provider>`** — opens the page in an LLM (ChatGPT, Claude, Gemini,
  GitHub Copilot, Perplexity, T3 Chat, Cursor) using the most reliable per-provider
  strategy (URL fetch / inline content / clipboard + open).

Every action and every provider is independently togglable. Per-provider
labels, prompt templates, and URL schemes are all overridable.

## 2. Why a new plugin (not adopt or fork)

`starlight-page-actions@0.6.0` ships overlapping functionality but has
shortcomings we want to fix:

| Concern | starlight-page-actions | starlight-llm-actions |
|---|---|---|
| Claude web `?q=` (broken since Oct 2025) | Ships broken link | Uses clipboard+open Desktop fallback |
| Cursor URL scheme | `?${prompt}` (no key — wrong) | `?text=${prompt}` (correct) |
| Gemini support | Not shipped | Clipboard + open |
| Save as PDF | No | Yes (off by default; Cmd/Ctrl+P always works) |
| Print/PDF snapshot disclaimer | No | Yes (configurable warning + branding row, hidden on screen) |
| Per-page `[...slug].md.ts` route | No (static-copy at build) | Yes (route file) |
| Per-provider prompt overrides | No (single global) | Yes |
| Per-provider URL overrides | No | Yes |
| Markdown URL strategy | Hardcoded `.md` extension | Configurable (`.md`, `.txt`, function) |
| `astro:page-load` rebinding (View Transitions) | No | Yes |
| ARIA / keyboard nav / Escape-to-close | Missing | Required |
| Print-mode hiding | No | Yes |

We considered:

- **(rejected) Adopt `starlight-page-actions`** — loses Save-as-PDF and
  per-page `.md` route; ships broken Claude / Cursor links.
- **(rejected) Fork and PR upstream** — slower, weakest match for the user's
  goal of "create our own Starlight plugin," and inherits their architecture.
- **(chosen) Build a fresh plugin** in a standalone repo, vendoring the
  existing `syllago-docs/src/components/PageActions.astro` as the starting point.

## 3. Decisions locked (2026-04-28)

| Decision | Choice |
|---|---|
| Package name | `starlight-llm-actions` |
| Repo location | `/home/hhewett/.local/src/starlight-llm-actions` (new standalone) |
| Layout | pnpm monorepo (mirrors HiDeoo's `generator-starlight-plugin` output) |
| Scaffold method | By hand (Yeoman generator is interactive; we know its output) |
| Default-enabled providers | All 7 (verified providers via URL; Claude/Gemini/Copilot via clipboard fallback) |
| Per-provider config form | `boolean \| object` — full overrides (label / prompt / url / strategy) |
| Frontmatter opt-out field | `llmActions: false` (idiomatic to plugin name) |
| Markdown URL | Configurable: default `(url) => url.pathname + '.md'`; accepts string suffix or function |
| v0.1 extras | Copy / View / PDF (off by default) / Open-in / configurable suffix / opt-out / printNotice (snapshot disclaimer in @media print) |
| Override slot | `PageTitle` (matches Starlight convention; same as today's local override) |
| License | MIT |
| Package manager | pnpm (Starlight ecosystem convention) |
| Icon source | Simple Icons (CC0) for 5 providers; generic chat-bubble for ChatGPT and T3 Chat (Simple Icons gaps). Inline SVGs, not a runtime peer dep. |
| Theme adaptation | Single `currentColor` SVG per provider (no white/black variant pairs needed). |
| Brand bundling | Do **not** bundle official brand assets. Per-provider `icon` override lets consumers swap in their own and accept the compliance burden. |

## 4. Public API surface

### 4.1 Plugin entry

```ts
import starlightLlmActions from 'starlight-llm-actions';

export default defineConfig({
  integrations: [
    starlight({
      plugins: [
        starlightLlmActions({
          // all options optional — defaults below
        }),
      ],
    }),
  ],
});
```

### 4.2 Config interface

```ts
export interface StarlightLlmActionsConfig {
  /** Which actions appear in the dropdown. */
  actions?: ActionsConfig;

  /**
   * Map a page URL → its markdown source URL.
   * - Function form: full control. Receives the page URL, returns string or URL.
   * - String form: treated as a suffix appended to the pathname (e.g. '.md', '.txt').
   * Default: '.md' suffix.
   */
  markdownUrl?: string | ((url: URL) => string | URL);

  /**
   * Default prompt template for the `url-prompt` strategy when a provider
   * doesn't supply its own. Supports `{url}` and `{title}` placeholders.
   * Default: 'Read {url}. I want to ask questions about it.'
   */
  prompt?: string;

  /** Trigger button label. Default: 'Copy page'. */
  triggerLabel?: string;

  /**
   * Frontmatter field name for per-page opt-out.
   * Set to `false` to disable opt-out entirely.
   * Default: 'llmActions'.
   */
  pageOptOut?: string | false;
}

export interface ActionsConfig {
  copyMarkdown?: boolean;       // default true
  viewMarkdown?: boolean;       // default true (auto-disabled if no md route)
  printPdf?: boolean;           // default false (Cmd/Ctrl+P still works; this gates the in-menu button)
  openIn?: boolean | OpenInConfig;  // default true
}

/**
 * Snapshot disclaimer rendered in @media print. Hidden on screen.
 * Shows whenever the page is printed (Cmd/Ctrl+P, browser menu,
 * or the dropdown's PDF button), independent of `actions.printPdf`.
 */
export type PrintNoticeConfig = boolean | {
  branding?: false | {
    logo?: { src: string; alt?: string; height?: string };  // height default '1.5rem'
    siteName?: string;
  };
  warning?: false | {
    title?: string;        // default 'Documentation Snapshot'
    message?: string[];    // default ['This is a point-in-time export and may be outdated.']
    showUrl?: boolean;     // default true — appends "<urlLabel><current URL>"
    showDate?: boolean;    // default true — appends "<dateLabel><today, locale-formatted>"
    urlLabel?: string;     // default 'Live version: '
    dateLabel?: string;    // default 'Exported: '
  };
};

export interface OpenInConfig {
  enabled?: boolean;            // default true
  label?: string;               // dropdown section label, default 'Open with'
  providers?: ProvidersConfig;  // see below
}

export interface ProvidersConfig {
  chatgpt?:    ProviderConfig;  // default true
  claude?:     ProviderConfig;  // default true
  gemini?:     ProviderConfig;  // default true
  copilot?:    ProviderConfig;  // default true
  perplexity?: ProviderConfig;  // default true
  t3chat?:     ProviderConfig;  // default true
  cursor?:     ProviderConfig;  // default true
}

export type ProviderConfig = boolean | ProviderOverride;

export interface ProviderOverride {
  enabled?: boolean;
  label?: string;
  prompt?: string;              // overrides global `prompt`
  url?: string | ((ctx: ProviderUrlContext) => string);
  strategy?: 'url-prompt' | 'inline-content' | 'clipboard-open';
  /**
   * Icon override. Accepts:
   * - A string of SVG markup (inlined into the dropdown)
   * - An import path to a `.svg` file
   * - `false` to render no icon (text-only label)
   * Default: provider's bundled Simple Icons SVG, or generic chat-bubble fallback.
   */
  icon?: string | false;
}

export interface ProviderUrlContext {
  pageUrl: URL;                 // current HTML page URL
  markdownUrl: URL;             // result of markdownUrl(pageUrl)
  prompt: string;               // resolved prompt (per-provider or global)
  title: string;                // page <h1>
  markdown?: string;            // page markdown content (only when fetched)
}
```

### 4.3 Default behavior

- All actions enabled.
- All 7 providers enabled.
- Verified providers (`chatgpt`, `perplexity`, `t3chat`) use the `url-prompt`
  strategy: encode the prompt (with `{url}` substituted to the markdown URL)
  into the provider URL.
- `cursor` uses the `inline-content` strategy: fetch markdown, encode into
  `?text=` parameter, fall back to `url-prompt` when over the 8KB cap.
- `claude`, `gemini`, `copilot` use `clipboard-open`: copy markdown to
  clipboard, open the provider's home URL.

## 5. Per-provider strategy table

| Provider | Strategy | URL template | Notes |
|---|---|---|---|
| ChatGPT | `url-prompt` | `https://chatgpt.com/?q={prompt}` | Free + Plus both browse URLs since mid-2025 |
| Perplexity | `url-prompt` | `https://www.perplexity.ai/?q={prompt}` | Native URL fetching |
| T3 Chat | `url-prompt` | `https://t3.chat/new?q={prompt}` | Web-search-capable model required to fetch |
| Cursor | `inline-content` | `https://cursor.com/link/prompt?text={content}` | 8KB cap; fallback to `url-prompt` over budget |
| Claude | `clipboard-open` | `https://claude.ai/new` | Web `?q=` broken since Oct 2025 |
| Gemini | `clipboard-open` | `https://gemini.google.com/app` | No native prefill |
| GitHub Copilot | `clipboard-open` | `https://github.com/copilot` | `?prompt=` undocumented; ship safe fallback |

## 6. Architecture

### 6.1 Plugin entry (`packages/starlight-llm-actions/index.ts`)

A single `StarlightPlugin` with `name: 'starlight-llm-actions'` and:

- **`config:setup` hook**:
  - Validate config with Zod.
  - Resolve config defaults; merge user-supplied overrides.
  - Call `updateConfig({ components: { PageTitle: 'starlight-llm-actions/overrides/PageTitle.astro' } })`.
  - Call `addIntegration(makeRouteIntegration(config))` to inject the
    `[...slug].md.ts` route.
  - Pass resolved config to the override via `vite-plugin-virtual` (matches
    how `starlight-page-actions` and `starlight-llms-txt` do it).

- **Route injection** (Astro integration):
  - In `astro:config:setup`, inject a static route at `/[...slug].md` whose
    handler imports `entryToSimpleMarkdown` from `starlight-llms-txt` (same
    transform syllago-docs uses today). If `markdownUrl` is overridden by
    the user, skip route injection (they're providing their own).

### 6.2 Component override (`packages/starlight-llm-actions/overrides/PageTitle.astro`)

Renders default Starlight title + the actions UI in a flex row. Imports
resolved config from `virtual:starlight-llm-actions/config`.

- Astro side: builds the dropdown menu structure based on enabled actions
  and providers. Reads `llmActions` from frontmatter to short-circuit.
- Client side (`<script is:inline>`):
  - Reuses the existing keyboard nav, Escape-to-close, ARIA scaffolding
    from `syllago-docs/src/components/PageActions.astro`.
  - Adds `astro:page-load` listener for View Transitions support.
  - Implements 3 strategy handlers: `urlPrompt`, `inlineContent`, `clipboardOpen`.

### 6.3 File layout (mirrors `HiDeoo/generator-starlight-plugin` output)

```
starlight-llm-actions/
├── .gitignore
├── .editorconfig
├── LICENSE                           # MIT
├── README.md                         # public README (npm)
├── PLAN.md                           # ongoing roadmap (private)
├── package.json                      # workspace root
├── pnpm-workspace.yaml
├── tsconfig.json                     # workspace tsconfig (extends @astrojs/starlight tsconfigs/strictest)
├── docs/                             # playground Starlight site (real, browseable)
│   ├── astro.config.mjs              # uses the plugin via workspace:* link
│   ├── package.json
│   ├── src/
│   │   └── content/docs/
│   │       ├── index.mdx
│   │       └── examples.mdx
│   └── public/favicon.svg
└── packages/
    └── starlight-llm-actions/
        ├── README.md                 # symlink or copy of root README
        ├── package.json              # publishable artifact
        ├── tsconfig.json
        ├── index.ts                  # plugin entry
        ├── route.ts                  # the [...slug].md.ts handler factory
        ├── components/
        │   └── PageActions.astro     # the dropdown UI (vendored from syllago-docs)
        ├── overrides/
        │   └── PageTitle.astro       # Starlight override
        ├── providers/
        │   └── builtin.ts            # the 7 provider definitions
        ├── config/
        │   ├── schema.ts             # Zod schema
        │   └── resolve.ts            # default merge logic
        ├── icons/
        │   ├── claude.svg            # Simple Icons (CC0), currentColor
        │   ├── googlegemini.svg
        │   ├── githubcopilot.svg
        │   ├── perplexity.svg
        │   ├── cursor.svg
        │   ├── chat-bubble.svg       # generic fallback for ChatGPT + T3 Chat
        │   └── README.md             # provenance + CC0 attribution
        └── virtual.d.ts              # module augmentation for virtual:config
```

### 6.4 Icons & branding

Provider logos are a real legal/compliance question. All seven providers'
brand policies are silent or hostile about redistribution-in-package
(OpenAI's grant is "non-transferrable"; Google requires advance permission;
Perplexity's commercial use requires written permission; Cursor's brand page
is silent on redistribution; etc.). Bundling official brand assets in an
MIT npm package is not what those policies contemplate.

**Strategy:** mirror the standard ecosystem pattern — use Simple Icons
(CC0-licensed monochrome SVGs) where available, generic glyphs where not,
and let consumers override per-provider if they want to ship official
assets and accept the compliance burden themselves.

| Provider | Source | Notes |
|---|---|---|
| Claude | Simple Icons (`claude`) | Inline SVG, ~1KB |
| Gemini | Simple Icons (`googlegemini`) | Inline SVG |
| GitHub Copilot | Simple Icons (`githubcopilot`) | Inline SVG |
| Perplexity | Simple Icons (`perplexity`) | Inline SVG |
| Cursor | Simple Icons (`cursor`) | Inline SVG |
| ChatGPT | Generic chat-bubble glyph | Simple Icons removed OpenAI |
| T3 Chat | Generic chat-bubble glyph | Not in Simple Icons |

Icon files live at `packages/starlight-llm-actions/icons/<slug>.svg`.
Each is sourced from Simple Icons (`https://simpleicons.org/`), normalized
to `fill="currentColor"` so it inherits theme color via CSS, and stripped
of the embedded `<title>` element. Total icon weight ~7KB.

**Theme adaptation:** monochrome `currentColor` SVGs inherit `color` from
their CSS context. Starlight already swaps text colors per theme via
`var(--sl-color-white)`, so no white/black variant pairs are needed.

**Consumer override:** the `ProviderOverride.icon` field accepts a string
of SVG markup, a path to an import, or `false` for text-only. Consumers who
want official brand assets pass them in directly:

```ts
starlightLlmActions({
  actions: {
    openIn: {
      providers: {
        chatgpt: { icon: '<svg>…</svg>' }, // ship your own asset
      },
    },
  },
});
```

**README disclaimer (mandatory):**

> Icons are sourced from [Simple Icons](https://simpleicons.org/) under
> CC0. Brand names and marks remain trademarks of their respective owners
> and appear nominatively here only to identify the linked services. No
> endorsement is implied. To use official brand assets, override
> `providers.<name>.icon` in your plugin config.

Sourcing each SVG: `curl https://cdn.simpleicons.org/<slug> > icons/<slug>.svg`,
then post-process to add `fill="currentColor"` to the `<svg>` root.

### 6.5 Package.json highlights

```jsonc
{
  "name": "starlight-llm-actions",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./index.ts",
    "./overrides/PageTitle.astro": "./overrides/PageTitle.astro"
  },
  "peerDependencies": {
    "@astrojs/starlight": ">=0.36.0",
    "astro": ">=5.6.0"
  },
  "dependencies": {
    "starlight-llms-txt": ">=0.5.0",   // for entryToSimpleMarkdown
    "vite-plugin-virtual": "^0.5.0",
    "zod": "^3.23.0"
  },
  "engines": { "node": "^22.0.0 || >=24.0.0" }
}
```

## 7. Implementation phases

### Phase A — Repo scaffolding (1 working session)

1. `mkdir /home/hhewett/.local/src/starlight-llm-actions && git init`
2. Create the file layout in §6.3 with empty/skeleton files.
3. Pin dependencies, install via `pnpm install` at the workspace root.
4. Verify `pnpm --filter docs dev` boots the playground site (no plugin
   wiring yet).
5. Initial commit. Push to GitHub once a remote is created (defer).

### Phase B — Core plugin ✓ done 2026-04-28

1. ✓ `config/schema.ts` (Zod, strict objects) and `config/resolve.ts`.
2. ✓ `providers/builtin.ts` — all 7 entries with **URL templates**
   (`{prompt}`, `{prompt_with_markdown}`) instead of buildUrl functions, so
   the entire resolved config is JSON-serializable.
3. ✓ `index.ts` — Starlight plugin + nested Astro integration.
   `internal/virtual-module.ts` exposes the resolved config to components
   and routes via `virtual:starlight-llm-actions/config`.
4. ✓ `route.ts` injected at the pattern derived from `markdownUrl`
   (default `/{slug}.md` → `/[...slug].md`). Renders `entry.body` with
   title + description prepended. **MDX components render verbatim** —
   skipping the heavy `starlight-llms-txt` HTML→markdown pipeline kept
   the plugin dep-free; future v0.2 can opt in.
5. ✓ `components/PageActions.astro` — vendored, parameterised on
   resolved config, brand SVGs imported as `?raw` and inlined.
6. ✓ `overrides/PageTitle.astro` — flex-row layout next to the H1.
7. ✓ Client-side strategy handlers for `url-prompt`, `inline-content`
   (with maxBytes fallback), and `clipboard-open`, plus `astro:page-load`
   rebinding for view transitions.

**Deviations from the original plan** worth noting before Phase D:
- `markdownUrl` is now a **string template** (`/{slug}.md`), not a
  `string | (URL) => string | URL` union. Function form was dropped to
  keep the resolved config JSON-serializable for the virtual module.
- Function-form `url` overrides on providers are also gone for the same
  reason — string templates only.
- Schema requires `markdownUrl` to contain `{slug}` exactly; plugin
  derives the Astro route pattern by replacing `{slug}` with `[...slug]`.
- Consumers must extend their `docsSchema` to declare the opt-out
  frontmatter field (`llmActions: z.boolean().optional()`); Starlight's
  default schema is strict and silently strips unknown fields. Document
  this in README under "Per-page opt-out".

**Verification:** `pnpm --filter docs build` succeeds. The playground's
home page renders the dropdown with all 7 providers and the brand SVGs
inlined; the opt-out page renders no UI; `/index.md` and `/opt-out.md`
serve clean markdown.

### Phase C — Playground validation (½ session)

1. In `docs/`, link the plugin via `pnpm`'s workspace protocol.
2. Add `astro.config.mjs` invoking the plugin with default config.
3. Write 2–3 sample doc pages exercising all actions and the `llmActions: false`
   opt-out.
4. Manually validate every action against every enabled provider.
5. Capture screenshots; document URL examples for each provider in README.

### Phase D — Consumer migration (½ session)

1. In `syllago-docs/`, replace local `PageActions.astro` + `PageTitle.astro`
   override with `starlight-llm-actions` plugin.
2. Wire via `file:` link to the local plugin repo until publish.
3. Verify `pnpm dev` shows identical/improved behavior.
4. Update `syllago-docs/CHANGELOG.md`.
5. Remove dead local files.

### Phase E — Pre-publish hardening + first release

The original "½ session, just `npm publish`" estimate was wrong. Current
npm supply-chain practice (post-Shai-Hulud, post-`tj-actions/changed-files`,
post-axios 1.14.1) requires meaningful security work before publishing
anything that other people will consume. Broken into four checkpoints,
each a real handoff point.

#### Checkpoint 1 — Repo skeleton + initial commit

| Owner | Task | Notes |
|---|---|---|
| Claude | Local hygiene pass | `package.json` (`repository`, `bugs`, `homepage`, `engines.node`, `files`, full `exports` map with `types` first, `publishConfig.provenance: true`, keywords); `LICENSE`; `.gitignore`; `.editorconfig` |
| Claude | Initial commit on `main` | Rename branch from `master` if needed |
| Holden | Create empty public GitHub repo `holdenhewett/starlight-llm-actions` | Empty (no README/license — Claude pushes those) |
| Claude | Add remote, push initial commit, verify with `gh` CLI | |

#### Checkpoint 2 — Hardening pass

| Owner | Task | Why |
|---|---|---|
| Holden | Enable WebAuthn passkey on npm account | TOTP no longer accepted for new enrollments; hard prerequisite for trusted publishing in C3 |
| Holden | Squat `@holdenhewett/starlight-llm-actions` 0.0.0 placeholder on npm | Cheap insurance against scope hijack |
| Holden | Configure repo settings: secret scanning + push protection + branch ruleset on `main` (signed commits, status checks, no force-push, no deletion) | Free for public repos; prevents Shai-Hulud-class secret leaks |
| Claude | Build pipeline emitting `dist/` (tsc + `prepublishOnly` hook) | Currently ships TS source via `file:` link; npm consumers need compiled artifacts |
| Claude | CI workflow (build / `publint` / `@arethetypeswrong/cli`) | Catches export-map bugs that would force a same-day v0.1.1 |
| Claude | Dependabot config (`.github/dependabot.yml`) for `npm` + `github-actions` ecosystems | Automated PRs for both |
| Claude | SHA-pin all `uses:` lines via `pinact` | Defends against `tj-actions/changed-files`-class compromise |

#### Checkpoint 3 — Publish workflow + first publish

| Owner | Task | Why |
|---|---|---|
| Holden | Configure trusted publisher on npmjs.com (workflow filename + environment name `npm-publish`) | Eliminates `NPM_TOKEN` — the credential type stolen in Shai-Hulud (Sept 2025) and axios 1.14.1 (Mar 2026) |
| Claude | Release workflow: `id-token: write`, `contents: write`, `attestations: write` permissions; `actions/attest-build-provenance@v2` on tarball | Required for OIDC trusted publishing + Sigstore-backed provenance |
| Claude | Pre-publish verification: `npm pack --dry-run`, `publint`, `@arethetypeswrong/cli` | |
| Holden + Claude | Tag `v0.1.0` and trigger publish | Claude tags; Holden authorizes the workflow run |
| Holden | Verify package live on npmjs.com + Rekor entry exists | `gh attestation verify` + npm package page |

#### Checkpoint 4 — Docs site + GitHub Pages

| Owner | Task | Notes |
|---|---|---|
| Claude | Build out `docs/` content: full configuration reference, examples per action, quickstart, provider matrix | Currently just "Welcome" + "Opt-out example" playground pages |
| Claude | GitHub Pages deploy workflow (`.github/workflows/deploy-docs.yml`) | Standard Astro deploy pattern |
| Holden | Enable GitHub Pages in repo settings (source: GitHub Actions) | One-time settings change |
| Claude | Verify docs site deploys correctly | `gh run watch` + curl the live URL |

#### Post-publish (not in checkpoints)

1. Update `syllago-docs` to install from npm; drop the `file:` link.
2. Submit PR to add to Starlight's [community plugins page](https://starlight.astro.build/resources/plugins/).

## 8. Open questions / future work

- **i18n.** Defer to v0.2. Architecture (in §4.2) leaves space for `locales`.
- **Custom user actions.** Defer to v0.2. The `OpenInConfig.providers` shape
  already accepts arbitrary keys; need to formalize for non-builtins.
- **Share dropdown.** Defer to v0.2 (or never — out of scope for "LLM actions").
- **`viewMarkdown` auto-disable detection.** When `markdownUrl` is overridden
  but the user hasn't deployed an actual markdown route, the link 404s. Plugin
  could add a build-time check (HEAD request), or just leave it to the user.
- **Length-budget telemetry.** Should we surface to the user when Cursor
  inline falls back to URL-only? Probably a console.warn in dev mode.
- **Frontmatter schema augmentation.** Should we extend the docs collection
  Zod schema to type-check `llmActions: false`? Cleanest path is a docs
  snippet showing how users add it themselves; full schema augmentation
  requires a build-time hook.

## 9. References

- HiDeoo `generator-starlight-plugin` — https://github.com/HiDeoo/generator-starlight-plugin
- Starlight Plugin API — https://starlight.astro.build/reference/plugins/
- Starlight Override slots — https://starlight.astro.build/reference/overrides/
- `starlight-page-actions` (prior art) — https://github.com/dlcastillop/starlight-page-actions
- `starlight-llms-txt` (route pattern) — https://github.com/delucis/starlight-llms-txt
- ChatGPT `?q=` — https://community.openai.com/t/url-query-param-to-open-chat-with-initial-message/64167
- Claude Desktop deep links — https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link
- Claude web `?q=` broken — https://github.com/anthropics/claude-code/issues/8827
- Cursor deep links — https://cursor.com/docs/integrations/deeplinks
- Gemini URL Context — https://ai.google.dev/gemini-api/docs/url-context

## 10. Resumption checkpoint

If a fresh session needs to pick this up:

1. Read this plan top to bottom — pay attention to the **Deviations**
   block in §7 Phase B (markdownUrl is string-only now, etc.).
2. Read these files in the new repo to understand current state:
   - `packages/starlight-llm-actions/index.ts` (plugin entry)
   - `packages/starlight-llm-actions/internal/virtual-module.ts` (Vite
     plugin that exposes resolved config across the prerender-worker
     boundary — this was the blocker that took the most thinking).
   - `packages/starlight-llm-actions/components/PageActions.astro`
     (rendered output + inline strategy script).
3. Resume at Phase C (playground manual click-through against all 7
   providers + screenshots) or Phase D (migrate syllago-docs to consume
   the plugin via `file:` link).
4. Neither repo has been committed yet. Both have working trees.
