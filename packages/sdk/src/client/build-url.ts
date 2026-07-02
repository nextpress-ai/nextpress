import type { RequestOptions } from "../types/client.js";

/**
 * Normalizes base URL by stripping trailing slashes so path joining is predictable.
 */
export function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.replace(/\/+$/, "");
}

/**
 * Builds a full request URL with optional query parameters.
 * Omits undefined/null query values.
 */
export function buildUrl({
	baseUrl,
	path,
	query,
}: {
	baseUrl: string;
	path: string;
	query?: RequestOptions["query"];
}): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const url = new URL(`${normalizeBaseUrl(baseUrl)}${normalizedPath}`);

	if (query) {
		for (const [key, value] of Object.entries(query)) {
			if (value !== undefined && value !== null) {
				url.searchParams.set(key, String(value));
			}
		}
	}

	return url.toString();
}

/**
 * Merges a default siteId into query params when the caller did not supply one.
 */
export function withSiteId({
	query,
	siteId,
}: {
	query?: Record<string, string | number | boolean | undefined | null>;
	siteId?: string;
}): Record<string, string | number | boolean | undefined | null> | undefined {
	if (!siteId) {
		return query;
	}

	return {
		...query,
		siteId: query?.siteId ?? siteId,
	};
}
