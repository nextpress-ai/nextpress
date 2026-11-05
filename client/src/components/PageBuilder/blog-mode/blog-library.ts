import { blockRegistry } from "../blocks";
import type { BlockLibraryCategory } from "../BlockLibrary";
import { docsBlockLabel } from "../docs-mode/docs-block-labels";

/**
 * The blocks a post's body takes, in the writing editor's sections. Text, heading and list are the
 * docs writing blocks, so typing shortcuts and the "/" menu work in posts as they do in docs.
 */
const SECTIONS: ReadonlyArray<{ id: string; name: string; names: readonly string[] }> = [
	{ id: "writing", name: "Writing", names: ["core/heading", "core/paragraph", "core/list", "core/quote", "core/separator"] },
	{ id: "media", name: "Media", names: ["core/image", "core/gallery", "core/video"] },
	{ id: "more", name: "More", names: ["core/code", "docs/callout", "core/table", "core/button"] },
];

/** Every name the body takes, for checks and tests. */
export const BLOG_WRITING_BLOCKS: readonly string[] = SECTIONS.flatMap((section) => section.names);

/** The writing editor's block list, in the shape the page builder's block list takes. */
export function buildBlogLibraryCategories(): BlockLibraryCategory[] {
	return SECTIONS.map(({ id, name, names }) => ({
		id,
		name,
		blocks: names.flatMap((blockName) => {
			const block = blockRegistry[blockName];
			return block ? [{ ...block, label: docsBlockLabel(block) }] : [];
		}),
	})).filter((section) => section.blocks.length > 0);
}
