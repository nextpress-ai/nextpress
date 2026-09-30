/**
 * Links from one page to other pages of the same site, found in button/header link fields and in
 * `href="…"` inside text. Used to offer linked pages on export, and to keep links pointing at the
 * right page when an import has to give a page a new address.
 */

import { decodePath } from "./decode-path.js";

/** Fields whose whole value is a link. */
const LINK_KEYS = new Set(["href", "url", "link"]);
/** `href="/about"` inside rich text. */
const HTML_HREF = /(href\s*=\s*["'])(\/[^"'\s>]*)/gi;
/** Paths that are app or file addresses, never pages. */
const NOT_PAGES = /^\/(?:uploads|api|admin|vendor|sites|pages|posts|preview|auth)(?:\/|$)/i;

export const HOMEPAGE_PATH = "/";

/** The page address a link points at: `/contact/?x#y` → `contact`, `/` → `/`, anything else → null. */
export function pageSlugFromPath(path: string): string | null {
	if (!path.startsWith("/") || path.startsWith("//")) return null;
	const bare = path.split(/[?#]/)[0] ?? "";
	if (bare === "/" || bare === "") return HOMEPAGE_PATH;
	if (NOT_PAGES.test(bare)) return null;
	const trimmed = bare.replace(/^\/+|\/+$/g, "");
	if (!trimmed || trimmed.includes("/")) return null;
	return decodePath(trimmed).toLowerCase();
}

type Visit = (text: string, key: string | undefined) => string;

function walkStrings<T>(value: T, visit: Visit, key?: string): T {
	if (typeof value === "string") return visit(value, key) as T;
	if (Array.isArray(value)) return value.map((item) => walkStrings(item, visit, key)) as T;
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([childKey, child]) => [childKey, walkStrings(child, visit, childKey)]),
		) as T;
	}
	return value;
}

/** Every page address a value links to (`/` for the homepage), once each. */
export function findPageLinks(value: unknown): string[] {
	const found = new Set<string>();
	const note = (path: string) => {
		const slug = pageSlugFromPath(path);
		if (slug) found.add(slug);
	};
	walkStrings(value, (text, key) => {
		if (key && LINK_KEYS.has(key)) note(text.trim());
		for (const match of text.matchAll(HTML_HREF)) note(match[2] ?? "");
		return text;
	});
	return [...found];
}

/** Swaps the address in one link, keeping any trailing slash, query or `#part`. */
const swapPath = (path: string, slugMap: Record<string, string>): string => {
	const slug = pageSlugFromPath(path);
	if (!slug || slug === HOMEPAGE_PATH || !slugMap[slug]) return path;
	const match = /^\/+[^/?#]+(\/?)(.*)$/.exec(path);
	return `/${slugMap[slug]}${match?.[1] ?? ""}${match?.[2] ?? ""}`;
};

/**
 * Copy of `value` with links to renamed pages pointing at their new address
 * (`slugMap`: old address → new address). Other links are left exactly as written.
 */
export function rewritePageLinks<T>({ value, slugMap }: { value: T; slugMap: Record<string, string> }): T {
	if (Object.keys(slugMap).length === 0) return value;
	return walkStrings(value, (text, key) => {
		const whole = key && LINK_KEYS.has(key) ? swapPath(text, slugMap) : text;
		return whole.replace(HTML_HREF, (_all, prefix: string, path: string) => `${prefix}${swapPath(path, slugMap)}`);
	});
}
