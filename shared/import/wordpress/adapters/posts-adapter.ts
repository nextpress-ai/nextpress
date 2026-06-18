import { normalizeSiteUrl } from "../normalize-site-url";
import { fetchWpJson, getWpTotal, getWpTotalPages } from "../fetch-wp-api";
import { mapWpPost } from "../map-wp-post";
import { stripHtml } from "../strip-html";
import type {
	WpDiscoverResult,
	WpListResult,
	WpMediaRaw,
	WpPostPreview,
	WpPostRaw,
	WpTermRaw,
	WordPressPostsAdapter,
} from "../types";

type WpSiteIndex = {
	name?: string;
	description?: string;
};

const mapPreview = (raw: WpPostRaw): WpPostPreview => ({
	wpId: raw.id,
	title: stripHtml(raw.title.rendered) || `Post ${raw.id}`,
	slug: raw.slug,
	status: raw.status,
	date: raw.date,
	link: raw.link,
});

export const createPostsAdapter = (): WordPressPostsAdapter => ({
	entity: "posts",

	discover: async ({ baseUrl }) => {
		const indexResult = await fetchWpJson<WpSiteIndex>({
			url: `${baseUrl}/wp-json`,
		});

		if (!indexResult.ok) {
			return { total: 0, reachable: false };
		}

		const postsResult = await fetchWpJson<WpPostRaw[]>({
			url: `${baseUrl}/wp-json/wp/v2/posts?per_page=1&status=publish`,
		});

		if (!postsResult.ok) {
			return {
				total: 0,
				reachable: false,
				siteName: indexResult.data.name,
			};
		}

		return {
			total: getWpTotal(postsResult.headers),
			reachable: true,
			siteName: indexResult.data.name,
		};
	},

	list: async ({ baseUrl, page, perPage }) => {
		const result = await fetchWpJson<WpPostRaw[]>({
			url: `${baseUrl}/wp-json/wp/v2/posts?per_page=${perPage}&page=${page}&status=publish`,
		});

		if (!result.ok) {
			throw new Error(result.error.message);
		}

		return {
			items: result.data.map(mapPreview),
			total: getWpTotal(result.headers),
			page,
			perPage,
			totalPages: getWpTotalPages(result.headers),
		};
	},

	fetchOne: async ({ baseUrl, wpId }) => {
		const result = await fetchWpJson<WpPostRaw>({
			url: `${baseUrl}/wp-json/wp/v2/posts/${wpId}`,
		});

		if (!result.ok) {
			throw new Error(result.error.message);
		}

		return result.data;
	},

	map: mapWpPost,
});

/** Discover a WordPress site and which entities are importable. */
export const discoverWordPressSite = async (params: {
	siteUrl: string;
}): Promise<WpDiscoverResult> => {
	const baseUrl = normalizeSiteUrl(params.siteUrl);
	if (!baseUrl) {
		return {
			ok: false,
			baseUrl: "",
			error: {
				code: "invalid_url",
				message: "Invalid site URL",
				hint: "Enter a valid domain or URL (e.g. example.com or https://example.com).",
			},
			entities: {},
		};
	}

	const adapter = createPostsAdapter();
	const postsInfo = await adapter.discover({ baseUrl });

	if (!postsInfo.reachable) {
		return {
			ok: false,
			baseUrl,
			error: {
				code: "not_wordpress",
				message: "Could not reach WordPress REST API",
				hint: "Confirm this is WordPress with /wp-json enabled and not blocked by a firewall.",
			},
			entities: {
				posts: { supported: true, total: 0, reachable: false },
			},
		};
	}

	if (postsInfo.total === 0) {
		return {
			ok: false,
			baseUrl,
			siteName: postsInfo.siteName,
			error: {
				code: "no_posts",
				message: "No public posts found",
				hint: "Publish posts on WordPress or check that the REST API exposes published content.",
			},
			entities: {
				posts: { supported: true, total: 0, reachable: true },
			},
		};
	}

	return {
		ok: true,
		baseUrl,
		siteName: postsInfo.siteName,
		entities: {
			posts: {
				supported: true,
				total: postsInfo.total,
				reachable: true,
			},
			pages: { supported: false, total: 0, reachable: false },
			media: { supported: false, total: 0, reachable: false },
			comments: { supported: false, total: 0, reachable: false },
			users: { supported: false, total: 0, reachable: false },
		},
	};
};

/** Fetch WP taxonomy term names for category/tag ID resolution. */
export const fetchWpTermMaps = async (params: {
	baseUrl: string;
}): Promise<{
	categoryNames: Map<number, string>;
	tagNames: Map<number, string>;
}> => {
	const [categoriesResult, tagsResult] = await Promise.all([
		fetchWpJson<WpTermRaw[]>({
			url: `${params.baseUrl}/wp-json/wp/v2/categories?per_page=100`,
		}),
		fetchWpJson<WpTermRaw[]>({
			url: `${params.baseUrl}/wp-json/wp/v2/tags?per_page=100`,
		}),
	]);

	const categoryNames = new Map<number, string>();
	const tagNames = new Map<number, string>();

	if (categoriesResult.ok) {
		categoriesResult.data.forEach((term) => categoryNames.set(term.id, term.name));
	}

	if (tagsResult.ok) {
		tagsResult.data.forEach((term) => tagNames.set(term.id, term.name));
	}

	return { categoryNames, tagNames };
};

/** Resolve featured image URL from WP media endpoint. */
export const fetchWpFeaturedImageUrl = async (params: {
	baseUrl: string;
	featuredMediaId: number;
}): Promise<string | null> => {
	if (params.featuredMediaId <= 0) return null;

	const result = await fetchWpJson<WpMediaRaw>({
		url: `${params.baseUrl}/wp-json/wp/v2/media/${params.featuredMediaId}`,
	});

	if (!result.ok) return null;
	return result.data.source_url || null;
};
