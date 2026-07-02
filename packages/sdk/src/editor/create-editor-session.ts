import type { BlocksBuilder } from "../blocks/build-block.js";
import type { PagesResource } from "../resources/pages.js";
import type { PostsResource } from "../resources/posts.js";
import type { PreviewResource } from "../resources/preview.js";
import type { TemplatesResource } from "../resources/templates.js";
import type { BlockConfig, Page, Post, Template } from "../types/domain.js";
import { createUndoStack } from "./create-undo-stack.js";

export type EditorContentType = "page" | "post" | "template";

type EditorSessionDeps = {
	pages: PagesResource;
	posts: PostsResource;
	templates: TemplatesResource;
	preview: PreviewResource;
	blocks: BlocksBuilder;
	coalesceMs?: number;
};

type LoadedContent = {
	type: EditorContentType;
	id: string;
	title: string;
	status?: string;
	slug?: string;
	blocks: BlockConfig[];
	raw: Page | Post | Template;
};

const DEFAULT_COALESCE_MS = 300;

/**
 * SDK editor session with undo/redo, save, publish, and expiring preview links.
 * Mirrors dashboard page builder workflows for programmatic / MCP use.
 */
export function createEditorSession({
	pages,
	posts,
	templates,
	preview,
	blocks,
	coalesceMs = DEFAULT_COALESCE_MS,
}: EditorSessionDeps) {
	let loaded: LoadedContent | null = null;
	let undoStack = createUndoStack<BlockConfig[]>([]);
	let coalesceTimer: ReturnType<typeof setTimeout> | null = null;

	const clearCoalesce = () => {
		if (coalesceTimer) {
			clearTimeout(coalesceTimer);
			coalesceTimer = null;
		}
	};

	const commitBlocks = (nextBlocks: BlockConfig[], { coalesce = false }: { coalesce?: boolean } = {}) => {
		if (!loaded) {
			throw new Error("Editor session not loaded");
		}

		loaded = { ...loaded, blocks: nextBlocks };

		if (coalesce) {
			undoStack.replaceCurrentState(nextBlocks);
			clearCoalesce();
			coalesceTimer = setTimeout(() => {
				coalesceTimer = null;
			}, coalesceMs);
			return;
		}

		clearCoalesce();
		undoStack.pushState(nextBlocks);
	};

	return {
		blocks,

		/** Load page, post, or template into the session (resets undo stack). */
		load: async ({
			type,
			id,
		}: {
			type: EditorContentType;
			id: string;
		}): Promise<LoadedContent> => {
			if (type === "page") {
				const page = await pages.get({ id });
				loaded = {
					type,
					id: page.id,
					title: page.title,
					status: page.status,
					slug: page.slug,
					blocks: (page.blocks as BlockConfig[]) ?? [],
					raw: page,
				};
			} else if (type === "post") {
				const post = await posts.get({ id });
				loaded = {
					type,
					id: post.id,
					title: post.title,
					status: post.status,
					slug: post.slug,
					blocks: (post.blocks as BlockConfig[]) ?? [],
					raw: post,
				};
			} else {
				const template = await templates.get({ id });
				loaded = {
					type,
					id: template.id,
					title: template.name,
					blocks: (template.blocks as BlockConfig[]) ?? [],
					raw: template,
				};
			}

			undoStack = createUndoStack(loaded.blocks);
			return loaded;
		},

		getBlocks: (): BlockConfig[] => loaded?.blocks ?? [],

		/** Replace blocks and push a new undo step. */
		setBlocks: (nextBlocks: BlockConfig[]) => {
			commitBlocks(nextBlocks);
		},

		/** Replace blocks with coalescing (for rapid sequential edits). */
		updateBlocks: (nextBlocks: BlockConfig[]) => {
			commitBlocks(nextBlocks, { coalesce: true });
		},

		undo: (): BlockConfig[] | undefined => {
			clearCoalesce();
			const state = undoStack.undo();
			if (state && loaded) {
				loaded = { ...loaded, blocks: state };
			}
			return state;
		},

		redo: (): BlockConfig[] | undefined => {
			clearCoalesce();
			const state = undoStack.redo();
			if (state && loaded) {
				loaded = { ...loaded, blocks: state };
			}
			return state;
		},

		canUndo: (): boolean => undoStack.canUndo(),
		canRedo: (): boolean => undoStack.canRedo(),

		/** Persist current blocks and metadata to the server. */
		save: async (input: { title?: string; slug?: string; status?: string } = {}) => {
			if (!loaded) {
				throw new Error("Editor session not loaded");
			}

			if (loaded.type === "page") {
				const page = await pages.update({
					id: loaded.id,
					blocks: loaded.blocks,
					title: input.title ?? loaded.title,
					slug: input.slug ?? loaded.slug,
					status: input.status ?? loaded.status,
				});
				loaded = {
					...loaded,
					title: page.title,
					slug: page.slug,
					status: page.status,
					raw: page,
				};
				return page;
			}

			if (loaded.type === "post") {
				const post = await posts.update({
					id: loaded.id,
					blocks: loaded.blocks,
					title: input.title ?? loaded.title,
					slug: input.slug ?? loaded.slug,
					status: input.status ?? loaded.status,
				});
				loaded = {
					...loaded,
					title: post.title,
					slug: post.slug,
					status: post.status,
					raw: post,
				};
				return post;
			}

			const template = await templates.update({
				id: loaded.id,
				blocks: loaded.blocks,
				name: input.title ?? loaded.title,
			});
			loaded = { ...loaded, title: template.name, raw: template };
			return template;
		},

		publish: async () => {
			if (!loaded) {
				throw new Error("Editor session not loaded");
			}
			if (loaded.type === "template") {
				throw new Error("Templates cannot be published");
			}
			return await (loaded.type === "page" ? pages : posts).update({
				id: loaded.id,
				blocks: loaded.blocks,
				status: "publish",
				publishedAt: new Date().toISOString(),
			});
		},

		unpublish: async () => {
			if (!loaded || loaded.type === "template") {
				throw new Error("Cannot unpublish this content type");
			}
			return await (loaded.type === "page" ? pages : posts).update({
				id: loaded.id,
				blocks: loaded.blocks,
				status: "draft",
			});
		},

		/** Authenticated preview payload (API key or session). */
		preview: async () => {
			if (!loaded) {
				throw new Error("Editor session not loaded");
			}
			if (loaded.type === "page") {
				return preview.page({ id: loaded.id });
			}
			if (loaded.type === "post") {
				return preview.post({ id: loaded.id });
			}
			return preview.template({ id: loaded.id });
		},

		/** Mint an expiring share link (default 5 minutes). No login required to open. */
		createPreviewLink: async ({
			expiresInSeconds = 300,
		}: { expiresInSeconds?: number } = {}) => {
			if (!loaded) {
				throw new Error("Editor session not loaded");
			}
			return preview.createShareToken({
				contentType: loaded.type,
				contentId: loaded.id,
				expiresInSeconds,
			});
		},

		/** Restore blocks from a saved page version (pages only). */
		restoreVersion: async ({ version }: { version: number }) => {
			if (!loaded || loaded.type !== "page") {
				throw new Error("Version restore is only available for pages");
			}
			const page = await pages.restoreVersion({ id: loaded.id, version });
			loaded = {
				...loaded,
				blocks: (page.blocks as BlockConfig[]) ?? [],
				raw: page,
			};
			undoStack.resetState(loaded.blocks);
			return page;
		},

		getHistory: async () => {
			if (!loaded || loaded.type !== "page") {
				throw new Error("History is only available for pages");
			}
			return pages.getHistory({ id: loaded.id });
		},

		getLoaded: (): LoadedContent | null => loaded,
	};
}

export type EditorSession = ReturnType<typeof createEditorSession>;
