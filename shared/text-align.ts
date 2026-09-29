import type { BlockConfig, BlockContent } from "./schema-types.js";

/**
 * Text alignment has one home: `styles.textAlign`, which the Style tab writes and every
 * renderer reads. Older pages, SDK scripts and the WordPress importer also left it on
 * `content.textAlign`. Those two could disagree (a heading centred in the Style tab still
 * published left-aligned), so the old spot is only read as a fallback and is moved into
 * styles whenever the page is saved.
 */

export const TEXT_ALIGN_VALUES = ["left", "center", "right", "justify"] as const;
export type TextAlign = (typeof TEXT_ALIGN_VALUES)[number];

/** Blocks whose `content.textAlign` used to carry the alignment. */
export const TEXT_ALIGN_BLOCK_NAMES = new Set([
	"core/heading",
	"core/paragraph",
	"core/quote",
	"core/pullquote",
]);

/** Anything that may carry an alignment: block styles, or old text content. */
type AlignSource = { textAlign?: string | null };

const toTextAlign = (value: string | null | undefined): TextAlign | undefined =>
	TEXT_ALIGN_VALUES.find((option) => option === value);

/** The alignment to paint: the style wins, the old content value is the fallback. */
export function readTextAlign({
	styles,
	content,
}: {
	styles?: AlignSource | null;
	content?: BlockContent | AlignSource | null;
}): TextAlign | undefined {
	return toTextAlign(styles?.textAlign) ?? toTextAlign(readContentAlign(content));
}

/** The old alignment on content, when this kind of content has one. */
const readContentAlign = (content: BlockContent | AlignSource | null | undefined): string | undefined => {
	if (!content || typeof content !== "object" || !("textAlign" in content)) return undefined;
	return typeof content.textAlign === "string" ? content.textAlign : undefined;
};

/**
 * Moves `content.textAlign` into `styles.textAlign` (unless the style is already set) and
 * drops it from content. Only for text blocks; other blocks come back unchanged.
 */
export function moveTextAlignToStyles(block: BlockConfig): BlockConfig {
	if (!TEXT_ALIGN_BLOCK_NAMES.has(block.name)) return block;
	const content = block.content;
	if (!content || typeof content !== "object" || !("textAlign" in content)) return block;

	const { textAlign: legacy, ...rest } = content as BlockContent & AlignSource;
	const align = readTextAlign({ styles: block.styles, content: { textAlign: legacy } });
	const styles = { ...(block.styles ?? {}) };
	if (align && !toTextAlign(styles.textAlign)) {
		styles.textAlign = align;
	}
	return { ...block, content: rest as BlockContent, styles };
}

/** `moveTextAlignToStyles` over a whole page tree. */
export function moveTextAlignToStylesInBlocks(blocks: BlockConfig[]): BlockConfig[] {
	return blocks.map((block) => {
		const next = moveTextAlignToStyles(block);
		return next.children?.length
			? { ...next, children: moveTextAlignToStylesInBlocks(next.children) }
			: next;
	});
}
