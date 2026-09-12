import type { CSSProperties } from "react";
import type { BlockContent } from "./schema-types";
import { readStackTypeFromContent, type StackType } from "./stack-model";
import {
	getContainerChildrenStackStyle,
	getContainerOuterShellStyle,
	readContainerLayoutFromBlock,
} from "./block-container-placement";

type StackShellParams = {
	styles?: CSSProperties;
	content: BlockContent | undefined;
	children?: { styles?: CSSProperties }[];
};

type StackShellResult = {
	outerStyle: CSSProperties;
	innerStackStyle: CSSProperties;
	stackType: StackType;
	isHorizontal: boolean;
	isOverlay: boolean;
};

const readExplicitStyle = (styles: CSSProperties | undefined, key: string): string | undefined => {
	const raw = (styles as Record<string, unknown> | undefined)?.[key];
	return typeof raw === "string" && raw.trim() !== "" ? raw : undefined;
};

/**
 * Shared stack shell layout for the editor canvas and the public renderer.
 *
 * - `vertical` / `horizontal` reuse the container flex-stack math (gap, align,
 *   distribution all live on `block.styles` via the Auto Layout panel); the mode
 *   owns display + direction so the panel chips can never fight the Content tab.
 * - `overlay` (AB stack) places every child in grid cell 1/1 — child order paints
 *   bottom-to-top, `other.stackLayer` overrides, and pins become self-alignment.
 */
export function buildStackShellStyles({
	styles,
	content,
	children,
}: StackShellParams): StackShellResult {
	const stackType = readStackTypeFromContent(content);
	const isOverlay = stackType === "overlay";
	const isHorizontal = stackType === "horizontal";

	const outerStyle = getContainerOuterShellStyle(styles, { children });

	if (isOverlay) {
		// Single shared cell: gap never applies between overlapping children.
		return {
			outerStyle,
			innerStackStyle: {
				display: "grid",
				width: "100%",
				minWidth: 0,
			},
			stackType,
			isHorizontal: false,
			isOverlay: true,
		};
	}

	const layout = readContainerLayoutFromBlock({ styles, content: {} });
	const explicitDirection = readExplicitStyle(styles, "flexDirection");
	const reversed = explicitDirection === "row-reverse" || explicitDirection === "column-reverse";
	const forcedLayout = {
		...layout,
		display: "flex" as const,
		flexDirection: reversed
			? isHorizontal
				? ("row-reverse" as const)
				: ("column-reverse" as const)
			: isHorizontal
				? ("row" as const)
				: ("column" as const),
		flexWrap: readExplicitStyle(styles, "flexWrap") ?? (isHorizontal ? "wrap" : "nowrap"),
		alignItems:
			readExplicitStyle(styles, "alignItems") ?? (isHorizontal ? "center" : "flex-start"),
	};

	const innerStackStyle = getContainerChildrenStackStyle(forcedLayout, {
		shellStyles: styles,
		children,
	});

	return { outerStyle, innerStackStyle, stackType, isHorizontal, isOverlay };
}
