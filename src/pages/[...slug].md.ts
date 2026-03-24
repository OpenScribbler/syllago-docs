import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { entryToSimpleMarkdown } from 'starlight-llms-txt/entryToSimpleMarkdown';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
	const docs = await getCollection('docs', (doc) => !doc.data.draft);
	return docs.map((entry) => ({
		params: { slug: entry.id },
		props: { entry },
	}));
};

export const GET: APIRoute = async (context) => {
	const { entry } = context.props as {
		entry: Awaited<ReturnType<typeof getCollection<'docs'>>>[number];
	};
	const title = entry.data.hero?.title || entry.data.title;
	const description = entry.data.description;
	const raw = await entryToSimpleMarkdown(entry, context);
	// Strip Starlight's heading anchor links that leak into markdown as
	// [Section titled "..."](...) lines — these are sr-only in HTML but
	// become visible boilerplate in the markdown output.
	const markdown = raw
		.replace(/\n\[Section titled \u201c[^\u201d]*\u201d\]\(#[^)]*\)\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n');

	const sections = [`# ${title}`];
	if (description) sections.push(`> ${description}`);
	sections.push(markdown);

	return new Response(sections.join('\n\n'), {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
	});
};
