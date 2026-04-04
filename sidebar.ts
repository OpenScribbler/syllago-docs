import type { SidebarItem } from "@astrojs/starlight/types";
import cliSidebarItems from "./src/generated/cli-sidebar.json";

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
        collapsed: true,
        items: cliSidebarItems as SidebarItem[],
      },
      {
        label: 'Content Types',
        collapsed: true,
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
        collapsed: true,
        items: [
          { label: 'Overview', slug: 'using-syllago/collections' },
          { label: 'Library', slug: 'using-syllago/collections/library' },
          { label: 'Registries', slug: 'using-syllago/collections/registries' },
          { label: 'Loadouts', slug: 'using-syllago/collections/loadouts' },
        ],
      },
      {
        label: 'Supported Providers',
        collapsed: true,
        items: [
          { label: 'Overview', slug: 'using-syllago/providers' },
          { label: 'Claude Code', slug: 'using-syllago/providers/claude-code' },
          { label: 'Cursor', slug: 'using-syllago/providers/cursor' },
          { label: 'Windsurf', slug: 'using-syllago/providers/windsurf' },
          { label: 'Copilot CLI', slug: 'using-syllago/providers/copilot-cli' },
          { label: 'Cline', slug: 'using-syllago/providers/cline' },
          { label: 'Roo Code', slug: 'using-syllago/providers/roo-code' },
          { label: 'Kiro', slug: 'using-syllago/providers/kiro' },
          { label: 'Zed', slug: 'using-syllago/providers/zed' },
          { label: 'Gemini CLI', slug: 'using-syllago/providers/gemini-cli' },
          { label: 'OpenCode', slug: 'using-syllago/providers/opencode' },
          { label: 'Codex', slug: 'using-syllago/providers/codex' },
          { label: 'Amp', slug: 'using-syllago/providers/amp' },
        ],
      },
      { label: '.syllago.yaml Format', slug: 'using-syllago/syllago-yaml' },
      { label: 'Format Conversion', slug: 'using-syllago/format-conversion' },
    ],
  },
  {
    label: 'Reference',
    collapsed: true,
    items: [
      { label: 'Compare Providers', slug: 'reference/compare-providers' },
      { label: 'Hook Event Matrix', slug: 'reference/hook-events' },
      { label: 'Rules Matrix', slug: 'reference/rules-matrix' },
      { label: 'Skills Matrix', slug: 'reference/skills-matrix' },
      { label: 'Agents Matrix', slug: 'reference/agents-matrix' },
      { label: 'MCP Matrix', slug: 'reference/mcp-configs-matrix' },
      { label: 'Commands Matrix', slug: 'reference/commands-matrix' },
      { label: 'Telemetry', slug: 'reference/telemetry' },
    ],
  },
  {
    label: 'Advanced',
    collapsed: true,
    items: [
      { label: 'Sandbox', slug: 'advanced/sandbox' },
      { label: 'Team Setup', slug: 'advanced/team-setup' },
      { label: 'Troubleshooting', slug: 'advanced/troubleshooting' },
    ],
  },
  {
    label: 'Error Codes',
    collapsed: true,
    autogenerate: { directory: 'errors' },
  },
  {
    label: 'For AI assistants',
    slug: 'for-ai-assistants',
  },
];
