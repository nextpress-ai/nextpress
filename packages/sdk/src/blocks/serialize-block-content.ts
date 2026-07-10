import type { BlockContent } from "../types/domain.js";
import { BLOCK_DEFINITIONS, type BlockName } from "./block-definitions.js";

/** Reads default structured `data` from the block registry for merge with partial content. */
export const readDefaultStructuredContent = (
	name: BlockName,
): Record<string, unknown> => {
	const def = BLOCK_DEFINITIONS[name];
	const content = def.defaultContent();
	if (content && typeof content === "object" && "kind" in content && content.kind === "structured") {
		return { ...(content.data ?? {}) };
	}
	return {};
};

/** Merges partial editor content with registry defaults into persisted block content. */
export const serializeStructuredContent = <TContent extends Record<string, unknown>>({
	name,
	content,
}: {
	name: BlockName;
	content?: Partial<TContent>;
}): BlockContent => ({
	kind: "structured",
	data: {
		...readDefaultStructuredContent(name),
		...(content ?? {}),
	},
});
