import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import {
	ACCORDION_ITEM_BLOCK_NAME,
	buildFaqJsonLd,
	isItemOpenAtStart,
	readAccordionContent,
	readAccordionItemContent,
	resolveAccordionIcons,
	type AccordionContent,
	type AccordionIconRef,
} from "@shared/accordion-model";
import { IconDrawingView, hasIconDrawing } from "@shared/icon-drawing-view";
import { getRenderProps, renderChildBlocks } from "../render-helpers";
import { LucideGlyph } from "../shared/lucide-glyph";

/** Paints one accordion icon: Lucide by name, anything else from its saved drawing or picture. */
function AccordionGlyph({ icon }: { icon: AccordionIconRef }): React.ReactNode {
	if (icon.iconSet === "lucide") {
		return <LucideGlyph iconName={icon.iconName} size="100%" strokeWidth={2} aria-hidden />;
	}
	return hasIconDrawing(icon) ? <IconDrawingView icon={{ ...icon, label: undefined }} size="100%" /> : null;
}

function AccordionIcon({ content }: { content: AccordionContent }): React.ReactNode {
	const icons = resolveAccordionIcons(content.icon);
	return (
		<span className="np-accordion__icon" aria-hidden="true">
			{icons.motion === "swap" && icons.open ? (
				<>
					<span className="np-accordion__icon-closed">
						<AccordionGlyph icon={icons.closed} />
					</span>
					<span className="np-accordion__icon-open">
						<AccordionGlyph icon={icons.open} />
					</span>
				</>
			) : (
				<AccordionGlyph icon={icons.closed} />
			)}
		</span>
	);
}

/** One item: a native `<details>`, so opening works without JavaScript and with the keyboard. */
function AccordionItemView({
	item,
	accordion,
	groupName,
	open,
}: {
	item: BlockConfig;
	accordion: AccordionContent;
	groupName?: string;
	open: boolean;
}): React.ReactElement {
	const { style, className, attributes } = getRenderProps(item);
	const { title } = readAccordionItemContent(item.content);
	return (
		<details
			className={["np-accordion__item", className].filter(Boolean).join(" ")}
			style={style}
			{...attributes}
			{...(groupName ? { name: groupName } : {})}
			open={open}
		>
			<summary className="np-accordion__title">
				<AccordionIcon content={accordion} />
				<span className="np-accordion__label">{title}</span>
			</summary>
			<div className="np-accordion__body">{renderChildBlocks(item.children ?? [])}</div>
		</details>
	);
}

/**
 * Accordion Block Component — items are its `core/accordion-item` children. Look, icons and
 * spacing come from `buildAccordionCss` (collected with the page's block CSS).
 */
export function AccordionBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const content = readAccordionContent(block.content);
	const items = (block.children ?? []).filter((child) => child.name === ACCORDION_ITEM_BLOCK_NAME);
	const groupName = content.openMode === "one" ? `np-accordion-${block.id}` : undefined;
	const faq = content.faqSchema ? buildFaqJsonLd(items) : "";

	return (
		<div
			className={["wp-block-accordion", "np-accordion", className].filter(Boolean).join(" ")}
			style={style}
			{...attributes}
		>
			{(block.children ?? []).map((child) =>
				child.name === ACCORDION_ITEM_BLOCK_NAME ? (
					<AccordionItemView
						key={child.id}
						item={child}
						accordion={content}
						groupName={groupName}
						open={isItemOpenAtStart({
							accordion: content,
							item: readAccordionItemContent(child.content),
							index: items.indexOf(child),
						})}
					/>
				) : (
					// Any other block dropped into the accordion still shows, in its place.
					<React.Fragment key={child.id}>{renderChildBlocks([child])}</React.Fragment>
				),
			)}
			{faq ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faq }} /> : null}
		</div>
	);
}

/**
 * An item outside an accordion (moved by hand, or from the API) still renders as a working
 * details element with the default look, instead of disappearing.
 */
export function AccordionItemBlock(block: BlockConfig) {
	const accordion = readAccordionContent(undefined);
	return (
		<div className="np-accordion">
			<AccordionItemView item={block} accordion={accordion} open={readAccordionItemContent(block.content).open} />
		</div>
	);
}
