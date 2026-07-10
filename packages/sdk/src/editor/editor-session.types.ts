import type { BlocksBuilder } from "../blocks/blocks-builder.types.js";
import type {
	EditorLoadParams,
	EditorPreviewLinkParams,
	EditorSaveParams,
	RestorePageVersionParams,
} from "../types/common-params.js";
import type {
	BlockConfig,
	Page,
	PageHistoryResponse,
	Post,
	PreviewShareToken,
	Template,
} from "../types/domain.js";
import type { SdkResult } from "../client/sdk-result.js";

export type EditorContentType = "page" | "post" | "template";

/** Hydrated editor state after `load` completes. */
export type EditorLoadedContent = {
	type: EditorContentType;
	id: string;
	title: string;
	status?: string;
	slug?: string;
	blocks: BlockConfig[];
	raw: Page | Post | Template;
	/** Optimistic concurrency token — refresh after each successful save. */
	expectedVersion?: number;
};

/** Stateful editor with undo/redo, save, publish, and expiring preview links. */
export type EditorSession = {
	/** Block factory for constructing trees while editing in the session. */
	blocks: BlocksBuilder;
	/** Hydrate the session from server content and reset undo to a clean baseline. */
	load: (params: EditorLoadParams) => Promise<EditorLoadedContent>;
	/** Read the in-memory block tree without a server round-trip. */
	getBlocks: () => BlockConfig[];
	/** Commit a full block replacement as one undo step for discrete actions. */
	setBlocks: (nextBlocks: BlockConfig[]) => void;
	/** Batch rapid keystrokes into one undo step like dashboard coalescing. */
	updateBlocks: (nextBlocks: BlockConfig[]) => void;
	/** Step back through coalesced edits like the dashboard undo shortcut. */
	undo: () => BlockConfig[] | undefined;
	/** Reapply a undone edit without reloading from the server. */
	redo: () => BlockConfig[] | undefined;
	/** Gate undo UI so empty stacks do not offer a no-op action. */
	canUndo: () => boolean;
	/** Gate redo UI after the user steps back in history. */
	canRedo: () => boolean;
	/** Flush in-memory edits to the server for the loaded content type. */
	save: (input?: EditorSaveParams) => Promise<SdkResult<Page | Post | Template>>;
	/** Go live with the current in-memory blocks without a separate save call. */
	publish: () => Promise<SdkResult<Page | Post>>;
	/** Pull content offline while keeping the block tree in the session. */
	unpublish: () => Promise<SdkResult<Page | Post>>;
	/** Render the loaded draft through the authenticated preview API. */
	preview: () => Promise<Page | Post | Template>;
	/** Share the loaded draft with reviewers who cannot sign into the dashboard. */
	createPreviewLink: (params?: EditorPreviewLinkParams) => Promise<PreviewShareToken>;
	/** Roll back to a server snapshot and realign the undo stack with that tree. */
	restoreVersion: (params: Pick<RestorePageVersionParams, "version">) => Promise<SdkResult<Page>>;
	/** List page version snapshots for rollback UI on loaded pages. */
	getHistory: () => Promise<PageHistoryResponse>;
	/** Inspect session metadata without triggering another load. */
	getLoaded: () => EditorLoadedContent | null;
};
