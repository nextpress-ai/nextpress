import type { BlockConfig } from "@shared/schema-types";
import { ACCORDION_ITEM_BLOCK_NAME } from "@shared/accordion-model";

const UNITS = { spacing: "px", font: "rem", dimension: "px", border: "px" } as const;

/**
 * A new accordion item: a title and one paragraph as its answer, ready to type into.
 * WHY here and not via the registry: the accordion's settings add items, and importing the
 * registry from a block would make the registry import itself.
 */
export function buildAccordionItem({
	id,
	parentId,
	title,
	newId,
}: {
	id: string;
	parentId: string;
	title: string;
	newId: () => string;
}): BlockConfig {
	const answerId = newId();
	return {
		id,
		name: ACCORDION_ITEM_BLOCK_NAME,
		label: "Accordion item",
		type: "container",
		parentId,
		category: "layout",
		content: { kind: "structured", data: { title, open: false } },
		styles: {},
		settings: {},
		other: { tokenMap: {}, units: { ...UNITS } },
		children: [
			{
				id: answerId,
				name: "core/paragraph",
				label: "Paragraph",
				type: "block",
				parentId: id,
				category: "basic",
				content: { kind: "text", value: "Write the answer here." },
				styles: { margin: "0", fontSize: "15px", lineHeight: "1.6" },
				settings: {},
				other: { tokenMap: {}, units: { ...UNITS } },
			},
		],
	};
}

/** The three items a new accordion starts with. */
export function buildStarterAccordionItems({
	parentId,
	newId,
}: {
	parentId: string;
	newId: () => string;
}): BlockConfig[] {
	return ["First question", "Second question", "Third question"].map((title) =>
		buildAccordionItem({ id: newId(), parentId, title, newId }),
	);
}
