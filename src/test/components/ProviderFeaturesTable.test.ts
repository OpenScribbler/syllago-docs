import { describe, it, expect } from 'vitest';

// Helpers extracted from ProviderFeaturesTable.astro.
// Kept in-test (rather than importing from the component) to match the
// project convention used by the other *.test.ts files in this directory.

type ConversionFate =
  | 'translated'
  | 'embedded'
  | 'dropped'
  | 'preserved'
  | 'not-portable';

interface CapMapping {
  supported: boolean;
  mechanism: string;
  paths?: string[];
  provider_field?: string | null;
  extension_id?: string;
}

interface CapExtension {
  id: string;
  name: string;
  summary: string;
  source_ref?: string;
  required?: boolean | null;
  value_type?: string;
  provider_field?: string | null;
  conversion: ConversionFate;
}

interface Row {
  label: string;
  canonicalKey: string | null;
  providerField: string | null;
  conversion: ConversionFate;
  summary: string;
}

const CONVERSION_ORDER: Record<ConversionFate, number> = {
  translated: 0,
  embedded: 1,
  dropped: 2,
  preserved: 3,
  'not-portable': 4,
};

function keyToSlug(key: string): string {
  return key.replace(/_/g, '-');
}

function buildRows(
  canonicalMappings: Record<string, CapMapping>,
  extensions: CapExtension[]
): { fields: Row[]; other: Row[] } {
  const rows: Row[] = [];
  const merged = new Set<string>();

  for (const [canonicalKey, mapping] of Object.entries(canonicalMappings)) {
    if (!mapping.supported) continue;
    const linkedExt = mapping.extension_id
      ? extensions.find((e) => e.id === mapping.extension_id)
      : null;
    if (linkedExt) merged.add(linkedExt.id);
    const providerField =
      linkedExt?.provider_field ?? mapping.provider_field ?? null;
    rows.push({
      label: providerField ?? canonicalKey,
      canonicalKey,
      providerField,
      conversion: linkedExt?.conversion ?? 'translated',
      summary: linkedExt?.summary ?? mapping.mechanism,
    });
  }

  for (const ext of extensions) {
    if (merged.has(ext.id)) continue;
    rows.push({
      label: ext.provider_field ?? ext.name,
      canonicalKey: null,
      providerField: ext.provider_field ?? null,
      conversion: ext.conversion,
      summary: ext.summary,
    });
  }

  function sortRows(a: Row, b: Row): number {
    const c = CONVERSION_ORDER[a.conversion] - CONVERSION_ORDER[b.conversion];
    if (c !== 0) return c;
    return a.label.localeCompare(b.label);
  }

  return {
    fields: rows.filter((r) => r.providerField !== null).sort(sortRows),
    other: rows.filter((r) => r.providerField === null).sort(sortRows),
  };
}

// ---------------------------------------------------------------------------

describe('keyToSlug', () => {
  it('converts underscores to hyphens', () => {
    expect(keyToSlug('display_name')).toBe('display-name');
    expect(keyToSlug('disable_model_invocation')).toBe('disable-model-invocation');
  });

  it('leaves plain keys unchanged', () => {
    expect(keyToSlug('license')).toBe('license');
  });
});

describe('buildRows: canonical mappings', () => {
  it('produces a translated row for a supported mapping with no linked extension', () => {
    const { fields, other } = buildRows(
      {
        display_name: {
          supported: true,
          mechanism: 'yaml frontmatter key: name',
          provider_field: 'name',
        },
      },
      []
    );
    expect(fields).toHaveLength(1);
    expect(other).toHaveLength(0);
    expect(fields[0]).toMatchObject({
      providerField: 'name',
      canonicalKey: 'display_name',
      conversion: 'translated',
    });
  });

  it('skips unsupported mappings', () => {
    const { fields, other } = buildRows(
      {
        license: { supported: false, mechanism: 'not supported' },
      },
      []
    );
    expect(fields).toHaveLength(0);
    expect(other).toHaveLength(0);
  });

  it('lands a canonical mapping without provider_field in the "other" group', () => {
    const { fields, other } = buildRows(
      {
        canonical_filename: {
          supported: true,
          mechanism: 'Fixed filename SKILL.md required',
        },
      },
      []
    );
    expect(fields).toHaveLength(0);
    expect(other).toHaveLength(1);
    expect(other[0].canonicalKey).toBe('canonical_filename');
    expect(other[0].conversion).toBe('translated');
  });
});

describe('buildRows: provider extensions', () => {
  it('lands an extension with provider_field in the "fields" group', () => {
    const { fields, other } = buildRows(
      {},
      [
        {
          id: 'allowed_tools',
          name: 'Allowed Tools',
          summary: 'Pre-approve tools for this skill',
          provider_field: 'allowed-tools',
          conversion: 'embedded',
        },
      ]
    );
    expect(fields).toHaveLength(1);
    expect(other).toHaveLength(0);
    expect(fields[0]).toMatchObject({
      providerField: 'allowed-tools',
      canonicalKey: null,
      conversion: 'embedded',
    });
  });

  it('lands an extension without provider_field in the "other" group', () => {
    const { fields, other } = buildRows(
      {},
      [
        {
          id: 'supporting_files',
          name: 'Supporting Files',
          summary: 'Bundle templates alongside SKILL.md',
          conversion: 'not-portable',
        },
      ]
    );
    expect(fields).toHaveLength(0);
    expect(other).toHaveLength(1);
    expect(other[0].label).toBe('Supporting Files');
    expect(other[0].conversion).toBe('not-portable');
  });
});

describe('buildRows: merging via extension_id', () => {
  it('uses the extension summary/conversion when a mapping links to an extension', () => {
    const { fields } = buildRows(
      {
        display_name: {
          supported: true,
          mechanism: 'canonical name field',
          provider_field: 'name',
          extension_id: 'name_field_ext',
        },
      },
      [
        {
          id: 'name_field_ext',
          name: 'Name Field',
          summary: 'Extension-provided summary wins',
          conversion: 'translated',
          provider_field: 'name',
        },
      ]
    );
    expect(fields).toHaveLength(1);
    expect(fields[0].summary).toBe('Extension-provided summary wins');
  });

  it('does not double-render a merged extension in the other group', () => {
    const { fields, other } = buildRows(
      {
        display_name: {
          supported: true,
          mechanism: 'm',
          provider_field: 'name',
          extension_id: 'ext1',
        },
      },
      [
        {
          id: 'ext1',
          name: 'Merged Extension',
          summary: 'm',
          conversion: 'translated',
          provider_field: 'name',
        },
      ]
    );
    expect(fields).toHaveLength(1);
    expect(other).toHaveLength(0);
  });
});

describe('buildRows: sort order', () => {
  it('orders rows by conversion fate (translated first, not-portable last)', () => {
    const { other } = buildRows({}, [
      { id: 'a', name: 'A', summary: 's', conversion: 'not-portable' },
      { id: 'b', name: 'B', summary: 's', conversion: 'translated' },
      { id: 'c', name: 'C', summary: 's', conversion: 'embedded' },
      { id: 'd', name: 'D', summary: 's', conversion: 'dropped' },
      { id: 'e', name: 'E', summary: 's', conversion: 'preserved' },
    ]);
    expect(other.map((r) => r.conversion)).toEqual([
      'translated',
      'embedded',
      'dropped',
      'preserved',
      'not-portable',
    ]);
  });

  it('orders alphabetically within the same conversion fate', () => {
    const { fields } = buildRows({}, [
      { id: 'z', name: 'Z', summary: 's', conversion: 'embedded', provider_field: 'z-field' },
      { id: 'a', name: 'A', summary: 's', conversion: 'embedded', provider_field: 'a-field' },
      { id: 'm', name: 'M', summary: 's', conversion: 'embedded', provider_field: 'm-field' },
    ]);
    expect(fields.map((r) => r.providerField)).toEqual(['a-field', 'm-field', 'z-field']);
  });
});

describe('buildRows: empty state', () => {
  it('returns empty arrays for empty input', () => {
    const { fields, other } = buildRows({}, []);
    expect(fields).toHaveLength(0);
    expect(other).toHaveLength(0);
  });
});
