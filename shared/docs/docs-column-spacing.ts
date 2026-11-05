import { INSERTED_BLOCK_BASE_STYLES } from "../block-catalog/create-default-block.js";
import type { BlockConfig } from "../schema-types.js";

/** The page builder's starting padding with the sides taken off: the top still spaces the block from the one above. */
const DOCS_COLUMN_PADDING = "20px 0 0";

/**
 * A block made for a docs page lines up with the page's text. New blocks start with the page
 * builder's padding (`INSERTED_BLOCK_BASE_STYLES`), whose sides would indent a code block or a
 * callout 20px from the paragraphs around it; here the sides go, for the block and every block in
 * it. A padding someone set themselves is left as it is.
 */
export function fitToDocsColumn(block: BlockConfig): BlockConfig {
	const padding = block.styles?.padding;
	const styles = padding === INSERTED_BLOCK_BASE_STYLES.padding ? { ...block.styles, padding: DOCS_COLUMN_PADDING } : block.styles;
	const children = block.children?.map(fitToDocsColumn);
	return { ...block, styles, ...(children ? { children } : {}) };
}

/** Spacing between the blocks of a written page (docs, posts): the reading column is the only inset. */
export const DOCS_PROSE_STYLES: Readonly<Record<string, NonNullable<BlockConfig["styles"]>>> = {
	"core/paragraph": { margin: "0 0 16px", padding: "0" },
	"core/heading": { margin: "28px 0 10px", padding: "0" },
	"core/list": { margin: "0 0 16px", padding: "0 0 0 1.5em" },
};
