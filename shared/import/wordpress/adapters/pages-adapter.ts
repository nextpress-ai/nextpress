import { fetchWpJson, getWpTotal, getWpTotalPages } from "../fetch-wp-api";
import { mapWpPage } from "../map-wp-page";
import { stripHtml } from "../strip-html";
import type { WpListResult, WpPostPreview, WpPostRaw } from "../types";

const mapPreview = (raw: WpPostRaw): WpPostPreview => ({
	wpId: raw.id,
	title: stripHtml(raw.title?.rendered ?? '') || `Page ${raw.id}`,
	slug: raw.slug,
	status: raw.status,
	date: raw.date,
	link: raw.link,
});

export type WordPressPagesAdapter = {
	entity: "pages";
	list: (params: {
		baseUrl: string;
		page: number;
		perPage: number;
	}) => Promise<WpListResult>;
	fetchOne: (params: { baseUrl: string; wpId: number }) => Promise<WpPostRaw>;
	map: typeof mapWpPage;
};

export const createPagesAdapter = (): WordPressPagesAdapter => ({
	entity: "pages",

	list: async ({ baseUrl, page, perPage }) => {
		const result = await fetchWpJson<WpPostRaw[]>({
			url: `${baseUrl}/wp-json/wp/v2/pages?per_page=${perPage}&page=${page}&status=publish`,
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
			url: `${baseUrl}/wp-json/wp/v2/pages/${wpId}`,
		});

		if (!result.ok) {
			throw new Error(result.error.message);
		}

		return result.data;
	},

	map: mapWpPage,
});

/** Page count probe for discovery. */
export const discoverWpPages = async (params: {
	baseUrl: string;
}): Promise<{ total: number; reachable: boolean }> => {
	const result = await fetchWpJson<WpPostRaw[]>({
		url: `${params.baseUrl}/wp-json/wp/v2/pages?per_page=1&status=publish`,
	});

	if (!result.ok) {
		return { total: 0, reachable: false };
	}

	return { total: getWpTotal(result.headers), reachable: true };
};
