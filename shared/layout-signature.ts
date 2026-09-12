import type { CSSProperties } from "react";
import type { BlockConfig } from "./schema-types";
import {
	getBlockSiblingFlexItemStyles,
	getBlockStackLayerWrapperStyles,
	getContainerChildrenStackStyle,
	getContainerSiblingStackDirection,
	readContainerLayoutFromBlock,
} from "./block-container-placement";
import { getHorizontalFlexChildStyles } from "./container-child-flex";
import { resolveBlockForSurface } from "./resolve-block-for-surface";

export type LayoutSignatureChild = {
	id: string;
	name: string;
	wrapper: CSSProperties;
};

export type LayoutSignature = {
	display: string;
	flexDirection: string;
	flexWrap: string;
	alignItems: string;
	justifyContent: string;
	gap?: string;
	gridTemplateColumns?: string;
	stackStyle: CSSProperties;
	children: LayoutSignatureChild[];
	canvasClassNames: string[];
	publishClassNames: string[];
};

/**
 * Stable layout fingerprint for golden tests — canvas vs publish class names plus
 * the CSS the inner stack and each sibling wrapper would apply.
 */
export function buildLayoutSignature(block: BlockConfig): LayoutSignature {
	const layout = readContainerLayoutFromBlock({
		styles: block.styles,
		content: block.content as Record<string, unknown>,
	});
	const stackDirection = getContainerSiblingStackDirection(layout);
	const isHorizontal = stackDirection === "row";
	const stackStyle = getContainerChildrenStackStyle(layout, {
		shellStyles: block.styles,
		children: block.children?.map((child) => ({ styles: child.styles })),
	});
	const children = (block.children ?? []).map((child) => ({
		id: child.id,
		name: child.name,
		wrapper: {
			...getHorizontalFlexChildStyles({
				isHorizontal,
				childStyles: child.styles,
				blockName: child.name,
				shrink: child.settings?.stackShrink === true,
			}),
			...getBlockSiblingFlexItemStyles(child.styles, stackDirection),
			...getBlockStackLayerWrapperStyles(child),
		},
	}));
	const canvas = resolveBlockForSurface({
		block,
		surface: "canvas",
		deviceView: "desktop",
	});
	const publish = resolveBlockForSurface({ block, surface: "publish" });
	return {
		display: layout.display,
		flexDirection: layout.flexDirection,
		flexWrap: layout.flexWrap,
		alignItems: layout.alignItems,
		justifyContent: layout.justifyContent,
		gap: layout.gap,
		gridTemplateColumns: layout.gridTemplateColumns,
		stackStyle,
		children,
		canvasClassNames: canvas.classNames,
		publishClassNames: publish.classNames,
	};
}
