import React, { useState } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { PanelTopOpen } from "lucide-react";
import {
	DEFAULT_ACCORDION_ITEM_CONTENT,
	isItemOpenAtStart,
	readAccordionItemContent,
	resolveAccordionIcons,
	type AccordionContent,
	type AccordionIconRef,
	type AccordionItemContent,
} from "@shared/accordion-model";
import { ContainerChildren } from "../../BlockRenderer";
import { createBlockDefinition } from "../createBlockDefinition";
import { InlineTextEditor } from "../shared/inline-text-editor";
import { IconRenderer } from "../shared/IconRenderer";
import type { IconReference } from "@/lib/icon-indexes";
import { useAccordionContext } from "./accordion-context";
import { AccordionItemSettings } from "./accordion-item-settings";

const toIconReference = (icon: AccordionIconRef): IconReference => ({
	...icon,
	iconSet: icon.iconSet as IconReference["iconSet"],
	size: 24,
	color: "currentColor",
	strokeWidth: 2,
});

function ItemIcon({ accordion }: { accordion: AccordionContent }) {
	const icons = resolveAccordionIcons(accordion.icon);
	const glyph = (icon: AccordionIconRef) => <IconRenderer icon={toIconReference(icon)} size="100%" />;
	return (
		<span className="np-accordion__icon" aria-hidden="true">
			{icons.motion === "swap" && icons.open ? (
				<>
					<span className="np-accordion__icon-closed">{glyph(icons.closed)}</span>
					<span className="np-accordion__icon-open">{glyph(icons.open)}</span>
				</>
			) : (
				glyph(icons.closed)
			)}
		</span>
	);
}

type AccordionItemCanvasProps = {
	hostBlock: BlockConfig;
	content: AccordionItemContent;
	isPreview?: boolean;
	isEditing?: boolean;
	onTitleChange: (title: string) => void;
	onNestedBlockChange?: (updated: BlockConfig) => void;
};

/**
 * Canvas view of one item. The chevron / plus opens and closes it while editing (that choice is
 * only for the canvas); "Open at start" in its settings is what visitors see first.
 */
function AccordionItemCanvas({
	hostBlock,
	content,
	isPreview,
	isEditing,
	onTitleChange,
	onNestedBlockChange,
}: AccordionItemCanvasProps) {
	const { content: accordion, itemIds } = useAccordionContext();
	const index = Math.max(0, itemIds.indexOf(hostBlock.id));
	const [open, setOpen] = useState(() => isItemOpenAtStart({ accordion, item: content, index }));

	return (
		<div className="np-accordion__item" data-open={open ? "true" : "false"}>
			<div className="np-accordion__title">
				<button
					type="button"
					className="inline-flex"
					aria-expanded={open}
					aria-label={open ? "Close this item on the canvas" : "Open this item on the canvas"}
					onClick={(event) => {
						event.stopPropagation();
						setOpen((value) => !value);
					}}
				>
					<ItemIcon accordion={accordion} />
				</button>
				{isEditing ? (
					<InlineTextEditor value={content.title} onChange={onTitleChange} placeholder="Question or section title" />
				) : (
					<span className="np-accordion__label">{content.title || "Untitled item"}</span>
				)}
			</div>
			{open ? (
				<div className="np-accordion__body">
					<ContainerChildren block={hostBlock} isPreview={isPreview ?? false} onBlockChange={onNestedBlockChange} />
				</div>
			) : null}
		</div>
	);
}

const AccordionItemBlock = createBlockDefinition<AccordionItemContent>({
	id: "core/accordion-item",
	label: "Accordion item",
	icon: PanelTopOpen,
	description: "One question or section inside an accordion",
	category: "layout",
	isContainer: true,
	handlesOwnChildren: true,
	defaultContent: DEFAULT_ACCORDION_ITEM_CONTENT,
	defaultStyles: { padding: "0", margin: "0" },
	parseContent: (raw) => readAccordionItemContent(raw),
	settings: AccordionItemSettings,
	hasSettings: true,
	render: ({ value, content, setContent, isPreview, isEditing, onNestedBlockChange }) => (
		<AccordionItemCanvas
			hostBlock={value}
			content={content}
			isPreview={isPreview}
			isEditing={isEditing}
			onTitleChange={(title) => setContent((prev) => ({ ...prev, title }))}
			onNestedBlockChange={onNestedBlockChange}
		/>
	),
});

export default AccordionItemBlock;
