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
// Builds the combined sources rows (page-level + per-extension source_ref rows).
interface CapSource {
  uri: string;
  type?: string;
  fetched_at?: string;
  name?: string;
  section?: string;
}

interface CapExtension {
  id: string;
  name: string;
  description: string;
  source_ref?: string;
}

interface SourceRow {
  name: string;
  section: string;
  uri: string;
}

function buildSourceRows(
  sources: CapSource[],
  extensions: CapExtension[]
): SourceRow[] {
  const pageRows: SourceRow[] = sources.map((s) => ({
    name: s.name ?? deriveSourceName(s.uri),
    section: s.section ?? 'All',
    uri: s.uri,
  }));

  const extRows: SourceRow[] = extensions
    .filter((e) => e.source_ref != null)
    .map((e) => ({
      name: e.source_ref!,
      section: `Extension: ${e.name}`,
      uri: e.source_ref!,
    }));

  return [...pageRows, ...extRows];
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
  it('maps page-level sources with name/section when present', () => {
    const rows = buildSourceRows(
      [{ uri: 'https://example.com/skills.md', name: 'Skills Docs', section: 'All' }],
      []
    );
    expect(rows).toEqual([{ name: 'Skills Docs', section: 'All', uri: 'https://example.com/skills.md' }]);
  });

  it('falls back to derived name and "All" when name/section absent', () => {
    const rows = buildSourceRows(
      [{ uri: 'https://example.com/skills.md' }],
      []
    );
    expect(rows[0].name).toBe('Skills');
    expect(rows[0].section).toBe('All');
  });

  it('generates Extension: <name> rows from extension source_refs', () => {
    const rows = buildSourceRows(
      [],
      [{ id: 'model', name: 'Model', description: 'desc', source_ref: 'https://example.com/model.md' }]
    );
    expect(rows).toEqual([{
      name: 'https://example.com/model.md',
      section: 'Extension: Model',
      uri: 'https://example.com/model.md',
    }]);
  });

  it('omits extension rows with no source_ref', () => {
    const rows = buildSourceRows(
      [],
      [{ id: 'model', name: 'Model', description: 'no ref' }]
    );
    expect(rows).toHaveLength(0);
  });

  it('combines page-level and extension rows in order', () => {
    const rows = buildSourceRows(
      [{ uri: 'https://a.com/docs.md', name: 'Docs', section: 'All' }],
      [{ id: 'x', name: 'X Feature', description: 'd', source_ref: 'https://a.com/x.md' }]
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].section).toBe('All');
    expect(rows[1].section).toBe('Extension: X Feature');
  });
});
