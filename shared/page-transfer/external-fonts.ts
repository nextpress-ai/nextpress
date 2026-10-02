/**
 * Fonts loaded from Google's hosts. A page file can carry the font bytes and point
 * the CSS at those copies, so the look does not depend on that host after import.
 */

const GOOGLE_CSS_HOST = "fonts.googleapis.com";
const GOOGLE_FILE_HOST = "fonts.gstatic.com";

const CSS_URL = /https:\/\/fonts\.googleapis\.com\/[^\s"'()]+/g;
const FILE_URL = /https:\/\/fonts\.gstatic\.com\/[^\s"'()]+\.(?:woff2|woff|ttf|otf)/g;
const IMPORT_STATEMENT =
	/@import\s+url\(\s*['"]?(https:\/\/fonts\.googleapis\.com\/[^'")\s]+)['"]?\s*\)\s*;?/gi;

export type ExternalFontKind = "stylesheet" | "file";

export type ExternalFontUrl = {
	url: string;
	kind: ExternalFontKind;
};

const walkStrings = (value: unknown, into: string[] = []): string[] => {
	if (typeof value === "string") into.push(value);
	else if (Array.isArray(value)) value.forEach((item) => walkStrings(item, into));
	else if (value && typeof value === "object") Object.values(value).forEach((item) => walkStrings(item, into));
	return into;
};

const unique = (urls: string[]): string[] => [...new Set(urls)];

/** Stylesheet and font-file addresses on Google's font hosts, in first-seen order. */
export function findExternalFontUrls(value: unknown): ExternalFontUrl[] {
	const found: ExternalFontUrl[] = [];
	const seen = new Set<string>();
	for (const text of walkStrings(value)) {
		for (const url of text.match(CSS_URL) ?? []) {
			if (seen.has(url)) continue;
			seen.add(url);
			found.push({ url, kind: "stylesheet" });
		}
		for (const url of text.match(FILE_URL) ?? []) {
			if (seen.has(url)) continue;
			seen.add(url);
			found.push({ url, kind: "file" });
		}
	}
	return found;
}

/** Font-file addresses inside one stylesheet body. */
export function findFontFileUrls(css: string): string[] {
	return unique(css.match(FILE_URL) ?? []);
}

export function isAllowedFontUrl(url: string): boolean {
	try {
		const host = new URL(url).hostname;
		return host === GOOGLE_CSS_HOST || host === GOOGLE_FILE_HOST;
	} catch {
		return false;
	}
}

/**
 * Swaps a downloaded stylesheet in place of its `@import`, and font-file addresses
 * for the copies stored with the page.
 */
export function rewriteExternalFontText({
	text,
	stylesheets,
	files,
}: {
	text: string;
	stylesheets: ReadonlyMap<string, string>;
	files: ReadonlyMap<string, string>;
}): string {
	const withSheets = text.replace(IMPORT_STATEMENT, (statement, url: string) => stylesheets.get(url) ?? statement);
	const urls = [...files.keys()].sort((a, b) => b.length - a.length);
	return urls.reduce((next, url) => next.split(url).join(files.get(url) ?? url), withSheets);
}

export function rewriteExternalFonts<T>({
	value,
	stylesheets,
	files,
}: {
	value: T;
	stylesheets: ReadonlyMap<string, string>;
	files: ReadonlyMap<string, string>;
}): T {
	const walk = (item: unknown): unknown => {
		if (typeof item === "string") return rewriteExternalFontText({ text: item, stylesheets, files });
		if (Array.isArray(item)) return item.map(walk);
		if (item && typeof item === "object") {
			return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, walk(child)]));
		}
		return item;
	};
	return walk(value) as T;
}
