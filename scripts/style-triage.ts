interface ValeFinding {
	Check: string;
	Line: number;
	Severity: 'error' | 'warning' | 'suggestion';
	Message: string;
	Match?: string;
	Link?: string;
}

interface JevFinding {
	line: number;
	section: string;
	rule: string;
	label: string;
	source: string;
	text: string;
	probability: number;
	status: 'flag' | 'review';
}

export interface PageTriage {
	file: string;
	vale: ValeFinding[];
	jev: JevFinding[];
	jevModel: string;
	jevUsage: { input_tokens: number; output_tokens: number };
}

const DEFAULT_FILES = [
	'src/content/docs/getting-started/why-syllago.mdx',
	'src/content/docs/getting-started/quick-start.mdx',
	'src/content/docs/advanced/sandbox.mdx',
];

function parseArgs() {
	const args = process.argv.slice(2);
	const files: string[] = [];
	let jsonOutput: string | undefined;
	let markdownOutput: string | undefined;
	for (let index = 0; index < args.length; index += 1) {
		if (args[index] === '--json-output') jsonOutput = args[++index];
		else if (args[index] === '--markdown-output') markdownOutput = args[++index];
		else if (args[index] === '--help' || args[index] === '-h') {
			console.log(
				'Usage: bun run style:triage -- [files...] [--json-output <path>] [--markdown-output <path>]',
			);
			process.exit(0);
		} else files.push(args[index]);
	}
	return { files: files.length > 0 ? files : DEFAULT_FILES, jsonOutput, markdownOutput };
}

async function run(command: string[], acceptedExitCodes = [0]) {
	const process = Bun.spawn(command, { stdout: 'pipe', stderr: 'pipe', env: Bun.env });
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
		process.exited,
	]);
	if (!acceptedExitCodes.includes(exitCode)) {
		throw new Error(`${command.join(' ')} exited ${exitCode}: ${stderr.trim()}`);
	}
	return stdout;
}

async function triagePage(file: string): Promise<PageTriage> {
	if (!(await Bun.file(file).exists())) throw new Error(`File not found: ${file}`);
	const valeJson = JSON.parse(await run(['vale', '--output=JSON', file], [0, 1])) as Record<
		string,
		ValeFinding[]
	>;
	const jevResult = JSON.parse(
		await run(['bun', 'scripts/jev-style-demo.ts', file, '--json']),
	) as {
		model: string;
		usage: { input_tokens: number; output_tokens: number };
		findings: JevFinding[];
	};
	return {
		file,
		vale: valeJson[file] ?? [],
		jev: jevResult.findings,
		jevModel: jevResult.model,
		jevUsage: jevResult.usage,
	};
}

function escapeCell(value: string) {
	return value.replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

export function renderMarkdown(pages: PageTriage[], generatedAt: string) {
	const valeCount = pages.reduce((total, page) => total + page.vale.length, 0);
	const jevCount = pages.reduce((total, page) => total + page.jev.length, 0);
	const jevFlags = pages.reduce(
		(total, page) => total + page.jev.filter((finding) => finding.status === 'flag').length,
		0,
	);
	const lines = [
		'# Vale + Jev style triage',
		'',
		`Generated: ${generatedAt}`,
		'',
		`Three-page trial: **${valeCount} Vale findings**, **${jevCount} Jev candidates** (${jevFlags} flags; ${jevCount - jevFlags} reviews).`,
		'',
		'Jev flags are prioritized candidates, not automatically proven violations. Review items are deliberately uncertain cases for human or editing-LLM triage.',
	];

	for (const page of pages) {
		lines.push('', `## ${page.file}`, '');
		const queue = [
			...page.jev.map((finding) => ({
				priority: finding.status === 'flag' ? 0 : 2,
				line: finding.line,
				source: 'Jev',
				severity: `${finding.status} ${finding.probability.toFixed(2)}`,
				rule: finding.label,
				message: finding.text,
			})),
			...page.vale.map((finding) => ({
				priority: finding.Severity === 'error' ? 1 : finding.Severity === 'warning' ? 3 : 4,
				line: finding.Line,
				source: 'Vale',
				severity: finding.Severity,
				rule: finding.Check,
				message: finding.Message,
			})),
		].sort((left, right) => left.priority - right.priority || left.line - right.line);

		if (queue.length === 0) {
			lines.push('No findings.');
			continue;
		}
		lines.push('| Priority | Line | Source | Rule | Finding |', '| --- | ---: | --- | --- | --- |');
		for (const finding of queue) {
			lines.push(
				`| ${escapeCell(finding.severity)} | ${finding.line} | ${finding.source} | ${escapeCell(finding.rule)} | ${escapeCell(finding.message)} |`,
			);
		}
	}

	return `${lines.join('\n')}\n`;
}

async function main() {
	const { files, jsonOutput, markdownOutput } = parseArgs();
	if (!process.env.TYPESAFE_API_KEY?.trim()) throw new Error('TYPESAFE_API_KEY is not set.');
	const pages = await Promise.all(files.map(triagePage));
	const generatedAt = new Date().toISOString();
	const report = { generated_at: generatedAt, pages };
	const json = `${JSON.stringify(report, null, 2)}\n`;
	const markdown = renderMarkdown(pages, generatedAt);
	if (jsonOutput) await Bun.write(jsonOutput, json);
	if (markdownOutput) await Bun.write(markdownOutput, markdown);
	if (!jsonOutput && !markdownOutput) process.stdout.write(markdown);
	else console.error(`Wrote ${[jsonOutput, markdownOutput].filter(Boolean).join(' and ')}`);
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
