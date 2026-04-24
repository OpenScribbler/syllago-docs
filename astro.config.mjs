// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeFlexoki from 'starlight-theme-flexoki';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightHeadingBadges from 'starlight-heading-badges';
import starlightImageZoom from 'starlight-image-zoom';
import astroD2 from 'astro-d2';
import { sidebar } from './sidebar.ts';
import remarkWrapTables from './scripts/remark-wrap-tables.mjs';
import { execSync } from 'child_process';

// Smart D2 detection — auto-enable when D2 is available.
// CI always has D2 (installed by .github/scripts/install-d2.sh).
// Locally, detect via d2 --version and warn if D2 diagrams exist but D2 isn't installed.
function shouldGenerateD2() {
  if (process.env.CI === 'true') {
    return true;
  }
  try {
    execSync('d2 --version', { stdio: 'ignore' });
    return true;
  } catch {
    try {
      execSync('grep -r "```d2" src/content/docs --include="*.md" --include="*.mdx"', { stdio: 'ignore' });
      console.warn('\n  D2 diagrams found but D2 not installed.');
      console.warn('  Install D2 to enable diagram generation:');
      console.warn('  https://github.com/terrastruct/d2/blob/master/docs/INSTALL.md\n');
    } catch {
      // No D2 diagrams found — nothing to warn about
    }
    return false;
  }
}

const integrations = [
  starlight({
    title: 'syllago',
    description: 'The package manager for AI coding tool content',
    plugins: [
      starlightThemeFlexoki(),
      starlightLinksValidator({
        errorOnLocalLinks: false,
        exclude: ['/using-syllago/providers/*', '/using-syllago/providers/*/*'],
      }),
      starlightLlmsTxt(),
      starlightHeadingBadges(),
      starlightImageZoom(),
    ],
    social: [
      { icon: 'github', label: 'GitHub', href: 'https://github.com/OpenScribbler/syllago' },
    ],
    customCss: [
      './src/styles/tables.css',
    ],
    sidebar,
    head: [
      {
        tag: 'link',
        attrs: {
          rel: 'alternate',
          type: 'text/plain',
          title: 'LLM-friendly version',
          href: '/llms.txt',
        },
      },
    ],
    editLink: {
      baseUrl: 'https://github.com/OpenScribbler/syllago-docs/edit/main/',
    },
    components: {
      PageTitle: './src/components/overrides/PageTitle.astro',
      SiteTitle: './src/components/overrides/SiteTitle.astro',
      SkipLink: './src/components/overrides/SkipLink.astro',
    },
  }),
];

if (shouldGenerateD2()) {
  integrations.push(
    astroD2({
      skipGeneration: false,
    })
  );
}

export default defineConfig({
  site: 'https://syllago.dev',
  integrations,
  markdown: {
    remarkPlugins: [remarkWrapTables],
  },
});
