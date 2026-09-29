import React, { useMemo } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { ListCollapse } from "lucide-react";
import {
	ACCORDION_ITEM_BLOCK_NAME,
	DEFAULT_ACCORDION_CONTENT,
	readAccordionContent,
	type AccordionContent,
} from "@shared/accordion-model";
import { ContainerChildren } from "../../BlockRenderer";
import { createBlockDefinition } from "../createBlockDefinition";
import { AccordionContext } from "./accordion-context";
import { buildStarterAccordionItems } from "./accordion-factory";
import { AccordionSettings } from "./accordion-settings";

type AccordionCanvasProps = {
	hostBlock: BlockConfig;
	content: AccordionContent;
	isPreview?: boolean;
	onNestedBlockChange?: (updated: BlockConfig) => void;
};

/**
 * Canvas view: the items are ordinary child blocks (select, drag, reorder like any block).
 * The look comes from the same CSS the published page uses (`buildAccordionCss`).
 */
function AccordionCanvas({ hostBlock, content, isPreview, onNestedBlockChange }: AccordionCanvasProps) {
	const children = hostBlock.children ?? [];
	const itemIds = useMemo(
		() => children.filter((child) => child.name === ACCORDION_ITEM_BLOCK_NAME).map((child) => child.id),
		[children],
	);
	const context = useMemo(() => ({ content, itemIds }), [content, itemIds]);

	return (
		<AccordionContext.Provider value={context}>
			<div className="wp-block-accordion">
				<ContainerChildren
					block={hostBlock}
					isPreview={isPreview ?? false}
					stackClassName="np-accordion"
					onBlockChange={onNestedBlockChange}
				/>
			</div>
		</AccordionContext.Provider>
	);
}

const AccordionBlock = createBlockDefinition<AccordionContent>({
	id: "core/accordion",
	label: "Accordion",
	icon: ListCollapse,
	description: "Questions or sections that open and close",
	category: "layout",
	isContainer: true,
	handlesOwnChildren: true,
	defaultContent: DEFAULT_ACCORDION_CONTENT,
	defaultStyles: { width: "100%", boxSizing: "border-box", padding: "0" },
	defaultChildren: ({ parentId, newId }) => buildStarterAccordionItems({ parentId, newId }),
	parseContent: (raw) => readAccordionContent(raw),
	settings: AccordionSettings,
	hasSettings: true,
	render: ({ value, content, isPreview, onNestedBlockChange }) => (
		<AccordionCanvas
			hostBlock={value}
			content={content}
			isPreview={isPreview}
			onNestedBlockChange={onNestedBlockChange}
		/>
	),
});

export default AccordionBlock;
