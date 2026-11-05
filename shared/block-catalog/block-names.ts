/**
 * Every block name NextPress knows. The one list: the editor, the server's save
 * check and the SDK all read it, so a block added here shows up everywhere.
 */
export const BLOCK_NAMES = [
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
	"core/stack",
	"core/page-shell",
	"core/header",
	"core/accordion",
	"core/accordion-item",
	"core/popup",
	"core/form",
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
	"core/template-part",
	"core/grid",
	"core/card",
	"core/badge",
	"core/steps",
	"core/step",
	"core/tabs",
	"core/tab",
	"core/logo-cloud",
	"core/search",
	"core/docs-layout",
	"docs/shell",
	"docs/page",
	"docs/callout",
	"docs/code-group",
	"docs/file-tree",
	"docs/params",
	"docs/example",
	"docs/diagram",
	"docs/update",
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
	"post/body",
] as const;

export type BlockName = (typeof BLOCK_NAMES)[number];

const NAME_SET = new Set<string>(BLOCK_NAMES);

export const isBlockName = (name: string): name is BlockName => NAME_SET.has(name);

const CORE_PREFIX = "core/";

/** Known names close to what was typed (it contains one, or one contains it), for a "did you mean" hint. */
export const suggestBlockNames = (typed: string): BlockName[] => {
	const needle = typed.trim().toLowerCase().replace(/^core\//, "");
	if (!needle) return [];
	return BLOCK_NAMES.filter((name) => name.includes(needle) || needle.includes(name.slice(name.indexOf("/") + 1)));
};

export type ResolvedBlockName = { ok: true; name: BlockName } | { ok: false; message: string };

/**
 * The block an agent means. A name without a prefix is a `core/` block, the way the page outline
 * prints it (`heading` is `core/heading`); `post/` and `docs/` blocks keep their prefix, so `list`
 * is never mistaken for `post/list`, and `callout` is refused with a hint to write `docs/callout`.
 *
 * WHY: agents copy names from the outline. Refusing the short spelling there cost them a step.
 */
export const resolveBlockName = (typed: string): ResolvedBlockName => {
	const name = typed.trim().toLowerCase();
	if (isBlockName(name)) return { ok: true, name };
	const core = `${CORE_PREFIX}${name}`;
	if (!name.includes("/") && isBlockName(core)) return { ok: true, name: core };
	const close = suggestBlockNames(name).slice(0, 5);
	return {
		ok: false,
		message: `Unknown block name "${typed}".${close.length > 0 ? ` Did you mean ${close.join(", ")}?` : ""} Call list_block_types for the valid names.`,
	};
};
