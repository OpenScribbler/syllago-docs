import { describe, it, expect } from 'vitest';

// Helper extracted from ProviderConventions.astro:
// Maps contentType slug to display string.
const CT_DISPLAY: Record<string, string> = {
  rules: 'Rules',
  hooks: 'Hooks',
  mcp: 'MCP Configs',
  skills: 'Skills',
  agents: 'Agents',
  commands: 'Commands',
};

function getCtDisplay(contentType: string): string {
  return CT_DISPLAY[contentType] ?? contentType;
}

// Helper extracted from ProviderConventions.astro:
// Maps file format key to display string.
const FORMAT_DISPLAY: Record<string, string> = {
  md: 'Markdown',
  mdc: 'MDC (Markdown + frontmatter)',
  json: 'JSON',
  jsonc: 'JSON with comments',
  yaml: 'YAML',
  toml: 'TOML',
};

function getFormatDisplay(fileFormat: string | undefined): string {
  return FORMAT_DISPLAY[fileFormat ?? ''] ?? fileFormat ?? '—';
}

// Helper extracted from ProviderConventions.astro:
// Maps install method key to display string.
const METHOD_DISPLAY: Record<string, string> = {
  filesystem: 'Symlink',
  'json-merge': 'JSON merge',
  'project-scope': 'Project scope',
};

function getMethodDisplay(installMethod: string | undefined): string {
  return METHOD_DISPLAY[installMethod ?? ''] ?? installMethod ?? '—';
}

// Helper extracted from ProviderConventions.astro:
// Maps hook category key to display string.
const HOOK_CATEGORY_DISPLAY: Record<string, string> = {
  tool: 'Tool',
  lifecycle: 'Lifecycle',
  context: 'Context',
  output: 'Output',
  security: 'Security',
  config: 'Config',
  workspace: 'Workspace',
  interaction: 'Interaction',
  collaboration: 'Collaboration',
  model: 'Model',
};

function getHookCategoryDisplay(category: string | undefined): string {
  if (!category) return '—';
  return HOOK_CATEGORY_DISPLAY[category] ?? category;
}

// Helper extracted from ProviderConventions.astro:
// Strips `{project}/` and replaces `{home}/` with `~/` for display.
function stripPathVars(path: string): string {
  return path.replace('{project}/', '').replace('{home}/', '~/');
}

describe('getCtDisplay', () => {
  it('returns display name for known content types', () => {
    expect(getCtDisplay('rules')).toBe('Rules');
    expect(getCtDisplay('hooks')).toBe('Hooks');
    expect(getCtDisplay('mcp')).toBe('MCP Configs');
    expect(getCtDisplay('skills')).toBe('Skills');
    expect(getCtDisplay('agents')).toBe('Agents');
    expect(getCtDisplay('commands')).toBe('Commands');
  });

  it('falls back to the contentType itself for unknown types', () => {
    expect(getCtDisplay('unknown-ct')).toBe('unknown-ct');
  });
});

describe('getFormatDisplay', () => {
  it('returns display name for known file formats', () => {
    expect(getFormatDisplay('md')).toBe('Markdown');
    expect(getFormatDisplay('mdc')).toBe('MDC (Markdown + frontmatter)');
    expect(getFormatDisplay('json')).toBe('JSON');
    expect(getFormatDisplay('jsonc')).toBe('JSON with comments');
    expect(getFormatDisplay('yaml')).toBe('YAML');
    expect(getFormatDisplay('toml')).toBe('TOML');
  });

  it('falls back to the raw format string for unknown formats', () => {
    expect(getFormatDisplay('xml')).toBe('xml');
  });

  it('returns dash when fileFormat is undefined', () => {
    expect(getFormatDisplay(undefined)).toBe('—');
  });
});

describe('getMethodDisplay', () => {
  it('returns display name for known install methods', () => {
    expect(getMethodDisplay('filesystem')).toBe('Symlink');
    expect(getMethodDisplay('json-merge')).toBe('JSON merge');
    expect(getMethodDisplay('project-scope')).toBe('Project scope');
  });

  it('falls back to the raw method string for unknown methods', () => {
    expect(getMethodDisplay('copy')).toBe('copy');
  });

  it('returns dash when installMethod is undefined', () => {
    expect(getMethodDisplay(undefined)).toBe('—');
  });
});

describe('getHookCategoryDisplay', () => {
  it('returns display name for known categories', () => {
    expect(getHookCategoryDisplay('tool')).toBe('Tool');
    expect(getHookCategoryDisplay('lifecycle')).toBe('Lifecycle');
    expect(getHookCategoryDisplay('context')).toBe('Context');
    expect(getHookCategoryDisplay('output')).toBe('Output');
    expect(getHookCategoryDisplay('security')).toBe('Security');
    expect(getHookCategoryDisplay('config')).toBe('Config');
    expect(getHookCategoryDisplay('workspace')).toBe('Workspace');
    expect(getHookCategoryDisplay('interaction')).toBe('Interaction');
    expect(getHookCategoryDisplay('collaboration')).toBe('Collaboration');
    expect(getHookCategoryDisplay('model')).toBe('Model');
  });

  it('falls back to the raw category string for unknown categories', () => {
    expect(getHookCategoryDisplay('custom-cat')).toBe('custom-cat');
  });

  it('returns dash when category is undefined', () => {
    expect(getHookCategoryDisplay(undefined)).toBe('—');
  });
});

describe('stripPathVars', () => {
  it('strips {project}/ prefix', () => {
    expect(stripPathVars('{project}/.cursorrules')).toBe('.cursorrules');
  });

  it('replaces {home}/ with ~/', () => {
    expect(stripPathVars('{home}/.config/rules')).toBe('~/.config/rules');
  });

  it('leaves paths without tokens unchanged', () => {
    expect(stripPathVars('/etc/ai/settings.json')).toBe('/etc/ai/settings.json');
  });

  it('handles a path with no prefix tokens', () => {
    expect(stripPathVars('.claude/settings.json')).toBe('.claude/settings.json');
  });
});
