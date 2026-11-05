/**
 * Names shorter and plainer than the catalog's, for blocks seen inside the docs editor, where every
 * block is a docs block already ("Text", not "Docs text"). Kept in a file of its own, with no
 * imports, so the canvas and the settings panel can use it without loading the block list.
 */
const DISPLAY_LABELS: Readonly<Record<string, string>> = {
	"core/heading": "Heading",
	"core/paragraph": "Text",
	"core/list": "List",
	"core/separator": "Divider",
	"docs/example": "Example",
};

export const docsBlockLabel = (block: { id: string; label: string }): string => DISPLAY_LABELS[block.id] ?? block.label;
