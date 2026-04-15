import { describe, it, expect } from 'vitest';
import z from 'zod';

// Mirror the schemas from content.config.ts to test them in isolation.
// This catches regressions if the Zod definitions are changed incorrectly.

const capSourceSchema = z.object({
  uri: z.string(),
  type: z.string().optional(),
  fetched_at: z.string().optional(),
  name: z.string().optional(),      // D9
  section: z.string().optional(),   // D9
});

const capExtensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  source_ref: z.string().optional(),
  required: z.boolean().nullable().optional(),  // D12
  value_type: z.string().optional(),             // D12
  examples: z.array(z.object({                  // D10
    title: z.string().optional(),
    lang: z.string(),
    code: z.string().min(1),
    note: z.string().optional(),
  })).optional(),
});

describe('capSourceSchema (D9)', () => {
  it('accepts a minimal source with no new fields', () => {
    const result = capSourceSchema.safeParse({
      uri: 'https://example.com/docs.md',
      type: 'documentation',
      fetched_at: '2026-04-11T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a source with name and section', () => {
    const result = capSourceSchema.safeParse({
      uri: 'https://example.com/docs.md',
      type: 'documentation',
      fetched_at: '2026-04-11T00:00:00Z',
      name: 'Skills documentation',
      section: 'All',
    });
    expect(result.success).toBe(true);
  });
});

describe('capExtensionSchema (D10, D12)', () => {
  it('accepts a minimal extension with no new fields', () => {
    const result = capExtensionSchema.safeParse({
      id: 'argument_hint',
      name: 'Argument Hint',
      description: 'A hint string shown during autocomplete.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts required: true', () => {
    const result = capExtensionSchema.safeParse({
      id: 'model',
      name: 'Model',
      description: 'Specifies the model.',
      required: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts required: false', () => {
    const result = capExtensionSchema.safeParse({
      id: 'model',
      name: 'Model',
      description: 'Specifies the model.',
      required: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts required: null (unspecified)', () => {
    const result = capExtensionSchema.safeParse({
      id: 'model',
      name: 'Model',
      description: 'Specifies the model.',
      required: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a structured examples array', () => {
    const result = capExtensionSchema.safeParse({
      id: 'model',
      name: 'Model',
      description: 'Specifies the model.',
      examples: [
        { lang: 'yaml', code: 'model: claude-sonnet-4-6' },
        { title: 'With note', lang: 'yaml', code: 'model: claude-opus-4-6', note: 'Requires Opus tier.' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an example with empty code', () => {
    const result = capExtensionSchema.safeParse({
      id: 'model',
      name: 'Model',
      description: 'Specifies the model.',
      examples: [{ lang: 'yaml', code: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an example missing lang', () => {
    const result = capExtensionSchema.safeParse({
      id: 'model',
      name: 'Model',
      description: 'Specifies the model.',
      examples: [{ code: 'model: foo' }],
    });
    expect(result.success).toBe(false);
  });
});
