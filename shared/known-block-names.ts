/**
 * Canonical block names accepted on page/post save.
 * Keep aligned with packages/sdk/src/blocks/block-definitions.ts BLOCK_NAMES.
 */
export const KNOWN_BLOCK_NAMES = [
	"core/heading",
	"core/paragraph",
	"core/button",
	"core/buttons",
	"core/image",
	"core/gallery",
	"core/video",
	"core/audio",
	"core/spacer",
	"core/separator",
	"core/columns",
	"core/container",
	"core/group",
	"core/quote",
	"core/list",
	"core/media-text",
	"core/cover",
	"core/file",
	"core/code",
	"core/html",
	"core/pullquote",
	"core/preformatted",
	"core/table",
	"core/markdown",
	"core/icon",
	"core/divider",
	"core/input",
	"core/textarea",
	"core/select",
	"post/title",
	"post/excerpt",
	"post/featured-image",
	"post/list",
	"post/toc",
	"post/author-box",
	"post/comments",
	"post/navigation",
	"post/info",
	"post/progress",
] as const;

export type KnownBlockName = (typeof KNOWN_BLOCK_NAMES)[number];

const KNOWN_SET = new Set<string>(KNOWN_BLOCK_NAMES);

export const isKnownBlockName = (name: string): name is KnownBlockName => KNOWN_SET.has(name);
