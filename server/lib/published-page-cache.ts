import { createHash } from "node:crypto";

/**
 * One stored HTML document. The key is the page version plus the theme baked into that HTML.
 * A save bumps the version, so the next request misses and builds again. The theme is part of
 * the key because its colors are written into the HTML without bumping the page version.
 */
export type PublishedPageCacheKey = {
	documentId: string;
	version: number;
	canonicalUrl: string;
	themeId: string | null;
	themeSettingsJson: string;
};

/**
 * Tracking parameters are not part of the page. Two visits that differ only by
 * `?utm=` must share one saved copy, and that copy must not keep the first visitor's query.
 */
export function canonicalUrlWithoutQuery(canonicalUrl: string): string {
	try {
		const url = new URL(canonicalUrl);
		url.search = "";
		url.hash = "";
		return url.toString();
	} catch {
		const noHash = canonicalUrl.split("#")[0] ?? canonicalUrl;
		return noHash.split("?")[0] ?? noHash;
	}
}

export function publishedPageCacheKey({
	documentId,
	version,
	canonicalUrl,
	themeId,
	themeSettingsJson,
}: PublishedPageCacheKey): string {
	const themeHash = createHash("sha256").update(themeSettingsJson).digest("hex").slice(0, 16);
	const address = canonicalUrlWithoutQuery(canonicalUrl);
	return `${documentId}:${version}:${address}:${themeId ?? "none"}:${themeHash}`;
}

export function createPublishedPageCache({ maxEntries }: { maxEntries: number }) {
	const entries = new Map<string, string>();

	const read = (key: string): string | undefined => {
		const html = entries.get(key);
		if (html === undefined) return undefined;
		entries.delete(key);
		entries.set(key, html);
		return html;
	};

	const write = (key: string, html: string): void => {
		if (entries.has(key)) entries.delete(key);
		entries.set(key, html);
		while (entries.size > maxEntries) {
			const oldest = entries.keys().next().value;
			if (oldest === undefined) return;
			entries.delete(oldest);
		}
	};

	const clear = (): void => {
		entries.clear();
	};

	return { read, write, clear, size: () => entries.size };
}

/** Process-wide cache for published HTML. Cleared in tests that reuse the same page id. */
export const publishedPageCache = createPublishedPageCache({ maxEntries: 200 });
