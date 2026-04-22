# Section Review: errors/
Reviewed: 2026-04-21
Files in scope: 57 (.mdx files in `src/content/docs/errors/`; the task brief said 60 — actual count is 56 error-code files + 1 index)
Codegen skipped: 0
Reviewed: 57

## Summary

The errors catalog is in unusually good shape. The body of every per-code `.mdx` file is mirrored from the canonical embedded markdown at `cli/internal/errordocs/docs/<slug>.md` (the same source `syllago explain <CODE>` reads). A byte-for-byte diff (after stripping frontmatter) found only **two divergences** site-wide. Every code prefix and number documented here is present in `cli/internal/output/errors.go` (the `AllErrorCodes()` registry) — no orphaned codes in scope.

Two cross-cutting issues are out of scope but worth flagging: (1) the source defines `MOAT_008` and `MOAT_009` with embedded markdown but neither has a docs page nor a row in `index.mdx`; (2) the syllago source itself is internally inconsistent about whether the updater command is `syllago update` (cobra) or `syllago self-update` (every error/Suggestion string in `moat/`, `registry_verify.go`, `install_moat.go`, `registry_sync_moat.go`). For the docs body I aligned to the canonical embedded markdown — fixing the cobra/error-string mismatch is a syllago bug, not a docs bug.

## Findings (group by file; only files with findings)

### src/content/docs/errors/moat-001.mdx

#### Finding 1 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: `For the full workflow, see https://openscribbler.github.io/syllago-docs/moat/registry-add-signing-identity/.`
- **Reality (syllago source)**: `cli/internal/errordocs/docs/moat-001.md:27` wraps the URL in autolink brackets: `<https://openscribbler.github.io/syllago-docs/moat/registry-add-signing-identity/>.`
- **Severity**: low (cosmetic / rendering parity)
- **Recommended fix**: wrap URL in angle brackets so the docs body matches what `syllago explain MOAT_001` prints.
- **Action taken**: applied

### src/content/docs/errors/moat-005.mdx

#### Finding 1 — OBVIOUS-FIX-APPLIED
- **Claim in docs**: How-to-Fix says `Run the updater …` and the code block reads `syllago update`.
- **Reality (syllago source)**: `cli/internal/errordocs/docs/moat-005.md:17,20` reads `Run the self-updater …` and `syllago self-update`. The Suggestion string emitted at runtime by `cli/internal/moat/trusted_root_loader.go:200,209,218` also uses `syllago self-update`. The Example Output block in this same docs file already prints `syllago self-update` in the Suggestion line, so the previous How-to-Fix section was internally inconsistent with its own example.
- **Severity**: medium (the Suggestion the user sees on stderr says one command; the doc told them another)
- **Recommended fix**: align the How-to-Fix prose and code block to `syllago self-update` (canonical embedded markdown).
- **Action taken**: applied

NOTE: there is a separate, **out-of-scope syllago source bug**: the cobra command is registered as `Use: "update"` in `cli/cmd/syllago/main.go:177-182` with no `self-update` alias, so `syllago self-update` will fail with `unknown command`. Every Suggestion string in `cli/cmd/syllago/registry_verify.go:175,280`, `cli/cmd/syllago/registry_sync_moat.go:83`, `cli/cmd/syllago/install_moat.go:163`, and `cli/internal/moat/trusted_root_loader.go:200,209,218` recommends a command that does not exist. Recommend filing a syllago issue to either (a) rename the cobra command to `self-update` or (b) add `Aliases: []string{"self-update"}`.

## Error codes missing from source (orphaned docs)

None. All 56 documented codes (and every code in `index.mdx`) exist in `cli/internal/output/errors.go`'s `AllErrorCodes()` slice.

## Codes in source but not documented (out of scope for fix)

- `MOAT_008` / `ErrMoatRevocationBlock` — defined `cli/internal/output/errors.go:101`; full embedded markdown exists at `cli/internal/errordocs/docs/moat-008.md`. No `errors/moat-008.mdx` and no entry in `errors/index.mdx`.
- `MOAT_009` / `ErrMoatTierBelowPolicy` — defined `cli/internal/output/errors.go:102`; full embedded markdown exists at `cli/internal/errordocs/docs/moat-009.md`. No `errors/moat-009.mdx` and no entry in `errors/index.mdx`.

Recommend adding docs pages for both and extending the Moat Errors table in `errors/index.mdx`. The body content can be lifted directly from the embedded source markdown, mirroring the pattern of every other file in this section.

## Files with no findings

catalog-001.mdx, catalog-002.mdx, config-001.mdx, config-002.mdx, config-003.mdx, config-004.mdx, convert-001.mdx, convert-002.mdx, convert-003.mdx, export-001.mdx, export-002.mdx, import-001.mdx, import-002.mdx, index.mdx, init-001.mdx, input-001.mdx, input-002.mdx, input-003.mdx, input-004.mdx, install-001.mdx, install-002.mdx, install-003.mdx, install-004.mdx, install-005.mdx, item-001.mdx, item-002.mdx, item-003.mdx, loadout-001.mdx, loadout-002.mdx, loadout-003.mdx, loadout-004.mdx, loadout-005.mdx, moat-002.mdx, moat-003.mdx, moat-004.mdx, moat-006.mdx, moat-007.mdx, privacy-001.mdx, privacy-002.mdx, privacy-003.mdx, promote-001.mdx, promote-002.mdx, promote-003.mdx, provider-001.mdx, provider-002.mdx, registry-001.mdx, registry-002.mdx, registry-003.mdx, registry-004.mdx, registry-005.mdx, registry-006.mdx, registry-007.mdx, registry-008.mdx, system-001.mdx, system-002.mdx
