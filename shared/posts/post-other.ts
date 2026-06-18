import type { Post } from "../schema-types";

/** Metadata stored when a post was imported from an external CMS. */
export type PostImportMeta = {
	source: "wordpress";
	domain: string;
	wpId: number;
	wpLink: string;
	importedAt: string;
	raw: Record<string, unknown>;
};

export type PostOther = {
	categories?: string[];
	tags?: string[];
	import?: PostImportMeta;
	seo?: Record<string, unknown>;
};

/** API shape with taxonomy and import flags flattened for consumers. */
export type EnrichedPost = Post & {
	categories: string[];
	tags: string[];
	isImported: boolean;
	importSource?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isPostImportMeta = (value: unknown): value is PostImportMeta => {
	if (!isRecord(value)) return false;
	return (
		value.source === "wordpress" &&
		typeof value.domain === "string" &&
		typeof value.wpId === "number" &&
		typeof value.wpLink === "string" &&
		typeof value.importedAt === "string" &&
		isRecord(value.raw)
	);
};

/**
 * Normalizes the jsonb `other` column — taxonomy lives here, not top-level DB columns.
 */
export const parsePostOther = (other: unknown): PostOther => {
	if (!isRecord(other)) {
		return { categories: [], tags: [] };
	}

	const categories = Array.isArray(other.categories)
		? other.categories.filter((item): item is string => typeof item === "string")
		: [];

	const tags = Array.isArray(other.tags)
		? other.tags.filter((item): item is string => typeof item === "string")
		: [];

	return {
		categories,
		tags,
		import: isPostImportMeta(other.import) ? other.import : undefined,
		seo: isRecord(other.seo) ? other.seo : undefined,
	};
};

/** Whether this post was imported from WordPress (or another source later). */
export const isImportedPost = (post: Pick<Post, "other">): boolean =>
	!!parsePostOther(post.other).import?.source;

/** Flatten `other` taxonomy/import fields onto the API response. */
export const enrichPostForApi = (post: Post): EnrichedPost => {
	const parsed = parsePostOther(post.other);
	return {
		...post,
		categories: parsed.categories ?? [],
		tags: parsed.tags ?? [],
		isImported: !!parsed.import?.source,
		importSource: parsed.import?.source,
	};
};
