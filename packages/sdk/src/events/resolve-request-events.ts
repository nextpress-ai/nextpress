import type { HttpMethod } from "../types/client.js";
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
import type { NextpressEventMap, SavedAction } from "./nextpress-events.js";

type ResolvedEvent = {
	[K in keyof NextpressEventMap]: { event: K; payload: NextpressEventMap[K] };
}[keyof NextpressEventMap];

type ResolveRequestEventsParams = {
	method: HttpMethod;
	path: string;
	body?: unknown;
	result: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const bodyStatus = (body: unknown): string | undefined =>
	isRecord(body) && typeof body.status === "string" ? body.status : undefined;

const extractId = (path: string): string | undefined => {
	const segments = path.split("/").filter(Boolean);
	return segments.at(-1);
};

const publishEvents = <T extends { status?: string }>(
	prefix: "post" | "page",
	entity: T,
	body: unknown,
): ResolvedEvent[] => {
	const events: ResolvedEvent[] = [];
	const status = bodyStatus(body);

	if (status === "publish") {
		if (prefix === "post") {
			events.push({ event: "post-published", payload: { post: entity as Post } });
		} else {
			events.push({ event: "page-published", payload: { page: entity as Page } });
		}
	}

	if (status === "draft") {
		if (prefix === "post") {
			events.push({ event: "post-unpublished", payload: { post: entity as Post } });
		} else {
			events.push({ event: "page-unpublished", payload: { page: entity as Page } });
		}
	}

	return events;
};

const savedEvents = (
	prefix: "post" | "page" | "template" | "blog" | "comment" | "user" | "site",
	action: SavedAction,
	entity: Post | Page | Template | Blog | Comment | User | Site,
	body: unknown,
): ResolvedEvent[] => {
	const events: ResolvedEvent[] = [];

	if (prefix === "post") {
		const post = entity as Post;
		events.push({ event: "post-saved", payload: { post, action } });
		events.push({
			event: action === "created" ? "post-created" : "post-updated",
			payload: { post },
		});
		events.push(...publishEvents("post", post, body));
		return events;
	}

	if (prefix === "page") {
		const page = entity as Page;
		events.push({ event: "page-saved", payload: { page, action } });
		events.push({
			event: action === "created" ? "page-created" : "page-updated",
			payload: { page },
		});
		events.push(...publishEvents("page", page, body));
		return events;
	}

	if (prefix === "template") {
		const template = entity as Template;
		events.push({ event: "template-saved", payload: { template, action } });
		events.push({
			event: action === "created" ? "template-created" : "template-updated",
			payload: { template },
		});
		return events;
	}

	if (prefix === "blog") {
		const blog = entity as Blog;
		events.push({ event: "blog-saved", payload: { blog, action } });
		events.push({
			event: action === "created" ? "blog-created" : "blog-updated",
			payload: { blog },
		});
		return events;
	}

	if (prefix === "comment") {
		const comment = entity as Comment;
		events.push({ event: "comment-saved", payload: { comment, action } });
		events.push({
			event: action === "created" ? "comment-created" : "comment-updated",
			payload: { comment },
		});
		return events;
	}

	if (prefix === "user") {
		const user = entity as User;
		events.push({ event: "user-saved", payload: { user, action } });
		events.push({
			event: action === "created" ? "user-created" : "user-updated",
			payload: { user },
		});
		return events;
	}

	const site = entity as Site;
	events.push({ event: "site-saved", payload: { site, action } });
	events.push({
		event: action === "created" ? "site-created" : "site-updated",
		payload: { site },
	});
	return events;
};

const deletedEvent = (
	prefix: "post" | "page" | "template" | "blog" | "comment" | "media" | "user" | "site",
	path: string,
	result: unknown,
): ResolvedEvent[] => {
	const id = extractId(path);
	if (!id) {
		return [];
	}

	const message =
		isRecord(result) && typeof result.message === "string" ? result.message : undefined;

	const map = {
		post: "post-deleted",
		page: "page-deleted",
		template: "template-deleted",
		blog: "blog-deleted",
		comment: "comment-deleted",
		media: "media-deleted",
		user: "user-deleted",
		site: "site-deleted",
	} as const;

	return [{ event: map[prefix], payload: { id, message } }];
};

/**
 * Maps successful HTTP mutations to typed SDK events.
 * Single emission point so every resource path fires consistent event names.
 */
export function resolveRequestEvents({
	method,
	path,
	body,
	result,
}: ResolveRequestEventsParams): ResolvedEvent[] {
	if (method === "POST" && path === "/api/posts") {
		return savedEvents("post", "created", result as Post, body);
	}
	if (method === "PUT" && path.startsWith("/api/posts/")) {
		return savedEvents("post", "updated", result as Post, body);
	}
	if (method === "DELETE" && path.startsWith("/api/posts/")) {
		return deletedEvent("post", path, result);
	}

	if (method === "POST" && path === "/api/pages") {
		return savedEvents("page", "created", result as Page, body);
	}
	if (method === "PUT" && path.startsWith("/api/pages/") && !path.endsWith("/restore")) {
		return savedEvents("page", "updated", result as Page, body);
	}
	if (method === "DELETE" && path.startsWith("/api/pages/")) {
		return deletedEvent("page", path, result);
	}
	if (method === "POST" && path.endsWith("/restore")) {
		const page = result as Page;
		const version = isRecord(body) && typeof body.version === "number" ? body.version : 0;
		return [{ event: "page-version-restored", payload: { page, version } }];
	}

	if (method === "POST" && path === "/api/templates") {
		return savedEvents("template", "created", result as Template, body);
	}
	if (method === "PUT" && path.startsWith("/api/templates/")) {
		return savedEvents("template", "updated", result as Template, body);
	}
	if (method === "DELETE" && path.startsWith("/api/templates/")) {
		return deletedEvent("template", path, result);
	}
	if (method === "POST" && path.includes("/duplicate")) {
		const template = result as Template;
		const sourceId = path.split("/")[3] ?? "";
		return [
			{ event: "template-duplicated", payload: { template, sourceId } },
			{ event: "template-created", payload: { template } },
			{ event: "template-saved", payload: { template, action: "created" } },
		];
	}

	if (method === "POST" && path === "/api/blogs") {
		return savedEvents("blog", "created", result as Blog, body);
	}
	if (method === "PUT" && path.startsWith("/api/blogs/")) {
		return savedEvents("blog", "updated", result as Blog, body);
	}
	if (method === "DELETE" && path.startsWith("/api/blogs/")) {
		return deletedEvent("blog", path, result);
	}

	if (method === "POST" && path === "/api/comments") {
		return savedEvents("comment", "created", result as Comment, body);
	}
	if (method === "PUT" && path.startsWith("/api/comments/")) {
		return savedEvents("comment", "updated", result as Comment, body);
	}
	if (method === "PATCH" && path.endsWith("/approve")) {
		return [{ event: "comment-approved", payload: { comment: result as Comment } }];
	}
	if (method === "PATCH" && path.endsWith("/spam")) {
		return [{ event: "comment-spammed", payload: { comment: result as Comment } }];
	}
	if (method === "DELETE" && path.startsWith("/api/comments/")) {
		return deletedEvent("comment", path, result);
	}

	if (method === "POST" && path === "/api/media") {
		return [{ event: "media-uploaded", payload: { media: result as Media } }];
	}
	if (method === "PUT" && path.startsWith("/api/media/")) {
		return [{ event: "media-updated", payload: { media: result as Media } }];
	}
	if (method === "DELETE" && path.startsWith("/api/media/")) {
		return deletedEvent("media", path, result);
	}

	if (method === "POST" && path === "/api/users") {
		return savedEvents("user", "created", result as User, body);
	}
	if (method === "PUT" && path.startsWith("/api/users/")) {
		return savedEvents("user", "updated", result as User, body);
	}
	if (method === "DELETE" && path.startsWith("/api/users/")) {
		return deletedEvent("user", path, result);
	}

	if (method === "POST" && path === "/api/sites") {
		const site = (isRecord(result) && "site" in result ? result.site : result) as Site;
		return savedEvents("site", "created", site, body);
	}
	if (method === "PATCH" && path.startsWith("/api/sites/")) {
		const site = (isRecord(result) && "site" in result ? result.site : result) as Site;
		return savedEvents("site", "updated", site, body);
	}
	if (method === "DELETE" && path.startsWith("/api/sites/")) {
		return deletedEvent("site", path, result);
	}

	if (method === "PATCH" && path === "/api/site") {
		return [{ event: "site-info-updated", payload: { site: result as SiteInfo } }];
	}

	if (method === "PATCH" && path === "/api/settings") {
		return [{ event: "settings-updated", payload: { settings: result as Settings } }];
	}

	if (method === "POST" && path === "/api/options") {
		const key = isRecord(body) && typeof body.key === "string" ? body.key : "";
		const value = isRecord(body) ? body.value : undefined;
		return [{ event: "option-set", payload: { key, value } }];
	}

	if (method === "POST" && path.endsWith("/activate")) {
		return [{ event: "theme-activated", payload: { theme: result as Theme & { siteId: string } } }];
	}

	if (method === "POST" && path === "/api/preview/tokens") {
		return [{ event: "preview-link-created", payload: { token: result as PreviewShareToken } }];
	}

	return [];
}

export const isMutationMethod = (method: HttpMethod | undefined): boolean =>
	method !== undefined && method !== "GET";
