# Security Policy

## Supported Versions

syllago-docs is a continuously deployed documentation site. Only the current `main` branch is supported. Prior commits are not patched.

## Scope

Vulnerabilities we want to hear about:

- **Malicious content injection** -- any path where untrusted input is rendered into the site without escaping (code blocks, MDX components, sync scripts importing external data)
- **Credential leakage** -- secrets, tokens, or internal URLs accidentally committed in docs, examples, fixtures, or sync output
- **Dependency supply chain** -- vulnerable or compromised npm packages used at build or runtime
- **CI/workflow abuse** -- GitHub Actions configurations that expose secrets, escalate privileges, or allow arbitrary code execution from untrusted PRs
- **Build-time code execution** -- sync scripts (`scripts/sync-*.ts`) fetching or executing untrusted code from sources outside the syllago repo

### Out of Scope (By Design)

- **Vulnerabilities in syllago itself.** Report CLI vulnerabilities to the [syllago repo](https://github.com/OpenScribbler/syllago/security). This repo only covers the documentation site and its build pipeline.
- **Third-party documentation links.** We link out to provider documentation and external resources. We can't audit their security posture.
- **Self-XSS or social engineering of readers.** Attacks that require the reader to paste attacker-controlled input into their own browser console are not in scope.

## Trust Model

- The site is built from this repository and deployed as static HTML
- Generated content is synced from the [syllago repo](https://github.com/OpenScribbler/syllago) at build time via `bun run sync`
- Third-party dependencies are managed via `bun` and pinned in `bun.lock`
- GitHub Actions are pinned to full commit SHAs (enforced by `validate-actions` CI check)

## CI Security Practices

- **Pinned dependencies** -- all GitHub Actions are pinned to full-length commit SHAs, not mutable version tags
- **Least-privilege tokens** -- CI workflows use explicit `permissions:` blocks with minimal scope
- **Automated dependency updates** -- [Dependabot](https://github.com/dependabot) watches GitHub Actions for security patches
- **Action SHA validation** -- `.github/scripts/validate-actions.sh` runs on every PR and blocks unpinned actions
- **Build-time validation** -- `starlight-links-validator` fails the build on broken internal links; `bun run lint:cli-refs` catches stale CLI references

## Reporting a Vulnerability

**Email:** openscribbler.dev@pm.me

Subject line: `[SECURITY] syllago-docs -- <brief description>`

**Response targets:**

- Acknowledgment: 48 hours
- Fix or mitigation: 7 days

**Please include:**

- Description of the vulnerability and impact
- Reproduction steps (URL or PR, if applicable)
- Affected pages, scripts, or workflows

This is a pre-revenue open source project. There is no bug bounty program.

## Safe Harbor

We support good-faith security research. If you act in good faith to identify and report vulnerabilities following this policy, we will not pursue legal action against you. We ask that you:

- Make a reasonable effort to avoid privacy violations, data destruction, and service disruption
- Only interact with accounts you own or with explicit permission from the account holder
- Give us reasonable time to address the issue before public disclosure

## Disclosure Policy

We prefer coordinated disclosure. Please do not open public GitHub issues for security vulnerabilities. We will credit reporters in the security advisory unless you prefer to remain anonymous.
