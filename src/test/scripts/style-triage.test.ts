import { describe, expect, test } from 'vitest';

import { renderMarkdown, type PageTriage } from '../../../scripts/style-triage';

describe('style triage report', () => {
	test('orders flags before Vale errors and review candidates', () => {
		const page: PageTriage = {
			file: 'docs/example.mdx',
			jevModel: 'jev-test',
			jevUsage: { input_tokens: 1, output_tokens: 1 },
			jev: [
				{
					line: 2,
					section: 'Example',
					rule: 'actor_clarity',
					label: 'unclear actor',
					source: 'https://example.com',
					text: 'This review candidate should appear third.',
					probability: 0.6,
					status: 'review',
				},
				{
					line: 8,
					section: 'Example',
					rule: 'single_idea',
					label: 'paragraph focus',
					source: 'https://example.com',
					text: 'This flag should appear first.',
					probability: 0.9,
					status: 'flag',
				},
			],
			vale: [
				{
					Check: 'Google.Passive',
					Line: 4,
					Severity: 'error',
					Message: 'This error should appear second.',
				},
			],
		};

		const markdown = renderMarkdown([page], '2026-09-17T00:00:00.000Z');
		expect(markdown.indexOf('This flag should appear first.')).toBeLessThan(
			markdown.indexOf('This error should appear second.'),
		);
		expect(markdown.indexOf('This error should appear second.')).toBeLessThan(
			markdown.indexOf('This review candidate should appear third.'),
		);
	});
});
