import { describe, expect, test } from 'vitest';

import { calculateViolationMetrics, selectThreshold } from '../../../scripts/jev-style-eval';

function result(expected: 'violation' | 'compliant', probability: number) {
	return {
		id: `${expected}-${probability}`,
		rule: 'test',
		expected,
		type: 'paragraph' as const,
		text: 'Fixture text',
		outcome: probability >= 0.5 ? ('violation' as const) : ('compliant' as const),
		confidence: 0.8,
		probabilities: {
			violation: probability,
			compliant: 1 - probability,
			not_applicable: 0,
		},
	};
}

describe('semantic style metrics', () => {
	test('calculates violation precision and recall', () => {
		const metrics = calculateViolationMetrics(
			[result('violation', 0.9), result('violation', 0.4), result('compliant', 0.7), result('compliant', 0.1)],
			0.5,
		);

		expect(metrics).toEqual({
			threshold: 0.5,
			truePositive: 1,
			falsePositive: 1,
			trueNegative: 1,
			falseNegative: 1,
			precision: 0.5,
			recall: 0.5,
			f1: 0.5,
		});
	});

	test('selects the highest equally accurate threshold', () => {
		const metrics = selectThreshold([
			result('violation', 0.95),
			result('violation', 0.9),
			result('compliant', 0.4),
		]);

		expect(metrics.f1).toBe(1);
		expect(metrics.threshold).toBe(0.9);
	});
});
