import type { StarlightUserConfig } from "@astrojs/starlight/types";

type SidebarItem = NonNullable<StarlightUserConfig["sidebar"]>[number];
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
          {
            label: 'Claude Code',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/claude-code/' },
              { label: 'Skills', link: '/using-syllago/providers/claude-code/skills/' },
              { label: 'Hooks', link: '/using-syllago/providers/claude-code/hooks/' },
              { label: 'Rules', link: '/using-syllago/providers/claude-code/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/claude-code/mcp/' },
              { label: 'Commands', link: '/using-syllago/providers/claude-code/commands/' },
              { label: 'Agents', link: '/using-syllago/providers/claude-code/agents/' },
            ],
          },
          {
            label: 'Cursor',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/cursor/' },
              { label: 'Skills', link: '/using-syllago/providers/cursor/skills/' },
            ],
          },
          {
            label: 'Windsurf',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/windsurf/' },
              { label: 'Skills', link: '/using-syllago/providers/windsurf/skills/' },
              { label: 'Hooks', link: '/using-syllago/providers/windsurf/hooks/' },
              { label: 'Rules', link: '/using-syllago/providers/windsurf/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/windsurf/mcp/' },
              { label: 'Commands', link: '/using-syllago/providers/windsurf/commands/' },
              { label: 'Agents', link: '/using-syllago/providers/windsurf/agents/' },
            ],
          },
          {
            label: 'Copilot CLI',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/copilot-cli/' },
              { label: 'Skills', link: '/using-syllago/providers/copilot-cli/skills/' },
              { label: 'Hooks', link: '/using-syllago/providers/copilot-cli/hooks/' },
              { label: 'Rules', link: '/using-syllago/providers/copilot-cli/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/copilot-cli/mcp/' },
              { label: 'Commands', link: '/using-syllago/providers/copilot-cli/commands/' },
              { label: 'Agents', link: '/using-syllago/providers/copilot-cli/agents/' },
            ],
          },
          {
            label: 'Cline',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/cline/' },
              { label: 'Skills', link: '/using-syllago/providers/cline/skills/' },
              { label: 'Hooks', link: '/using-syllago/providers/cline/hooks/' },
              { label: 'Rules', link: '/using-syllago/providers/cline/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/cline/mcp/' },
              { label: 'Commands', link: '/using-syllago/providers/cline/commands/' },
            ],
          },
          {
            label: 'Roo Code',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/roo-code/' },
              { label: 'Skills', link: '/using-syllago/providers/roo-code/skills/' },
            ],
          },
          {
            label: 'Kiro',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/kiro/' },
              { label: 'Skills', link: '/using-syllago/providers/kiro/skills/' },
              { label: 'Hooks', link: '/using-syllago/providers/kiro/hooks/' },
              { label: 'Rules', link: '/using-syllago/providers/kiro/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/kiro/mcp/' },
              { label: 'Agents', link: '/using-syllago/providers/kiro/agents/' },
            ],
          },
          {
            label: 'Zed',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/zed/' },
              { label: 'Skills', link: '/using-syllago/providers/zed/skills/' },
            ],
          },
          {
            label: 'Gemini CLI',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/gemini-cli/' },
              { label: 'Skills', link: '/using-syllago/providers/gemini-cli/skills/' },
              { label: 'Hooks', link: '/using-syllago/providers/gemini-cli/hooks/' },
              { label: 'Rules', link: '/using-syllago/providers/gemini-cli/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/gemini-cli/mcp/' },
              { label: 'Commands', link: '/using-syllago/providers/gemini-cli/commands/' },
            ],
          },
          {
            label: 'OpenCode',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/opencode/' },
              { label: 'Skills', link: '/using-syllago/providers/opencode/skills/' },
            ],
          },
          {
            label: 'Codex',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/codex/' },
              { label: 'Skills', link: '/using-syllago/providers/codex/skills/' },
              { label: 'Hooks', link: '/using-syllago/providers/codex/hooks/' },
              { label: 'Rules', link: '/using-syllago/providers/codex/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/codex/mcp/' },
              { label: 'Commands', link: '/using-syllago/providers/codex/commands/' },
              { label: 'Agents', link: '/using-syllago/providers/codex/agents/' },
            ],
          },
          {
            label: 'Amp',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/amp/' },
              { label: 'Skills', link: '/using-syllago/providers/amp/skills/' },
              { label: 'Hooks', link: '/using-syllago/providers/amp/hooks/' },
              { label: 'Rules', link: '/using-syllago/providers/amp/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/amp/mcp/' },
            ],
          },
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
