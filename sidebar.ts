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
    label: 'Using Syllago',
    items: [
      { label: 'The TUI', slug: 'using-syllago/tui' },
      {
        label: 'CLI Reference',
        autogenerate: { directory: 'using-syllago/cli-reference' },
      },
      {
        label: 'Content Types',
        items: [
          { label: 'Overview', slug: 'using-syllago/content-types' },
          { label: 'Rules', slug: 'using-syllago/content-types/rules' },
          { label: 'Skills', slug: 'using-syllago/content-types/skills' },
          { label: 'Agents', slug: 'using-syllago/content-types/agents' },
          { label: 'MCP Configs', slug: 'using-syllago/content-types/mcp-configs' },
          { label: 'Hooks', slug: 'using-syllago/content-types/hooks' },
          { label: 'Commands', slug: 'using-syllago/content-types/commands' },
        ],
      },
      {
        label: 'Collections',
        items: [
          { label: 'Overview', slug: 'using-syllago/collections' },
          { label: 'Library', slug: 'using-syllago/collections/library' },
          { label: 'Registries', slug: 'using-syllago/collections/registries' },
          { label: 'Loadouts', slug: 'using-syllago/collections/loadouts' },
        ],
      },
      {
        label: 'Supported Providers',
        items: [
          { label: 'Overview', slug: 'using-syllago/providers' },
          { label: 'Claude Code', slug: 'using-syllago/providers/claude-code' },
          { label: 'Cursor', slug: 'using-syllago/providers/cursor' },
          { label: 'Windsurf', slug: 'using-syllago/providers/windsurf' },
          { label: 'Copilot', slug: 'using-syllago/providers/copilot' },
          { label: 'Cline', slug: 'using-syllago/providers/cline' },
          { label: 'Roo Code', slug: 'using-syllago/providers/roo-code' },
          { label: 'Kiro', slug: 'using-syllago/providers/kiro' },
          { label: 'Zed', slug: 'using-syllago/providers/zed' },
          { label: 'Gemini CLI', slug: 'using-syllago/providers/gemini-cli' },
          { label: 'OpenCode', slug: 'using-syllago/providers/opencode' },
          { label: 'Codex', slug: 'using-syllago/providers/codex' },
        ],
      },
      { label: '.syllago.yaml Format', slug: 'using-syllago/syllago-yaml' },
      { label: 'Format Conversion', slug: 'using-syllago/format-conversion' },
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
    label: 'Error Codes',
    autogenerate: { directory: 'errors' },
  },
  {
    label: 'For AI assistants',
    slug: 'for-ai-assistants',
  },
];
