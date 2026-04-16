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

const TYPE_LABELS: Record<string, string> = {
  documentation: 'Documentation',
  reference: 'Reference',
  source_code: 'Source code',
  json_schema: 'Schema definition',
  example: 'Usage example',
  index: 'Index',
};

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
  purpose: string;
}

function buildSourceRows(sources: CapSource[]): SourceRow[] {
  return sources.map((s) => ({
    name: s.name ?? deriveSourceName(s.uri),
    uri: s.uri,
    purpose: TYPE_LABELS[s.type ?? ''] ?? s.type ?? '—',
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
    expect(deriveSourceName('https://example.com/docs/')).toBe('Docs');
  });
});

describe('buildSourceRows', () => {
  it('uses explicit name when present', () => {
    const rows = buildSourceRows([
      { uri: 'https://example.com/skills.md', name: 'Skills Docs', type: 'documentation' },
    ]);
    expect(rows).toEqual([{
      name: 'Skills Docs',
      uri: 'https://example.com/skills.md',
      purpose: 'Documentation',
    }]);
  });

  it('falls back to derived name when name absent', () => {
    const rows = buildSourceRows([{ uri: 'https://example.com/skills.md', type: 'reference' }]);
    expect(rows[0].name).toBe('Skills');
    expect(rows[0].purpose).toBe('Reference');
  });

  it('maps all known type labels', () => {
    const types = ['documentation', 'reference', 'source_code', 'json_schema', 'example', 'index'];
    const expected = ['Documentation', 'Reference', 'Source code', 'Schema definition', 'Usage example', 'Index'];
    types.forEach((t, i) => {
      const rows = buildSourceRows([{ uri: 'https://x.com/a.md', type: t }]);
      expect(rows[0].purpose).toBe(expected[i]);
    });
  });

  it('falls back to raw type string for unknown types', () => {
    const rows = buildSourceRows([{ uri: 'https://x.com/a.md', type: 'blog_post' }]);
    expect(rows[0].purpose).toBe('blog_post');
  });

  it('shows dash when type is absent', () => {
    const rows = buildSourceRows([{ uri: 'https://x.com/a.md' }]);
    expect(rows[0].purpose).toBe('—');
  });

  it('returns empty array for empty sources', () => {
    expect(buildSourceRows([])).toHaveLength(0);
  });
});
