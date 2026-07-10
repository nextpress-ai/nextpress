/** Common HTML meta `name` values editors may set. */
export const STANDARD_META_TAG_NAMES = [
	"description",
	"keywords",
	"author",
	"viewport",
	"robots",
	"theme-color",
	"format-detection",
	"referrer",
	"application-name",
	"generator",
] as const;

export type StandardMetaTagName = (typeof STANDARD_META_TAG_NAMES)[number];

/** Open Graph / Twitter / article property prefixes. */
export type OpenGraphMetaName = `og:${string}`;
export type TwitterMetaName = `twitter:${string}`;
export type ArticleMetaName = `article:${string}`;

export type MetaTagName =
	| StandardMetaTagName
	| OpenGraphMetaName
	| TwitterMetaName
	| ArticleMetaName;

const standardMetaSet = new Set<string>(STANDARD_META_TAG_NAMES);

const META_NAME_PATTERN = /^[a-z0-9][a-z0-9:_-]*$/i;

/**
 * Validates a custom meta tag `name`. Accepts standard names and og:/twitter:/article: prefixes.
 */
export function isValidMetaTagName(value: unknown): value is MetaTagName {
	if (typeof value !== "string" || value.trim() === "") return false;
	if (standardMetaSet.has(value)) return true;
	if (
		value.startsWith("og:") ||
		value.startsWith("twitter:") ||
		value.startsWith("article:")
	) {
		return META_NAME_PATTERN.test(value);
	}
	return META_NAME_PATTERN.test(value);
}
