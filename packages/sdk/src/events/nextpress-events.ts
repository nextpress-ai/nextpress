import type { EditorLoadedContent } from "../editor/editor-session.types.js";
import type {
	Blog,
	Comment,
	Media,
	Page,
	Post,
	PreviewShareToken,
	Site,
	SiteInfo,
	Template,
	Theme,
	User,
	Settings,
} from "../types/domain.js";

import type { NextpressEventContext } from "./event-context.js";

/** Whether a save event came from create or update. */
export type SavedAction = "created" | "updated";

export type NextpressEventMap = {
	"post-saved": { post: Post; action: SavedAction };
	"post-created": { post: Post };
	"post-updated": { post: Post };
	"post-deleted": { id: string; message?: string };
	"post-published": { post: Post };
	"post-unpublished": { post: Post };

	"page-saved": { page: Page; action: SavedAction };
	"page-created": { page: Page };
	"page-updated": { page: Page };
	"page-deleted": { id: string; message?: string };
	"page-published": { page: Page };
	"page-unpublished": { page: Page };
	"page-version-restored": { page: Page; version: number };

	"template-saved": { template: Template; action: SavedAction };
	"template-created": { template: Template };
	"template-updated": { template: Template };
	"template-deleted": { id: string; message?: string };
	"template-duplicated": { template: Template; sourceId: string };

	"blog-saved": { blog: Blog; action: SavedAction };
	"blog-created": { blog: Blog };
	"blog-updated": { blog: Blog };
	"blog-deleted": { id: string; message?: string };

	"comment-saved": { comment: Comment; action: SavedAction };
	"comment-created": { comment: Comment };
	"comment-updated": { comment: Comment };
	"comment-deleted": { id: string; message?: string };
	"comment-approved": { comment: Comment };
	"comment-spammed": { comment: Comment };

	"media-uploaded": { media: Media };
	"media-updated": { media: Media };
	"media-deleted": { id: string; message?: string };

	"user-saved": { user: User; action: SavedAction };
	"user-created": { user: User };
	"user-updated": { user: User };
	"user-deleted": { id: string; message?: string };

	"site-saved": { site: Site; action: SavedAction };
	"site-created": { site: Site };
	"site-updated": { site: Site };
	"site-deleted": { id: string; message?: string };

	"site-info-updated": { site: SiteInfo };
	"settings-updated": { settings: Settings };
	"option-set": { key: string; value: unknown };
	"theme-activated": { theme: Theme & { siteId: string } };
	"preview-link-created": { token: PreviewShareToken };

	"editor-loaded": { content: EditorLoadedContent };
	"editor-blocks-changed": { blocks: EditorLoadedContent["blocks"]; coalesced: boolean };
	"editor-saved": { content: EditorLoadedContent; data: Page | Post | Template };
	"editor-published": { content: EditorLoadedContent; data: Page | Post };
	"editor-unpublished": { content: EditorLoadedContent; data: Page | Post };
};

export type NextpressEventName = keyof NextpressEventMap;

export type NextpressEventHandler<K extends NextpressEventName> = (
	ctx: NextpressEventContext<NextpressEventMap[K]>,
) => void;
