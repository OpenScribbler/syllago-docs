import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';

const hookEventSchema = z.object({
	canonical: z.string(),
	nativeName: z.string(),
	category: z.string().optional(),
});

const contentCapabilitySchema = z.object({
	supported: z.boolean(),
	fileFormat: z.string().optional(),
	installMethod: z.string().optional(),
	installPath: z.string().optional(),
	symlinkSupport: z.boolean(),
	discoveryPaths: z.array(z.string()).optional(),
	hookEvents: z.array(hookEventSchema).optional(),
	hookTypes: z.array(z.string()).optional(),
	configLocation: z.string().optional(),
	mcpTransports: z.array(z.string()).optional(),
	frontmatterFields: z.array(z.string()).optional(),
});

const providerSchema = z.object({
	name: z.string(),
	slug: z.string(),
	configDir: z.string(),
	emitPath: z.string().optional(),
	content: z.record(z.string(), contentCapabilitySchema),
});

const capSourceSchema = z.object({
	uri: z.string(),
	type: z.string(),
	fetched_at: z.string(),
});

const capMappingSchema = z.object({
	supported: z.boolean(),
	mechanism: z.string(),
	paths: z.array(z.string()).optional(),
});

const capExtensionSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	source_ref: z.string().optional(),
});

const capabilitySchema = z.object({
	id: z.string(),
	provider: z.string(),
	contentType: z.string(),
	status: z.string(),
	lastChangedAt: z.string(),
	sources: z.array(capSourceSchema),
	canonicalMappings: z.record(z.string(), capMappingSchema),
	providerExtensions: z.array(capExtensionSchema),
});

const canonicalKeyProviderSupportSchema = z.object({
	supported: z.boolean(),
	mechanism: z.string(),
});

const canonicalKeySchema = z.object({
	id: z.string(),
	key: z.string(),
	contentType: z.string(),
	description: z.string(),
	type: z.string(),
	providers: z.record(z.string(), canonicalKeyProviderSupportSchema),
});

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	providers: defineCollection({
		loader: glob({ pattern: '*.json', base: './src/data/providers' }),
		schema: providerSchema,
	}),
	capabilities: defineCollection({
		loader: glob({ pattern: '*.json', base: './src/data/capabilities' }),
		schema: capabilitySchema,
	}),
	'canonical-keys': defineCollection({
		loader: glob({ pattern: '*.json', base: './src/data/canonical-keys' }),
		schema: canonicalKeySchema,
	}),
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
