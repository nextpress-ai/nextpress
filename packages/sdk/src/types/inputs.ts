import type { z } from "zod";
import type {
	blockConfigSchema,
	createBlogSchema,
	createCommentSchema,
	createPageSchema,
	createPostSchema,
	createSiteSchema,
	createTemplateSchema,
	createUserSchema,
	duplicateTemplateSchema,
	listBlogsQuerySchema,
	listCommentsQuerySchema,
	listMediaQuerySchema,
	listPagesQuerySchema,
	listPostsQuerySchema,
	listTemplatesQuerySchema,
	listUsersQuerySchema,
	partialSettingsSchema,
	setOptionSchema,
	setupSchema,
	updateBlogSchema,
	updateCommentSchema,
	updateMediaSchema,
	updatePageSchema,
	updatePostSchema,
	updateSiteInfoSchema,
	updateSiteSchema,
	updateTemplateSchema,
	updateUserSchema,
	uploadMediaSchema,
	wpDiscoverSchema,
	wpImportPagesSchema,
	wpImportPostsSchema,
} from "../schemas/index.js";

export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export type ListPagesQuery = z.infer<typeof listPagesQuerySchema>;
export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;

export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type DuplicateTemplateInput = z.infer<typeof duplicateTemplateSchema>;

export type ListBlogsQuery = z.infer<typeof listBlogsQuerySchema>;
export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;

export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;
export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
export type UpdateSiteInfoInput = z.infer<typeof updateSiteInfoSchema>;

export type PartialSettingsInput = z.infer<typeof partialSettingsSchema>;
export type SetOptionInput = z.infer<typeof setOptionSchema>;
export type SetupInput = z.infer<typeof setupSchema>;

export type WpDiscoverInput = z.infer<typeof wpDiscoverSchema>;
export type WpImportPostsInput = z.infer<typeof wpImportPostsSchema>;
export type WpImportPagesInput = z.infer<typeof wpImportPagesSchema>;

export type BlockConfigInput = z.infer<typeof blockConfigSchema>;
