import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, getBlockComponent } from "../render-helpers";
import { headerHasBlocksSlot, readHeaderContent } from "@shared/header-model";
import { HeaderBar } from "@shared/header-view";
import {
	getBlockSiblingFlexItemStyles,
	getBlockStackLayerWrapperStyles,
} from "@shared/block-container-placement";
import { getHorizontalFlexChildStyles } from "@shared/container-child-flex";

/**
 * Header for preview, publish, and server render. In the blocks layout the child blocks are
 * painted on the right with the same per-child wrapper the editor uses, so nothing shifts
 * between the canvas and the live page.
 */
export function HeaderBlock(block: BlockConfig) {
	const { className, attributes } = getRenderProps(block);
	const content = readHeaderContent(block.content);
	const childBlocks = block.children ?? [];

	const blocks = headerHasBlocksSlot(content.variant) ? (
		<div className="wp-block-header__blocks">
			{childBlocks.map((child) => {
				const ChildComponent = getBlockComponent(child.name);
				if (!ChildComponent) return null;
				return (
					<div
						key={child.id}
						style={{
							...getHorizontalFlexChildStyles({
								isHorizontal: true,
								childStyles: child.styles,
								blockName: child.name,
								shrink: child.settings?.stackShrink === true,
							}),
							...getBlockSiblingFlexItemStyles(child.styles, "row"),
							...getBlockStackLayerWrapperStyles(child),
						}}
					>
						<ChildComponent {...child} />
					</div>
				);
			})}
		</div>
	) : undefined;

	return (
		<div className={className || undefined} {...attributes}>
			<HeaderBar content={content} blocks={blocks} />
		</div>
	);
}
