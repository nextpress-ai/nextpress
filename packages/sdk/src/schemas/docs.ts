import { z } from "zod";
import { uuidSchema } from "./index.js";

/** The most links the docs header can show (the server keeps no more). */
export const MAX_DOCS_HEADER_LINKS = 6;

/** The most pages one reorder call can order (the server refuses more). */
export const MAX_DOCS_REORDER_ITEMS = 1000;

const docsFeaturesSchema = z
	.object({
		sidebar: z.boolean(),
		toc: z.boolean(),
		prevNext: z.boolean(),
		copyPage: z.boolean(),
	})
	.partial();

const docsLinkSchema = z.object({
	label: z.string().max(80),
	url: z.string().max(2048),
});

const docsItemKindSchema = z.enum(["page", "group"]);

export const listDocsQuerySchema = z.object({
	siteId: uuidSchema.optional(),
});

export const createDocsSchema = z.object({
	siteId: uuidSchema,
	name: z.string().trim().min(1).max(200),
	slug: z.string().max(200),
	logoUrl: z.string().max(2048).optional(),
	search: z.boolean().optional(),
	features: docsFeaturesSchema.optional(),
});

export const updateDocsSettingsSchema = z.object({
	title: z.string().max(200).optional(),
	logoUrl: z.string().max(2048).optional(),
	logoDarkUrl: z.string().max(2048).optional(),
	links: z.array(docsLinkSchema).max(MAX_DOCS_HEADER_LINKS).optional(),
	button: docsLinkSchema.optional(),
	search: z
		.object({
			show: z.boolean(),
			label: z.string().max(80),
			placeholder: z.string().max(120),
		})
		.partial()
		.optional(),
	features: docsFeaturesSchema.optional(),
});

export const addDocsItemSchema = z.object({
	parentId: uuidSchema,
	title: z.string().trim().min(1).max(200),
	kind: docsItemKindSchema,
	slug: z.string().max(200).optional(),
	position: z.number().int().min(0).optional(),
});

export const updateDocsItemSchema = z.object({
	title: z.string().trim().min(1).max(200).optional(),
	slug: z.string().max(200).optional(),
	parentId: uuidSchema.optional(),
	hidden: z.boolean().optional(),
	kind: docsItemKindSchema.optional(),
});

export const reorderDocsSchema = z.object({
	parentId: uuidSchema,
	orderedIds: z.array(uuidSchema).max(MAX_DOCS_REORDER_ITEMS),
});

export const exportDocsQuerySchema = z.object({
	includeFiles: z.boolean().optional(),
});
