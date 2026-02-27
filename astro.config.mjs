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
import { execSync } from 'child_process';

// Auto-enable D2 when installed, skip gracefully when not
function shouldGenerateD2() {
  if (process.env.CI === 'true') {
    return true;
  }
  try {
    execSync('d2 --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const integrations = [
  starlight({
    title: 'nesco',
    description: 'The package manager for AI coding tool content',
    plugins: [
      starlightThemeFlexoki(),
      starlightLinksValidator({
        errorOnLocalLinks: false,
      }),
      starlightLlmsTxt(),
      starlightHeadingBadges(),
      starlightImageZoom(),
    ],
    social: [
      { icon: 'github', label: 'GitHub', href: 'https://github.com/OpenScribbler/nesco' },
    ],
    sidebar,
    components: {
      PageTitle: './src/components/overrides/PageTitle.astro',
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
  site: 'https://openscribbler.github.io',
  base: '/nesco-docs',
  integrations,
});
