import { buildBlockLibraryCategories, type BlockLibraryCategory } from "../BlockLibrary";
import type { BlockDefinition } from "../blocks/types";
import { docsBlockLabel } from "./docs-block-labels";

/**
 * How the docs inserter groups its blocks: the sections of the docs editor mockup. A block that
 * is in the Docs group but in no section here (a new docs block nobody sorted yet) still shows,
 * under "More", so adding a docs block never needs a change here to be usable.
 */

export type DocsLibrarySection = { id: string; name: string; blocks: BlockDefinition[] };

const SECTIONS: ReadonlyArray<{ id: string; name: string; ids: readonly string[] }> = [
	{ id: "writing", name: "Writing", ids: ["core/heading", "core/paragraph", "core/list", "core/quote", "core/separator"] },
	{ id: "callouts", name: "Callouts", ids: ["docs/callout"] },
	{ id: "code", name: "Code", ids: ["core/code", "docs/code-group", "docs/example", "docs/diagram"] },
	{ id: "structure", name: "Structure", ids: ["core/steps", "core/tabs", "core/grid", "core/accordion", "core/table", "docs/file-tree"] },
	{ id: "reference", name: "Reference", ids: ["docs/params", "docs/update"] },
	{ id: "media", name: "Media", ids: ["core/image", "core/video"] },
];


/** The blocks sorted into sections, in the order above; empty sections are left out. */
export function groupDocsBlocks(blocks: BlockDefinition[]): DocsLibrarySection[] {
	const byId = new Map(blocks.map((block) => [block.id, block]));
	const placed = new Set<string>();
	const sections = SECTIONS.map(({ id, name, ids }) => {
		const inSection = ids.flatMap((blockId) => {
			const block = byId.get(blockId);
			return block ? [block] : [];
		});
		inSection.forEach((block) => placed.add(block.id));
		return { id, name, blocks: inSection };
	});
	const rest = blocks.filter((block) => !placed.has(block.id));
	return [...sections, { id: "more", name: "More", blocks: rest }].filter((section) => section.blocks.length > 0);
}

/**
 * The docs editor's block list: the Docs group in the sections above, each block under its docs
 * name, in the shape the page builder's block list takes, so both editors show one list.
 */
export function buildDocsLibraryCategories(): BlockLibraryCategory[] {
	const docsGroup = buildBlockLibraryCategories({ mode: "docs" }).flatMap((category) => category.blocks);
	return groupDocsBlocks(docsGroup).map((section) => ({
		...section,
		blocks: section.blocks.map((block) => ({ ...block, label: docsBlockLabel(block) })),
	}));
}
