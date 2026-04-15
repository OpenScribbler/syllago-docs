import { describe, it, expect } from 'vitest';

// Helper extracted from ProviderCanonicalMappings.astro:
// Converts a canonical key (underscore-separated) to a URL slug (hyphen-separated).
function keyToSlug(key: string): string {
  return key.replace(/_/g, '-');
}

interface CapMapping {
  supported: boolean;
  mechanism: string;
  paths?: string[];
}

// Helper extracted from ProviderCanonicalMappings.astro:
// Filters canonicalMappings to only supported entries, sorted alphabetically by key.
function getSupportedEntries(
  canonicalMappings: Record<string, CapMapping>
): [string, CapMapping][] {
  return Object.entries(canonicalMappings)
    .filter(([, m]) => m.supported)
    .sort(([a], [b]) => a.localeCompare(b));
}

// Helper extracted from ProviderCanonicalMappings.astro:
// Builds the canonical-key page URL for a given key.
function canonicalKeyUrl(key: string): string {
  return `/reference/canonical-keys/${keyToSlug(key)}/`;
}

describe('keyToSlug', () => {
  it('converts underscores to hyphens', () => {
    expect(keyToSlug('display_name')).toBe('display-name');
  });

  it('converts multiple underscores', () => {
    expect(keyToSlug('auto_approve')).toBe('auto-approve');
  });

  it('leaves already-hyphenated strings unchanged', () => {
    expect(keyToSlug('global-scope')).toBe('global-scope');
  });

  it('handles single-word keys with no separators', () => {
    expect(keyToSlug('version')).toBe('version');
  });
});

describe('getSupportedEntries', () => {
  it('filters out unsupported entries', () => {
    const mappings: Record<string, CapMapping> = {
      display_name: { supported: true, mechanism: 'via name field' },
      version: { supported: false, mechanism: 'not supported' },
    };
    const entries = getSupportedEntries(mappings);
    expect(entries).toHaveLength(1);
    expect(entries[0][0]).toBe('display_name');
  });

  it('returns empty array when no entries are supported', () => {
    const mappings: Record<string, CapMapping> = {
      license: { supported: false, mechanism: '' },
    };
    expect(getSupportedEntries(mappings)).toHaveLength(0);
  });

  it('sorts supported entries alphabetically by key', () => {
    const mappings: Record<string, CapMapping> = {
      version: { supported: true, mechanism: 'via version field' },
      display_name: { supported: true, mechanism: 'via name field' },
      global_scope: { supported: true, mechanism: 'via scope field' },
    };
    const entries = getSupportedEntries(mappings);
    expect(entries.map(([k]) => k)).toEqual(['display_name', 'global_scope', 'version']);
  });

  it('returns all entries when all are supported', () => {
    const mappings: Record<string, CapMapping> = {
      a: { supported: true, mechanism: 'mech a' },
      b: { supported: true, mechanism: 'mech b' },
    };
    expect(getSupportedEntries(mappings)).toHaveLength(2);
  });
});

describe('canonicalKeyUrl (links to canonical-keys)', () => {
  it('produces a canonical-keys URL from an underscore key', () => {
    expect(canonicalKeyUrl('display_name')).toBe('/reference/canonical-keys/display-name/');
  });

  it('produces a canonical-keys URL from a plain key', () => {
    expect(canonicalKeyUrl('version')).toBe('/reference/canonical-keys/version/');
  });

  it('URL contains "canonical-keys" path segment', () => {
    expect(canonicalKeyUrl('auto_approve')).toContain('canonical-keys');
  });
});
