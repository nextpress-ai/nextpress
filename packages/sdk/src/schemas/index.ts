import { z } from "zod";
import {
	CONTAINER_HTML_TAG_NAMES,
	GROUP_HTML_TAG_NAMES,
	ICON_SET_IDS,
	PAGE_ICON_DEFAULT_SETS,
	REACT_ICONS_PREFIXES,
	STANDARD_META_TAG_NAMES,
} from "../types/page-other.js";

export const uuidSchema = z.string().uuid();

export const contentStatusSchema = z.enum(["publish", "draft", "preview", "private", "any"]);

export const paginationSchema = z.object({
	page: z.number().int().positive().optional(),
	per_page: z.number().int().positive().max(100).optional(),
});

export const siteIdSchema = z.object({
	siteId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({
	id: uuidSchema,
});

export const iconSetIdSchema = z.enum(ICON_SET_IDS);

export const iconReferenceSchema = z.object({
	iconSet: iconSetIdSchema.optional(),
	iconName: z.string().min(1),
	size: z.number().optional(),
	color: z.string().optional(),
	strokeWidth: z.number().optional(),
});

const metaTagNameSchema = z.union([
	z.enum(STANDARD_META_TAG_NAMES),
	z.string().regex(/^(og|twitter|article):[a-z0-9][a-z0-9:_-]*$/i),
	z.string().regex(/^[a-z0-9][a-z0-9:_-]*$/i),
]);

export const pageIconSettingsSchema = z.object({
	defaultSet: z.enum(PAGE_ICON_DEFAULT_SETS),
	allowedSets: z.array(z.enum(REACT_ICONS_PREFIXES)).optional(),
	defaultSize: z.number().int().min(8).max(256).optional(),
});

export const pageOtherSchema = z
	.object({
		seo: z
			.object({
				metaTitle: z.string().optional(),
				metaDescription: z.string().optional(),
				canonicalUrl: z.string().optional(),
				noIndex: z.boolean().optional(),
				customMeta: z
					.array(
						z.object({
							name: metaTagNameSchema,
							content: z.string(),
						}),
					)
					.optional(),
			})
			.optional(),
		design: z
			.object({
				fontFamily: z.string().optional(),
				containerWidth: z.string().optional(),
				padding: z.string().optional(),
			})
			.optional(),
		icons: pageIconSettingsSchema.optional(),
		isBlogPage: z.boolean().optional(),
		blogId: z.string().uuid().optional(),
		categories: z.array(z.string()).optional(),
		tags: z.array(z.string()).optional(),
	})
	.passthrough();

export const groupHtmlTagSchema = z.enum(GROUP_HTML_TAG_NAMES);
export const containerHtmlTagSchema = z.enum(CONTAINER_HTML_TAG_NAMES);

export const blockContentSchema: z.ZodType<unknown> = z.union([
	z.object({
		kind: z.literal("text"),
		value: z.string(),
		textAlign: z.string().optional(),
		dropCap: z.boolean().optional(),
		format: z.literal("html").optional(),
		level: z.number().int().min(1).max(6).optional(),
	}),
	z.object({
		kind: z.literal("markdown"),
		value: z.string(),
		textAlign: z.string().optional(),
	}),
	z.object({
		kind: z.literal("media"),
		url: z.string().refine(
			(value) => {
				if (value.startsWith("/")) {
					return true;
				}
				try {
					const parsed = new URL(value);
					return parsed.protocol === "http:" || parsed.protocol === "https:";
				} catch {
					return false;
				}
			},
			{ message: "Media URL must be http(s) or a site-relative path" },
		),
		alt: z.string().optional(),
		caption: z.string().optional(),
		mediaType: z.enum(["image", "video", "audio"]),
	}),
	z.object({
		kind: z.literal("html"),
		value: z.string(),
		sanitized: z.boolean(),
	}),
	z.object({
		kind: z.literal("structured"),
		data: z.record(z.unknown()),
	}),
	z.object({ kind: z.literal("empty") }),
	z.undefined(),
]);

export const blockConfigSchema: z.ZodType<unknown> = z.lazy(() =>
	z.object({
		id: z.string().min(1),
		name: z.string().min(1),
		type: z.enum(["block", "container"]),
		parentId: z.string().nullable(),
		label: z.string().optional(),
		category: z.enum(["basic", "form", "layout", "media", "advanced", "post"]).optional(),
		content: blockContentSchema,
		styles: z.record(z.union([z.string(), z.number(), z.null()])).optional(),
		customCss: z.string().optional(),
		children: z.array(blockConfigSchema).optional(),
		settings: z.record(z.unknown()).optional(),
		requires: z.string().optional(),
		isReactive: z.boolean().optional(),
		other: z.record(z.unknown()).optional(),
	}),
);

export const listPostsQuerySchema = paginationSchema.extend({
	status: contentStatusSchema.optional(),
	blog_id: uuidSchema.optional(),
	/** Dashboard alias — normalized to `blog_id` before the request is sent. */
	blogId: uuidSchema.optional(),
	siteId: z.string().uuid().optional(),
});

export const createPostSchema = z.object({
	title: z.string().min(1),
	slug: z.string().optional(),
	content: z.string().optional(),
	excerpt: z.string().optional(),
	status: z.string().optional(),
	blogId: uuidSchema,
	blocks: z.array(blockConfigSchema).optional(),
	featuredImageId: uuidSchema.nullable().optional(),
	publishedAt: z.string().datetime().optional(),
	other: z.record(z.unknown()).optional(),
});

export const updatePostSchema = z
	.object({
		expectedVersion: z.number().int().min(0),
	})
	.merge(createPostSchema.partial().omit({ blogId: true }));

export const listPagesQuerySchema = paginationSchema.extend({
	status: contentStatusSchema.optional(),
	siteId: z.string().uuid().optional(),
});

export const createPageSchema = z.object({
	title: z.string().min(1),
	slug: z.string().optional(),
	content: z.string().optional(),
	status: z.string().optional(),
	siteId: z.string().uuid().optional(),
	blocks: z.array(blockConfigSchema).optional(),
	publishedAt: z.string().datetime().optional(),
	other: pageOtherSchema.optional(),
});

export const updatePageSchema = z
	.object({
		expectedVersion: z.number().int().min(0),
	})
	.merge(createPageSchema.partial());

export const listBlogsQuerySchema = paginationSchema.extend({
	status: contentStatusSchema.optional(),
	siteId: z.string().uuid().optional(),
});

export const createBlogSchema = z.object({
	name: z.string().min(1),
	slug: z.string().optional(),
	siteId: z.string().uuid().optional(),
});

export const updateBlogSchema = createBlogSchema.partial();

export const listCommentsQuerySchema = paginationSchema.extend({
	post_id: uuidSchema.optional(),
	status: z.string().optional(),
	siteId: z.string().uuid().optional(),
});

export const createCommentSchema = z.object({
	postId: uuidSchema,
	content: z.string().min(1),
	authorId: uuidSchema.optional(),
	authorName: z.string().optional(),
	authorEmail: z.string().email().optional(),
	parentId: uuidSchema.optional(),
	status: z.string().optional(),
});

export const updateCommentSchema = createCommentSchema.partial().omit({
	postId: true,
});

export const listMediaQuerySchema = paginationSchema.extend({
	mime_type: z.string().optional(),
	siteId: z.string().uuid().optional(),
});

export const updateMediaSchema = z.object({
	alt: z.string().optional(),
	caption: z.string().optional(),
	description: z.string().optional(),
});

export const uploadMediaSchema = z.object({
	file: z.instanceof(Blob),
	alt: z.string().optional(),
	caption: z.string().optional(),
	description: z.string().optional(),
	siteId: z.string().uuid().optional(),
});

export const listUsersQuerySchema = paginationSchema;

export const createUserSchema = z.object({
	username: z.string().min(1),
	email: z.string().email(),
	password: z.string().min(8),
	name: z.string().optional(),
	role: z.string().optional(),
});

export const updateUserSchema = createUserSchema
	.partial()
	.omit({ password: true })
	.extend({
		password: z.string().min(8).optional(),
	});

export const createSiteSchema = z.object({
	name: z.string().min(1),
	siteUrl: z.string().url().optional(),
	description: z.string().optional(),
});

export const updateSiteSchema = createSiteSchema.partial().extend({
	isDefault: z.boolean().optional(),
});

export const updateSiteInfoSchema = z.object({
	logoUrl: z.string().url().nullable().optional(),
	faviconUrl: z.string().url().nullable().optional(),
	activeThemeId: z.string().uuid().nullable().optional(),
});

export const generalSettingsSchema = z.object({
	siteName: z.string().min(1).max(255),
	siteDescription: z.string().max(1000),
	siteUrl: z.string().url().or(z.literal("")),
	adminEmail: z.string().email().or(z.literal("")),
	timezone: z.string().min(1),
	dateFormat: z.string().min(1),
	timeFormat: z.string().min(1),
});

export const writingSettingsSchema = z.object({
	richTextEnabled: z.boolean(),
	autosaveEnabled: z.boolean(),
	syntaxHighlighting: z.boolean(),
});

export const readingSettingsSchema = z.object({
	postsPerPage: z.number().int().positive().max(100),
	rssPosts: z.number().int().positive().max(100),
	rssEnabled: z.boolean(),
	discourageSearchIndexing: z.boolean(),
});

export const discussionSettingsSchema = z.object({
	enableComments: z.boolean(),
	moderateComments: z.boolean(),
	emailNotifications: z.boolean(),
	enableRegistration: z.boolean(),
	defaultRole: z.string().min(1),
});

export const systemSettingsSchema = z.object({
	cachingEnabled: z.boolean(),
	compressionEnabled: z.boolean(),
	securityHeadersEnabled: z.boolean(),
	debugMode: z.boolean(),
	restApiEnabled: z.boolean(),
	graphqlEnabled: z.boolean(),
	webhooksEnabled: z.boolean(),
});

export const partialSettingsSchema = z.object({
	general: generalSettingsSchema.partial().optional(),
	writing: writingSettingsSchema.partial().optional(),
	reading: readingSettingsSchema.partial().optional(),
	discussion: discussionSettingsSchema.partial().optional(),
	system: systemSettingsSchema.partial().optional(),
});

export const signInEmailSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});

export const signUpEmailSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	name: z.string().min(1),
	username: z.string().optional(),
	firstName: z.string().optional(),
	lastName: z.string().optional(),
});

export const setOptionSchema = z.object({
	name: z.string().min(1),
	value: z.unknown(),
	siteId: z.string().uuid().optional(),
});

export const listTemplatesQuerySchema = paginationSchema.extend({
	type: z.enum(["header", "footer", "page", "post", "popup"]).optional(),
});

export const createTemplateSchema = z.object({
	name: z.string().min(1),
	type: z.enum(["header", "footer", "page", "post", "popup"]),
	description: z.string().optional(),
	blocks: z.array(blockConfigSchema).optional(),
	settings: z.record(z.unknown()).optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const duplicateTemplateSchema = z.object({
	name: z.string().min(1),
});

export const wpDiscoverSchema = z.object({
	siteUrl: z.string().url(),
});

export const wpImportPostsSchema = z.object({
	baseUrl: z.string().url(),
	blogId: uuidSchema,
	wpIds: z.array(z.number().int().positive()).min(1),
	featuredImageMode: z.enum(["reference", "copy"]).optional(),
});

export const wpImportPagesSchema = z.object({
	baseUrl: z.string().url(),
	siteId: z.string().uuid().optional(),
	wpIds: z.array(z.number().int().positive()).min(1),
	featuredImageMode: z.enum(["reference", "copy"]).optional(),
});

export const setupSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	username: z.string().optional(),
	siteName: z.string().min(1),
	domain: z.string().min(1),
});

export const nextpressOptionsSchema = z.object({
	baseUrl: z.string().url(),
	apiKey: z.string().min(1),
	siteId: z.string().uuid(),
	timeout: z.number().int().positive().optional(),
});

export const previewContentTypeSchema = z.enum(["page", "post", "template"]);

export const createPreviewTokenSchema = z.object({
	contentType: previewContentTypeSchema,
	contentId: uuidSchema,
	expiresInSeconds: z.number().int().positive().max(3600).optional(),
	siteId: uuidSchema.optional(),
});

export const restorePageVersionSchema = z.object({
	version: z.number().int().min(0),
});
