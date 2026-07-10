/** Semantic HTML tags allowed on group blocks. */
export const GROUP_HTML_TAG_NAMES = [
	"div",
	"section",
	"article",
	"main",
	"header",
	"footer",
	"aside",
	"nav",
] as const;

/** Semantic HTML tags allowed on container blocks. */
export const CONTAINER_HTML_TAG_NAMES = ["div", "section", "article", "aside"] as const;

export type GroupHtmlTagName = (typeof GROUP_HTML_TAG_NAMES)[number];
export type ContainerHtmlTagName = (typeof CONTAINER_HTML_TAG_NAMES)[number];
export type BlockHtmlTagName = GroupHtmlTagName | ContainerHtmlTagName;

const groupTagSet = new Set<string>(GROUP_HTML_TAG_NAMES);
const containerTagSet = new Set<string>(CONTAINER_HTML_TAG_NAMES);

export function isGroupHtmlTagName(value: unknown): value is GroupHtmlTagName {
	return typeof value === "string" && groupTagSet.has(value);
}

export function isContainerHtmlTagName(value: unknown): value is ContainerHtmlTagName {
	return typeof value === "string" && containerTagSet.has(value);
}
