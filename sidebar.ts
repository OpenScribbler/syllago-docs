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
          // AUTO-GENERATED:PROVIDERS START — managed by scripts/sync-providers.ts. Do not edit by hand.
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
            label: 'Crush',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/crush/' },
              { label: 'Skills', link: '/using-syllago/providers/crush/skills/' },
              { label: 'Rules', link: '/using-syllago/providers/crush/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/crush/mcp/' },
            ],
          },
          {
            label: 'Cursor',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/cursor/' },
              { label: 'Skills', link: '/using-syllago/providers/cursor/skills/' },
              { label: 'Hooks', link: '/using-syllago/providers/cursor/hooks/' },
              { label: 'Rules', link: '/using-syllago/providers/cursor/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/cursor/mcp/' },
              { label: 'Commands', link: '/using-syllago/providers/cursor/commands/' },
              { label: 'Agents', link: '/using-syllago/providers/cursor/agents/' },
            ],
          },
          {
            label: 'Factory Droid',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/factory-droid/' },
              { label: 'Skills', link: '/using-syllago/providers/factory-droid/skills/' },
              { label: 'Hooks', link: '/using-syllago/providers/factory-droid/hooks/' },
              { label: 'Rules', link: '/using-syllago/providers/factory-droid/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/factory-droid/mcp/' },
              { label: 'Commands', link: '/using-syllago/providers/factory-droid/commands/' },
              { label: 'Agents', link: '/using-syllago/providers/factory-droid/agents/' },
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
              { label: 'Agents', link: '/using-syllago/providers/gemini-cli/agents/' },
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
            label: 'OpenCode',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/opencode/' },
              { label: 'Skills', link: '/using-syllago/providers/opencode/skills/' },
              { label: 'Rules', link: '/using-syllago/providers/opencode/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/opencode/mcp/' },
              { label: 'Commands', link: '/using-syllago/providers/opencode/commands/' },
              { label: 'Agents', link: '/using-syllago/providers/opencode/agents/' },
            ],
          },
          {
            label: 'Pi',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/pi/' },
              { label: 'Skills', link: '/using-syllago/providers/pi/skills/' },
              { label: 'Hooks', link: '/using-syllago/providers/pi/hooks/' },
              { label: 'Rules', link: '/using-syllago/providers/pi/rules/' },
              { label: 'Commands', link: '/using-syllago/providers/pi/commands/' },
            ],
          },
          {
            label: 'Roo Code',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/roo-code/' },
              { label: 'Skills', link: '/using-syllago/providers/roo-code/skills/' },
              { label: 'Rules', link: '/using-syllago/providers/roo-code/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/roo-code/mcp/' },
              { label: 'Commands', link: '/using-syllago/providers/roo-code/commands/' },
              { label: 'Agents', link: '/using-syllago/providers/roo-code/agents/' },
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
            ],
          },
          {
            label: 'Zed',
            collapsed: true,
            items: [
              { label: 'Overview', link: '/using-syllago/providers/zed/' },
              { label: 'Rules', link: '/using-syllago/providers/zed/rules/' },
              { label: 'MCP Configs', link: '/using-syllago/providers/zed/mcp/' },
            ],
          },
          // AUTO-GENERATED:PROVIDERS END
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
      {
        label: 'Canonical Keys',
        collapsed: true,
        items: [
          { label: 'Overview', slug: 'reference/canonical-keys' },
          // AUTO-GENERATED:CANONICAL-KEYS START — managed by scripts/sync-capabilities.ts. Do not edit by hand.
          {
            label: 'Agents',
            collapsed: true,
            items: [
              { label: 'agent_scopes', slug: 'reference/canonical-keys/agent-scopes' },
              { label: 'definition_format', slug: 'reference/canonical-keys/definition-format' },
              { label: 'invocation_patterns', slug: 'reference/canonical-keys/invocation-patterns' },
              { label: 'model_selection', slug: 'reference/canonical-keys/model-selection' },
              { label: 'per_agent_mcp', slug: 'reference/canonical-keys/per-agent-mcp' },
              { label: 'subagent_spawning', slug: 'reference/canonical-keys/subagent-spawning' },
              { label: 'tool_restrictions', slug: 'reference/canonical-keys/tool-restrictions' },
            ],
          },
          {
            label: 'Commands',
            collapsed: true,
            items: [
              { label: 'argument_substitution', slug: 'reference/canonical-keys/argument-substitution' },
              { label: 'builtin_commands', slug: 'reference/canonical-keys/builtin-commands' },
            ],
          },
          {
            label: 'Hooks',
            collapsed: true,
            items: [
              { label: 'async_execution', slug: 'reference/canonical-keys/async-execution' },
              { label: 'context_injection', slug: 'reference/canonical-keys/context-injection' },
              { label: 'decision_control', slug: 'reference/canonical-keys/decision-control' },
              { label: 'handler_types', slug: 'reference/canonical-keys/handler-types' },
              { label: 'hook_scopes', slug: 'reference/canonical-keys/hook-scopes' },
              { label: 'input_modification', slug: 'reference/canonical-keys/input-modification' },
              { label: 'json_io_protocol', slug: 'reference/canonical-keys/json-io-protocol' },
              { label: 'matcher_patterns', slug: 'reference/canonical-keys/matcher-patterns' },
              { label: 'permission_control', slug: 'reference/canonical-keys/permission-control' },
            ],
          },
          {
            label: 'MCP',
            collapsed: true,
            items: [
              { label: 'auto_approve', slug: 'reference/canonical-keys/auto-approve' },
              { label: 'enterprise_management', slug: 'reference/canonical-keys/enterprise-management' },
              { label: 'env_var_expansion', slug: 'reference/canonical-keys/env-var-expansion' },
              { label: 'marketplace', slug: 'reference/canonical-keys/marketplace' },
              { label: 'oauth_support', slug: 'reference/canonical-keys/oauth-support' },
              { label: 'resource_referencing', slug: 'reference/canonical-keys/resource-referencing' },
              { label: 'tool_filtering', slug: 'reference/canonical-keys/tool-filtering' },
              { label: 'transport_types', slug: 'reference/canonical-keys/transport-types' },
            ],
          },
          {
            label: 'Rules',
            collapsed: true,
            items: [
              { label: 'activation_mode', slug: 'reference/canonical-keys/activation-mode' },
              { label: 'auto_memory', slug: 'reference/canonical-keys/auto-memory' },
              { label: 'cross_provider_recognition', slug: 'reference/canonical-keys/cross-provider-recognition' },
              { label: 'file_imports', slug: 'reference/canonical-keys/file-imports' },
              { label: 'hierarchical_loading', slug: 'reference/canonical-keys/hierarchical-loading' },
            ],
          },
          {
            label: 'Skills',
            collapsed: true,
            items: [
              { label: 'canonical_filename', slug: 'reference/canonical-keys/canonical-filename' },
              { label: 'compatibility', slug: 'reference/canonical-keys/compatibility' },
              { label: 'custom_filename', slug: 'reference/canonical-keys/custom-filename' },
              { label: 'description', slug: 'reference/canonical-keys/description' },
              { label: 'disable_model_invocation', slug: 'reference/canonical-keys/disable-model-invocation' },
              { label: 'display_name', slug: 'reference/canonical-keys/display-name' },
              { label: 'global_scope', slug: 'reference/canonical-keys/global-scope' },
              { label: 'license', slug: 'reference/canonical-keys/license' },
              { label: 'metadata_map', slug: 'reference/canonical-keys/metadata-map' },
              { label: 'project_scope', slug: 'reference/canonical-keys/project-scope' },
              { label: 'shared_scope', slug: 'reference/canonical-keys/shared-scope' },
              { label: 'user_invocable', slug: 'reference/canonical-keys/user-invocable' },
              { label: 'version', slug: 'reference/canonical-keys/version' },
            ],
          },
          // AUTO-GENERATED:CANONICAL-KEYS END
        ],
      },
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
