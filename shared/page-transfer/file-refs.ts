/**
 * Finding and swapping `/uploads/…` file paths inside blocks and page extras.
 * WHY: a page points at its images by path (`src`, `url("…")` in fills, featured image).
 * On another site the same files get new paths, so every mention has to follow.
 */

const UPLOAD_PATH_PATTERN = /\/uploads\/[^\s"'()<>,\\?#]+/g;

const escapeForRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const safeDecode = (text: string): string => {
	try {
		return decodeURI(text);
	} catch {
		// A lone `%` is not an encoded path; the text is already plain.
		return text;
	}
};

/** Every string anywhere inside a JSON-like value. */
function collectStrings(value: unknown, into: string[] = []): string[] {
	if (typeof value === "string") {
		into.push(value);
	} else if (Array.isArray(value)) {
		value.forEach((item) => collectStrings(item, into));
	} else if (value && typeof value === "object") {
		Object.values(value).forEach((item) => collectStrings(item, into));
	}
	return into;
}

/**
 * All upload paths a value mentions. `knownUrls` (the site's media library) also catches
 * names the plain pattern cannot, such as a file name with spaces.
 */
export function findUploadRefs({
	value,
	knownUrls = [],
}: {
	value: unknown;
	knownUrls?: readonly string[];
}): string[] {
	const strings = collectStrings(value);
	const found = new Set<string>();
	strings.forEach((text) =>
		(text.match(UPLOAD_PATH_PATTERN) ?? []).forEach((match) => found.add(safeDecode(match))),
	);
	knownUrls
		.filter((url) => strings.some((text) => text.includes(url) || text.includes(encodeURI(url))))
		.forEach((url) => found.add(url));
	return [...found];
}

/**
 * Returns a copy of `value` with every mapped upload path swapped for its new one.
 * A full address on the old site (`http://localhost:5000/uploads/a.png`) becomes the new path too,
 * since the old host means nothing on the new site.
 */
export function rewriteFileRefs<T>({ value, refMap }: { value: T; refMap: Record<string, string> }): T {
	const keys = Object.keys(refMap);
	if (keys.length === 0) return value;

	const lookup = new Map<string, string>();
	keys.forEach((key) => {
		lookup.set(key, refMap[key]!);
		lookup.set(encodeURI(key), refMap[key]!);
	});
	const alternatives = [...lookup.keys()]
		.sort((a, b) => b.length - a.length)
		.map(escapeForRegex)
		.join("|");
	// Stop at a character that cannot continue a file name, so `/uploads/a.png` never
	// rewrites inside `/uploads/a.png.bak`.
	const pattern = new RegExp(`(https?://[^/\\s"'()]+)?(${alternatives})(?![^\\s"'()<>,\\\\?#])`, "g");

	const swap = (text: string): string =>
		text.replace(pattern, (whole, _origin: string | undefined, path: string) => lookup.get(path) ?? whole);

	const walk = (item: unknown): unknown => {
		if (typeof item === "string") return swap(item);
		if (Array.isArray(item)) return item.map(walk);
		if (item && typeof item === "object") {
			return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, walk(child)]));
		}
		return item;
	};
	return walk(value) as T;
}
