import type { BlocksBuilder } from "../blocks/blocks-builder.types.js";
import type { NextpressEventMap } from "../events/nextpress-events.js";
import type { PagesResource } from "../resources/pages.js";
import type { PostsResource } from "../resources/posts.js";
import type { PreviewResource } from "../resources/preview.js";
import type { TemplatesResource } from "../resources/templates.js";
import type { BlockConfig, Page, Post, Template } from "../types/domain.js";
import type { EditorLoadedContent, EditorSession } from "./editor-session.types.js";
import { sdkOk, type SdkResult } from "../client/sdk-result.js";
import { createUndoStack } from "./create-undo-stack.js";

export type { EditorContentType, EditorLoadedContent, EditorSession } from "./editor-session.types.js";

type EmitFn = <K extends keyof NextpressEventMap & string>(
	event: K,
	payload: NextpressEventMap[K],
) => NextpressEventMap[K];

type EditorSessionDeps = {
	pages: PagesResource;
	posts: PostsResource;
	templates: TemplatesResource;
	preview: PreviewResource;
	blocks: BlocksBuilder;
	coalesceMs?: number;
	emit?: EmitFn;
};

const DEFAULT_COALESCE_MS = 300;

const readContentVersion = (raw: Page | Post | Template): number => {
	if ("version" in raw && typeof raw.version === "number") {
		return raw.version;
	}
	return 0;
};

const bumpLoadedVersion = (
	loaded: EditorLoadedContent,
	nextRaw: Page | Post | Template,
): EditorLoadedContent => ({
	...loaded,
	expectedVersion: readContentVersion(nextRaw),
	raw: nextRaw,
});

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
	emit,
}: EditorSessionDeps): EditorSession {
	let loaded: EditorLoadedContent | null = null;
	let undoStack = createUndoStack<BlockConfig[]>([]);
	let coalesceTimer: ReturnType<typeof setTimeout> | null = null;

	const notify = emit ?? (<K extends keyof NextpressEventMap & string>(_event: K, payload: NextpressEventMap[K]) => payload);

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
			notify("editor-blocks-changed", { blocks: nextBlocks, coalesced: true });
			return;
		}

		clearCoalesce();
		undoStack.pushState(nextBlocks);
		notify("editor-blocks-changed", { blocks: nextBlocks, coalesced: coalesce });
	};

	return {
		/** Block factory for constructing trees while editing in the session. */
		blocks,

		/** Hydrate the session from server content and reset undo to a clean baseline. */
		load: async ({
			type,
			id,
		}: {
			type: EditorLoadedContent["type"];
			id: string;
		}): Promise<EditorLoadedContent> => {
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
					expectedVersion: readContentVersion(page),
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
					expectedVersion: readContentVersion(post),
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
			notify("editor-loaded", { content: loaded });
			return loaded;
		},

		/** Read the in-memory block tree without a server round-trip. */
		getBlocks: (): BlockConfig[] => loaded?.blocks ?? [],

		/** Commit a full block replacement as one undo step for discrete actions. */
		setBlocks: (nextBlocks: BlockConfig[]) => {
			commitBlocks(nextBlocks);
		},

		/** Batch rapid keystrokes into one undo step like dashboard coalescing. */
		updateBlocks: (nextBlocks: BlockConfig[]) => {
			commitBlocks(nextBlocks, { coalesce: true });
		},

		/** Step back through coalesced edits like the dashboard undo shortcut. */
		undo: (): BlockConfig[] | undefined => {
			clearCoalesce();
			const state = undoStack.undo();
			if (state && loaded) {
				loaded = { ...loaded, blocks: state };
			}
			return state;
		},

		/** Reapply a undone edit without reloading from the server. */
		redo: (): BlockConfig[] | undefined => {
			clearCoalesce();
			const state = undoStack.redo();
			if (state && loaded) {
				loaded = { ...loaded, blocks: state };
			}
			return state;
		},

		/** Gate undo UI so empty stacks do not offer a no-op action. */
		canUndo: (): boolean => undoStack.canUndo(),
		/** Gate redo UI after the user steps back in history. */
		canRedo: (): boolean => undoStack.canRedo(),

		/** Flush in-memory edits to the server for the loaded content type. */
		save: async (input: { title?: string; slug?: string; status?: string } = {}): Promise<SdkResult<Page | Post | Template>> => {
			if (!loaded) {
				throw new Error("Editor session not loaded");
			}

			if (loaded.type === "page") {
				const result = await pages.update({
					id: loaded.id,
					expectedVersion: loaded.expectedVersion ?? readContentVersion(loaded.raw as Page),
					blocks: loaded.blocks,
					title: input.title ?? loaded.title,
					slug: input.slug ?? loaded.slug,
					status: input.status ?? loaded.status,
				});
				if (result.isErr) return result;
				const page = result.value;
				loaded = {
					...bumpLoadedVersion(loaded, page),
					title: page.title,
					slug: page.slug,
					status: page.status,
				};
				notify("editor-saved", { content: loaded, data: page });
				return sdkOk(page);
			}

			if (loaded.type === "post") {
				const result = await posts.update({
					id: loaded.id,
					expectedVersion: loaded.expectedVersion ?? readContentVersion(loaded.raw as Post),
					blocks: loaded.blocks,
					title: input.title ?? loaded.title,
					slug: input.slug ?? loaded.slug,
					status: input.status ?? loaded.status,
				});
				if (result.isErr) return result;
				const post = result.value;
				loaded = {
					...bumpLoadedVersion(loaded, post),
					title: post.title,
					slug: post.slug,
					status: post.status,
				};
				notify("editor-saved", { content: loaded, data: post });
				return sdkOk(post);
			}

			const template = await templates.update({
				id: loaded.id,
				blocks: loaded.blocks,
				name: input.title ?? loaded.title,
			});
			loaded = { ...loaded, title: template.name, raw: template };
			notify("editor-saved", { content: loaded, data: template });
			return sdkOk(template);
		},

		/** Go live with the current in-memory blocks without a separate save call. */
		publish: async (): Promise<SdkResult<Page | Post>> => {
			if (!loaded) {
				throw new Error("Editor session not loaded");
			}
			if (loaded.type === "template") {
				throw new Error("Templates cannot be published");
			}
			const resource = loaded.type === "page" ? pages : posts;
			const result = await resource.update({
				id: loaded.id,
				expectedVersion: loaded.expectedVersion ?? readContentVersion(loaded.raw as Page | Post),
				blocks: loaded.blocks,
				status: "publish",
				publishedAt: new Date().toISOString(),
			});
			if (result.isErr) return result;
			const data = result.value;
			loaded = bumpLoadedVersion(loaded, data);
			notify("editor-published", { content: loaded, data: data as Page | Post });
			return sdkOk(data);
		},

		/** Pull content offline while keeping the block tree in the session. */
		unpublish: async (): Promise<SdkResult<Page | Post>> => {
			if (!loaded || loaded.type === "template") {
				throw new Error("Cannot unpublish this content type");
			}
			const resource = loaded.type === "page" ? pages : posts;
			const result = await resource.update({
				id: loaded.id,
				expectedVersion: loaded.expectedVersion ?? readContentVersion(loaded.raw as Page | Post),
				blocks: loaded.blocks,
				status: "draft",
			});
			if (result.isErr) return result;
			const data = result.value;
			loaded = bumpLoadedVersion(loaded, data);
			notify("editor-unpublished", { content: loaded, data: data as Page | Post });
			return sdkOk(data);
		},

		/** Render the loaded draft through the authenticated preview API. */
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

		/** Share the loaded draft with reviewers who cannot sign into the dashboard. */
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

		/** Roll back to a server snapshot and realign the undo stack with that tree. */
		restoreVersion: async ({ version }: { version: number }): Promise<SdkResult<Page>> => {
			if (!loaded || loaded.type !== "page") {
				throw new Error("Version restore is only available for pages");
			}
			const result = await pages.restoreVersion({ id: loaded.id, version });
			if (result.isErr) return result;
			const page = result.value;
			loaded = {
				...bumpLoadedVersion(loaded, page),
				blocks: (page.blocks as BlockConfig[]) ?? [],
			};
			undoStack.resetState(loaded.blocks);
			return sdkOk(page);
		},

		/** List page version snapshots for rollback UI on loaded pages. */
		getHistory: async () => {
			if (!loaded || loaded.type !== "page") {
				throw new Error("History is only available for pages");
			}
			return pages.getHistory({ id: loaded.id });
		},

		/** Inspect session metadata without triggering another load. */
		getLoaded: (): EditorLoadedContent | null => loaded,
	};
}
