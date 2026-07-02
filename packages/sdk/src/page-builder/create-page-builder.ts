import type { BlocksBuilder } from "../blocks/build-block.js";
import type { PagesResource } from "../resources/pages.js";
import type { PostsResource } from "../resources/posts.js";
import type { PreviewResource } from "../resources/preview.js";
import type { TemplatesResource } from "../resources/templates.js";
import type { BlockConfig, Page, Post, Template } from "../types/domain.js";
import type { UpdatePageInput, UpdatePostInput } from "../types/inputs.js";

type PageBuilderDeps = {
	pages: PagesResource;
	posts: PostsResource;
	templates: TemplatesResource;
	preview: PreviewResource;
	blocks: BlocksBuilder;
};

/**
 * High-level page builder workflows mirroring the dashboard editor:
 * load → edit blocks → save → preview → publish.
 */
export function createPageBuilder({ pages, posts, templates, preview, blocks }: PageBuilderDeps) {
	return {
		/** Load a page for editing (by UUID or slug). */
		loadPage: async ({ id }: { id: string }): Promise<Page> => pages.get({ id }),

		/** Save page content and metadata (full block tree replacement). */
		savePage: async ({ id, ...input }: { id: string } & UpdatePageInput): Promise<Page> =>
			pages.update({ id, ...input }),

		/** Save only the block tree on a page. */
		savePageBlocks: async ({
			id,
			blocks: blockTree,
		}: {
			id: string;
			blocks: BlockConfig[];
		}): Promise<Page> => pages.update({ id, blocks: blockTree }),

		/** Publish a page (sets status to publish). */
		publishPage: async ({
			id,
			blocks: blockTree,
		}: {
			id: string;
			blocks?: BlockConfig[];
		}): Promise<Page> =>
			pages.update({
				id,
				status: "publish",
				publishedAt: new Date().toISOString(),
				...(blockTree ? { blocks: blockTree } : {}),
			}),

		/** Move a page back to draft. */
		unpublishPage: async ({ id }: { id: string }): Promise<Page> =>
			pages.update({ id, status: "draft" }),

		/** Preview page payload used by the builder preview pane. */
		previewPage: async ({ id }: { id: string }): Promise<Page> => preview.page({ id }),

		/** Create a new page seeded from a template's block tree. */
		createPageFromTemplate: async ({
			templateId,
			title,
			slug,
			status = "draft",
		}: {
			templateId: string;
			title: string;
			slug?: string;
			status?: string;
		}): Promise<Page> => {
			const template = await templates.get({ id: templateId });
			return pages.create({
				title,
				slug,
				status,
				blocks: template.blocks ?? [],
			});
		},

		/** Replace or append a template's blocks onto an existing page. */
		applyTemplateToPage: async ({
			pageId,
			templateId,
			mode = "replace",
		}: {
			pageId: string;
			templateId: string;
			mode?: "replace" | "append";
		}): Promise<Page> => {
			const [page, template] = await Promise.all([
				pages.get({ id: pageId }),
				templates.get({ id: templateId }),
			]);
			const templateBlocks = template.blocks ?? [];
			const nextBlocks =
				mode === "append" ? [...(page.blocks ?? []), ...templateBlocks] : templateBlocks;
			return pages.update({ id: pageId, blocks: nextBlocks });
		},

		/** Load a post for editing. */
		loadPost: async ({ id }: { id: string }): Promise<Post> => posts.get({ id }),

		/** Save post content including blocks. */
		savePost: async ({ id, ...input }: { id: string } & UpdatePostInput): Promise<Post> =>
			posts.update({ id, ...input }),

		savePostBlocks: async ({
			id,
			blocks: blockTree,
		}: {
			id: string;
			blocks: BlockConfig[];
		}): Promise<Post> => posts.update({ id, blocks: blockTree }),

		publishPost: async ({
			id,
			blocks: blockTree,
		}: {
			id: string;
			blocks?: BlockConfig[];
		}): Promise<Post> =>
			posts.update({
				id,
				status: "publish",
				publishedAt: new Date().toISOString(),
				...(blockTree ? { blocks: blockTree } : {}),
			}),

		/** Create a 5-minute share preview link (no login required to open). */
		createPagePreviewLink: async ({
			id,
			expiresInSeconds = 300,
		}: {
			id: string;
			expiresInSeconds?: number;
		}) => preview.createShareToken({ contentType: "page", contentId: id, expiresInSeconds }),

		createPostPreviewLink: async ({
			id,
			expiresInSeconds = 300,
		}: {
			id: string;
			expiresInSeconds?: number;
		}) => preview.createShareToken({ contentType: "post", contentId: id, expiresInSeconds }),

		previewPost: async ({ id }: { id: string }): Promise<Post> => preview.post({ id }),

		/** Load a template for editing. */
		loadTemplate: async ({ id }: { id: string }): Promise<Template> => templates.get({ id }),

		saveTemplateBlocks: async ({
			id,
			blocks: blockTree,
		}: {
			id: string;
			blocks: BlockConfig[];
		}): Promise<Template> => templates.update({ id, blocks: blockTree }),

		/** Convenience: starter layout with heading + paragraph. */
		starterLayout: (): BlockConfig[] => [
			blocks.heading({ text: "Page title", level: 1 }),
			blocks.paragraph({ text: "Start writing your content…" }),
		],
	};
}

export type PageBuilder = ReturnType<typeof createPageBuilder>;
