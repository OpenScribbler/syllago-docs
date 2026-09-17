import { describe, expect, test } from 'vitest';

import { extractProseBlocks, extractStyleUnits } from '../../../scripts/jev-style-demo';

describe('extractProseBlocks', () => {
	test('extracts prose with its section and source line', () => {
		const source = `---
title: Demo
---

# Start here

This paragraph is long enough to be evaluated as documentation prose.

## Next step

- This list item also contains enough prose to be evaluated by the style demo.
`;

		expect(extractProseBlocks(source)).toEqual([
			{
				id: 0,
				line: 7,
				section: 'Start here',
				text: 'This paragraph is long enough to be evaluated as documentation prose.',
			},
			{
				id: 1,
				line: 11,
				section: 'Next step',
				text: 'This list item also contains enough prose to be evaluated by the style demo.',
			},
		]);
	});

	test('skips code fences, tables, imports, and JSX components', () => {
		const source = `import Widget from './Widget.astro';

# Example

\`\`\`sh
this command should not become a prose block even though it is long
\`\`\`

| Column | Value |
| --- | --- |

<Widget />

Only this sufficiently long sentence should be returned from the document.
`;

		expect(extractProseBlocks(source)).toEqual([
			{
				id: 0,
				line: 14,
				section: 'Example',
				text: 'Only this sufficiently long sentence should be returned from the document.',
			},
		]);
	});

	test('adds headings with the prose that immediately follows them', () => {
		const source = `# Configure the registry

Set the registry URL before you install shared packages from your team.

## Verify the setup

Run the status command to confirm that the registry is available.
`;

		expect(extractStyleUnits(source)).toEqual([
			{
				id: 0,
				type: 'heading',
				line: 1,
				section: 'Configure the registry',
				text: 'Configure the registry',
				followingText: 'Set the registry URL before you install shared packages from your team.',
			},
			{
				id: 1,
				type: 'paragraph',
				line: 3,
				section: 'Configure the registry',
				text: 'Set the registry URL before you install shared packages from your team.',
			},
			{
				id: 2,
				type: 'heading',
				line: 5,
				section: 'Verify the setup',
				text: 'Verify the setup',
				followingText: 'Run the status command to confirm that the registry is available.',
			},
			{
				id: 3,
				type: 'paragraph',
				line: 7,
				section: 'Verify the setup',
				text: 'Run the status command to confirm that the registry is available.',
			},
		]);
	});

	test('keeps adjacent list items as separate prose units', () => {
		const source = `# Options

1. Choose the local registry when only this project needs the package.
2. Choose the global registry when every project needs the package.
`;

		expect(extractProseBlocks(source)).toEqual([
			{
				id: 0,
				line: 3,
				section: 'Options',
				text: 'Choose the local registry when only this project needs the package.',
			},
			{
				id: 1,
				line: 4,
				section: 'Options',
				text: 'Choose the global registry when every project needs the package.',
			},
		]);
	});

	test('does not treat comments in fenced code as headings', () => {
		const source = `# Install dependencies

\`\`\`bash
# Arch
sudo pacman -S example
\`\`\`

Run the verification command after the dependency installation completes.
`;

		expect(extractStyleUnits(source).filter((unit) => unit.type === 'heading')).toEqual([
			{
				id: 0,
				type: 'heading',
				line: 1,
				section: 'Install dependencies',
				text: 'Install dependencies',
				followingText: 'Run the verification command after the dependency installation completes.',
			},
		]);
	});
});
