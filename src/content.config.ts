import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	glossary: defineCollection({
		loader: glob({ pattern: '**/*.yaml', base: './src/content/glossary' }),
		schema: z.object({
			term: z.string(),
			slug: z.string(),
			definition: z.string(),
			category: z.enum(['core', 'content-type', 'provider', 'ai-ecosystem', 'format']),
			aliases: z.array(z.string()).optional(),
			abbr: z.string().optional(),
			link: z.string().optional(),
			related: z.array(z.string()).optional(),
		}),
	}),
};
