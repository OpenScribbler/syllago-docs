import type { SidebarItem } from "@astrojs/starlight/types";

export const sidebar: SidebarItem[] = [
  {
    label: 'Getting Started',
    items: [
      { label: 'Installation', slug: 'getting-started/installation' },
      { label: 'Quick Start', slug: 'getting-started/quick-start' },
      { label: 'Core Concepts', slug: 'getting-started/core-concepts' },
    ],
  },
  {
    label: 'Using Nesco',
    items: [
      { label: 'The TUI', slug: 'using-nesco/tui' },
      { label: 'CLI Reference', slug: 'using-nesco/cli-reference' },
      {
        label: 'Supported Providers',
        items: [
          { label: 'Overview', slug: 'using-nesco/providers' },
          { label: 'Claude Code', slug: 'using-nesco/providers/claude-code' },
          { label: 'Cursor', slug: 'using-nesco/providers/cursor' },
          { label: 'Windsurf', slug: 'using-nesco/providers/windsurf' },
          { label: 'Copilot', slug: 'using-nesco/providers/copilot' },
          { label: 'Cline', slug: 'using-nesco/providers/cline' },
          { label: 'Roo Code', slug: 'using-nesco/providers/roo-code' },
          { label: 'Kiro', slug: 'using-nesco/providers/kiro' },
          { label: 'Zed', slug: 'using-nesco/providers/zed' },
          { label: 'Gemini CLI', slug: 'using-nesco/providers/gemini-cli' },
          { label: 'OpenCode', slug: 'using-nesco/providers/opencode' },
          { label: 'Codex', slug: 'using-nesco/providers/codex' },
        ],
      },
      { label: 'Content Types', slug: 'using-nesco/content-types' },
    ],
  },
  {
    label: 'Creating Content',
    items: [
      { label: 'Authoring Guide', slug: 'creating-content/authoring-guide' },
      { label: '.nesco.yaml Format', slug: 'creating-content/nesco-yaml' },
      { label: 'Registries', slug: 'creating-content/registries' },
      { label: 'Format Conversion', slug: 'creating-content/format-conversion' },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { label: 'Sandbox', slug: 'advanced/sandbox' },
      { label: 'Team Setup', slug: 'advanced/team-setup' },
      { label: 'Troubleshooting', slug: 'advanced/troubleshooting' },
    ],
  },
  {
    label: 'For AI assistants',
    slug: 'for-ai-assistants',
  },
];
