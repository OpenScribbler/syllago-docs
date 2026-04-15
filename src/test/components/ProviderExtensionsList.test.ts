import { describe, it, expect } from 'vitest';

// Helper extracted from ProviderExtensionsList.astro:
// The list only renders when extensions.length > 0.
function shouldRenderList(extensions: unknown[]): boolean {
  return extensions.length > 0;
}

interface Example {
  title?: string;
  lang: string;
  code: string;
  note?: string;
}

interface CapExtension {
  id: string;
  name: string;
  description: string;
  source_ref?: string;
  required?: boolean | null;
  value_type?: string;
  examples?: Example[];
}

// Helper extracted from ProviderExtensionsList.astro:
// Builds the heading text for the extension list section.
function headingText(providerName: string, contentTypeDisplay: string): string {
  return `${providerName}-specific ${contentTypeDisplay}`;
}

// Helper extracted from ProviderExtensionsList.astro:
// Builds the intro paragraph text for the extension list section.
function introText(providerName: string, contentTypeDisplay: string): string {
  return (
    `${providerName}-specific ${contentTypeDisplay.toLowerCase()} behaviors and configuration` +
    ` options not yet mapped to canonical keys. When a canonical key covers one of these,` +
    ` the item graduates there.`
  );
}

describe('shouldRenderList', () => {
  it('returns false for empty extensions array', () => {
    expect(shouldRenderList([])).toBe(false);
  });

  it('returns true for non-empty extensions array', () => {
    const ext: CapExtension = { id: 'a', name: 'A', description: 'desc' };
    expect(shouldRenderList([ext])).toBe(true);
  });

  it('returns true for multiple extensions', () => {
    const exts: CapExtension[] = [
      { id: 'a', name: 'A', description: 'desc a' },
      { id: 'b', name: 'B', description: 'desc b' },
    ];
    expect(shouldRenderList(exts)).toBe(true);
  });
});

describe('headingText', () => {
  it('combines providerName and contentTypeDisplay', () => {
    expect(headingText('Claude Code', 'Skills')).toBe('Claude Code-specific Skills');
  });

  it('works with multi-word content type display', () => {
    expect(headingText('Gemini CLI', 'MCP Configs')).toBe('Gemini CLI-specific MCP Configs');
  });
});

describe('introText', () => {
  it('lowercases contentTypeDisplay in the intro body', () => {
    const text = introText('Cursor', 'Rules');
    expect(text).toContain('rules behaviors');
  });

  it('preserves provider name casing', () => {
    const text = introText('Claude Code', 'Skills');
    expect(text.startsWith('Claude Code-specific')).toBe(true);
  });

  it('includes the graduation note', () => {
    const text = introText('Amp', 'Hooks');
    expect(text).toContain('the item graduates there');
  });
});
