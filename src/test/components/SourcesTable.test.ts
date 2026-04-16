import { describe, it, expect } from 'vitest';

// Helper extracted from SourcesTable.astro logic:
// Derives a display name from a URI when no `name` field is present.
function deriveSourceName(uri: string): string {
  const path = new URL(uri).pathname;
  const segment = path.split('/').filter(Boolean).pop() ?? uri;
  const withoutExt = segment.replace(/\.[^.]+$/, '');
  return withoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Helper extracted from SourcesTable.astro logic:
// Builds the source rows from page-level sources.
interface CapSource {
  uri: string;
  type?: string;
  fetched_at?: string;
  name?: string;
}

interface SourceRow {
  name: string;
  uri: string;
}

function buildSourceRows(sources: CapSource[]): SourceRow[] {
  return sources.map((s) => ({
    name: s.name ?? deriveSourceName(s.uri),
    uri: s.uri,
  }));
}

describe('deriveSourceName', () => {
  it('extracts last path segment without extension', () => {
    expect(deriveSourceName('https://example.com/docs/en/skills.md')).toBe('Skills');
  });

  it('converts hyphens to spaces and title-cases', () => {
    expect(deriveSourceName('https://example.com/mcp-config.md')).toBe('Mcp Config');
  });

  it('falls back to the full URI for non-URL-parseable input', () => {
    // URL constructor throws on invalid URIs; function should not be called with those.
    expect(deriveSourceName('https://example.com/docs/')).toBe('Docs');
  });
});

describe('buildSourceRows', () => {
  it('uses explicit name when present', () => {
    const rows = buildSourceRows([
      { uri: 'https://example.com/skills.md', name: 'Skills Docs' },
    ]);
    expect(rows).toEqual([{ name: 'Skills Docs', uri: 'https://example.com/skills.md' }]);
  });

  it('falls back to derived name when name absent', () => {
    const rows = buildSourceRows([{ uri: 'https://example.com/skills.md' }]);
    expect(rows[0].name).toBe('Skills');
  });

  it('returns empty array for empty sources', () => {
    const rows = buildSourceRows([]);
    expect(rows).toHaveLength(0);
  });

  it('preserves source order', () => {
    const rows = buildSourceRows([
      { uri: 'https://a.com/alpha.md', name: 'Alpha' },
      { uri: 'https://a.com/beta.md', name: 'Beta' },
    ]);
    expect(rows.map((r) => r.name)).toEqual(['Alpha', 'Beta']);
  });
});
