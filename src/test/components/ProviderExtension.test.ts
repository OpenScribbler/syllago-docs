import { describe, it, expect } from 'vitest';

// Helper extracted from ProviderExtension.astro:
// Maps required field value to CSS badge class modifier.
function badgeClass(required: boolean | null | undefined): string {
  if (required === true) return 'provider-badge--required';
  if (required === false) return 'provider-badge--optional';
  return 'provider-badge--unspecified';
}

// Helper extracted from ProviderExtension.astro:
// Maps required field value to badge label text.
function badgeLabel(required: boolean | null | undefined): string {
  if (required === true) return 'Required';
  if (required === false) return 'Optional';
  return 'Unspecified';
}

describe('badgeClass (D12)', () => {
  it('returns required class for true', () => {
    expect(badgeClass(true)).toBe('provider-badge--required');
  });

  it('returns optional class for false', () => {
    expect(badgeClass(false)).toBe('provider-badge--optional');
  });

  it('returns unspecified class for null', () => {
    expect(badgeClass(null)).toBe('provider-badge--unspecified');
  });

  it('returns unspecified class for undefined', () => {
    expect(badgeClass(undefined)).toBe('provider-badge--unspecified');
  });
});

describe('badgeLabel (D12)', () => {
  it('labels true as Required', () => {
    expect(badgeLabel(true)).toBe('Required');
  });

  it('labels false as Optional', () => {
    expect(badgeLabel(false)).toBe('Optional');
  });

  it('labels null as Unspecified', () => {
    expect(badgeLabel(null)).toBe('Unspecified');
  });
});
